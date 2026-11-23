import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  CLUB_KIT_PALETTES,
  DEFAULT_PLAYER_DRAFTS,
  PlayerDraft,
} from '../data/gameData';
import { JerseyIcon, TrophyBadgeIcon } from './FootballArt';
import { Crown, Play, Plus, Trash2 } from 'lucide-react';

interface LobbySetupProps {
  onStartMatch: (drafts: PlayerDraft[]) => void;
  onBackToOnline?: () => void;
}

export const LobbySetup: React.FC<LobbySetupProps> = ({
  onStartMatch,
  onBackToOnline,
}) => {
  const [drafts, setDrafts] = useState<PlayerDraft[]>(() =>
    DEFAULT_PLAYER_DRAFTS.map((d) => ({ ...d }))
  );

  const updateDraft = (index: number, patch: Partial<PlayerDraft>) => {
    setDrafts((prev) =>
      prev.map((item, i) => (i === index ? { ...item, ...patch } : item))
    );
  };

  const addPlayer = () => {
    if (drafts.length >= 5) return;
    const nextIdx = drafts.length;
    const palette = CLUB_KIT_PALETTES[nextIdx % CLUB_KIT_PALETTES.length];
    setDrafts((prev) => [
      ...prev,
      {
        id: `p-${Date.now()}`,
        name: `Jugador ${nextIdx + 1}`,
        clubName: `Club ${nextIdx + 1} FC`,
        paletteId: palette.id,
      },
    ]);
  };

  const removePlayer = (index: number) => {
    if (drafts.length <= 2) return;
    setDrafts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onStartMatch(drafts);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="w-full max-w-[1260px] mx-auto my-auto px-3 py-4 sm:px-6 sm:py-6"
    >
      {/* Top Editorial Nav Line + Corner Crown Badge (inspired by reference) */}
      <div className="flex items-center justify-between gap-4 mb-3 px-1">
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1 rounded-full bg-[#111111] text-[#F2F1EC] text-xs font-semibold tracking-wide">
            Práctica Local
          </span>
          <span className="text-xs font-medium text-[#525252] hidden sm:inline">
            Inicio $500M · 0 PTS · Carrera por el Triplete
          </span>
        </div>

        <div className="flex items-center gap-3">
          {onBackToOnline && (
            <button
              type="button"
              onClick={onBackToOnline}
              className="text-xs font-bold text-[#111111] hover:underline cursor-pointer"
            >
              Volver al Multijugador Online
            </button>
          )}
          <span className="font-mono text-xs font-bold text-[#111111] tabular-nums">
            {drafts.length} / 5 clubes
          </span>
          <div
            className="w-9 h-9 rounded-lg bg-[#111111] text-[#F2F1EC] flex items-center justify-center shadow-[2px_2px_0_rgba(17,17,17,0.25)]"
            aria-hidden="true"
          >
            <Crown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Framed Paper Card */}
      <form
        onSubmit={handleSubmit}
        className="relative rounded-[28px] border-2 border-[#111111] bg-[#F7F6F2] shadow-[6px_6px_0_#111111] overflow-hidden"
      >
        {/* Subtle Desaturated Geometric Background Blocks (like reference screenshot) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="absolute top-6 left-[12%] w-28 h-36 bg-[#C7DCEB]/55 rounded-sm" />
          <div className="absolute top-12 right-[18%] w-36 h-28 bg-[#CDE7DD]/65 rounded-sm" />
          <div className="absolute bottom-14 left-[28%] w-32 h-24 bg-[#EDE0B8]/60 rounded-sm" />
          <div className="absolute bottom-8 right-[8%] w-28 h-32 bg-[#ECD1C5]/55 rounded-sm" />
          {/* Delicate Ink Stars & Board Pawn Doodles */}
          <svg
            viewBox="0 0 28 28"
            className="absolute top-7 left-[44%] w-6 h-6 text-[#111111]/70"
            fill="none"
          >
            <path
              d="M14 2L16.5 11.5L26 14L16.5 16.5L14 26L11.5 16.5L2 14L11.5 11.5L14 2Z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinejoin="round"
            />
          </svg>
          <svg
            viewBox="0 0 36 44"
            className="hidden lg:block absolute top-6 right-8 w-8 h-10 text-[#111111]/75 rotate-12"
            fill="none"
          >
            <circle cx="18" cy="11" r="6.5" fill="#EDE0B8" stroke="currentColor" strokeWidth="2" />
            <path
              d="M10 38L14 19H22L26 38H10Z"
              fill="#CDE7DD"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        {/* Hero Editorial Header */}
        <div className="relative z-10 px-6 sm:px-8 pt-7 pb-5 border-b-2 border-[#111111] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <div>
              <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-[#111111] display-tight">
                MONOPOLIO
                <br />
                FUTBOLERO
              </h1>
            </div>

            {/* Signature Solid Black Italic Editorial Block */}
            <div className="bg-[#111111] text-[#F7F6F2] px-5 py-3.5 rounded-sm max-w-sm">
              <p className="font-display italic text-xl sm:text-2xl font-bold leading-tight tracking-wide">
                Armá tu club, fichá cracks y ganá el Triplete.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {drafts.length < 5 && (
              <motion.button
                type="button"
                whileTap={{ scale: 0.96 }}
                onClick={addPlayer}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white hover:bg-[#EDE0B8]/50 border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Plus className="w-4 h-4" />
                Sumar club
              </motion.button>
            )}
          </div>
        </div>

        {/* Players & Clubs Editor Grid */}
        <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <AnimatePresence mode="popLayout">
            {drafts.map((draft, index) => {
              const palette =
                CLUB_KIT_PALETTES.find((p) => p.id === draft.paletteId) ??
                CLUB_KIT_PALETTES[0];

              const cardTint = [
                'bg-[#FDFCF9]',
                'bg-[#FAF9F4]',
                'bg-[#FDFCF9]',
                'bg-[#FAF9F4]',
                'bg-[#FDFCF9]',
              ][index % 5];

              return (
                <motion.div
                  key={draft.id}
                  layout
                  initial={{ opacity: 0, scale: 0.94 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.92 }}
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                  className={`rounded-2xl ${cardTint} ink-card-sm p-4 flex flex-col justify-between gap-4`}
                >
                  {/* Top Jersey Preview + Remove */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="w-11 h-11 rounded-xl bg-[#F2F1EC] border-2 border-[#111111] flex items-center justify-center shrink-0">
                        <JerseyIcon
                          primary={palette.primary}
                          secondary={palette.secondary}
                          number={index + 1}
                          className="w-8 h-8"
                        />
                      </div>
                      <div>
                        <span className="text-[11px] font-mono font-bold text-[#525252] uppercase">
                          Turno {index + 1}
                        </span>
                        <p className="font-mono text-xs font-bold text-[#2D6A4F] tabular-nums">
                          $500M · 0 PTS
                        </p>
                      </div>
                    </div>

                    {drafts.length > 2 && (
                      <button
                        type="button"
                        onClick={() => removePlayer(index)}
                        className="p-1.5 rounded-lg text-[#737373] hover:text-[#9F4D59] hover:bg-[#F4D6DC]/60 transition-colors cursor-pointer"
                        aria-label={`Quitar jugador ${index + 1}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Pill-shaped White Inputs (matching reference form aesthetic) */}
                  <div className="space-y-3">
                    <div>
                      <label
                        htmlFor={`player-name-${draft.id}`}
                        className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
                      >
                        Tu nombre
                      </label>
                      <input
                        id={`player-name-${draft.id}`}
                        type="text"
                        maxLength={16}
                        required
                        value={draft.name}
                        onChange={(e) => updateDraft(index, { name: e.target.value })}
                        placeholder="Ej: Davo"
                        className="w-full rounded-full bg-white border-2 border-[#111111] focus:bg-[#FDFBF4] focus:outline-none px-3.5 py-1.5 text-sm font-semibold text-[#111111] placeholder:text-[#A3A3A3]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`club-name-${draft.id}`}
                        className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
                      >
                        Nombre de tu club
                      </label>
                      <input
                        id={`club-name-${draft.id}`}
                        type="text"
                        maxLength={20}
                        required
                        value={draft.clubName}
                        onChange={(e) =>
                          updateDraft(index, { clubName: e.target.value })
                        }
                        placeholder="Ej: Club Xeneize"
                        className="w-full rounded-full bg-white border-2 border-[#111111] focus:bg-[#FDFBF4] focus:outline-none px-3.5 py-1.5 text-sm font-medium text-[#111111] placeholder:text-[#A3A3A3]"
                      />
                    </div>
                  </div>

                  {/* Desaturated Kit Swatches */}
                  <div>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1.5">
                      Colores del club
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {CLUB_KIT_PALETTES.map((kit) => {
                        const selected = kit.id === draft.paletteId;
                        return (
                          <button
                            key={kit.id}
                            type="button"
                            onClick={() => updateDraft(index, { paletteId: kit.id })}
                            title={kit.label}
                            className={`w-6 h-6 rounded-full border-2 transition-transform cursor-pointer ${
                              selected
                                ? 'border-[#111111] scale-115 ring-2 ring-[#111111]/25'
                                : 'border-[#111111]/45 hover:scale-105'
                            }`}
                            style={{
                              background: `linear-gradient(135deg, ${kit.primary} 55%, ${kit.secondary} 55%)`,
                            }}
                            aria-label={`Elegir colores ${kit.label}`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Bottom Rules + Solid Black Pill CTA */}
        <div className="relative z-10 px-6 sm:px-8 py-5 bg-[#EFECE4] border-t-2 border-[#111111] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-5 gap-y-2 text-xs text-[#262626]">
            <span className="inline-flex items-center gap-1.5 font-medium">
              <TrophyBadgeIcon tier="copa" unlocked className="w-4 h-4" />
              <span>
                <strong>Copa de la Liga</strong> · 20 PTS + vuelta
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <TrophyBadgeIcon tier="liga" unlocked className="w-4 h-4" />
              <span>
                <strong>Liga Nacional</strong> · 40 PTS + vuelta
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium">
              <TrophyBadgeIcon tier="ucl" unlocked className="w-4 h-4" />
              <span>
                <strong>Champions</strong> · 60 PTS + vuelta
              </span>
            </span>
          </div>

          <motion.button
            type="submit"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="inline-flex items-center gap-2 px-7 py-3 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-xl font-extrabold uppercase tracking-wide shadow-[3px_3px_0_rgba(17,17,17,0.25)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            Comenzar partido
          </motion.button>
        </div>
      </form>
    </motion.div>
  );
};
