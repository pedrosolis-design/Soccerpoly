import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Eye, EyeOff, KeyRound, LogIn, UserPlus, X } from 'lucide-react';

interface AccountAuthModalProps {
  initialMode?: 'login' | 'register';
  onLogin: (username: string, password: string) => Promise<void>;
  onRegister: (username: string, password: string) => Promise<void>;
  onClose: () => void;
}

export const AccountAuthModal: React.FC<AccountAuthModalProps> = ({
  initialMode = 'login',
  onLogin,
  onRegister,
  onClose,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    const trimmedUser = username.trim();
    if (!trimmedUser) {
      setLocalError('Ingresá tu nombre de usuario.');
      return;
    }
    if (!trimmedUser.includes('@') && !/^[a-zA-Z0-9._-]{3,20}$/.test(trimmedUser)) {
      setLocalError(
        'Usá entre 3 y 20 caracteres: solo letras, números, punto, guion o guion bajo (sin espacios).'
      );
      return;
    }
    if (password.length < 6) {
      setLocalError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (mode === 'register' && password !== confirmPassword) {
      setLocalError('Las contraseñas no coinciden.');
      return;
    }

    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(trimmedUser, password);
      } else {
        await onRegister(trimmedUser, password);
      }
      onClose();
    } catch (err) {
      setLocalError(
        err instanceof Error
          ? err.message
          : 'No se pudo completar la autenticación.'
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label="Cuenta de jugador"
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
        className="w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 py-4 bg-[#EFECE4] border-b-2 border-[#111111] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[#111111] text-[#EDE0B8] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display text-2xl font-extrabold text-[#111111] uppercase leading-none">
                {mode === 'login' ? 'Entrar con tu cuenta' : 'Crear usuario'}
              </h2>
              <p className="text-xs font-medium text-[#525252] mt-1">
                Guardá tu club, récord y Tripletes en la nube
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full bg-white border-2 border-[#111111] text-[#111111] hover:bg-[#111111] hover:text-white transition-colors cursor-pointer"
            aria-label="Cerrar ventana de cuenta"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Mode Switch Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-full bg-[#EFECE4] border-2 border-[#111111]">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setLocalError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                mode === 'login'
                  ? 'bg-[#111111] text-[#F7F6F2]'
                  : 'text-[#404040] hover:text-[#111111]'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              Ya tengo usuario
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setLocalError(null);
              }}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                mode === 'register'
                  ? 'bg-[#111111] text-[#F7F6F2]'
                  : 'text-[#404040] hover:text-[#111111]'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              Crear usuario
            </button>
          </div>

          {localError && (
            <div className="rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] px-3.5 py-2.5 text-xs font-bold text-[#111111]">
              {localError}
            </div>
          )}

          <div>
            <label
              htmlFor="auth-username"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
            >
              Usuario
            </label>
            <input
              id="auth-username"
              type="text"
              autoComplete="username"
              maxLength={48}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Ej: davo412"
              className="w-full rounded-full bg-white border-2 border-[#111111] px-4 py-2 text-sm font-semibold text-[#111111] focus:outline-none"
            />
            <p className="text-[11px] text-[#525252] mt-1 px-1">
              Sin correo obligatorio: letras, números, punto o guion (3–20 caracteres).
            </p>
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
            >
              Contraseña
            </label>
            <div className="relative">
              <input
                id="auth-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full rounded-full bg-white border-2 border-[#111111] pl-4 pr-10 py-2 text-sm font-semibold text-[#111111] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#525252] hover:text-[#111111] cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label
                htmlFor="auth-password-confirm"
                className="block text-[11px] font-bold uppercase tracking-wider text-[#404040] mb-1"
              >
                Repetir contraseña
              </label>
              <input
                id="auth-password-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                maxLength={64}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repetí tu contraseña"
                className="w-full rounded-full bg-white border-2 border-[#111111] px-4 py-2 text-sm font-semibold text-[#111111] focus:outline-none"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-full bg-[#111111] hover:bg-[#262626] disabled:opacity-55 text-[#F7F6F2] font-display text-xl font-extrabold uppercase tracking-wide transition-colors cursor-pointer"
          >
            {submitting
              ? mode === 'login'
                ? 'Entrando...'
                : 'Creando cuenta...'
              : mode === 'login'
                ? 'Entrar'
                : 'Crear cuenta y entrar'}
          </button>

          <p className="text-[11px] text-center text-[#525252]">
            La cuenta es opcional: también podés jugar salas online sin registrarte.
          </p>
        </form>
      </motion.div>
    </motion.div>
  );
};
