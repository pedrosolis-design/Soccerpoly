import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { AuctionState, Participant } from '../types/game';
import { JerseyIcon } from './FootballArt';
import { Clock, Gavel } from 'lucide-react';

interface AuctionModalProps {
  auction: AuctionState;
  me: Participant;
  onBid: () => void;
  onPass: () => void;
}

export const AuctionModal: React.FC<AuctionModalProps> = ({
  auction,
  me,
  onBid,
  onPass,
}) => {
  const [secLeft, setSecLeft] = useState(() =>
    Math.max(0, (auction.endsAtMs - Date.now()) / 1000)
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      setSecLeft(Math.max(0, (auction.endsAtMs - Date.now()) / 1000));
    }, 100);
    return () => window.clearInterval(interval);
  }, [auction.endsAtMs]);

  const isSeller = me.id === auction.sellerId;
  const hasPassed = auction.passedIds.includes(me.id);
  const isHighestBidder = auction.highestBidderId === me.id;
  const nextBid = auction.highestBidderId
    ? auction.currentBid + 10
    : auction.startingBid;
  const canAfford = me.money >= nextBid;
  const canAct = !isSeller && !hasPassed && !isHighestBidder && canAfford;

  const progressPct = Math.min(100, Math.max(0, (secLeft / 10) * 100));

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
        className="w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        <div className="bg-[#111111] px-6 py-3.5 flex items-center justify-between text-[#F7F6F2]">
          <span className="inline-flex items-center gap-2 font-display text-base font-bold tracking-widest uppercase">
            <Gavel className="w-4 h-4 text-[#EDE0B8]" />
            Subasta Relámpago
          </span>
          <span className="inline-flex items-center gap-1 font-mono text-xs font-bold tabular-nums text-[#EDE0B8]">
            <Clock className="w-3.5 h-3.5" />
            {secLeft.toFixed(1)}s
          </span>
        </div>

        {/* Countdown Bar */}
        <div className="w-full h-2 bg-[#E5E3DC] border-b border-[#111111]">
          <div
            className="h-full bg-[#4F7D63] transition-[width] duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        <div className="p-6 space-y-5 text-center">
          {/* Player Card Showcase */}
          <div className="rounded-2xl card-oro border-2 border-[#111111] p-4 flex items-center gap-4 text-left">
            <div className="w-16 h-16 rounded-full bg-white/80 border-2 border-[#111111] flex items-center justify-center shrink-0">
              <JerseyIcon
                primary={auction.player.kitPrimary}
                secondary={auction.player.kitSecondary}
                number={auction.player.number}
                className="w-11 h-11"
              />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-[#111111] text-[#EFE2B3]">
                {auction.player.tier} · {auction.player.leagueLabel}
              </span>
              <h2 className="font-display text-2xl font-extrabold text-[#111111] uppercase mt-1 truncate">
                {auction.player.name}
              </h2>
              <p className="text-xs font-semibold text-[#404040]">
                {auction.player.club} · +{auction.player.points} PTS
              </p>
            </div>
          </div>

          {/* Current Highest Bid */}
          <div className="rounded-2xl bg-white border-2 border-[#111111] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#525252]">
              {auction.highestBidderId ? 'Oferta líder actual' : 'Precio base de salida'}
            </p>
            <p className="font-mono text-4xl font-extrabold text-[#111111] tabular-nums mt-1">
              ${auction.currentBid}M
            </p>
            <p className="text-xs font-semibold text-[#2D6A4F] mt-1">
              {auction.highestBidderId
                ? `${auction.highestBidderName} · ${auction.highestBidderClub}`
                : 'Sin ofertas todavía'}
            </p>
          </div>

          {/* Action Buttons */}
          {isSeller ? (
            <p className="text-xs font-bold text-[#525252] py-2">
              Pasaste este fichaje · Los demás clubes están pujando.
            </p>
          ) : isHighestBidder ? (
            <p className="text-xs font-bold text-[#2D6A4F] py-2">
              ¡Vas ganando la subasta con ${auction.currentBid}M!
            </p>
          ) : hasPassed ? (
            <p className="text-xs font-bold text-[#525252] py-2">
              Ya te bajaste de esta subasta.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <motion.button
                type="button"
                disabled={!canAct}
                whileTap={canAct ? { scale: 0.96 } : undefined}
                onClick={onBid}
                className="py-3 px-4 rounded-full bg-[#111111] hover:bg-[#262626] disabled:bg-[#D4D4D4] disabled:text-[#737373] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide cursor-pointer disabled:cursor-not-allowed"
              >
                Pujar ${nextBid}M
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={onPass}
                className="py-3 px-4 rounded-full bg-white hover:bg-[#F2F1EC] border-2 border-[#111111] font-display text-lg font-bold uppercase text-[#111111] cursor-pointer"
              >
                Pasar
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};
