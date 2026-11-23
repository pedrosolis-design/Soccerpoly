import React from 'react';
import { motion } from 'motion/react';
import { ChampionRecord } from '../types/game';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { AlertTriangle, Database, LogIn, Trophy, X } from 'lucide-react';

interface HallOfFameModalProps {
  champions: ChampionRecord[];
  loading: boolean;
  cloudWarning?: string | null;
  isSignedIn?: boolean;
  onOpenAuthModal?: () => void;
  onClose: () => void;
}

export const HallOfFameModal: React.FC<HallOfFameModalProps> = ({
  champions,
  loading,
  cloudWarning = null,
  isSignedIn = false,
  onOpenAuthModal,
  onClose,
}) => {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Salón de la Fama del Triplete"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/45 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0.14, duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        <div className="px-6 py-4 bg-[#EFECE4] border-b-2 border-[#111111] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#EDE0B8] flex items-center justify-center">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#111111] uppercase leading-none">
                Salón de la Fama · Tripletes
              </h2>
              <p className="text-xs font-medium text-[#525252] mt-1">
                Campeones reales registrados en la sesión del servidor
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar salón de la fama"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto">
          {loading ? (
            <p className="text-center text-xs font-bold text-[#525252] py-8">
              Cargando campeones...
            </p>
          ) : champions.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#111111]/30 bg-white/70 p-8 text-center space-y-2">
              <TrophyBadgeIcon tier="ucl" unlocked={false} className="w-10 h-10 mx-auto" />
              <p className="font-display text-xl font-bold text-[#111111] uppercase">
                Todavía no hay campeones en esta sesión
              </p>
              <p className="text-xs text-[#525252]">
                Completá el Triplete (Copa de la Liga, Liga Nacional y Champions) en una sala online para inaugurar la tabla.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {champions.map((champ, idx) => (
                <div
                  key={champ.id}
                  className="rounded-2xl bg-white border-2 border-[#111111] shadow-[2.5px_2.5px_0_#111111] px-4 py-3 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="font-mono text-sm font-extrabold text-[#9E823D] w-6 shrink-0">
                      #{idx + 1}
                    </span>
                    <JerseyIcon
                      primary={champ.color}
                      secondary={champ.secondaryColor}
                      className="w-9 h-9 shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="font-display text-xl font-extrabold text-[#111111] uppercase leading-none truncate">
                        {champ.winnerName} · {champ.clubName}
                      </p>
                      <p className="text-[11px] font-medium text-[#525252] mt-1">
                        {champ.mode === 'online' ? 'Sala Online' : 'Torneo Registrado'} ·{' '}
                        {champ.playersCount} clubes · {champ.squadCount} fichajes
                      </p>
                    </div>
                  </div>
                  <div className="text-right font-mono shrink-0">
                    <span className="block text-sm font-extrabold text-[#111111] tabular-nums">
                      {champ.points} PTS
                    </span>
                    <span className="block text-[11px] font-bold text-[#2D6A4F] tabular-nums">
                      ${champ.moneyLeft}M
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cloudWarning ? (
            <div className="rounded-2xl bg-[#EDE0B8]/80 border-2 border-[#111111] px-4 py-3 flex items-start gap-2.5 text-xs text-[#111111]">
              <AlertTriangle className="w-4 h-4 text-[#9E5A1E] shrink-0 mt-0.5" />
              <p>{cloudWarning}</p>
            </div>
          ) : (
            <div className="rounded-2xl bg-[#CDE7DD]/55 border-2 border-[#111111] px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#111111]">
              <div className="flex items-start gap-2.5">
                <Database className="w-4 h-4 text-[#2D6A4F] shrink-0 mt-0.5" />
                <p>
                  <strong>Firebase Firestore conectado:</strong> los Tripletes de jugadores con sesión iniciada quedan guardados de forma permanente en la nube.
                </p>
              </div>
              {!isSignedIn && onOpenAuthModal && (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] text-xs font-bold whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogIn className="w-3.5 h-3.5 text-[#EDE0B8]" />
                  Crear / Entrar
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
