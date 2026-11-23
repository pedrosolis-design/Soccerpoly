import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { CLUB_KIT_PALETTES } from '../data/gameData';
import { PublicRoomSummary, RoomVisibility, UserProfile } from '../types/game';
import { JerseyIcon } from './FootballArt';
import {
  BarChart3,
  Check,
  Crown,
  Globe,
  KeyRound,
  LogIn,
  LogOut,
  RefreshCw,
  Save,
  Trophy,
  Users,
  X,
  Zap,
} from 'lucide-react';

interface OnlineHubProps {
  connectionStatus: 'connecting' | 'connected' | 'reconnecting';
  publicRooms: PublicRoomSummary[];
  errorMsg: string | null;
  firebaseError?: string | null;
  onDismissFirebaseError?: () => void;
  authUser?: { uid: string; displayName: string | null } | null;
  userProfile?: UserProfile | null;
  authLoading?: boolean;
  onOpenAuthModal?: () => void;
  onSignOut?: () => void;
  onSaveProfile?: (identity: {
    displayName: string;
    clubName: string;
    paletteId: string;
  }) => Promise<boolean>;
  onQuickMatch: (profile: { name: string; clubName: string; paletteId: string }) => void;
  onCreateRoom: (profile: {
    name: string;
    clubName: string;
    paletteId: string;
    visibility: RoomVisibility;
  }) => void;
  onJoinRoom: (profile: {
    code: string;
    name: string;
    clubName: string;
    paletteId: string;
  }) => void;
  onRefreshRooms: () => void;
  onOpenHallOfFame?: () => void;
  isAdmin?: boolean;
  onOpenMetrics?: () => void;
}

