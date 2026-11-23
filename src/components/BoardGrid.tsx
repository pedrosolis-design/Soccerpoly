import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { BoardTile, FeedEntry, Participant } from '../types/game';
import { DiceFace, JerseyIcon, TileEmblem } from './FootballArt';
import { Clock, History, Lock, RotateCcw, Sparkles } from 'lucide-react';

interface BoardGridProps {
  tiles: BoardTile[];
  participants: Participant[];
  activePlayerIndex: number;
  diceValue: number;
  isRolling: boolean;
  isMoving: boolean;
  isDimmed: boolean;
  isMyTurn: boolean;
  isOnline: boolean;
  roomCode?: string;
  turnDeadlineMs?: number | null;
  feed: FeedEntry[];
  onRollDice: () => void;
  onOpenJailOptions: () => void;
  onResetMatch: () => void;
  onOpenHistory?: () => void;
}

export const BoardGrid: React.FC<BoardGridProps> = ({
  tiles,
  participants,
  activePlayerIndex,
  diceValue,
  isRolling,
  isMoving,
  isDimmed,
  isMyTurn,
  isOnline,
  roomCode,
  turnDeadlineMs,
  feed,
  onRollDice,
  onOpenJailOptions,
  onResetMatch,
  onOpenHistory,
}) => {
  const activePlayer = participants[activePlayerIndex];
  const activeTile = tiles[activePlayer.position];

  const [secLeft, setSecLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!turnDeadlineMs) {
      setSecLeft(null);
      return;
    }
    const update = () => {
      setSecLeft(Math.max(0, Math.ceil((turnDeadlineMs - Date.now()) / 1000)));
    };
    update();
    const interval = window.setInterval(update, 250);
    return () => window.clearInterval(interval);
  }, [turnDeadlineMs]);

  return (
    <motion.div
      animate={{
        scale: isDimmed ? 0.985 : 1,
        opacity: isDimmed ? 0.5 : 1,
      }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="relative w-full rounded-3xl border-2 border-[#111111] bg-[#E8E5DC] p-2 sm:p-3 shadow-[6px_6px_0_#111111] origin-center"
    >
      {/* 7x5 Monopoly Perimeter Grid */}
      <div className="grid grid-cols-7 grid-rows-5 gap-1.5 sm:gap-2">
        {tiles.map((tile) => {
          const playersHere = participants.filter((p) => p.position === tile.id);
          const isActiveTile = activePlayer?.position === tile.id;

          return (
            <div
              key={tile.id}
              style={{
                gridColumn: tile.gridCol,
                gridRow: tile.gridRow,
                backgroundColor: isActiveTile ? '#FFFFFF' : tile.accentHex,
              }}
              className={`relative flex flex-col justify-between rounded-xl overflow-hidden text-left transition-all duration-150 min-h-[86px] sm:min-h-[102px] lg:min-h-[108px] ${
                isActiveTile
                  ? 'border-2 border-[#111111] shadow-[3px_3px_0_#111111] -translate-y-0.5'
                  : 'border-[1.5px] border-[#111111]/85'
              }`}
            >
              {/* Muted League / Action Header Strip */}
              <div
                className="w-full px-1.5 py-1 flex items-center justify-between gap-1 border-b border-[#111111]/60"
                style={{ backgroundColor: tile.headerBg }}
              >
                <span className="font-display text-[10px] sm:text-xs font-bold uppercase tracking-wider text-[#FAF9F5] truncate leading-none">
                  {tile.title}
                </span>
              </div>

              {/* Center Emblem */}
              <div className="flex-1 flex flex-col items-center justify-center px-1 py-1">
                <TileEmblem
                  kind={tile.kind}
                  leagueId={tile.leagueId}
                  className={`w-7 h-7 sm:w-8 sm:h-8 transition-transform duration-200 ${
                    isActiveTile ? 'scale-110' : ''
                  }`}
                />
              </div>

              {/* Footer Price / Points / Action Subtitle */}
              <div className="w-full px-1.5 py-1 bg-[#111111] text-[#F7F6F2] flex items-center justify-center gap-1 text-[9px] sm:text-[10px] font-mono font-bold tabular-nums">
                {tile.priceRange ? (
                  <>
                    <span className="text-[#CDE7DD] truncate">{tile.priceRange}</span>
                    <span className="text-[#737373]">·</span>
                    <span className="text-[#EDE0B8] truncate">{tile.pointsRange}</span>
                  </>
                ) : (
                  <span className="font-sans text-[9px] sm:text-[10px] font-semibold tracking-tight text-[#E5E5E5] truncate uppercase">
                    {tile.subtitle}
                  </span>
                )}
              </div>

              {/* Live Animated Player Tokens */}
              {playersHere.length > 0 && (
                <div className="absolute top-6 right-1 flex flex-wrap justify-end gap-0.5 max-w-[82%] pointer-events-none">
                  {playersHere.map((p) => {
                    const isCurrent = p.id === activePlayer.id;
                    return (
                      <motion.div
                        key={p.id}
                        layoutId={`token-${p.id}`}
                        transition={{ type: 'spring', bounce: 0.25, duration: 0.3 }}
                        className={`w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[9px] sm:text-[10px] font-display font-extrabold shadow-sm border-2 border-[#111111] ${
                          isCurrent ? 'scale-110 ring-2 ring-white' : ''
                        }`}
                        style={{
                          backgroundColor: p.color,
                          color:
                            p.color.toLowerCase() === '#faf9f5'
                              ? '#111111'
                              : '#FFFFFF',
                        }}
                        title={`${p.name} (${p.clubName})`}
                      >
                        {p.shortTag.slice(0, 2)}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Center 5x3 Soft Sage Paper Football Pitch */}
        <div
          style={{ gridColumn: '2 / 7', gridRow: '2 / 5' }}
          className="relative rounded-2xl overflow-hidden pitch-sage border-2 border-[#111111] flex flex-col justify-between p-3 sm:p-5"
        >
          {/* Crisp Chalk & Ink Pitch Lines */}
          <svg
            viewBox="0 0 800 420"
            preserveAspectRatio="none"
            className="absolute inset-0 w-full h-full pointer-events-none opacity-65"
            aria-hidden="true"
          >
            <line x1="400" y1="0" x2="400" y2="420" stroke="#FAF9F5" strokeWidth="3.5" />
            <circle cx="400" cy="210" r="68" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <circle cx="400" cy="210" r="5" fill="#FAF9F5" />
            <rect x="0" y="95" width="110" height="230" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <rect x="0" y="150" width="42" height="120" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <path d="M110 165 A55 55 0 0 1 110 255" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <rect x="690" y="95" width="110" height="230" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <rect x="758" y="150" width="42" height="120" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
            <path d="M690 165 A55 55 0 0 0 690 255" fill="none" stroke="#FAF9F5" strokeWidth="3.5" />
          </svg>

          {/* Top Row inside Pitch: Editorial Brand Mark + Reset / Live Clock */}
          <div className="relative z-10 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-[#111111] text-[#F7F6F2] px-3.5 py-1.5 rounded-sm shadow-[2.5px_2.5px_0_rgba(17,17,17,0.2)]">
                <span className="font-display italic text-xl sm:text-2xl font-extrabold tracking-wider leading-none">
                  MONOPOLIO ★ 412
                </span>
              </div>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-sm bg-[#FAF9F5]/90 border border-[#111111]/50 font-mono text-[10px] font-bold tracking-wider text-[#111111] uppercase whitespace-nowrap">
                by RayMonday
              </span>
            </div>

            {isOnline ? (
              <div className="flex items-center gap-2">
                {roomCode && (
                  <span className="px-3 py-1 rounded-full bg-white border-2 border-[#111111] font-mono text-xs font-bold text-[#111111] whitespace-nowrap">
                    SALA {roomCode}
                  </span>
                )}
                {secLeft !== null && (
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full border-2 border-[#111111] font-mono text-xs font-bold tabular-nums whitespace-nowrap ${
                      secLeft <= 7 ? 'bg-[#F4D6DC] text-[#9F4D59]' : 'bg-[#FAF9F5] text-[#111111]'
                    }`}
                  >
                    <Clock className="w-3.5 h-3.5" />
                    {secLeft}s
                  </span>
                )}
              </div>
            ) : (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onResetMatch}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white hover:bg-[#FAF9F5] border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reiniciar $500M
              </motion.button>
            )}
          </div>

          {/* Center Interactive Arena: Active Turn + Dice + Decorative Challenge Deck */}
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-12 items-center gap-4 my-auto py-2">
            {/* Turn & Dice Control Card */}
            <div className="md:col-span-8 flex flex-col sm:flex-row items-center gap-4 bg-[#FAF9F5] ink-card rounded-2xl p-4">
              <motion.div
                animate={
                  isRolling || isMoving
                    ? { rotate: [0, -14, 14, -8, 0], scale: [1, 1.1, 0.97, 1.04, 1] }
                    : { rotate: 0, scale: 1 }
                }
                transition={{ duration: 0.3 }}
              >
                <DiceFace value={diceValue} rolling={isRolling} />
              </motion.div>

              <div className="flex-1 text-center sm:text-left min-w-0">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <JerseyIcon
                    primary={activePlayer.color}
                    secondary={activePlayer.secondaryColor}
                    className="w-5 h-5 shrink-0"
                  />
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#46735B] truncate">
                    En casillero · {activeTile.title}
                  </p>
                </div>
                <h2 className="font-display text-2xl sm:text-3xl font-extrabold text-[#111111] display-tight mt-0.5 truncate uppercase">
                  {activePlayer.name}{' '}
                  <span className="text-[#525252] font-bold text-xl">
                    · {activePlayer.clubName}
                  </span>
                </h2>
                <p className="text-xs font-medium text-[#525252] mt-1">
                  {activePlayer.jailTurns > 0
                    ? `En la cárcel (${activePlayer.jailTurns} turnos restantes).`
                    : `$${activePlayer.money}M disponibles · ${activePlayer.points} PTS · Vuelta ${activePlayer.laps + 1}`}
                </p>
              </div>

              {!isMyTurn ? (
                <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#EFECE4] border-2 border-[#111111] font-display text-base font-bold uppercase text-[#404040] whitespace-nowrap shrink-0">
                  {isMoving
                    ? 'Avanzando...'
                    : activePlayer.isBot
                      ? 'Bot jugando...'
                      : `Turno de ${activePlayer.name}`}
                </span>
              ) : activePlayer.jailTurns > 0 ? (
                <motion.button
                  type="button"
                  whileTap={{ scale: 0.96 }}
                  onClick={onOpenJailOptions}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#9F4D59] hover:bg-[#8A3F4A] text-white border-2 border-[#111111] font-display text-lg font-extrabold tracking-wide shadow-[2.5px_2.5px_0_#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Lock className="w-4 h-4" />
                  Resolver cárcel
                </motion.button>
              ) : (
                <motion.button
                  type="button"
                  disabled={isRolling || isMoving}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={onRollDice}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#111111] hover:bg-[#262626] disabled:opacity-60 text-[#F7F6F2] font-display text-xl font-extrabold uppercase tracking-wide shadow-[3px_3px_0_rgba(17,17,17,0.25)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  {isRolling ? 'Tirando...' : isMoving ? 'Avanzando...' : 'Tirar dado'}
                </motion.button>
              )}
            </div>

            {/* Right: Physical Desafío Deck Stack */}
            <div className="md:col-span-4 hidden md:flex justify-center">
              <div className="relative w-36 h-26">
                <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rounded-2xl bg-[#111111]" />
                <div className="relative w-full h-full rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] p-3 flex flex-col items-center justify-center text-center">
                  <Sparkles className="w-5 h-5 text-[#111111] mb-1" />
                  <span className="font-display text-sm font-extrabold tracking-wider text-[#111111] uppercase leading-tight">
                    Mazo Desafío
                  </span>
                  <span className="text-[10px] font-medium text-[#525252] mt-0.5 leading-tight">
                    Trivia · Penales · Travesaño
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Row inside Pitch: Live Play Ticker */}
          <div className="relative z-10 flex items-center justify-between gap-3 bg-[#FAF9F5] border-2 border-[#111111] rounded-xl px-3.5 py-1.5 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-[#525252] shrink-0">Última jugada:</span>
              {feed[0] ? (
                <p className="text-[#111111] truncate font-medium">
                  <span className="font-bold underline decoration-2 underline-offset-2">
                    {feed[0].actorName}
                  </span>{' '}
                  {feed[0].text}{' '}
                  {feed[0].delta && (
                    <span className="font-mono font-bold text-[#2D6A4F] ml-1">
                      {feed[0].delta}
                    </span>
                  )}
                </p>
              ) : (
                <p className="text-[#404040] truncate">
                  Todos los clubes en Salida con $500M. ¡Tirá el dado para arrancar!
                </p>
              )}
            </div>
            {onOpenHistory ? (
              <button
                type="button"
                onClick={onOpenHistory}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFECE4] hover:bg-[#EDE0B8] border border-[#111111] text-[11px] font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap shrink-0"
              >
                <History className="w-3 h-3" />
                Historial ({feed.length})
              </button>
            ) : (
              <span className="hidden sm:inline text-[11px] font-medium text-[#525252] whitespace-nowrap shrink-0">
                Click en un club arriba para ver su plantel
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};
