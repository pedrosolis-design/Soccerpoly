import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { DuelState, Participant } from '../types/game';
import { JerseyIcon } from './FootballArt';
import { CheckCircle2, Clock, Swords, XCircle } from 'lucide-react';

interface DuelModalProps {
  duel: DuelState;
  participants: Participant[];
  meId: string;
  onSubmitAnswer: (optionIndex: number) => void;
}

export const DuelModal: React.FC<DuelModalProps> = ({
  duel,
  participants,
  meId,
  onSubmitAnswer,
}) => {
  const [secLeft, setSecLeft] = useState(() =>
    Math.max(0, (duel.endsAtMs - Date.now()) / 1000)
  );
  const [myPick, setMyPick] = useState<number | null>(null);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecLeft(Math.max(0, (duel.endsAtMs - Date.now()) / 1000));
    }, 100);
    return () => window.clearInterval(interval);
  }, [duel.endsAtMs]);

  const challenger = participants.find((p) => p.id === duel.challengerId);
  const defender = participants.find((p) => p.id === duel.defenderId);
  const isParticipant = meId === duel.challengerId || meId === duel.defenderId;
  const alreadyAnswered = duel.answeredIds.includes(meId);
  const resolved = duel.resolved;

  const progressPct = Math.min(100, Math.max(0, (secLeft / 12) * 100));

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/45 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0.14, duration: 0.36 }}
        className="w-full max-w-lg rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        <div className="bg-[#4E7299] px-6 py-3.5 border-b-2 border-[#111111] flex items-center justify-between text-white">
          <span className="inline-flex items-center gap-2 font-display text-base font-bold tracking-widest uppercase">
            <Swords className="w-4 h-4" />
            Duelo 1v1 en Casillero · ${duel.stake}M
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums">
            <Clock className="w-3.5 h-3.5" />
            {resolved ? 'Resuelto' : `${secLeft.toFixed(1)}s`}
          </span>
        </div>

        {/* Countdown Bar */}
        <div className="w-full h-2 bg-[#E5E3DC] border-b border-[#111111]">
          <div
            className="h-full bg-[#111111] transition-[width] duration-100"
            style={{ width: `${resolved ? 0 : progressPct}%` }}
          />
        </div>

        <div className="p-6 space-y-5">
          {/* VS Header */}
          <div className="grid grid-cols-11 items-center gap-2 bg-white border-2 border-[#111111] rounded-2xl p-3">
            <div className="col-span-5 flex items-center gap-2 min-w-0">
              {challenger && (
                <>
                  <JerseyIcon
                    primary={challenger.color}
                    secondary={challenger.secondaryColor}
                    className="w-9 h-9 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold text-[#111111] uppercase leading-none truncate">
                      {challenger.name}
                    </p>
                    <p className="text-[11px] text-[#525252] truncate">
                      {challenger.clubName}
                    </p>
                  </div>
                </>
              )}
            </div>
            <div className="col-span-1 text-center font-display text-xl font-extrabold text-[#9F4D59]">
              VS
            </div>
            <div className="col-span-5 flex items-center justify-end gap-2 min-w-0 text-right">
              {defender && (
                <>
                  <div className="min-w-0">
                    <p className="font-display text-lg font-extrabold text-[#111111] uppercase leading-none truncate">
                      {defender.name}
                    </p>
                    <p className="text-[11px] text-[#525252] truncate">
                      {defender.clubName}
                    </p>
                  </div>
                  <JerseyIcon
                    primary={defender.color}
                    secondary={defender.secondaryColor}
                    className="w-9 h-9 shrink-0"
                  />
                </>
              )}
            </div>
          </div>

          {/* Question */}
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-[#525252] mb-1">
              {isParticipant
                ? 'El primero en responder bien gana $40M del rival'
                : 'Modo espectador · Duelo en curso'}
            </p>
            <h3 className="font-semibold text-base text-[#111111] leading-snug">
              {duel.question}
            </h3>
          </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {duel.options.map((opt, idx) => {
              const isCorrect = resolved && idx === resolved.correctIndex;
              const isWrongPick = resolved && myPick === idx && idx !== resolved.correctIndex;
              const canClick = isParticipant && !alreadyAnswered && !resolved;

              let btnClass =
                'bg-white hover:bg-[#EDE0B8]/40 text-[#111111] border-[#111111]';
              if (resolved) {
                if (isCorrect) {
                  btnClass = 'bg-[#CDE7DD] text-[#111111] border-[#111111]';
                } else if (isWrongPick) {
                  btnClass = 'bg-[#F4D6DC] text-[#111111] border-[#111111]';
                } else {
                  btnClass = 'bg-white/60 text-[#737373] border-[#111111]/40';
                }
              }

              return (
                <motion.button
                  key={opt}
                  type="button"
                  disabled={!canClick}
                  whileTap={canClick ? { scale: 0.97 } : undefined}
                  onClick={() => {
                    setMyPick(idx);
                    onSubmitAnswer(idx);
                  }}
                  className={`px-4 py-3 rounded-xl border-2 text-sm font-bold flex items-center justify-between gap-2 transition-colors cursor-pointer disabled:cursor-default ${btnClass}`}
                >
                  <span className="truncate">{opt}</span>
                  {resolved && isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-[#2D6A4F] shrink-0" />
                  )}
                  {resolved && isWrongPick && (
                    <XCircle className="w-4 h-4 text-[#9F4D59] shrink-0" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {resolved && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-2xl border-2 border-[#111111] p-3.5 text-xs ${
                resolved.winnerId ? 'bg-[#CDE7DD]' : 'bg-[#EDE0B8]'
              }`}
            >
              <p className="font-bold text-[#111111] uppercase">
                {resolved.reason}
              </p>
              {resolved.explanation && (
                <p className="text-[#262626] mt-1">{resolved.explanation}</p>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
