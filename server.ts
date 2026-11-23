import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { getApp, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth, type Auth as AdminAuth } from 'firebase-admin/auth';
import { WebSocketServer } from 'ws';
import { GameServerEngine } from './server/gameEngine.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    try {
      out[key] = decodeURIComponent(val);
    } catch {
      out[key] = val;
    }
  }
  return out;
}

function firstHeaderValue(val: string | string[] | undefined): string {
  const raw = Array.isArray(val) ? val[0] : val;
  if (!raw) return '';
  return raw.split(',')[0].trim();
}

function isSameOriginRequest(req: express.Request): boolean {
  const expectedHost =
    firstHeaderValue(req.headers['x-forwarded-host']) ||
    firstHeaderValue(req.headers.host);
  if (!expectedHost) return false;

  const origin = req.headers.origin;
  if (origin) {
    try {
      return new URL(origin).host === expectedHost;
    } catch {
      return false;
    }
  }

  const fetchSite = req.headers['sec-fetch-site'];
  if (typeof fetchSite === 'string' && fetchSite === 'cross-site') {
    return false;
  }
  return true;
}

function isHttpsRequest(req: express.Request): boolean {
  const proto = firstHeaderValue(req.headers['x-forwarded-proto']);
  return req.secure || proto === 'https';
}

function resolveListenPort(): number {
  const argv = process.argv.slice(2);
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--port' && argv[i + 1]) {
      const parsed = Number(argv[i + 1]);
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    } else if (arg.startsWith('--port=')) {
      const parsed = Number(arg.slice('--port='.length));
      if (Number.isInteger(parsed) && parsed > 0) return parsed;
    }
  }
  const envPort = Number(process.env.PORT || 3000);
  return Number.isInteger(envPort) && envPort > 0 ? envPort : 3000;
}

