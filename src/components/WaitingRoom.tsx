import React, { useState } from 'react';
import { motion } from 'motion/react';
import { RoomState } from '../types/game';
import { JerseyIcon } from './FootballArt';
import { Bot, Check, Copy, LogOut, Play } from 'lucide-react';

interface WaitingRoomProps {
  room: RoomState;
  myParticipantId: string;
  errorMsg: string | null;
  onToggleReady: () => void;
  onToggleFillBots: () => void;
  onStartMatch: () => void;
  onLeave: () => void;
}

export const WaitingRoom: React.FC<WaitingRoomProps> = ({
  room,
  myParticipantId,
  errorMsg,
  onToggleReady,
  onToggleFillBots,
  onStartMatch,
  onLeave,
}) => {
  const [copied, setCopied] = useState(false);
  const me = room.participants.find((p) => p.id === myParticipantId);
  const isHost = Boolean(me?.isHost);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      // Ignore clipboard failures
    }
  };

  const slots = Array.from({ length: 5 }, (_, idx) => room.participants[idx] ?? null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="w-full max-w-[1160px] mx-auto my-auto px-3 py-4 sm:px-6 sm:py-6"
    >
      <div className="rounded-[28px] border-2 border-[#111111] bg-[#F7F6F2] shadow-[6px_6px_0_#111111] overflow-hidden">
        {/* Top Room Code & Status Header */}
        <div className="px-6 sm:px-8 py-5 bg-[#EFECE4] border-b-2 border-[#111111] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#46735B]">
              {room.visibility === 'public' ? 'Sala Pública' : 'Sala Privada'} · Vestuario en Vivo
            </p>
            <div className="flex items-center gap-3 mt-1">
              <h1 className="font-display text-3xl sm:text-4xl font-extrabold text-[#111111] uppercase display-tight">
                Código: <span className="font-mono">{room.code}</span>
              </h1>
              <motion.button
                type="button"
                whileTap={{ scale: 0.94 }}
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border-2 border-[#111111] text-xs font-bold text-[#111111] cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-[#2D6A4F]" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copiado' : 'Copiar'}
              </motion.button>
            </div>
          </div>

          <button
            type="button"
            onClick={onLeave}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-white hover:bg-[#F4D6DC] border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer self-start sm:self-center"
          >
            <LogOut className="w-3.5 h-3.5" />
            Salir de sala
          </button>
        </div>

        {errorMsg && (
          <div className="mx-6 sm:mx-8 mt-5 rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] px-4 py-2.5 text-xs font-bold text-[#111111]">
            {errorMsg}
          </div>
        )}

        {/* 5 Seat Slots */}
        <div className="p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {slots.map((player, idx) => {
            if (!player) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="rounded-2xl border-2 border-dashed border-[#111111]/35 bg-white/55 p-4 flex flex-col items-center justify-center text-center min-h-[175px]"
                >
                  {room.fillWithBots ? (
                    <>
                      <Bot className="w-7 h-7 text-[#525252] mb-2" />
                      <p className="font-display text-lg font-bold text-[#111111] uppercase">
                        Bot táctico
                      </p>
                      <p className="text-[11px] text-[#525252] mt-0.5">
                        Cubrirá este lugar si no entra nadie
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="font-display text-lg font-bold text-[#737373] uppercase">
                        Cupo libre #{idx + 1}
                      </p>
                      <p className="text-[11px] text-[#737373] mt-0.5">
                        Esperando jugador...
                      </p>
                    </>
                  )}
                </div>
              );
            }

            const isMe = player.id === myParticipantId;
            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, scale: 0.94 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`rounded-2xl p-4 flex flex-col justify-between min-h-[175px] ${
                  isMe
                    ? 'bg-white border-2 border-[#111111] shadow-[4px_4px_0_#111111]'
                    : 'bg-[#FAF9F5] border-2 border-[#111111]/80'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-12 h-12 rounded-xl bg-[#F2F1EC] border-2 border-[#111111] flex items-center justify-center shrink-0">
                    <JerseyIcon
                      primary={player.color}
                      secondary={player.secondaryColor}
                      number={idx + 1}
                      className="w-9 h-9"
                    />
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border border-[#111111] ${
                      player.isHost
                        ? 'bg-[#EDE0B8] text-[#111111]'
                        : player.isReady
                          ? 'bg-[#CDE7DD] text-[#111111]'
                          : 'bg-white text-[#525252]'
                    }`}
                  >
                    {player.isHost ? 'Anfitrión' : player.isReady ? 'Listo' : 'Esperando'}
                  </span>
                </div>

                <div className="mt-3">
                  <p className="font-display text-2xl font-extrabold text-[#111111] uppercase leading-none truncate">
                    {player.name} {isMe && '(Vos)'}
                  </p>
                  <p className="text-xs font-semibold text-[#46735B] mt-1 truncate">
                    {player.clubName}
                  </p>
                  <p className="font-mono text-[11px] font-bold text-[#525252] mt-2">
                    $500M · 0 PTS
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom Host / Ready Controls */}
        <div className="px-6 sm:px-8 py-5 bg-[#EFECE4] border-t-2 border-[#111111] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {isHost ? (
              <button
                type="button"
                onClick={onToggleFillBots}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-full border-2 border-[#111111] text-xs font-bold transition-colors cursor-pointer ${
                  room.fillWithBots
                    ? 'bg-[#CDE7DD] text-[#111111]'
                    : 'bg-white text-[#404040]'
                }`}
              >
                <Bot className="w-4 h-4" />
                {room.fillWithBots
                  ? 'Bots para vacantes: ACTIVOS'
                  : 'Bots para vacantes: DESACTIVADOS'}
              </button>
            ) : (
              <p className="text-xs font-medium text-[#404040]">
                Esperando que el anfitrión inicie el torneo...
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            {!isHost && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onToggleReady}
                className={`px-5 py-2.5 rounded-full border-2 border-[#111111] font-display text-lg font-bold uppercase cursor-pointer ${
                  me?.isReady ? 'bg-[#CDE7DD] text-[#111111]' : 'bg-white text-[#111111]'
                }`}
              >
                {me?.isReady ? 'Listo ✓' : 'Marcar listo'}
              </motion.button>
            )}

            {isHost && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onStartMatch}
                className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-xl font-extrabold uppercase tracking-wide shadow-[3px_3px_0_rgba(17,17,17,0.25)] cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                Comenzar partido
              </motion.button>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
