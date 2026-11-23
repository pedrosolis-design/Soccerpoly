import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface State {
  hasError: boolean;
  message: string;
}

export class FirestoreErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  state: State = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      message: error?.message || 'Error inesperado de conexión con Firebase.',
    };
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isQuotaError =
      this.state.message.includes('Quota exceeded') ||
      this.state.message.includes('resource-exhausted');

    return (
      <div className="min-h-screen w-full paper-canvas flex items-center justify-center p-4">
        <div className="w-full max-w-md rounded-3xl bg-[#FAF8F2] border-2 border-[#111111] shadow-[8px_8px_0_#111111] p-7 text-center space-y-4">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-[#F4D6DC] border-2 border-[#111111] flex items-center justify-center text-[#9F4D59]">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="font-display text-3xl font-extrabold uppercase text-[#111111]">
            {isQuotaError ? 'Límite diario alcanzado' : 'Problema de sincronización'}
          </h1>
          <p className="text-xs font-medium text-[#404040] leading-relaxed">
            {isQuotaError
              ? 'Se alcanzó el cupo gratuito diario de lecturas/escrituras en Firestore. Se restablece automáticamente mañana.'
              : 'No se pudo completar la operación en la base de datos. Podés recargar la pantalla para continuar.'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-[#111111] hover:bg-[#262626] text-[#F7F6F2] font-display text-lg font-extrabold uppercase cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Recargar partido
          </button>
        </div>
      </div>
    );
  }
}
