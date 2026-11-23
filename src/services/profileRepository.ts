import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import type { ChampionRecord, UserProfile } from '../types/game';

const PALETTE_RE = /^[a-z0-9_\-]+$/;
const HEX_RE = /^#[0-9a-fA-F]{6}$/;

function cleanText(val: string | undefined | null, fallback: string, maxLen: number): string {
  const cleaned = (val ?? '').replace(/[<>]/g, '').trim().slice(0, maxLen);
  return cleaned || fallback;
}

function cleanPaletteId(val: string | undefined | null): string {
  const candidate = (val ?? '').trim().toLowerCase().slice(0, 20);
  return PALETTE_RE.test(candidate) ? candidate : 'xeneize';
}

function cleanHex(val: string | undefined | null, fallback: string): string {
  return val && HEX_RE.test(val) ? val : fallback;
}

function extractRawFirebaseError(error: unknown): { code: string; message: string } {
  const code =
    typeof error === 'object' && error !== null && 'code' in error
      ? String((error as { code?: unknown }).code ?? '')
      : '';
  let message = error instanceof Error ? error.message : String(error ?? '');
  if (message.startsWith('{')) {
    try {
      const parsed = JSON.parse(message) as { error?: unknown };
      if (typeof parsed.error === 'string' && parsed.error) {
        message = parsed.error;
      }
    } catch {
      // Keep original message
    }
  }
  return { code, message };
}

export function formatFirebaseUserError(
  error: unknown,
  context: 'auth' | 'profile' | 'hallOfFame' | 'metrics' = 'profile'
): string {
  const { code, message } = extractRawFirebaseError(error);
  const combined = `${code} ${message}`.toLowerCase();

  if (combined.includes('m412_invalid_username')) {
    return 'Usá un nombre de usuario de 3 a 20 caracteres (solo letras, números, punto, guion o guion bajo, sin espacios).';
  }
  if (combined.includes('auth/operation-not-allowed')) {
    return 'El registro con usuario y contraseña todavía no está activado en Firebase Console (Authentication → Sign-in method → Email/Password).';
  }
  if (combined.includes('auth/email-already-in-use')) {
    return 'Ese nombre de usuario ya existe. Probá iniciar sesión o elegí otro.';
  }
  if (
    combined.includes('auth/invalid-credential') ||
    combined.includes('auth/wrong-password') ||
    combined.includes('auth/user-not-found')
  ) {
    return 'Usuario o contraseña incorrectos.';
  }
  if (combined.includes('auth/weak-password')) {
    return 'La contraseña es muy corta: usá al menos 6 caracteres.';
  }
  if (combined.includes('auth/invalid-email')) {
    return 'Formato de usuario inválido. Usá letras o números sin espacios (ej: davo412).';
  }
  if (combined.includes('auth/too-many-requests')) {
    return 'Demasiados intentos seguidos. Esperá unos segundos y volvé a intentar.';
  }
  if (combined.includes('auth/unauthorized-domain')) {
    return 'Este enlace todavía no está en "Authorized domains" de Firebase Authentication. Podés seguir jugando salas online sin cuenta.';
  }
  if (
    combined.includes('api-key-not-valid') ||
    combined.includes('api_key_invalid')
  ) {
    return 'La API Key de Firebase necesita revisión en la consola. Las salas online siguen funcionando.';
  }
  if (
    combined.includes('quota exceeded') ||
    combined.includes('resource-exhausted')
  ) {
    return 'Se alcanzó el límite diario gratuito (plan Spark) de Firestore. Las salas online siguen funcionando normal; la nube se restablece al renovarse la cuota.';
  }
  if (
    combined.includes('billing') ||
    combined.includes('service_disabled') ||
    combined.includes('has not been used in project') ||
    combined.includes('is disabled')
  ) {
    return 'Firestore o una API del proyecto quedó restringida tras el cambio de plan en Firebase/Cloud. Las partidas online en sala siguen funcionando sin problemas.';
  }
  if (
    combined.includes('permission-denied') ||
    combined.includes('missing or insufficient permissions')
  ) {
    return context === 'hallOfFame'
      ? 'No se pudo consultar la nube de campeones por permisos de Firestore. Se muestran los campeones de esta sesión.'
      : 'Sin permisos en Firestore para guardar cambios en la cuenta. Verificá tu sesión.';
  }
  if (
    combined.includes('offline') ||
    combined.includes('unavailable') ||
    combined.includes('network-request-failed')
  ) {
    return 'No se pudo conectar con Firebase en este momento. Podés seguir jugando salas online normalmente.';
  }

  return context === 'auth'
    ? 'No se pudo iniciar sesión en este momento. Podés jugar igualmente como invitado.'
    : 'Error temporal con Firebase Cloud. El juego multijugador sigue funcionando normalmente.';
}

export interface HallOfFameResult {
  champions: ChampionRecord[];
  cloudWarning: string | null;
}