async function bootstrap() {
  const app = express();
  app.set('trust proxy', 1);
  app.use(express.json({ limit: '16kb' }));
  const port = resolveListenPort();
  const isProd = process.env.NODE_ENV === 'production';

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });
  const engine = new GameServerEngine();

  let adminAuth: AdminAuth | null = null;
  try {
    const cfgPath = path.join(__dirname, 'firebase-applet-config.json');
    if (fs.existsSync(cfgPath)) {
      const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')) as {
        projectId?: string;
      };
      if (cfg.projectId && cfg.projectId !== 'remixed-project-id') {
        const adminApp = getApps().length
          ? getApp()
          : initializeApp({ projectId: cfg.projectId });
        adminAuth = getAuth(adminApp);
      }
    }
  } catch (err) {
    console.warn('Firebase Admin verifyIdToken no disponible:', err);
  }

  let totalVisits = 0;
  let uniqueVisitors = 0;

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/metrics/visit', (req, res) => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: 'Origen no autorizado.' });
      return;
    }
    totalVisits += 1;
    const cookies = parseCookies(req.headers.cookie);
    if (cookies.m412_v !== '1') {
      uniqueVisitors += 1;
      const https = isHttpsRequest(req);
      const attrs = https
        ? 'HttpOnly; Path=/; Max-Age=2592000; SameSite=None; Secure; Partitioned'
        : 'HttpOnly; Path=/; Max-Age=2592000; SameSite=Lax';
      res.setHeader('Set-Cookie', `m412_v=1; ${attrs}`);
    }
    res.json({ ok: true });
  });

  app.post('/api/metrics/local-match', (req, res) => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: 'Origen no autorizado.' });
      return;
    }
    engine.recordLocalMatchStarted();
    res.json({ ok: true });
  });

  app.get('/api/metrics', async (req, res) => {
    if (!adminAuth) {
      res.status(503).json({ error: 'Verificación Firebase no configurada.' });
      return;
    }
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : '';
    if (!token) {
      res.status(401).json({ error: 'Autenticación requerida.' });
      return;
    }
    try {
      const decoded = await adminAuth.verifyIdToken(token);
      if (
        decoded.email !== 'nsoliscordova@gmail.com' ||
        decoded.email_verified !== true
      ) {
        res.status(403).json({ error: 'Acceso exclusivo para el creador.' });
        return;
      }
      res.json({
        totalVisits,
        uniqueVisitors,
        ...engine.getEngineMetrics(),
      });
    } catch {
      res.status(401).json({ error: 'Token inválido o expirado.' });
    }
  });

  app.get('/api/hall-of-fame', (_req, res) => {
    res.json({ champions: engine.getHallOfFame() });
  });

  app.post('/api/hall-of-fame', (req, res) => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: 'Origen no autorizado.' });
      return;
    }
    const body = req.body;
    if (!body || typeof body !== 'object') {
      res.status(400).json({ error: 'Datos inválidos.' });
      return;
    }
    const champion = engine.addLocalChampion(body);
    res.status(201).json({ champion });
  });

  app.post('/api/seat-session', (req, res) => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: 'Origen no autorizado.' });
      return;
    }
    const code = typeof req.body?.code === 'string' ? req.body.code : '';
    const seatToken =
      typeof req.body?.seatToken === 'string' ? req.body.seatToken : '';
    const cleanCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

    if (
      !/^[A-Z0-9]{4,6}$/.test(cleanCode) ||
      !/^[a-f0-9]{32}$/.test(seatToken) ||
      !engine.verifySeatToken(cleanCode, seatToken)
    ) {
      res.status(400).json({ error: 'Asiento inválido.' });
      return;
    }

    const encodedVal = encodeURIComponent(`${cleanCode}:${seatToken}`);
    const https = isHttpsRequest(req);
    const attrs = https
      ? 'HttpOnly; Path=/; Max-Age=21600; SameSite=None; Secure; Partitioned'
      : 'HttpOnly; Path=/; Max-Age=21600; SameSite=Lax';
    res.setHeader('Set-Cookie', `m412_seat=${encodedVal}; ${attrs}`);
    res.json({ ok: true });
  });

  app.delete('/api/seat-session', (req, res) => {
    if (!isSameOriginRequest(req)) {
      res.status(403).json({ error: 'Origen no autorizado.' });
      return;
    }
    const https = isHttpsRequest(req);
    const attrs = https
      ? 'HttpOnly; Path=/; Max-Age=0; SameSite=None; Secure; Partitioned'
      : 'HttpOnly; Path=/; Max-Age=0; SameSite=Lax';
    res.setHeader('Set-Cookie', `m412_seat=; ${attrs}`);
    res.json({ ok: true });
  });

  const aliveSockets = new WeakMap<object, boolean>();
  const wsHeartbeat = setInterval(() => {
    for (const client of wss.clients) {
      if (aliveSockets.get(client) === false) {
        client.terminate();
        continue;
      }
      aliveSockets.set(client, false);
      try {
        client.ping();
      } catch {
        // Ignore ping failure on closing socket
      }
    }
  }, 25_000);

  wss.on('close', () => {
    clearInterval(wsHeartbeat);
  });

  wss.on('connection', (ws, req) => {
    aliveSockets.set(ws, true);
    ws.on('pong', () => {
      aliveSockets.set(ws, true);
    });

    const cookies = parseCookies(req.headers.cookie);
    const rawSeat = cookies.m412_seat;
    let cookieSeat: { code: string; seatToken: string } | null = null;
    if (rawSeat) {
      const sepIdx = rawSeat.indexOf(':');
      if (sepIdx > 0) {
        const code = rawSeat.slice(0, sepIdx).toUpperCase().trim();
        const seatToken = rawSeat.slice(sepIdx + 1).trim();
        if (/^[A-Z0-9]{4,6}$/.test(code) && /^[a-f0-9]{32}$/.test(seatToken)) {
          cookieSeat = { code, seatToken };
        }
      }
    }

    engine.registerSocket(ws, cookieSeat);

    ws.on('message', (data) => {
      aliveSockets.set(ws, true);
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      engine.handleMessage(ws, raw);
    });

    ws.on('close', () => {
      engine.handleDisconnect(ws);
    });
  });

  const distDir = path.resolve(__dirname, 'dist');
  const distIndex = path.join(distDir, 'index.html');

  if (!isProd || !fs.existsSync(distIndex)) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(distIndex);
    });
  }

  server.listen(port, '0.0.0.0', () => {
    console.log(`Monopolio Futbolero 412 listening on http://0.0.0.0:${port}`);
  });
}

bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
