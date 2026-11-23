import React from 'react';
import { motion } from 'motion/react';
import { Participant } from '../types/game';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { RotateCcw, Settings2, Users } from 'lucide-react';

interface VictoryModalProps {
  winner: Participant;
  canRematch?: boolean;
  isOnline?: boolean;
  onRestartSameClubs: () => void;
  onReturnToWaitingRoom?: () => void;
  onBackToLobby: () => void;
}

export const VictoryModal: React.FC<VictoryModalProps> = ({
  winner,
  canRematch = true,
  isOnline = false,
  onRestartSameClubs,
  onReturnToWaitingRoom,
  onBackToLobby,
}) => {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/55 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        transition={{ type: 'spring', bounce: 0.2, duration: 0.42 }}
        className="w-full max-w-lg rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] p-8 text-center"
      >
        <div className="flex items-center justify-center gap-3 mb-4">
          <TrophyBadgeIcon tier="copa" unlocked className="w-9 h-9" />
          <TrophyBadgeIcon tier="ucl" unlocked className="w-12 h-12" />
          <TrophyBadgeIcon tier="liga" unlocked className="w-9 h-9" />
        </div>

        <span className="inline-block px-3 py-1 rounded-sm bg-[#111111] text-[#F7F6F2] font-display italic text-sm font-bold tracking-widest uppercase">
          ¡Triplete Completado!
        </span>
        <h2 className="font-display text-5xl font-extrabold text-[#111111] uppercase display-tight mt-3">
          {winner.name} Campeón
        </h2>
        <p className="text-sm font-medium text-[#404040] mt-2">
          {winner.clubName} conquistó Copa de la Liga, Liga Nacional y Champions League.
        </p>

        <div className="mt-6 flex items-center justify-center gap-5 bg-[#EDE0B8]/55 border-2 border-[#111111] rounded-2xl py-4 px-5">
          <JerseyIcon
            primary={winner.color}
            secondary={winner.secondaryColor}
            className="w-14 h-14"
          />
          <div className="text-left">
            <p className="font-mono text-2xl font-bold text-[#111111] tabular-nums">
              {winner.points} PTS
            </p>
            <p className="font-mono text-sm font-semibold text-[#2D6A4F] tabular-nums">
              ${winner.money}M restantes · {winner.squad.length} fichajes
            </p>
          </div>
        </div>

        {!canRematch && isOnline && (
          <p className="mt-5 text-xs font-bold uppercase tracking-wider text-[#525252]">
            Esperando que el anfitrión decida si hay revancha...
          </p>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          {canRematch && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onRestartSameClubs}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap"
            >
              <RotateCcw className="w-4 h-4" />
              Revancha ($500M)
            </motion.button>
          )}
          {isOnline && canRematch && onReturnToWaitingRoom && (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onReturnToWaitingRoom}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-[#EDE0B8] hover:bg-[#e5d4a3] border-2 border-[#111111] text-sm font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Users className="w-4 h-4" />
              Volver al vestuario
            </motion.button>
          )}
          <motion.button
            type="button"
            whileTap={{ scale: 0.96 }}
            onClick={onBackToLobby}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-full bg-white hover:bg-[#F2F1EC] border-2 border-[#111111] text-sm font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Settings2 className="w-4 h-4" />
            {isOnline ? 'Salir al Hub' : 'Cambiar clubes'}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
};