export interface ProfileRepository {
  getUserProfile(uid: string, fallbackName?: string | null): Promise<UserProfile>;
  updateClubIdentity(
    uid: string,
    identity: { displayName: string; clubName: string; paletteId: string }
  ): Promise<UserProfile>;
  recordMatchStats(
    uid: string,
    stats: { wonTriplete: boolean; points: number }
  ): Promise<UserProfile | null>;
  getHallOfFame(): Promise<HallOfFameResult>;
  recordLocalChampion(
    record: Omit<ChampionRecord, 'id' | 'wonAt'>
  ): Promise<void>;
  recordOnlineChampionForSignedInUser(
    record: Omit<ChampionRecord, 'id' | 'wonAt'>
  ): Promise<void>;
  getAdminMetrics(): Promise<{
    server: {
      startedAt: number;
      totalVisits: number;
      uniqueVisitors: number;
      activeConnections: number;
      activeOnlinePlayers: number;
      activeRooms: number;
      waitingRooms: number;
      inGameRooms: number;
      roomsCreated: number;
      onlineMatchesStarted: number;
      onlineMatchesFinished: number;
      localMatchesStarted: number;
      hallOfFameSessionCount: number;
    };
    cloud: {
      registeredUsers: number;
      totalCloudMatches: number;
      totalCloudTripletes: number;
      hallOfFameCloudCount: number;
    };
  }>;
}

