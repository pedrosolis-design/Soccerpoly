import React from 'react';
import { motion } from 'motion/react';
import { TABLE_REACTIONS } from '../data/gameData';
import { Participant } from '../types/game';
import { TrophyBadgeIcon } from './FootballArt';
import { LogOut, Settings2, Volume2, VolumeX } from 'lucide-react';

interface TripleteFooterProps {
  activePlayer: Participant;
  isOnline?: boolean;
  isMuted: boolean;
  onToggleMute: () => void;
  onSendReaction?: (reactionKey: string) => void;
  onBackToLobby: () => void;
}

export const TripleteFooter: React.FC<TripleteFooterProps> = ({
  activePlayer,
  isOnline = false,
  isMuted,
  onToggleMute,
  onSendReaction,
  onBackToLobby,
}) => {
  const nextGoal =
    activePlayer.points < 20
      ? `Copa de la Liga (${activePlayer.points}/20 PTS)`
      : activePlayer.points < 40
        ? `Liga Nacional (${activePlayer.points}/40 PTS)`
        : `Champions League (${activePlayer.points}/60 PTS)`;

  return (
    <footer className="w-full rounded-2xl bg-[#F8F7F3] border-2 border-[#111111] shadow-[3px_3px_0_#111111] px-4 py-2.5 flex flex-col lg:flex-row items-center justify-between gap-3">
      {/* Left: Triplete Objective Strip */}
      <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 text-xs text-[#262626]">
        <span className="font-display text-sm font-extrabold tracking-wider uppercase text-[#111111] whitespace-nowrap shrink-0">
          Objetivo: Ganar el Triplete
        </span>

        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <TrophyBadgeIcon tier="copa" unlocked className="w-3.5 h-3.5" />
            <span className="font-bold text-[#111111]">Copa Liga</span>
            <span className="font-mono text-[#525252]">20 PTS</span>
          </span>
          <span className="text-[#A3A3A3]" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <TrophyBadgeIcon tier="liga" unlocked className="w-3.5 h-3.5" />
            <span className="font-bold text-[#111111]">Liga Nac.</span>
            <span className="font-mono text-[#525252]">40 PTS</span>
          </span>
          <span className="text-[#A3A3A3]" aria-hidden="true">
            ·
          </span>
          <span className="inline-flex items-center gap-1 whitespace-nowrap">
            <TrophyBadgeIcon tier="ucl" unlocked className="w-3.5 h-3.5" />
            <span className="font-bold text-[#111111]">Champions</span>
            <span className="font-mono text-[#525252]">60 PTS</span>
          </span>
        </div>

        <span className="hidden xl:inline text-[#D4D4D4]" aria-hidden="true">
          |
        </span>

        <span className="text-[#2D6A4F] font-semibold whitespace-nowrap">
          {activePlayer.clubName} · Vuelta {activePlayer.laps + 1} · Va por{' '}
          <strong className="font-mono tabular-nums text-[#111111]">{nextGoal}</strong>
        </span>
        <span className="hidden 2xl:inline text-[11px] font-mono font-bold text-[#737373] whitespace-nowrap">
          · by RayMonday
        </span>
      </div>

      {/* Right: Online Reactions + Match Exit */}
      <div className="flex items-center gap-2 shrink-0">
        {isOnline && onSendReaction && (
          <div className="flex items-center gap-1 bg-white border-2 border-[#111111] rounded-full px-2 py-0.5">
            {TABLE_REACTIONS.map((rx) => (
              <motion.button
                key={rx.key}
                type="button"
                whileTap={{ scale: 0.85 }}
                onClick={() => onSendReaction(rx.key)}
                title={rx.label}
                aria-label={`Reacción ${rx.label}`}
                className="w-7 h-7 rounded-full hover:bg-[#EDE0B8]/60 flex items-center justify-center text-sm cursor-pointer transition-colors"
              >
                {rx.emoji}
              </motion.button>
            ))}
          </div>
        )}

        <motion.button
          type="button"
          whileTap={{ scale: 0.94 }}
          onClick={onToggleMute}
          aria-label={isMuted ? 'Activar sonidos' : 'Silenciar sonidos'}
          title={isMuted ? 'Activar sonidos' : 'Silenciar sonidos'}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 border-[#111111] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
            isMuted
              ? 'bg-[#F4D6DC] text-[#9F4D59]'
              : 'bg-white hover:bg-[#EDE0B8]/50 text-[#111111]'
          }`}
        >
          {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          <span className="hidden sm:inline">{isMuted ? 'Silenciado' : 'Sonido'}</span>
        </motion.button>

        <motion.button
          type="button"
          whileTap={{ scale: 0.96 }}
          onClick={onBackToLobby}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#EDE0B8]/50 border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          {isOnline ? <LogOut className="w-3.5 h-3.5" /> : <Settings2 className="w-3.5 h-3.5" />}
          {isOnline ? 'Salir de sala' : 'Cambiar clubes / Reiniciar'}
        </motion.button>
      </div>
    </footer>
  );
};
