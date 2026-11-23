import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { ChallengeAttemptState } from '../types/game';
import { CheckCircle2, Clock, Sparkles, Target, XCircle } from 'lucide-react';

interface ChallengeEngineProps {
  challenge: ChallengeAttemptState;
  participantName: string;
  isMyTurn: boolean;
  onSubmitAnswer: (optionIndex: number) => void;
  onPenaltyShot: (aim: 'LEFT' | 'CENTER' | 'RIGHT', power: number) => void;
  onCrossbarKick: (level: number) => void;
  onContinueLocal?: () => void;
}

function useDeadlineCountdown(expiresAtMs: number, paused: boolean) {
  const [secLeft, setSecLeft] = useState(() =>
    Math.max(0, (expiresAtMs - Date.now()) / 1000)
  );

  useEffect(() => {
    setSecLeft(Math.max(0, (expiresAtMs - Date.now()) / 1000));
    if (paused) return;
    const interval = window.setInterval(() => {
      setSecLeft(Math.max(0, (expiresAtMs - Date.now()) / 1000));
    }, 100);
    return () => window.clearInterval(interval);
  }, [expiresAtMs, paused]);

  return secLeft;
}

/* -------------------------------------------------------------------------- */
/* 1. TIMED TRIVIA CHALLENGE (Anti-Google 12s countdown)                      */
/* -------------------------------------------------------------------------- */
export const TriviaChallenge: React.FC<ChallengeEngineProps> = ({
  challenge,
  participantName,
  isMyTurn,
  onSubmitAnswer,
  onContinueLocal,
}) => {
  const { card, resolved, expiresAtMs } = challenge;
  const totalSec = card.timeLimitSec ?? 12;
  const timeLeft = useDeadlineCountdown(expiresAtMs, Boolean(resolved));
  const [localPick, setLocalPick] = useState<number | null>(null);

  useEffect(() => {
    setLocalPick(null);
  }, [card.id, expiresAtMs]);

  const isResolved = Boolean(resolved);
  const chosenIdx = resolved?.chosenIndex ?? localPick;
  const progressPct = Math.min(100, Math.max(0, (timeLeft / totalSec) * 100));

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-[#525252]">
            <Clock className="w-3.5 h-3.5" />
            {isMyTurn ? 'Reloj anti-Google' : `Responde ${participantName}`}
          </span>
          <span
            className={`font-mono tabular-nums ${
              timeLeft <= 4 && !isResolved ? 'text-[#9F4D59]' : 'text-[#111111]'
            }`}
          >
            {isResolved ? 'Resuelto' : `${timeLeft.toFixed(1)}s`}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[#E5E3DC] border border-[#111111] overflow-hidden">
          <div
            className={`h-full transition-[width] duration-100 ${
              timeLeft <= 4 ? 'bg-[#9F4D59]' : 'bg-[#4F7D63]'
            }`}
            style={{ width: `${isResolved ? 0 : progressPct}%` }}
          />
        </div>
      </div>

      <p className="font-semibold text-base text-[#111111] leading-snug">
        {card.question}
      </p>

      <div className="grid grid-cols-1 gap-2">
        {(card.options ?? []).map((opt, idx) => {
          const isCorrectOption = isResolved && idx === resolved?.correctIndex;
          const isChosen = idx === chosenIdx;
          const canClick = isMyTurn && !isResolved && localPick === null;

          let btnStyle =
            'bg-white hover:bg-[#EDE0B8]/40 text-[#111111] border-[#111111]';
          if (!canClick && !isResolved) {
            btnStyle = 'bg-white/80 text-[#404040] border-[#111111]/60';
          }
          if (isResolved) {
            if (isCorrectOption) {
              btnStyle = 'bg-[#CDE7DD] text-[#111111] border-[#111111]';
            } else if (isChosen) {
              btnStyle = 'bg-[#F4D6DC] text-[#111111] border-[#111111]';
            } else {
              btnStyle = 'bg-white/60 text-[#737373] border-[#111111]/40';
            }
          }

          return (
            <motion.button
              key={opt}
              type="button"
              disabled={!canClick}
              whileTap={canClick ? { scale: 0.98 } : undefined}
              onClick={() => {
                setLocalPick(idx);
                onSubmitAnswer(idx);
              }}
              className={`w-full text-left px-4 py-2.5 rounded-xl border-2 text-sm font-semibold flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
            >
              <span>{opt}</span>
              {isResolved && isCorrectOption && (
                <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
              )}
              {isResolved && isChosen && !isCorrectOption && (
                <XCircle className="w-4 h-4 text-[#9F4D59] shrink-0" />
              )}
            </motion.button>
          );
        })}
      </div>

      {!isMyTurn && !isResolved && (
        <p className="text-center text-xs font-bold text-[#525252]">
          Esperando respuesta de {participantName}...
        </p>
      )}

      {isResolved && resolved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="pt-2 space-y-3"
        >
          <div
            className={`rounded-xl border-2 border-[#111111] p-3 text-xs ${
              resolved.isSuccess ? 'bg-[#CDE7DD]' : 'bg-[#F4D6DC]'
            }`}
          >
            <p className="font-bold text-[#111111] uppercase">
              {resolved.isSuccess
                ? `¡Correcto! +$${card.reward}M`
                : `Falló · -$${card.penalty}M${
                    card.sendToJailOnFail ? ' y va a la cárcel' : ''
                  }`}
            </p>
            {resolved.explanation && (
              <p className="text-[#262626] mt-1">{resolved.explanation}</p>
            )}
          </div>

          {onContinueLocal ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onContinueLocal}
              className="w-full py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
            >
              {resolved.isSuccess ? `Cobrar +$${card.reward}M` : 'Continuar'}
            </motion.button>
          ) : (
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[#525252]">
              Avanzando al siguiente turno...
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 2. CAREER PATH CHALLENGE (Progressive club clues + 16s timer)              */
/* -------------------------------------------------------------------------- */
export const CareerChallenge: React.FC<ChallengeEngineProps> = ({
  challenge,
  participantName,
  isMyTurn,
  onSubmitAnswer,
  onContinueLocal,
}) => {
  const { card, resolved, expiresAtMs } = challenge;
  const clubs = card.careerClubs ?? [];
  const totalSec = card.timeLimitSec ?? 16;
  const timeLeft = useDeadlineCountdown(expiresAtMs, Boolean(resolved));
  const [revealedCount, setRevealedCount] = useState(1);
  const [localPick, setLocalPick] = useState<number | null>(null);

  useEffect(() => {
    setRevealedCount(1);
    setLocalPick(null);
  }, [card.id, expiresAtMs]);

  const isResolved = Boolean(resolved);
  const chosenIdx = resolved?.chosenIndex ?? localPick;

  useEffect(() => {
    if (isResolved || revealedCount >= clubs.length) return;
    const revealTimer = window.setTimeout(() => {
      setRevealedCount((c) => Math.min(clubs.length, c + 1));
    }, 2600);
    return () => window.clearTimeout(revealTimer);
  }, [isResolved, revealedCount, clubs.length]);

  const progressPct = Math.min(100, Math.max(0, (timeLeft / totalSec) * 100));

  return (
    <div className="space-y-4 text-left">
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-bold">
          <span className="inline-flex items-center gap-1 text-[#525252]">
            <Clock className="w-3.5 h-3.5" />
            Pistas {revealedCount}/{clubs.length}
          </span>
          <span className="font-mono tabular-nums text-[#111111]">
            {isResolved ? 'Resuelto' : `${timeLeft.toFixed(1)}s`}
          </span>
        </div>
        <div className="w-full h-2.5 rounded-full bg-[#E5E3DC] border border-[#111111] overflow-hidden">
          <div
            className={`h-full transition-[width] duration-100 ${
              timeLeft <= 4 ? 'bg-[#9F4D59]' : 'bg-[#4E7299]'
            }`}
            style={{ width: `${isResolved ? 0 : progressPct}%` }}
          />
        </div>
      </div>

      <div className="rounded-2xl bg-white border-2 border-[#111111] p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-[#525252]">
            Trayectoria del futbolista
          </span>
          {!isResolved && isMyTurn && revealedCount < clubs.length && (
            <button
              type="button"
              onClick={() =>
                setRevealedCount((c) => Math.min(clubs.length, c + 1))
              }
              className="text-[11px] font-bold text-[#4E7299] hover:underline cursor-pointer"
            >
              + Revelar club
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {clubs.map((entry, idx) => {
            const visible = isResolved || idx < revealedCount;
            return (
              <div
                key={entry.club}
                className={`rounded-xl px-3 py-2 border text-xs transition-all ${
                  visible
                    ? 'bg-[#F2F1EC] border-[#111111] text-[#111111]'
                    : 'bg-[#FAF9F5] border-dashed border-[#A3A3A3] text-[#A3A3A3]'
                }`}
              >
                <p className="font-bold truncate">
                  {visible ? entry.club : 'Club oculto'}
                </p>
                <p className="font-mono text-[10px]">
                  {visible ? entry.years : '••••'}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {(card.options ?? []).map((opt, idx) => {
          const isCorrectOption = isResolved && idx === resolved?.correctIndex;
          const isChosen = idx === chosenIdx;
          const canClick = isMyTurn && !isResolved && localPick === null;

          let btnStyle =
            'bg-white hover:bg-[#EDE0B8]/40 text-[#111111] border-[#111111]';
          if (!canClick && !isResolved) {
            btnStyle = 'bg-white/80 text-[#404040] border-[#111111]/60';
          }
          if (isResolved) {
            if (isCorrectOption) {
              btnStyle = 'bg-[#CDE7DD] text-[#111111] border-[#111111]';
            } else if (isChosen) {
              btnStyle = 'bg-[#F4D6DC] text-[#111111] border-[#111111]';
            } else {
              btnStyle = 'bg-white/60 text-[#737373] border-[#111111]/40';
            }
          }

          return (
            <motion.button
              key={opt}
              type="button"
              disabled={!canClick}
              whileTap={canClick ? { scale: 0.97 } : undefined}
              onClick={() => {
                setLocalPick(idx);
                onSubmitAnswer(idx);
              }}
              className={`px-3 py-2.5 rounded-xl border-2 text-xs sm:text-sm font-bold text-center transition-colors cursor-pointer disabled:cursor-default ${btnStyle}`}
            >
              {opt}
            </motion.button>
          );
        })}
      </div>

      {!isMyTurn && !isResolved && (
        <p className="text-center text-xs font-bold text-[#525252]">
          {participantName} está analizando la trayectoria...
        </p>
      )}

      {isResolved && resolved && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div
            className={`rounded-xl border-2 border-[#111111] p-3 text-xs ${
              resolved.isSuccess ? 'bg-[#CDE7DD]' : 'bg-[#F4D6DC]'
            }`}
          >
            <p className="font-bold text-[#111111] uppercase">
              {resolved.isSuccess
                ? `¡Adivinó! +$${card.reward}M`
                : `Falló · -$${card.penalty}M`}
            </p>
            {resolved.explanation && (
              <p className="text-[#262626] mt-1">{resolved.explanation}</p>
            )}
          </div>

          {onContinueLocal ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.97 }}
              onClick={onContinueLocal}
              className="w-full py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
            >
              {resolved.isSuccess ? `Cobrar +$${card.reward}M` : 'Continuar'}
            </motion.button>
          ) : (
            <p className="text-center text-[11px] font-bold uppercase tracking-wider text-[#525252]">
              Avanzando al siguiente turno...
            </p>
          )}
        </motion.div>
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 3. PENALTY SHOOTOUT MINI-GAME (2 shots, score at least 1)                  */
/* -------------------------------------------------------------------------- */
type GoalZone = 'LEFT' | 'CENTER' | 'RIGHT';

export const PenaltyChallenge: React.FC<ChallengeEngineProps> = ({
  challenge,
  participantName,
  isMyTurn,
  onPenaltyShot,
  onContinueLocal,
}) => {
  const { card, resolved } = challenge;
  const shotsTaken = challenge.shotsTaken ?? 0;
  const goals = challenge.goals ?? 0;
  const lastShot = challenge.lastShot;

  const [power, setPower] = useState(50);
  const rafRef = useRef<number | null>(null);
  const finished = Boolean(resolved) || goals >= 1 || shotsTaken >= 2;
  const isSuccess = Boolean(resolved?.isSuccess ?? goals >= 1);

  useEffect(() => {
    if (finished || !isMyTurn) return;
    let start: number | null = null;
    const loop = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000;
      const val = 50 + 50 * Math.sin(elapsed * 4.4);
      setPower(Math.round(val));
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [finished, isMyTurn, shotsTaken]);

  const keeperX =
    lastShot?.keeper === 'LEFT'
      ? 72
      : lastShot?.keeper === 'RIGHT'
        ? 228
        : 150;
  const ballX =
    lastShot?.aim === 'LEFT'
      ? 62
      : lastShot?.aim === 'RIGHT'
        ? 238
        : 150;
  const ballY = lastShot?.outcome === 'MISS' ? 18 : 66;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-[#404040]">
        <span>
          Disparos: <strong className="font-mono text-[#111111]">{shotsTaken}/2</strong>
        </span>
        <span>
          Goles: <strong className="font-mono text-[#2D6A4F]">{goals}/1</strong>
        </span>
      </div>

      <div className="rounded-2xl bg-[#D6E6DA] border-2 border-[#111111] p-3">
        <svg viewBox="0 0 300 135" className="w-full h-32" aria-label="Arco de penales">
          <rect x="0" y="106" width="300" height="29" fill="#C4DBC9" />
          <rect
            x="30"
            y="24"
            width="240"
            height="82"
            fill="#FAF9F5"
            fillOpacity="0.65"
            stroke="#111111"
            strokeWidth="4"
          />
          <path
            d="M70 24V106M110 24V106M150 24V106M190 24V106M230 24V106M30 52H270M30 80H270"
            stroke="#111111"
            strokeOpacity="0.14"
            strokeWidth="1.2"
          />

          <g
            style={{
              transform: `translateX(${lastShot ? keeperX - 150 : 0}px)`,
              transition: 'transform 220ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <circle cx="150" cy="60" r="9" fill="#EDE0B8" stroke="#111111" strokeWidth="2" />
            <rect x="139" y="70" width="22" height="28" rx="4" fill="#4E7299" stroke="#111111" strokeWidth="2" />
            <path d="M139 76L124 68M161 76L176 68" stroke="#111111" strokeWidth="3" strokeLinecap="round" />
          </g>

          <circle
            cx={lastShot ? ballX : 150}
            cy={lastShot ? ballY : 120}
            r="8.5"
            fill="#FFFFFF"
            stroke="#111111"
            strokeWidth="2.2"
            style={{ transition: 'all 220ms cubic-bezier(0.16, 1, 0.3, 1)' }}
          />
        </svg>
      </div>

      {isMyTurn && !finished && (
        <>
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#525252]">
              <span>Frená en la zona verde para patear</span>
              <span className="font-mono text-[#111111] tabular-nums">{power}%</span>
            </div>
            <div className="relative w-full h-4 rounded-full border-2 border-[#111111] bg-[#E5E3DC] overflow-hidden">
              <div
                className="absolute inset-y-0 bg-[#CDE7DD]"
                style={{ left: '22%', width: '61%' }}
              />
              <div
                className="absolute inset-y-0 right-0 bg-[#F4D6DC]"
                style={{ width: '17%' }}
              />
              <div
                className="absolute inset-y-0 w-2 bg-[#111111]"
                style={{ left: `calc(${power}% - 4px)` }}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {(
              [
                { id: 'LEFT', label: 'Izquierda' },
                { id: 'CENTER', label: 'Centro' },
                { id: 'RIGHT', label: 'Derecha' },
              ] as const
            ).map((btn) => (
              <motion.button
                key={btn.id}
                type="button"
                whileTap={{ scale: 0.95 }}
                onClick={() => onPenaltyShot(btn.id as GoalZone, power)}
                className="py-2.5 px-2 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-base font-bold uppercase tracking-wide cursor-pointer"
              >
                {btn.label}
              </motion.button>
            ))}
          </div>
        </>
      )}

      {!isMyTurn && !finished && (
        <p className="text-xs font-bold text-[#525252]">
          {participantName} está apuntando su penal en vivo...
        </p>
      )}

      {lastShot && (
        <p
          className={`text-xs font-bold px-3 py-2 rounded-xl border-2 border-[#111111] ${
            lastShot.outcome === 'GOAL' ? 'bg-[#CDE7DD]' : 'bg-[#F4D6DC]'
          }`}
        >
          {lastShot.message}
        </p>
      )}

      {finished && (
        onContinueLocal ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.97 }}
            onClick={onContinueLocal}
            className="w-full py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
          >
            {isSuccess ? `¡Gol! Cobrar +$${card.reward}M` : `Sin goles · -$${card.penalty}M`}
          </motion.button>
        ) : (
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#525252]">
            {isSuccess ? `¡Gol! +$${card.reward}M · Siguiente turno...` : `Sin goles · -$${card.penalty}M`}
          </p>
        )
      )}
    </div>
  );
};

/* -------------------------------------------------------------------------- */
/* 4. CROSSBAR CHALLENGE (Hit 64%-80% sweet spot in 3 attempts)               */
/* -------------------------------------------------------------------------- */
export const CrossbarChallenge: React.FC<ChallengeEngineProps> = ({
  challenge,
  participantName,
  isMyTurn,
  onCrossbarKick,
  onContinueLocal,
}) => {
  const { card, resolved } = challenge;
  const attempts = challenge.attempts ?? 0;
  const hitCrossbar = Boolean(challenge.hitCrossbar);
  const lastShot = challenge.lastShot;

  const [level, setLevel] = useState(50);
  const rafRef = useRef<number | null>(null);
  const finished = Boolean(resolved) || hitCrossbar || attempts >= 3;

  useEffect(() => {
    if (finished || !isMyTurn) return;
    let start: number | null = null;
    const loop = (ts: number) => {
      if (start === null) start = ts;
      const elapsed = (ts - start) / 1000;
      const val = 50 + 50 * Math.sin(elapsed * 4.8);
      setLevel(Math.round(val));
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [finished, isMyTurn, attempts]);

  const shotHeight = lastShot?.level ?? null;
  const ballSvgY = shotHeight !== null ? 116 - (shotHeight / 100) * 102 : 116;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs font-bold text-[#404040]">
        <span>
          Intentos: <strong className="font-mono text-[#111111]">{attempts}/3</strong>
        </span>
        <span className="inline-flex items-center gap-1 text-[#9E823D]">
          <Target className="w-3.5 h-3.5" />
          Zona Travesaño: 64%–80%
        </span>
      </div>

      <div className="grid grid-cols-12 gap-3 items-stretch">
        <div className="col-span-9 rounded-2xl bg-[#D6E6DA] border-2 border-[#111111] p-3 flex items-center justify-center">
          <svg viewBox="0 0 240 130" className="w-full h-32" aria-label="Desafío del travesaño">
            <rect x="0" y="112" width="240" height="18" fill="#C4DBC9" />
            <rect x="36" y="42" width="168" height="70" fill="#FAF9F5" fillOpacity="0.6" stroke="#111111" strokeWidth="3" />
            <line
              x1="34"
              y1="42"
              x2="206"
              y2="42"
              stroke={hitCrossbar ? '#2D6A4F' : '#9E823D'}
              strokeWidth="7"
              strokeLinecap="round"
            />
            <text
              x="120"
              y="31"
              textAnchor="middle"
              fontSize="10"
              fontWeight="800"
              fill="#111111"
              fontFamily="Barlow Condensed, sans-serif"
            >
              TRAVESAÑO
            </text>

            <circle
              cx="120"
              cy={ballSvgY}
              r="8.5"
              fill="#FFFFFF"
              stroke="#111111"
              strokeWidth="2.2"
              style={{ transition: 'cy 200ms cubic-bezier(0.16, 1, 0.3, 1)' }}
            />
          </svg>
        </div>

        <div className="col-span-3 flex flex-col items-center justify-between">
          <div className="relative w-8 h-36 rounded-full border-2 border-[#111111] bg-[#E5E3DC] overflow-hidden">
            <div
              className="absolute inset-x-0 bg-[#EDE0B8] border-y border-[#111111]/40"
              style={{ bottom: '64%', height: '16%' }}
            />
            <div
              className="absolute inset-x-0 h-2 bg-[#111111]"
              style={{ bottom: `calc(${isMyTurn ? level : shotHeight ?? 50}% - 4px)` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-[#111111] tabular-nums mt-1">
            {isMyTurn ? level : shotHeight ?? 50}%
          </span>
        </div>
      </div>

      {lastShot && (
        <p
          className={`text-xs font-bold px-3 py-2 rounded-xl border-2 border-[#111111] ${
            hitCrossbar ? 'bg-[#CDE7DD]' : 'bg-[#F4D6DC]'
          }`}
        >
          {lastShot.message}
        </p>
      )}

      {!finished ? (
        isMyTurn ? (
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={() => onCrossbarKick(level)}
            className="w-full inline-flex items-center justify-center gap-2 py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide cursor-pointer"
          >
            <Sparkles className="w-4 h-4" />
            Patear al travesaño
          </motion.button>
        ) : (
          <p className="text-xs font-bold text-[#525252]">
            {participantName} está midiendo el remate al travesaño...
          </p>
        )
      ) : onContinueLocal ? (
        <motion.button
          type="button"
          whileTap={{ scale: 0.97 }}
          onClick={onContinueLocal}
          className="w-full py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide cursor-pointer"
        >
          {hitCrossbar ? `Cobrar +$${card.reward}M` : `Sin suerte · -$${card.penalty}M`}
        </motion.button>
      ) : (
        <p className="text-[11px] font-bold uppercase tracking-wider text-[#525252]">
          {hitCrossbar ? `¡Travesaño! +$${card.reward}M · Siguiente turno...` : `Sin suerte · -$${card.penalty}M`}
        </p>
      )}
    </div>
  );
};
