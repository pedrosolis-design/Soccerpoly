import React from 'react';
import { motion } from 'motion/react';
import { Footballer, Participant } from '../types/game';
import { JerseyIcon } from './FootballArt';
import { Check, Percent, X } from 'lucide-react';

interface SigningModalProps {
  participant: Participant;
  leagueTitle: string;
  options: Footballer[];
  isMyTurn: boolean;
  isOnline?: boolean;
  onSign: (player: Footballer, finalCost: number) => void;
  onPass: () => void;
}

export const SigningModal: React.FC<SigningModalProps> = ({
  participant,
  leagueTitle,
  options,
  isMyTurn,
  isOnline = false,
  onSign,
  onPass,
}) => {
  const discountActive = participant.hasDiscount;

  const getTierStyles = (tier: Footballer['tier']) => {
    switch (tier) {
      case 'ORO':
        return {
          surface: 'card-oro',
          badgeBg: 'bg-[#111111] text-[#EFE2B3]',
        };
      case 'PLATA':
        return {
          surface: 'card-plata',
          badgeBg: 'bg-[#111111] text-[#E5E7EB]',
        };
      case 'BRONCE':
        return {
          surface: 'card-bronce',
          badgeBg: 'bg-[#111111] text-[#F5E5D8]',
        };
      case 'LEYENDA':
        return {
          surface: 'card-leyenda',
          badgeBg: 'bg-[#111111] text-[#F3E3AD]',
        };
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="signing-modal-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/45 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        transition={{ type: 'spring', bounce: 0.12, duration: 0.36 }}
        className="relative w-full max-w-4xl rounded-3xl bg-[#F7F6F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        {/* Top Editorial Kicker Bar */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 bg-[#EFECE4] border-b-2 border-[#111111]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-white border-2 border-[#111111] flex items-center justify-center shrink-0">
              <JerseyIcon
                primary={participant.color}
                secondary={participant.secondaryColor}
                className="w-8 h-8"
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-widest text-[#46735B]">
                Fichajes · {leagueTitle} · Turno de {participant.name}
              </p>
              <h2
                id="signing-modal-title"
                className="font-display text-3xl sm:text-4xl font-extrabold text-[#111111] uppercase display-tight mt-0.5 truncate"
              >
                ¿A quién ficha {participant.clubName}?
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-[#525252]">
                Presupuesto
              </p>
              <p className="font-mono text-lg font-bold tabular-nums text-[#111111]">
                ${participant.money}M
              </p>
            </div>
            {isMyTurn && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.92 }}
                onClick={onPass}
                className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
                aria-label="Cerrar mercado"
              >
                <X className="w-4 h-4" />
              </motion.button>
            )}
          </div>
        </div>

        {/* Optional Active Discount Notice */}
        {discountActive && (
          <div className="px-6 py-2.5 bg-[#EDE0B8] border-b-2 border-[#111111] flex items-center gap-2 text-sm text-[#111111] font-semibold">
            <Percent className="w-4 h-4 shrink-0" />
            <span>
              Descuento activo del 50% en este fichaje. Los precios ya reflejan la rebaja.
            </span>
          </div>
        )}

        {/* 3 Footballer Cards Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-5">
          {options.map((player, index) => {
            const finalCost = discountActive
              ? Math.round(player.cost * 0.5)
              : player.cost;
            const canAfford = participant.money >= finalCost;
            const canClick = isMyTurn && canAfford;
            const styles = getTierStyles(player.tier);

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{
                  type: 'spring',
                  bounce: 0.2,
                  duration: 0.4,
                  delay: index * 0.06,
                }}
                whileHover={canClick ? { y: -4 } : undefined}
                className={`relative rounded-2xl p-4 ${styles.surface} ink-card flex flex-col justify-between ${
                  canAfford ? '' : 'opacity-60'
                }`}
              >
                <div className="flex flex-col items-center text-center h-full justify-between">
                  {/* Top Tier & Position Line */}
                  <div className="w-full flex items-center justify-between text-xs font-bold">
                    <span
                      className={`px-2.5 py-0.5 rounded-full font-display tracking-wider uppercase ${styles.badgeBg}`}
                    >
                      {player.tier}
                    </span>
                    <span className="text-[#111111] font-mono tabular-nums">
                      {player.position} · #{player.number}
                    </span>
                  </div>

                  {/* Custom SVG Jersey Kit */}
                  <div className="my-4 relative flex flex-col items-center">
                    <div className="w-26 h-26 rounded-full bg-white/75 border-2 border-[#111111] flex items-center justify-center">
                      <JerseyIcon
                        primary={player.kitPrimary}
                        secondary={player.kitSecondary}
                        number={player.number}
                        className="w-18 h-18"
                      />
                    </div>
                  </div>

                  {/* Player Name & Club */}
                  <div className="w-full">
                    <h3 className="font-display text-2xl font-extrabold uppercase tracking-wide text-[#111111] leading-tight truncate">
                      {player.name}
                    </h3>
                    <p className="text-xs font-semibold text-[#404040] mt-0.5 truncate">
                      {player.club} · {player.nationality}
                    </p>

                    {/* Cost & Points Row */}
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <span className="font-mono text-sm font-bold tabular-nums px-3 py-1 rounded-full bg-[#111111] text-[#F7F6F2]">
                        ${finalCost}M
                        {discountActive && (
                          <span className="line-through text-[#A3A3A3] text-xs ml-1.5">
                            ${player.cost}M
                          </span>
                        )}
                      </span>
                      <span className="font-mono text-sm font-bold tabular-nums px-3 py-1 rounded-full bg-white text-[#111111] border-2 border-[#111111]">
                        +{player.points} PTS
                      </span>
                    </div>

                    {/* Sign CTA */}
                    <motion.button
                      type="button"
                      disabled={!canClick}
                      whileTap={canClick ? { scale: 0.96 } : undefined}
                      onClick={() => onSign(player, finalCost)}
                      className="mt-4 w-full inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-full bg-[#111111] hover:bg-[#262626] disabled:bg-[#D4D4D4] disabled:text-[#737373] text-[#F7F6F2] font-display text-lg font-bold tracking-wide uppercase transition-colors cursor-pointer disabled:cursor-not-allowed"
                    >
                      {!isMyTurn ? (
                        `Turno de ${participant.name}`
                      ) : canAfford ? (
                        <>
                          <Check className="w-4 h-4" />
                          Fichar jugador
                        </>
                      ) : (
                        'Sin presupuesto'
                      )}
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Footer Pass Button */}
        <div className="px-6 py-3.5 bg-[#EFECE4] border-t-2 border-[#111111] flex items-center justify-between gap-4">
          <p className="text-xs font-medium text-[#404040]">
            {isOnline
              ? `Si ${participant.name} pasa, la figura principal sale a subasta relámpago.`
              : `El fichaje se suma directo al plantel de ${participant.clubName}.`}
          </p>
          {isMyTurn ? (
            <motion.button
              type="button"
              whileTap={{ scale: 0.96 }}
              onClick={onPass}
              className="px-4 py-2 rounded-full bg-white hover:bg-[#FAF9F5] border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              {isOnline ? 'Pasar (Subasta)' : 'Pasar sin fichar'}
            </motion.button>
          ) : (
            <span className="px-4 py-2 rounded-full bg-white/80 border-2 border-[#111111]/40 text-xs font-bold text-[#525252] whitespace-nowrap shrink-0">
              Esperando decisión...
            </span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