export const OnlineHub: React.FC<OnlineHubProps> = ({
  connectionStatus,
  publicRooms,
  errorMsg,
  firebaseError = null,
  onDismissFirebaseError,
  authUser,
  userProfile,
  authLoading = false,
  onOpenAuthModal,
  onSignOut,
  onSaveProfile,
  onQuickMatch,
  onCreateRoom,
  onJoinRoom,
  onRefreshRooms,
  onOpenHallOfFame,
  isAdmin = false,
  onOpenMetrics,
}) => {
  const [name, setName] = useState('');
  const [clubName, setClubName] = useState('');
  const [paletteId, setPaletteId] = useState(CLUB_KIT_PALETTES[0].id);
  const [joinCode, setJoinCode] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    setName(userProfile.displayName);
    setClubName(userProfile.clubName);
    setPaletteId(userProfile.paletteId);
  }, [userProfile?.uid]);

  const selectedPalette =
    CLUB_KIT_PALETTES.find((p) => p.id === paletteId) ?? CLUB_KIT_PALETTES[0];

  const getProfile = () => ({
    name: name.trim() || 'Jugador',
    clubName: clubName.trim() || `Club ${name.trim() || '412'}`,
    paletteId,
  });

  const isConnected = connectionStatus === 'connected';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.35 }}
      className="w-full max-w-[1160px] mx-auto my-auto px-3 py-4 sm:px-6 sm:py-6"
    >
      {/* Top Editorial Header Strip */}
      <div className="flex items-center justify-between gap-4 mb-3 px-1">
        <div className="flex items-center gap-3">
          <span className="px-3.5 py-1 rounded-full bg-[#111111] text-[#F2F1EC] text-xs font-semibold tracking-wide">
            Online Multijugador
          </span>
          <span className="text-xs font-medium text-[#525252] hidden sm:inline">
            {isConnected ? 'Conectado al servidor de salas' : 'Conectando con el servidor...'}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {authUser ? (
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#CDE7DD] border-2 border-[#111111] text-xs font-bold text-[#111111] whitespace-nowrap">
              <span>
                {userProfile?.displayName || authUser.displayName || 'DT'}
              </span>
              {userProfile && (
                <span className="font-mono text-[11px] text-[#2D6A4F] tabular-nums">
                  · {userProfile.tripletesWon}T / {userProfile.matchesPlayed}PJ
                </span>
              )}
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  title="Cerrar sesión"
                  aria-label="Cerrar sesión"
                  className="ml-0.5 p-0.5 rounded-full hover:bg-[#111111]/10 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ) : (
            onOpenAuthModal && (
              <button
                type="button"
                disabled={authLoading}
                onClick={onOpenAuthModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#111111] hover:bg-[#262626] disabled:opacity-55 text-[#F7F6F2] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
              >
                <LogIn className="w-3.5 h-3.5 text-[#EDE0B8]" />
                {authLoading ? 'Verificando...' : 'Crear / Entrar'}
              </button>
            )
          )}
          {isAdmin && onOpenMetrics && (
            <button
              type="button"
              onClick={onOpenMetrics}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#EDE0B8] hover:bg-[#e5d4a3] border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#111111]" />
              Métricas
            </button>
          )}
          {onOpenHallOfFame && (
            <button
              type="button"
              onClick={onOpenHallOfFame}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#EDE0B8]/60 border-2 border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trophy className="w-3.5 h-3.5 text-[#9E823D]" />
              Salón de la Fama
            </button>
          )}
          <div
            className="w-9 h-9 rounded-lg bg-[#111111] text-[#F2F1EC] flex items-center justify-center shrink-0"
            aria-hidden="true"
          >
            <Crown className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Main Framed Paper Card */}
      <div className="relative rounded-[28px] border-2 border-[#111111] bg-[#F7F6F2] shadow-[6px_6px_0_#111111] overflow-hidden">
        {/* Soft Desaturated Geometric Background Accents */}
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute top-6 left-[8%] w-28 h-32 bg-[#C7DCEB]/50 rounded-sm" />
          <div className="absolute top-12 right-[12%] w-36 h-28 bg-[#CDE7DD]/55 rounded-sm" />
          <div className="absolute bottom-10 left-[38%] w-32 h-24 bg-[#EDE0B8]/50 rounded-sm" />
        </div>

        {/* Hero Editorial Bar */}
        <div className="relative z-10 px-6 sm:px-8 pt-7 pb-5 border-b-2 border-[#111111] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
            <h1 className="font-display text-4xl sm:text-5xl font-extrabold uppercase text-[#111111] display-tight">
              MONOPOLIO
              <br />
              FUTBOLERO 412
            </h1>
            <div className="bg-[#111111] text-[#F7F6F2] px-5 py-3.5 rounded-sm max-w-sm">
              <p className="font-display italic text-xl sm:text-2xl font-bold leading-tight tracking-wide">
                Salas en vivo, subastas, duelos 1v1 y carrera al Triplete.
              </p>
            </div>
          </div>

          <div className="text-xs font-medium text-[#404040] space-y-0.5">
            <p className="font-bold text-[#111111] uppercase tracking-wider">Reglas de sala</p>
            <p>Inicio $500M · Reloj 30s · Bots ante vacantes</p>
          </div>
        </div>

        {errorMsg && (
          <div className="relative z-10 mx-6 sm:mx-8 mt-5 rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] px-4 py-2.5 text-xs font-bold text-[#111111]">
            {errorMsg}
          </div>
        )}

        {firebaseError && (
          <div className="relative z-10 mx-6 sm:mx-8 mt-4 rounded-2xl bg-[#EDE0B8] border-2 border-[#111111] px-4 py-2.5 flex items-center justify-between gap-3 text-xs font-bold text-[#111111]">
            <span>{firebaseError}</span>
            {onDismissFirebaseError && (
              <button
                type="button"
                onClick={onDismissFirebaseError}
                aria-label="Cerrar aviso"
                className="p-1 rounded-full hover:bg-[#111111]/10 cursor-pointer shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Two-Column Split: Club Identity + Room Matchmaking */}
        <div className="relative z-10 p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Left: Identity & Club Kit */}
          <div className="lg:col-span-5 rounded-2xl bg-white ink-card-sm p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-14 h-14 rounded-2xl bg-[#F2F1EC] border-2 border-[#111111] flex items-center justify-center shrink-0">
                <JerseyIcon
                  primary={selectedPalette.primary}
                  secondary={selectedPalette.secondary}
                  number={10}
                  className="w-10 h-10"
                />
              </div>
              <div>
                <h2 className="font-display text-2xl font-extrabold uppercase text-[#111111] leading-none">
                  Tu Club Online
                </h2>
                <p className="text-xs text-[#525252] mt-1">
                  Los futbolistas que fiches irán directo a este plantel.
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label
                  htmlFor="online-player-name"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
                >
                  Tu nombre
                </label>
                <input
                  id="online-player-name"
                  type="text"
                  maxLength={16}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Davo"
                  className="w-full rounded-full bg-[#FAF9F5] border-2 border-[#111111] focus:bg-white focus:outline-none px-4 py-2 text-sm font-semibold text-[#111111]"
                />
              </div>

              <div>
                <label
                  htmlFor="online-club-name"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
                >
                  Nombre de tu club
                </label>
                <input
                  id="online-club-name"
                  type="text"
                  maxLength={20}
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  placeholder="Ej: Club Xeneize"
                  className="w-full rounded-full bg-[#FAF9F5] border-2 border-[#111111] focus:bg-white focus:outline-none px-4 py-2 text-sm font-medium text-[#111111]"
                />
              </div>

              <div>
                <span className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1.5">
                  Colores de camiseta
                </span>
                <div className="flex flex-wrap gap-2">
                  {CLUB_KIT_PALETTES.map((kit) => {
                    const selected = kit.id === paletteId;
                    return (
                      <button
                        key={kit.id}
                        type="button"
                        onClick={() => setPaletteId(kit.id)}
                        title={kit.label}
                        className={`w-7 h-7 rounded-full border-2 transition-transform cursor-pointer ${
                          selected
                            ? 'border-[#111111] scale-115 ring-2 ring-[#111111]/25'
                            : 'border-[#111111]/45 hover:scale-105'
                        }`}
                        style={{
                          background: `linear-gradient(135deg, ${kit.primary} 55%, ${kit.secondary} 55%)`,
                        }}
                        aria-label={`Colores ${kit.label}`}
                      />
                    );
                  })}
                </div>
              </div>

              {authUser && onSaveProfile && (
                <div className="pt-1 flex items-center justify-between gap-2">
                  <button
                    type="button"
                    disabled={savingProfile}
                    onClick={async () => {
                      const p = getProfile();
                      setSavingProfile(true);
                      try {
                        const ok = await onSaveProfile({
                          displayName: p.name,
                          clubName: p.clubName,
                          paletteId: p.paletteId,
                        });
                        if (ok) {
                          setSavedNotice(true);
                          window.setTimeout(() => setSavedNotice(false), 2000);
                        }
                      } finally {
                        setSavingProfile(false);
                      }
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#EFECE4] hover:bg-[#EDE0B8] border border-[#111111] text-xs font-bold text-[#111111] transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {savedNotice ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-[#2D6A4F]" />
                        Guardado en tu cuenta
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        {savingProfile ? 'Guardando...' : 'Guardar club en mi cuenta'}
                      </>
                    )}
                  </button>
                  {userProfile && (
                    <span className="font-mono text-[11px] font-bold text-[#525252] tabular-nums">
                      Récord: {userProfile.bestPoints} PTS
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Play Actions + Open Public Rooms */}
          <div className="lg:col-span-7 flex flex-col justify-between gap-4">
            {/* Primary Online Match Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                type="button"
                disabled={!isConnected}
                whileHover={isConnected ? { y: -2 } : undefined}
                whileTap={isConnected ? { scale: 0.97 } : undefined}
                onClick={() => onQuickMatch(getProfile())}
                className="rounded-2xl bg-[#111111] hover:bg-[#262626] disabled:opacity-55 text-[#F7F6F2] p-5 text-left border-2 border-[#111111] shadow-[4px_4px_0_rgba(17,17,17,0.28)] transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <Zap className="w-5 h-5 text-[#EDE0B8]" />
                  <span className="text-[11px] font-mono uppercase text-[#CDE7DD]">
                    Pública
                  </span>
                </div>
                <h3 className="font-display text-2xl font-extrabold uppercase mt-2">
                  Partida Rápida
                </h3>
                <p className="text-xs text-[#D4D4D4] mt-1">
                  Te suma a una sala abierta o crea una pública nueva.
                </p>
              </motion.button>

              <motion.button
                type="button"
                disabled={!isConnected}
                whileHover={isConnected ? { y: -2 } : undefined}
                whileTap={isConnected ? { scale: 0.97 } : undefined}
                onClick={() =>
                  onCreateRoom({ ...getProfile(), visibility: 'private' })
                }
                className="rounded-2xl bg-[#EDE0B8] hover:bg-[#e5d4a3] disabled:opacity-55 text-[#111111] p-5 text-left ink-card-sm transition-colors cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <KeyRound className="w-5 h-5 text-[#111111]" />
                  <span className="text-[11px] font-mono font-bold uppercase text-[#525252]">
                    Con código
                  </span>
                </div>
                <h3 className="font-display text-2xl font-extrabold uppercase mt-2">
                  Crear Sala Privada
                </h3>
                <p className="text-xs text-[#404040] mt-1">
                  Generá un código de 6 letras para invitar a tus amigos.
                </p>
              </motion.button>
            </div>

            {/* Join by Code */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!joinCode.trim() || !isConnected) return;
                onJoinRoom({ ...getProfile(), code: joinCode });
              }}
              className="rounded-2xl bg-white ink-card-sm p-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <div className="flex-1">
                <label
                  htmlFor="join-code-input"
                  className="block text-[11px] font-bold uppercase tracking-wider text-[#525252] mb-1"
                >
                  Unirse con código de sala
                </label>
                <input
                  id="join-code-input"
                  type="text"
                  maxLength={6}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Ej: 412K8M"
                  className="w-full rounded-full bg-[#FAF9F5] border-2 border-[#111111] px-4 py-1.5 font-mono text-sm font-bold uppercase tracking-widest text-[#111111] focus:outline-none"
                />
              </div>
              <motion.button
                type="submit"
                disabled={!isConnected || joinCode.trim().length < 4}
                whileTap={{ scale: 0.96 }}
                className="sm:self-end px-6 py-2.5 rounded-full bg-[#111111] hover:bg-[#262626] disabled:bg-[#D4D4D4] disabled:text-[#737373] text-[#F7F6F2] font-display text-lg font-extrabold uppercase tracking-wide cursor-pointer whitespace-nowrap"
              >
                Entrar
              </motion.button>
            </form>

            {/* Open Public Rooms Directory */}
            <div className="rounded-2xl bg-[#FAF9F5] border-2 border-[#111111] p-4 flex-1 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-2">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111]">
                  <Globe className="w-3.5 h-3.5" />
                  Salas públicas abiertas ({publicRooms.length})
                </span>
                <button
                  type="button"
                  onClick={onRefreshRooms}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#525252] hover:text-[#111111] cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" />
                  Actualizar
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <p className="text-xs text-[#525252] py-2">
                  No hay salas públicas esperando en este momento. Tocá{' '}
                  <strong>Partida Rápida</strong> para abrir una nueva.
                </p>
              ) : (
                <div className="space-y-2 max-h-28 overflow-y-auto">
                  {publicRooms.map((r) => (
                    <div
                      key={r.code}
                      className="flex items-center justify-between gap-3 rounded-xl bg-white border border-[#111111] px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#111111] truncate">
                          Sala {r.code} · {r.hostClub}
                        </p>
                        <p className="text-[11px] text-[#525252] truncate">
                          Anfitrión: {r.hostName}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onJoinRoom({ ...getProfile(), code: r.code })}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#CDE7DD] hover:bg-[#b8dcd0] border border-[#111111] text-xs font-bold text-[#111111] cursor-pointer shrink-0"
                      >
                        <Users className="w-3 h-3" />
                        {r.playerCount}/{r.maxPlayers} · Entrar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Creator Signature Watermark Bar */}
        <div className="relative z-10 px-6 sm:px-8 py-2.5 bg-[#EFECE4]/90 border-t-2 border-[#111111] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#525252]">
          <span className="font-medium">
            Edición web multijugador · Creado y desarrollado por{' '}
            <strong className="font-display text-sm tracking-wide text-[#111111] uppercase">
              RayMonday
            </strong>
          </span>
          <span className="font-mono font-bold text-[#111111]/75">
            MONOPOLIO 412 · BY RAYMONDAY
          </span>
        </div>
      </div>
    </motion.div>
  );
};
