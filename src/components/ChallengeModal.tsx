import React from 'react';
import { motion } from 'motion/react';
import { ActiveModal, Participant } from '../types/game';
import { AlertTriangle, Lock, Sparkles } from 'lucide-react';
import {
  CareerChallenge,
  CrossbarChallenge,
  PenaltyChallenge,
  TriviaChallenge,
} from './DigitalChallenges';

interface ChallengeModalProps {
  modal: Extract<ActiveModal, { type: 'CHALLENGE' } | { type: 'LUCK' } | { type: 'JAIL' }>;
  participant: Participant;
  isMyTurn: boolean;
  onSubmitChallengeAnswer: (optionIndex: number) => void;
  onPenaltyShot: (aim: 'LEFT' | 'CENTER' | 'RIGHT', power: number) => void;
  onCrossbarKick: (level: number) => void;
  onContinueLocalChallenge?: () => void;
  onResolveLuck: () => void;
  onResolveJail: (action: 'BAIL' | 'CHALLENGE' | 'WAIT') => void;
}

export const ChallengeModal: React.FC<ChallengeModalProps> = ({
  modal,
  participant,
  isMyTurn,
  onSubmitChallengeAnswer,
  onPenaltyShot,
  onCrossbarKick,
  onContinueLocalChallenge,
  onResolveLuck,
  onResolveJail,
}) => {
  if (modal.type === 'CHALLENGE') {
    const { challenge } = modal;
    const { card } = challenge;
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
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', bounce: 0.14, duration: 0.36 }}
          className="w-full max-w-md rounded-3xl bg-[#FAF8F2] text-[#111111] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
        >
          <div className="bg-[#9F4D59] px-6 py-3.5 border-b-2 border-[#111111] flex items-center justify-between gap-2">
            <span className="font-display text-sm font-bold tracking-widest uppercase text-[#FAF9F5] truncate">
              Desafío · {card.category}
            </span>
            <span className="font-display text-sm font-bold text-white uppercase shrink-0">
              {participant.name}
            </span>
          </div>

          <div className="p-6 text-center space-y-4">
            <div>
              <h2 className="font-display text-3xl font-extrabold text-[#111111] uppercase display-tight">
                {card.title}
              </h2>
              <p className="mt-1.5 text-xs font-medium text-[#525252]">
                {card.description}
              </p>
            </div>

            {/* Premio / Castigo Compact Bar */}
            <div className="grid grid-cols-2 divide-x-2 divide-[#111111]/15 rounded-xl bg-[#EFECE4] border border-[#111111]/25 py-2">
              <div className="px-2">
                <span className="text-[10px] font-bold uppercase text-[#525252] block">
                  Premio
                </span>
                <span className="font-display text-xl font-extrabold text-[#2D6A4F] tabular-nums">
                  +${card.reward}M
                </span>
              </div>
              <div className="px-2">
                <span className="text-[10px] font-bold uppercase text-[#525252] block">
                  Castigo
                </span>
                <span className="font-display text-xl font-extrabold text-[#9F4D59] tabular-nums">
                  -${card.penalty}M{card.sendToJailOnFail ? ' + Cárcel' : ''}
                </span>
              </div>
            </div>

            {/* Digital Challenge Engine */}
            {card.mode === 'TRIVIA' && (
              <TriviaChallenge
                challenge={challenge}
                participantName={participant.name}
                isMyTurn={isMyTurn}
                onSubmitAnswer={onSubmitChallengeAnswer}
                onPenaltyShot={onPenaltyShot}
                onCrossbarKick={onCrossbarKick}
                onContinueLocal={onContinueLocalChallenge}
              />
            )}
            {card.mode === 'CAREER' && (
              <CareerChallenge
                challenge={challenge}
                participantName={participant.name}
                isMyTurn={isMyTurn}
                onSubmitAnswer={onSubmitChallengeAnswer}
                onPenaltyShot={onPenaltyShot}
                onCrossbarKick={onCrossbarKick}
                onContinueLocal={onContinueLocalChallenge}
              />
            )}
            {card.mode === 'PENALTY' && (
              <PenaltyChallenge
                challenge={challenge}
                participantName={participant.name}
                isMyTurn={isMyTurn}
                onSubmitAnswer={onSubmitChallengeAnswer}
                onPenaltyShot={onPenaltyShot}
                onCrossbarKick={onCrossbarKick}
                onContinueLocal={onContinueLocalChallenge}
              />
            )}
            {card.mode === 'CROSSBAR' && (
              <CrossbarChallenge
                challenge={challenge}
                participantName={participant.name}
                isMyTurn={isMyTurn}
                onSubmitAnswer={onSubmitChallengeAnswer}
                onPenaltyShot={onPenaltyShot}
                onCrossbarKick={onCrossbarKick}
                onContinueLocal={onContinueLocalChallenge}
              />
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  if (modal.type === 'LUCK') {
    const { card } = modal;
    const isGood = card.type === 'luck';
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
          initial={{ opacity: 0, scale: 0.92, y: 18 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ type: 'spring', bounce: 0.14, duration: 0.36 }}
          className="w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden text-center"
        >
          <div
            className={`px-6 py-3.5 border-b-2 border-[#111111] flex items-center justify-center gap-2 ${
              isGood ? 'bg-[#4F7D63]' : 'bg-[#44505E]'
            }`}
          >
            {isGood ? (
              <Sparkles className="w-4 h-4 text-[#FAF9F5]" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-[#EDE0B8]" />
            )}
            <span className="font-display text-base font-bold tracking-widest uppercase text-white">
              {isGood ? 'Carta de Suerte' : 'Carta de Mala Suerte'} · {participant.name}
            </span>
          </div>

          <div className="p-7">
            <h2 className="font-display text-3xl font-extrabold text-[#111111] uppercase display-tight">
              {card.title}
            </h2>
            <p className="mt-3 text-sm text-[#404040] leading-relaxed">
              {card.description}
            </p>

            <div className="mt-5 flex items-center justify-center gap-3 font-mono text-sm font-bold tabular-nums">
              {card.moneyDelta !== 0 && (
                <span
                  className={`px-3.5 py-1 rounded-full border-2 border-[#111111] ${
                    card.moneyDelta > 0
                      ? 'bg-[#CDE7DD] text-[#111111]'
                      : 'bg-[#F4D6DC] text-[#111111]'
                  }`}
                >
                  {card.moneyDelta > 0 ? `+$${card.moneyDelta}M` : `-$${Math.abs(card.moneyDelta)}M`}
                </span>
              )}
              {card.moveSteps !== 0 && (
                <span className="px-3.5 py-1 rounded-full bg-white text-[#111111] border-2 border-[#111111]">
                  {card.moveSteps > 0 ? `+${card.moveSteps} casilleros` : `${card.moveSteps} casilleros`}
                </span>
              )}
              {card.grantDiscount && (
                <span className="px-3.5 py-1 rounded-full bg-[#EDE0B8] text-[#111111] border-2 border-[#111111]">
                  -50% Próximo Fichaje
                </span>
              )}
            </div>

            {isMyTurn ? (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onResolveLuck}
                className="mt-6 w-full py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold tracking-wide uppercase transition-colors cursor-pointer"
              >
                Aplicar efecto
              </motion.button>
            ) : (
              <p className="mt-6 text-xs font-bold uppercase tracking-wider text-[#525252]">
                Esperando que {participant.name} aplique la carta...
              </p>
            )}
          </div>
        </motion.div>
      </motion.div>
    );
  }

  // JAIL MODAL
  const canPayBail = participant.money >= modal.bailCost;
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
        initial={{ opacity: 0, scale: 0.92, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 12 }}
        transition={{ type: 'spring', bounce: 0.14, duration: 0.36 }}
        className="w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        <div className="bg-[#27272A] px-6 py-4 border-b-2 border-[#111111] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-[#EDE0B8]" />
            <span className="font-display text-xl font-extrabold tracking-wider uppercase text-white">
              Cárcel · {participant.name}
            </span>
          </div>
          <span className="font-mono text-xs font-bold text-[#EDE0B8] tabular-nums">
            {participant.jailTurns} turnos
          </span>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-sm text-[#404040] leading-relaxed">{modal.reason}</p>

          {isMyTurn ? (
            <div className="space-y-2.5 pt-2">
              <motion.button
                type="button"
                disabled={!canPayBail}
                whileTap={canPayBail ? { scale: 0.97 } : undefined}
                onClick={() => onResolveJail('BAIL')}
                className="w-full py-3 px-4 rounded-full bg-[#111111] hover:bg-[#262626] disabled:bg-[#D4D4D4] disabled:text-[#737373] text-[#F7F6F2] font-display text-lg font-extrabold tracking-wide uppercase transition-colors cursor-pointer disabled:cursor-not-allowed"
              >
                Pagar fianza (${modal.bailCost}M) y jugar ya
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onResolveJail('CHALLENGE')}
                className="w-full py-3 px-4 rounded-full bg-[#CDE7DD] hover:bg-[#BBDCD0] text-[#111111] border-2 border-[#111111] font-display text-lg font-bold tracking-wide uppercase transition-colors cursor-pointer"
              >
                Superar desafío digital de escape
              </motion.button>

              <motion.button
                type="button"
                whileTap={{ scale: 0.97 }}
                onClick={() => onResolveJail('WAIT')}
                className="w-full py-2.5 px-4 rounded-full bg-white hover:bg-[#F2F1EC] text-[#404040] border-2 border-[#111111] text-sm font-bold transition-colors cursor-pointer"
              >
                Cumplir 1 turno en la cárcel
              </motion.button>
            </div>
          ) : (
            <p className="pt-2 text-center text-xs font-bold uppercase tracking-wider text-[#525252]">
              Esperando decisión de {participant.name} en la cárcel...
            </p>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
