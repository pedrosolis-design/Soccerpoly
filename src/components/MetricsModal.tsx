import React from 'react';
import { motion } from 'motion/react';
import {
  Activity,
  BarChart3,
  Database,
  RefreshCw,
  Trophy,
  Users,
  X,
} from 'lucide-react';

export interface AdminMetricsSnapshot {
  server: {
    startedAt: number;
    totalVisits: number;
    uniqueVisitors: number;
    activeConnections: number;
    activeOnlinePlayers: number;
    activeRooms: number;
    waitingRooms: number;
    inGameRooms: number;
    roomsCreated: number;
    onlineMatchesStarted: number;
    onlineMatchesFinished: number;
    localMatchesStarted: number;
    hallOfFameSessionCount: number;
  };
  cloud: {
    registeredUsers: number;
    totalCloudMatches: number;
    totalCloudTripletes: number;
    hallOfFameCloudCount: number;
  };
}

interface MetricsModalProps {
  metrics: AdminMetricsSnapshot | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}

export const MetricsModal: React.FC<MetricsModalProps> = ({
  metrics,
  loading,
  error,
  onRefresh,
  onClose,
}) => {
  const uptimeMin = metrics
    ? Math.max(1, Math.round((Date.now() - metrics.server.startedAt) / 60_000))
    : 0;

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Métricas del creador RayMonday"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#111111]/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ type: 'spring', bounce: 0.14, duration: 0.35 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        <div className="px-6 py-4 bg-[#EFECE4] border-b-2 border-[#111111] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#CDE7DD] flex items-center justify-center">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#111111] uppercase leading-none">
                Métricas del Juego · RayMonday
              </h2>
              <p className="text-xs font-medium text-[#525252] mt-1">
                Panel privado de tráfico en vivo y registros en Firestore
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={loading}
              onClick={onRefresh}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white hover:bg-[#EDE0B8] border-2 border-[#111111] text-xs font-bold text-[#111111] cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
              aria-label="Cerrar métricas"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {error ? (
            <div className="rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] p-4 text-xs font-bold text-[#111111]">
              {error}
            </div>
          ) : loading && !metrics ? (
            <p className="text-center text-xs font-bold text-[#525252] py-10">
              Cargando métricas en vivo...
            </p>
          ) : metrics ? (
            <>
              {/* Live Server Traffic */}
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111]">
                    <Activity className="w-3.5 h-3.5 text-[#2D6A4F]" />
                    Tráfico en vivo (sesión actual del servidor · {uptimeMin} min)
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-white border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#525252]">
                      Visitantes únicos
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.server.uniqueVisitors}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#525252]">
                      Sesiones abiertas
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.server.totalVisits}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#CDE7DD]/65 border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#2D6A4F]">
                      Conectados ahora
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.server.activeConnections}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-[#EDE0B8]/65 border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#525252]">
                      Salas activas
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.server.activeRooms}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-3 text-xs">
                  <div className="rounded-xl bg-[#EFECE4] border border-[#111111]/40 px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-[#404040]">Salas creadas</span>
                    <strong className="font-mono tabular-nums">{metrics.server.roomsCreated}</strong>
                  </div>
                  <div className="rounded-xl bg-[#EFECE4] border border-[#111111]/40 px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-[#404040]">Online jugados</span>
                    <strong className="font-mono tabular-nums">{metrics.server.onlineMatchesStarted}</strong>
                  </div>
                  <div className="rounded-xl bg-[#EFECE4] border border-[#111111]/40 px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-[#404040]">Online finalizados</span>
                    <strong className="font-mono tabular-nums">{metrics.server.onlineMatchesFinished}</strong>
                  </div>
                  <div className="rounded-xl bg-[#EFECE4] border border-[#111111]/40 px-3 py-2 flex items-center justify-between">
                    <span className="font-semibold text-[#404040]">Prácticas locales</span>
                    <strong className="font-mono tabular-nums">{metrics.server.localMatchesStarted}</strong>
                  </div>
                </div>
              </div>

              {/* Persistent Firebase Firestore Metrics */}
              <div>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#111111] mb-2.5">
                  <Database className="w-3.5 h-3.5 text-[#4E7299]" />
                  Histórico permanente (Firebase Firestore)
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-2xl bg-[#C7DCEB]/55 border-2 border-[#111111] p-3.5">
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#111111]">
                      <Users className="w-3 h-3" /> Cuentas Google
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.cloud.registeredUsers}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#525252]">
                      Partidos en cuentas
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.cloud.totalCloudMatches}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border-2 border-[#111111] p-3.5">
                    <p className="inline-flex items-center gap-1 text-[11px] font-bold uppercase text-[#525252]">
                      <Trophy className="w-3 h-3 text-[#9E823D]" /> Tripletes en cuentas
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.cloud.totalCloudTripletes}
                    </p>
                  </div>
                  <div className="rounded-2xl bg-white border-2 border-[#111111] p-3.5">
                    <p className="text-[11px] font-bold uppercase text-[#525252]">
                      Salón de la Fama
                    </p>
                    <p className="font-mono text-2xl font-extrabold text-[#111111] tabular-nums mt-1">
                      {metrics.cloud.hallOfFameCloudCount}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </motion.div>
    </motion.div>
  );
};
