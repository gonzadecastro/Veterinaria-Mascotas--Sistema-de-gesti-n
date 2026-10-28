import React, { useEffect, useState } from 'react';
import { CashShift } from '../types';
import { $ } from '../utils/formatters';

interface HeaderProps {
  currentShift: CashShift | null;
  expectedCash: number;
  onOpenShiftModal: () => void;
  onGoHome: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentShift,
  expectedCash,
  onOpenShiftModal,
  onGoHome,
}) => {
  const [timeStr, setTimeStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      setTimeStr(
        d.toLocaleTimeString('es-AR', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setDateStr(
        d.toLocaleDateString('es-AR', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-gradient-to-r from-orange-600 to-amber-700 text-white shadow-lg sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand / Logo */}
        <div
          onClick={onGoHome}
          className="flex items-center gap-3 cursor-pointer group select-none transition-transform active:scale-95"
        >
          <img
            src="/logo.png"
            alt="Veterinaria Mascotas"
            className="h-12 w-12 object-contain rounded-xl bg-white/10 p-0.5 shadow-sm border border-white/20 group-hover:border-white/50 transition-colors"
            onError={(e) => {
              // Fallback if image fails to load
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div>
            <h1 className="text-xl font-extrabold tracking-tight leading-tight flex items-center gap-1.5">
              Veterinaria Mascotas
            </h1>
            <p className="text-xs text-orange-100/90 font-medium tracking-wide">
              Sistema de gestión
            </p>
          </div>
        </div>

        {/* Cash Shift Quick Badge & Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onOpenShiftModal}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs sm:text-sm font-semibold transition-all shadow-sm ${
              currentShift
                ? 'bg-emerald-950/40 text-emerald-100 hover:bg-emerald-950/60 border border-emerald-400/40 hover:border-emerald-300'
                : 'bg-red-950/40 text-red-100 hover:bg-red-950/60 border border-red-400/40 hover:border-red-300 animate-pulse'
            }`}
            title={currentShift ? 'Caja abierta: clic para ver arqueo o cerrar' : 'Caja cerrada: clic para abrir'}
          >
            <span
              className={`h-2.5 w-2.5 rounded-full ${
                currentShift ? 'bg-emerald-400' : 'bg-red-400'
              }`}
            />
            {currentShift ? (
              <span>
                Caja abierta:{' '}
                <strong className="text-white font-bold tracking-tight">
                  {$(expectedCash)}
                </strong>
              </span>
            ) : (
              <span className="font-bold">Caja cerrada · Abrir caja</span>
            )}
          </button>

          {/* Clock */}
          <div className="text-right pl-2 border-l border-white/20 select-none hidden sm:block">
            <span className="block text-xl font-bold font-mono tracking-tight leading-none text-white">
              {timeStr}
            </span>
            <span className="block text-[11px] text-orange-100/80 capitalize leading-tight mt-0.5">
              {dateStr}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
