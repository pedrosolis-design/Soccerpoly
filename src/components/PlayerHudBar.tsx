import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Participant, PlayerReaction } from '../types/game';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { Bot, Lock, Percent, Users, WifiOff } from 'lucide-react';

interface PlayerHudBarProps {
  participants: Participant[];
  activePlayerIndex: number;
  myParticipantId?: string | null;
  turnDeadlineMs?: number | null;
  reactions?: PlayerReaction[];
  onInspectSquad: (participant: Participant) => void;
}

export const PlayerHudBar: React.FC<PlayerHudBarProps> = ({
  participants,
  activePlayerIndex,
  myParticipantId,
  turnDeadlineMs,
  reactions = [],
  onInspectSquad,
}) => {
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    if (!turnDeadlineMs) return;
    setNowMs(Date.now());
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
    }, 200);
    return () => window.clearInterval(interval);
  }, [turnDeadlineMs]);

  const turnPct = turnDeadlineMs
    ? Math.min(100, Math.max(0, ((turnDeadlineMs - nowMs) / 30000) * 100))
    : 0;

  const gridColsClass =
    participants.length === 2
      ? 'grid-cols-1 sm:grid-cols-2'
      : participants.length === 3
        ? 'grid-cols-1 sm:grid-cols-3'
        : participants.length === 4
          ? 'grid-cols-2 lg:grid-cols-4'
          : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <section
      aria-label="Marcador de clubes"
      className={`grid ${gridColsClass} gap-2.5 w-full`}
    >
      {participants.map((player, idx) => {
        const isActive = idx === activePlayerIndex;
        const isMe = Boolean(myParticipantId && player.id === myParticipantId);
        const latestReaction = [...reactions]
          .reverse()
          .find((r) => r.participantId === player.id);

        const trophyCount =
          (player.trophies.copaDeLaLiga ? 1 : 0) +
          (player.trophies.ligaNacional ? 1 : 0) +
          (player.trophies.championsLeague ? 1 : 0);

        return (
          <motion.button
            key={player.id}
            type="button"
            whileTap={{ scale: 0.98 }}
            onClick={() => onInspectSquad(player)}
            className={`group relative text-left rounded-2xl px-3.5 py-2.5 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111111] cursor-pointer overflow-visible ${
              isActive
                ? 'bg-[#FFFFFF] border-2 border-[#111111] shadow-[4px_4px_0_#111111]'
                : isMe
                  ? 'bg-[#FAF9F5] border-2 border-[#111111] hover:bg-white'
                  : 'bg-[#F8F7F3] border-2 border-[#111111]/75 hover:border-[#111111] hover:bg-white'
            }`}
          >
            {/* Spring-gliding active turn accent strip */}
            {isActive && (
              <motion.div
                layoutId="active-turn-ring"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.36 }}
                className="absolute inset-x-3 -top-[3px] h-[5px] rounded-full bg-[#111111] pointer-events-none"
              />
            )}

            {/* Ephemeral Floating Table Reaction */}
            <AnimatePresence>
              {latestReaction && (
                <motion.div
                  key={latestReaction.id}
                  initial={{ opacity: 0, y: 6, scale: 0.85 }}
                  animate={{ opacity: 1, y: -12, scale: 1 }}
                  exit={{ opacity: 0, y: -20, scale: 0.9 }}
                  transition={{ type: 'spring', bounce: 0.25, duration: 0.28 }}
                  className="pointer-events-none absolute -top-3 right-3 z-30 inline-flex items-center gap-1 rounded-full bg-[#111111] text-[#F7F6F2] border-2 border-white px-2.5 py-0.5 text-[11px] font-bold shadow-md whitespace-nowrap"
                >
                  <span>{latestReaction.emoji}</span>
                  <span>{latestReaction.label}</span>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Top row: Jersey Avatar + Name + Trophies */}
            <div className="relative z-10 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border-2 border-[#111111]"
                  style={{ backgroundColor: '#F2F1EC' }}
                >
                  <JerseyIcon
                    primary={player.color}
                    secondary={player.secondaryColor}
                    className="w-7 h-7"
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-display text-lg font-extrabold tracking-wide text-[#111111] leading-none truncate uppercase">
                      {player.name}
                    </span>
                    {isMe && (
                      <span className="text-[10px] font-bold uppercase text-[#4E7299] whitespace-nowrap shrink-0">
                        (Vos)
                      </span>
                    )}
                    {isActive && (
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#2D6A4F] whitespace-nowrap shrink-0">
                        · TURNO
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-[#525252] truncate mt-0.5 flex items-center gap-1">
                    <span className="truncate">{player.clubName}</span>
                    <span>· V{player.laps + 1}</span>
                    {player.isBot && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 rounded bg-[#E5E3DC] text-[#111111] font-mono text-[9px] font-bold shrink-0"
                        title="Controlado por Bot"
                      >
                        <Bot className="w-2.5 h-2.5" />
                        BOT
                      </span>
                    )}
                    {!player.connected && player.isHumanOwner && (
                      <span
                        className="inline-flex items-center gap-0.5 px-1 rounded bg-[#F4D6DC] text-[#9F4D59] font-mono text-[9px] font-bold shrink-0"
                        title="Jugador desconectado"
                      >
                        <WifiOff className="w-2.5 h-2.5" />
                        OFF
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Triplete Trophies */}
              <div
                className="flex items-center gap-0.5 shrink-0"
                title={`Títulos: ${trophyCount}/3`}
              >
                <TrophyBadgeIcon
                  tier="copa"
                  unlocked={player.trophies.copaDeLaLiga}
                  className="w-4 h-4"
                />
                <TrophyBadgeIcon
                  tier="liga"
                  unlocked={player.trophies.ligaNacional}
                  className="w-4 h-4"
                />
                <TrophyBadgeIcon
                  tier="ucl"
                  unlocked={player.trophies.championsLeague}
                  className="w-4 h-4"
                />
              </div>
            </div>

            {/* Bottom row: Budget + Points */}
            <div className="relative z-10 mt-2 flex items-center justify-between gap-1.5">
              <div className="flex items-center gap-1.5">
                <span className="font-mono text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-[#111111] text-[#F7F6F2]">
                  ${player.money}M
                </span>
                <span className="font-mono text-xs font-bold tabular-nums px-2.5 py-0.5 rounded-full bg-[#EDE0B8] text-[#111111] border border-[#111111]/40">
                  {player.points} PTS
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-[#404040] shrink-0">
                {player.jailTurns > 0 && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[#9F4D59] font-bold"
                    title="En la cárcel"
                  >
                    <Lock className="w-3 h-3" />
                    {player.jailTurns}T
                  </span>
                )}
                {player.hasDiscount && (
                  <span
                    className="inline-flex items-center gap-0.5 text-[#2D6A4F] font-bold"
                    title="Descuento -50% activo"
                  >
                    <Percent className="w-3 h-3" />
                    50
                  </span>
                )}
                <span
                  className="inline-flex items-center gap-0.5 text-[#525252] group-hover:text-[#111111] transition-colors tabular-nums font-medium"
                  title="Ver plantel del club"
                >
                  <Users className="w-3 h-3" />
                  {player.squad.length}
                </span>
              </div>
            </div>

            {/* Turn Countdown Bar on Active Player */}
            {isActive && turnDeadlineMs && (
              <div className="mt-2 h-1 w-full rounded-full bg-[#E5E3DC] overflow-hidden">
                <div
                  className={`h-full transition-[width] duration-200 ${
                    turnPct <= 25 ? 'bg-[#9F4D59]' : 'bg-[#4F7D63]'
                  }`}
                  style={{ width: `${turnPct}%` }}
                />
              </div>
            )}
          </motion.button>
        );
      })}
    </section>
  );
};
