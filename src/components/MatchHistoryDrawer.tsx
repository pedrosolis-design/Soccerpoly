import React from 'react';
import { motion } from 'motion/react';
import { FeedEntry } from '../types/game';
import { History, X } from 'lucide-react';

interface MatchHistoryDrawerProps {
  feed: FeedEntry[];
  onClose: () => void;
}

export const MatchHistoryDrawer: React.FC<MatchHistoryDrawerProps> = ({
  feed,
  onClose,
}) => {
  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Historial completo del partido"
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
        <div className="px-6 py-5 bg-[#EFECE4] border-b-2 border-[#111111] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#F7F6F2] flex items-center justify-center shrink-0">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#111111] uppercase leading-none">
                Historial del Partido
              </h2>
              <p className="text-xs font-medium text-[#525252] mt-1">
                Últimas {feed.length} jugadas registradas en mesa
              </p>
            </div>
          </div>

          <motion.button
            type="button"
            whileTap={{ scale: 0.9 }}
            onClick={onClose}
            className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar historial"
          >
            <X className="w-4 h-4" />
          </motion.button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5">
          {feed.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-[#111111]/25 bg-white/60 p-8 text-center text-sm text-[#525252]">
              Todavía no hay jugadas registradas. ¡Tirá el dado para arrancar!
            </div>
          ) : (
            feed.map((entry, idx) => (
              <div
                key={entry.id}
                className="rounded-2xl bg-white border-2 border-[#111111] shadow-[2px_2px_0_#111111] px-3.5 py-2.5 flex items-start justify-between gap-3"
              >
                <div className="flex items-start gap-2.5 min-w-0">
                  <span
                    className="w-3 h-3 rounded-full border border-[#111111] mt-1 shrink-0"
                    style={{ backgroundColor: entry.actorColor }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs text-[#111111] leading-snug">
                      <strong className="font-bold">{entry.actorName}</strong>{' '}
                      {entry.text}
                    </p>
                    <p className="text-[10px] font-mono text-[#737373] mt-0.5">
                      Jugada #{feed.length - idx}
                    </p>
                  </div>
                </div>

                {entry.delta && (
                  <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#EFECE4] border border-[#111111]/40 text-[#111111] whitespace-nowrap shrink-0">
                    {entry.delta}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </motion.aside>
    </motion.div>
  );
};
