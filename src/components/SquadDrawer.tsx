import React from 'react';
import { motion } from 'motion/react';
import { Participant } from '../types/game';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { X } from 'lucide-react';

interface SquadDrawerProps {
  participant: Participant;
  canSell: boolean;
  onSellPlayer: (squadIndex: number) => void;
  onClose: () => void;
}

export const SquadDrawer: React.FC<SquadDrawerProps> = ({
  participant,
  canSell,
  onSellPlayer,
  onClose,
}) => {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Plantel de ${participant.clubName}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex justify-end bg-[#111111]/40 backdrop-blur-xs"
      onClick={onClose}
    >
      <motion.aside
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', bounce: 0, duration: 0.34 }}
        className="w-full max-w-md paper-glass border-l-2 border-[#111111] h-full flex flex-col shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-5 bg-[#EFECE4] border-b-2 border-[#111111] flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-white border-2 border-[#111111] flex items-center justify-center shrink-0">
              <JerseyIcon
                primary={participant.color}
                secondary={participant.secondaryColor}
                className="w-9 h-9"
              />
            </div>
            <div className="min-w-0">
              <h2 className="font-display text-2xl font-extrabold text-[#111111] tracking-wide uppercase truncate">
                {participant.clubName}
              </h2>
              <p className="text-xs font-medium text-[#525252] truncate">
                DT: {participant.name} · ${participant.money}M · {participant.points} PTS · Vuelta{' '}
                {participant.laps + 1}
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar plantel"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        {/* Triplete Progress */}
        <div className="px-6 py-4 border-b-2 border-[#111111]/15 space-y-2.5">
          <p className="text-xs font-bold uppercase tracking-wider text-[#525252]">
            Objetivo Triplete
          </p>
          <div className="grid grid-cols-3 gap-2">
            {[
              {
                key: 'copa',
                title: 'Copa Liga',
                req: '20 PTS + Vuelta',
                done: participant.trophies.copaDeLaLiga,
              },
              {
                key: 'liga',
                title: 'Liga Nac.',
                req: '40 PTS + Vuelta',
                done: participant.trophies.ligaNacional,
              },
              {
                key: 'ucl',
                title: 'Champions',
                req: '60 PTS + Vuelta',
                done: participant.trophies.championsLeague,
              },
            ].map((item) => (
              <div
                key={item.key}
                className={`rounded-xl p-2.5 border-2 text-center ${
                  item.done
                    ? 'bg-[#EDE0B8] border-[#111111]'
                    : 'bg-white/75 border-[#111111]/25 opacity-75'
                }`}
              >
                <div className="flex justify-center mb-1">
                  <TrophyBadgeIcon
                    tier={item.key as 'copa' | 'liga' | 'ucl'}
                    unlocked={item.done}
                    className="w-5 h-5"
                  />
                </div>
                <p className="font-display text-sm font-bold text-[#111111] uppercase leading-tight">
                  {item.title}
                </p>
                <p className="text-[10px] font-medium text-[#525252] mt-0.5">{item.req}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Signed Squad List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#525252]">
              Plantel fichado ({participant.squad.length})
            </h3>
            <span className="font-mono text-xs font-bold text-[#2D6A4F] tabular-nums">
              Total: {participant.points} PTS
            </span>
          </div>

          {participant.squad.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#111111]/25 bg-white/60 p-8 text-center text-sm text-[#525252]">
              {participant.clubName} todavía no fichó futbolistas. Caé en una liga para sumar refuerzos.
            </div>
          ) : (
            <div className="space-y-2.5">
              {participant.squad.map((player, index) => {
                const sellValue = Math.round(player.cost * 0.5);
                return (
                  <motion.div
                    key={`${player.id}-${index}`}
                    initial={{ opacity: 0, x: 16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.03 }}
                    className="flex items-center justify-between gap-3 rounded-2xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111] px-3.5 py-2.5"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <JerseyIcon
                        primary={player.kitPrimary}
                        secondary={player.kitSecondary}
                        number={player.number}
                        className="w-9 h-9 shrink-0"
                      />
                      <div className="min-w-0">
                        <p className="font-display text-lg font-bold text-[#111111] leading-none truncate">
                          {player.name}
                        </p>
                        <p className="text-xs text-[#525252] mt-1 truncate">
                          {player.club} · {player.leagueLabel} · {player.tier}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0 flex items-center gap-2.5">
                      <div>
                        <span className="font-mono text-sm font-bold text-[#2D6A4F] tabular-nums block">
                          +{player.points} PTS
                        </span>
                        <span className="font-mono text-[11px] text-[#525252] tabular-nums">
                          ${player.cost}M
                        </span>
                      </div>
                      {canSell && (
                        <motion.button
                          type="button"
                          whileTap={{ scale: 0.94 }}
                          onClick={() => onSellPlayer(index)}
                          className="px-2.5 py-1 rounded-full bg-[#F4D6DC] hover:bg-[#ebc3cb] border border-[#111111] text-[11px] font-bold text-[#111111] cursor-pointer whitespace-nowrap"
                          title={`Vender al mercado (-${player.points} PTS)`}
                        >
                          +${sellValue}M
                        </motion.button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
};
