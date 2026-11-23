import React from 'react';
import { motion } from 'motion/react';
import { TrophyEvent } from '../types/game';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { Sparkles } from 'lucide-react';

interface TrophyCelebrationOverlayProps {
  event: TrophyEvent;
  onDismiss: () => void;
}

const CONFETTI_SPECS = [
  { x: -115, y: -90, color: '#EDE0B8', delay: 0.05 },
  { x: -75, y: -120, color: '#CDE7DD', delay: 0.1 },
  { x: -30, y: -135, color: '#4E7299', delay: 0.08 },
  { x: 32, y: -130, color: '#EDE0B8', delay: 0.12 },
  { x: 78, y: -115, color: '#F4D6DC', delay: 0.07 },
  { x: 118, y: -85, color: '#4F7D63', delay: 0.14 },
  { x: -95, y: -55, color: '#9E823D', delay: 0.16 },
  { x: 96, y: -50, color: '#C7DCEB', delay: 0.15 },
];

export const TrophyCelebrationOverlay: React.FC<TrophyCelebrationOverlayProps> = ({
  event,
  onDismiss,
}) => {
  const tierTheme =
    event.tier === 'ucl'
      ? {
          bg: 'bg-[#EDE0B8]',
          kicker: '¡CAMPEÓN DE CHAMPIONS LEAGUE!',
          subtitle: 'Gloria máxima europea · 60 PTS + Vuelta completada',
        }
      : event.tier === 'liga'
        ? {
            bg: 'bg-[#C7DCEB]',
            kicker: '¡CAMPEÓN DE LIGA NACIONAL!',
            subtitle: 'Segundo título rumbo al Triplete · 40 PTS + Vuelta',
          }
        : {
            bg: 'bg-[#CDE7DD]',
            kicker: '¡LEVANTA LA COPA DE LA LIGA!',
            subtitle: 'Primer título oficial · 20 PTS + Vuelta',
          };

  return (
    <motion.div
      role="status"
      aria-live="polite"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onDismiss}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/40 backdrop-blur-[2px] p-4 cursor-pointer"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.84, y: 36 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: -18 }}
        transition={{ type: 'spring', bounce: 0.28, duration: 0.5 }}
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        className="relative w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] p-7 text-center overflow-visible"
      >
        {/* Bursting Paper Confetti Particles */}
        {CONFETTI_SPECS.map((dot, idx) => (
          <motion.span
            key={idx}
            initial={{ opacity: 0, x: 0, y: 0, scale: 0.4, rotate: 0 }}
            animate={{
              opacity: [0, 1, 1, 0],
              x: dot.x,
              y: dot.y,
              scale: [0.5, 1.15, 0.9],
              rotate: idx % 2 === 0 ? 140 : -140,
            }}
            transition={{
              duration: 1.55,
              delay: dot.delay,
              ease: 'easeOut',
            }}
            className="pointer-events-none absolute left-1/2 top-1/3 w-3.5 h-3.5 rounded-sm border border-[#111111]"
            style={{ backgroundColor: dot.color }}
          />
        ))}

        {/* Lifting Trophy Pedestal */}
        <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: [0.85, 1.12, 1], opacity: 1 }}
            transition={{ duration: 0.65, ease: 'easeOut' }}
            className={`absolute inset-0 rounded-full border-2 border-[#111111] ${tierTheme.bg}`}
          />
          <motion.div
            initial={{ y: 42, scale: 0.65, rotate: -10 }}
            animate={{
              y: [42, -10, 0],
              scale: [0.65, 1.16, 1.05],
              rotate: [-10, 4, 0],
            }}
            transition={{ type: 'spring', bounce: 0.38, duration: 0.85 }}
            className="relative z-10"
          >
            <TrophyBadgeIcon
              tier={event.tier}
              unlocked
              className="w-16 h-16 drop-shadow-[2px_2px_0_#111111]"
            />
          </motion.div>
        </div>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-sm bg-[#111111] text-[#F7F6F2] font-display italic text-sm font-bold tracking-widest uppercase">
          <Sparkles className="w-3.5 h-3.5 text-[#EDE0B8]" />
          {tierTheme.kicker}
        </div>

        <h2 className="font-display text-4xl font-extrabold text-[#111111] uppercase display-tight mt-3">
          {event.clubName}
        </h2>

        <div className="mt-3 inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white border-2 border-[#111111]">
          <JerseyIcon
            primary={event.color}
            secondary={event.secondaryColor}
            className="w-5 h-5"
          />
          <span className="text-xs font-bold text-[#111111]">
            DT {event.participantName} ·{' '}
            <span className="font-mono text-[#2D6A4F] tabular-nums">
              {event.points} PTS
            </span>
          </span>
        </div>

        <p className="text-xs font-semibold text-[#525252] mt-3">
          {tierTheme.subtitle}
        </p>

        <p className="text-[11px] font-medium text-[#737373] mt-4">
          Tocá para continuar
        </p>
      </motion.div>
    </motion.div>
  );
};