class FirebaseProfileRepository implements ProfileRepository {
  async getUserProfile(
    uid: string,
    fallbackName?: string | null
  ): Promise<UserProfile> {
    const path = `users/${uid}`;
    const ref = doc(db, 'users', uid);

    try {
      const snap = await getDoc(ref);
      if (snap.exists()) {
        const d = snap.data();
        return {
          uid,
          displayName: cleanText(d.displayName, 'DT 412', 24),
          clubName: cleanText(d.clubName, 'Club 412', 24),
          paletteId: cleanPaletteId(d.paletteId),
          matchesPlayed: Number(d.matchesPlayed ?? 0),
          tripletesWon: Number(d.tripletesWon ?? 0),
          bestPoints: Number(d.bestPoints ?? 0),
        };
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, path);
    }

    const displayName = cleanText(fallbackName, 'DT 412', 24);
    const clubName = cleanText(`Club ${displayName}`, 'Club 412', 24);
    const initialProfile: UserProfile = {
      uid,
      displayName,
      clubName,
      paletteId: 'xeneize',
      matchesPlayed: 0,
      tripletesWon: 0,
      bestPoints: 0,
    };

    try {
      await setDoc(ref, {
        ...initialProfile,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }

    return initialProfile;
  }

  async updateClubIdentity(
    uid: string,
    identity: { displayName: string; clubName: string; paletteId: string }
  ): Promise<UserProfile> {
    const path = `users/${uid}`;
    const ref = doc(db, 'users', uid);
    const displayName = cleanText(identity.displayName, 'DT 412', 24);
    const clubName = cleanText(identity.clubName, 'Club 412', 24);
    const paletteId = cleanPaletteId(identity.paletteId);

    try {
      await updateDoc(ref, {
        displayName,
        clubName,
        paletteId,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }

    return this.getUserProfile(uid, displayName);
  }

  async recordMatchStats(
    uid: string,
    stats: { wonTriplete: boolean; points: number }
  ): Promise<UserProfile | null> {
    if (!auth.currentUser || auth.currentUser.uid !== uid) {
      return null;
    }

    const path = `users/${uid}`;
    const ref = doc(db, 'users', uid);
    const current = await this.getUserProfile(uid, auth.currentUser.displayName);

    const safePoints = Math.max(0, Math.min(1000, Math.round(stats.points)));
    const nextMatches = Math.min(100000, current.matchesPlayed + 1);
    const nextTripletes = Math.min(
      nextMatches,
      current.tripletesWon + (stats.wonTriplete ? 1 : 0)
    );
    const nextBest = Math.max(current.bestPoints, safePoints);

    try {
      await updateDoc(ref, {
        matchesPlayed: nextMatches,
        tripletesWon: nextTripletes,
        bestPoints: nextBest,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, path);
    }

    return {
      ...current,
      matchesPlayed: nextMatches,
      tripletesWon: nextTripletes,
      bestPoints: nextBest,
    };
  }

  private async fetchCloudHallOfFame(): Promise<ChampionRecord[]> {
    const cloudRecords: ChampionRecord[] = [];
    const path = 'hallOfFame';

    try {
      const q = query(
        collection(db, path),
        where('isPublic', '==', true),
        limit(30)
      );
      const snap = await getDocs(q);
      for (const docSnap of snap.docs) {
        const d = docSnap.data();
        const ts = d.wonAt;
        const wonAt =
          ts instanceof Timestamp
            ? ts.toMillis()
            : typeof ts === 'number'
              ? ts
              : Date.now();
        cloudRecords.push({
          id: docSnap.id,
          winnerName: cleanText(d.winnerName, 'Campeón', 20),
          clubName: cleanText(d.clubName, 'Club 412', 24),
          color: cleanHex(d.color, '#4B6B94'),
          secondaryColor: cleanHex(d.secondaryColor, '#E9D69B'),
          points: Number(d.points ?? 60),
          moneyLeft: Number(d.moneyLeft ?? 0),
          squadCount: Number(d.squadCount ?? 0),
          mode: d.mode === 'online' ? 'online' : 'local',
          playersCount: Number(d.playersCount ?? 2),
          wonAt,
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, path);
    }

    return cloudRecords;
  }

  async getHallOfFame(): Promise<HallOfFameResult> {
    let cloudRecords: ChampionRecord[] = [];
    let cloudWarning: string | null = null;

    try {
      cloudRecords = await this.fetchCloudHallOfFame();
    } catch (error) {
      cloudWarning = formatFirebaseUserError(error, 'hallOfFame');
    }

    // Also include any current server-session champions (from unauthenticated guests or fallback)
    let sessionRecords: ChampionRecord[] = [];
    try {
      const res = await fetch('/api/hall-of-fame');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.champions)) {
          sessionRecords = data.champions;
        }
      }
    } catch {
      // Non-blocking fallback
    }

    const merged = [...cloudRecords];
    for (const s of sessionRecords) {
      const duplicate = merged.some(
        (c) =>
          c.winnerName === s.winnerName &&
          c.clubName === s.clubName &&
          c.points === s.points &&
          Math.abs(c.wonAt - s.wonAt) < 15_000
      );
      if (!duplicate) {
        merged.push(s);
      }
    }

    return {
      champions: merged.sort((a, b) => b.wonAt - a.wonAt).slice(0, 30),
      cloudWarning,
    };
  }

  async getAdminMetrics(): Promise<{
    server: {
      startedAt: number;
      totalVisits: number;
      uniqueVisitors: number;
      activeConnections: number;
      activeOnlinePlayers: number;
      activeRooms: number;
      waitingRooms: number;
      inGameRooms: number;
      roomsCreated: number;
      onlineMatchesStarted: number;
      onlineMatchesFinished: number;
      localMatchesStarted: number;
      hallOfFameSessionCount: number;
    };
    cloud: {
      registeredUsers: number;
      totalCloudMatches: number;
      totalCloudTripletes: number;
      hallOfFameCloudCount: number;
    };
  }> {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('Debés iniciar sesión como creador para ver las métricas.');
    }

    const token = await user.getIdToken();
    const res = await fetch('/api/metrics', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error('No autorizado para consultar las métricas del servidor.');
    }
    const server = await res.json();

    let registeredUsers = 0;
    let totalCloudMatches = 0;
    let totalCloudTripletes = 0;
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      registeredUsers = usersSnap.size;
      for (const d of usersSnap.docs) {
        const data = d.data();
        totalCloudMatches += Number(data.matchesPlayed ?? 0);
        totalCloudTripletes += Number(data.tripletesWon ?? 0);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'users');
    }

    let hallOfFameCloudCount = 0;
    try {
      const hofSnap = await getDocs(
        query(collection(db, 'hallOfFame'), where('isPublic', '==', true))
      );
      hallOfFameCloudCount = hofSnap.size;
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'hallOfFame');
    }

    return {
      server,
      cloud: {
        registeredUsers,
        totalCloudMatches,
        totalCloudTripletes,
        hallOfFameCloudCount,
      },
    };
  }

  private async writeCloudChampion(
    record: Omit<ChampionRecord, 'id' | 'wonAt'>
  ): Promise<void> {
    const user = auth.currentUser;
    if (!user) return;

    const path = 'hallOfFame';
    const payload = {
      recordedByUid: user.uid,
      winnerName: cleanText(record.winnerName, 'Campeón', 20),
      clubName: cleanText(record.clubName, 'Club 412', 24),
      color: cleanHex(record.color, '#4B6B94'),
      secondaryColor: cleanHex(record.secondaryColor, '#E9D69B'),
      points: Math.max(60, Math.min(1000, Math.round(record.points))),
      moneyLeft: Math.max(0, Math.min(10000, Math.round(record.moneyLeft))),
      squadCount: Math.max(0, Math.min(30, Math.round(record.squadCount))),
      mode: record.mode === 'online' ? 'online' : 'local',
      playersCount: Math.max(2, Math.min(5, Math.round(record.playersCount))),
      isPublic: true,
      wonAt: serverTimestamp(),
    };

    try {
      await addDoc(collection(db, path), payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  }

  async recordLocalChampion(
    record: Omit<ChampionRecord, 'id' | 'wonAt'>
  ): Promise<void> {
    try {
      await fetch('/api/hall-of-fame', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record),
      });
    } catch {
      // Non-blocking
    }
    await this.writeCloudChampion(record);
  }

  async recordOnlineChampionForSignedInUser(
    record: Omit<ChampionRecord, 'id' | 'wonAt'>
  ): Promise<void> {
    await this.writeCloudChampion(record);
  }
}

export const profileRepository: ProfileRepository = new FirebaseProfileRepository();
