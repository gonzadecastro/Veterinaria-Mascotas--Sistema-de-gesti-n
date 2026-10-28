import React, { useState } from 'react';
import { AppData, CashShift, PaymentMethod } from '../types';
import { $, num, r2, today, nowTime, nowIso, fd } from '../utils/formatters';
import { calculateExpectedShiftCash, calculateShiftSummary } from '../utils/financial';
import { AlertTriangle, CheckCircle, Clock, DollarSign, History, Lock, Unlock, X, Printer } from 'lucide-react';

interface CashShiftModalProps {
  data: AppData;
  isOpen: boolean;
  onClose: () => void;
  onOpenShift: (initialCash: number, openedBy: string, notes?: string) => void;
  onCloseShift: (shiftId: number, countedCash: number, notes?: string) => void;
  onPrintShiftTicket: (shift: CashShift) => void;
}

export const CashShiftModal: React.FC<CashShiftModalProps> = ({
  data,
  isOpen,
  onClose,
  onOpenShift,
  onCloseShift,
  onPrintShiftTicket,
}) => {
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [initialCashInput, setInitialCashInput] = useState<string>('0');
  const [openedByInput, setOpenedByInput] = useState<string>('Turno General');
  const [openNotes, setOpenNotes] = useState<string>('');

  const [countedCashInput, setCountedCashInput] = useState<string>('');
  const [closeNotes, setCloseNotes] = useState<string>('');
  const [selectedHistoryShift, setSelectedHistoryShift] = useState<CashShift | null>(null);

  if (!isOpen) return null;

  const currentShift = data.shifts.find((s) => s.status === 'open') || null;
  const currentSummary = currentShift ? calculateShiftSummary(data, currentShift) : null;
  const currentExpected = currentShift ? calculateExpectedShiftCash(data, currentShift) : 0;

  const countedNum = num(countedCashInput);
  const diff = r2(countedNum - currentExpected);

  const handleOpenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const initCash = Math.max(0, num(initialCashInput));
    const by = openedByInput.trim() || 'General';
    onOpenShift(initCash, by, openNotes.trim());
  };

  const handleCloseSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentShift) return;
    if (countedCashInput.trim() === '') {
      alert('Por favor, ingresá cuánto dinero físico contaste en la caja.');
      return;
    }
    const counted = Math.max(0, num(countedCashInput));
    if (Math.abs(diff) > 0.01) {
      const confirmMsg =
        diff < 0
          ? `Hay un FALTANTE de ${$(-diff)}. ¿Deseás cerrar la caja de todos modos?`
          : `Hay un SOBRANTE de ${$(diff)}. ¿Deseás cerrar la caja de todos modos?`;
      if (!window.confirm(confirmMsg)) return;
    }
    onCloseShift(currentShift.id, counted, closeNotes.trim());
    setCountedCashInput('');
    setCloseNotes('');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full overflow-hidden my-6">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white p-4 sm:p-5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl ${
                currentShift ? 'bg-emerald-500/20 text-emerald-400' : 'bg-orange-500/20 text-orange-400'
              }`}
            >
              <DollarSign className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold tracking-tight">Control de Caja y Turnos</h2>
              <p className="text-xs text-stone-300">
                Apertura, arqueo en tiempo real y cierre diario
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-white hover:bg-stone-700 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-stone-200 bg-stone-100/60 p-1">
          <button
            onClick={() => {
              setActiveTab('current');
              setSelectedHistoryShift(null);
            }}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'current'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            {currentShift ? <Unlock className="w-4 h-4 text-emerald-600" /> : <Lock className="w-4 h-4 text-amber-600" />}
            {currentShift ? 'Caja Actual en Curso' : 'Apertura de Caja'}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-2 px-4 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'history'
                ? 'bg-white text-stone-900 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <History className="w-4 h-4 text-stone-600" />
            Historial de Cierres ({data.shifts.filter((s) => s.status === 'closed').length})
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {activeTab === 'current' && !currentShift && (
            /* =================== FORM: ABRIR CAJA =================== */
            <form onSubmit={handleOpenSubmit} className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong className="block font-semibold">La caja está actualmente CERRADA</strong>
                  Para comenzar la jornada o turno, ingresá el fondo inicial (cambio o dinero base) con el que arrancás en el cajón.
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">
                  Monto inicial en efectivo (Fondo de cambio)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    required
                    value={initialCashInput}
                    onChange={(e) => setInitialCashInput(e.target.value)}
                    className="w-full pl-8 pr-4 py-2.5 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden text-lg font-bold text-stone-900"
                    placeholder="0"
                    autoFocus
                  />
                </div>
                <p className="text-xs text-stone-500 mt-1">
                  Ejemplo: $10.000 si dejaste billetes chicos para dar vuelto.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">
                  Responsable / Cajero
                </label>
                <input
                  type="text"
                  value={openedByInput}
                  onChange={(e) => setOpenedByInput(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden font-medium text-stone-900"
                  placeholder="Ej: Turno Mañana / Gonzalo"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-stone-700 mb-1">
                  Observaciones de apertura (opcional)
                </label>
                <textarea
                  rows={2}
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden text-sm"
                  placeholder="Ej: Billetes de 500 y 1000 para cambio..."
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20 transition-transform active:scale-95 flex items-center gap-2"
                >
                  <Unlock className="w-4 h-4" />
                  Abrir Caja Ahora
                </button>
              </div>
            </form>
          )}

          {activeTab === 'current' && currentShift && currentSummary && (
            /* =================== CAJA ABIERTA: RESUMEN Y ARQUEO =================== */
            <div className="space-y-6">
              {/* Header card */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-200/80 text-emerald-800 mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    Turno en curso #{currentShift.id}
                  </span>
                  <h3 className="text-base font-bold text-emerald-950">
                    Abierta por {currentShift.openedBy}
                  </h3>
                  <p className="text-xs text-emerald-800">
                    Desde el {fd(currentShift.openedDate)} a las {currentShift.openedTime} hs
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 block">Efectivo esperado</span>
                  <span className="text-2xl font-black text-emerald-800">
                    {$(currentExpected)}
                  </span>
                </div>
              </div>

              {/* Shift metrics grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs sm:text-sm">
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Fondo inicial</span>
                  <b className="text-base text-stone-900 font-bold">{$(currentShift.initialCash)}</b>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Ventas en Efectivo</span>
                  <b className="text-base text-emerald-700 font-bold">+{$(currentSummary.cashSales)}</b>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Cobros de Deudas</span>
                  <b className="text-base text-emerald-700 font-bold">+{$(currentSummary.cashDebtCollections)}</b>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Ingresos Varios</span>
                  <b className="text-base text-emerald-700 font-bold">+{$(currentSummary.cashManualInflows)}</b>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Gastos en Efectivo</span>
                  <b className="text-base text-rose-700 font-bold">−{$(currentSummary.cashExpenses)}</b>
                </div>
                <div className="bg-stone-50 border border-stone-200 rounded-xl p-3">
                  <span className="text-stone-500 block text-xs">Devoluciones/Anulaciones</span>
                  <b className="text-base text-rose-700 font-bold">−{$(currentSummary.cashRefunds)}</b>
                </div>
              </div>

              {/* Digital breakdown */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-3.5 text-xs sm:text-sm">
                <div className="flex justify-between items-center mb-1.5 font-bold text-blue-950">
                  <span>Cobrado en Medios Digitales (Banco / MP / Tarjetas):</span>
                  <span className="text-blue-800 text-base">{$(currentSummary.digitalTotal)}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-stone-600 text-xs">
                  <div>
                    Transferencias: <b>{$(currentSummary.salesByMethod['Transferencia'])}</b>
                  </div>
                  <div>
                    Mercado Pago: <b>{$(currentSummary.salesByMethod['Mercado Pago'])}</b>
                  </div>
                  <div>
                    Tarjetas: <b>{$(currentSummary.salesByMethod['Tarjeta'])}</b>
                  </div>
                </div>
              </div>

              {/* Close & Arqueo Form */}
              <form onSubmit={handleCloseSubmit} className="border-t border-stone-200 pt-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-base font-extrabold text-stone-900 flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-stone-700" />
                    Arqueo de Dinero y Cierre de Caja
                  </h4>
                  <button
                    type="button"
                    onClick={() => onPrintShiftTicket(currentShift)}
                    className="text-xs text-orange-700 font-semibold flex items-center gap-1 hover:underline"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir Comprobante
                  </button>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                      Dinero en efectivo contado en el cajón *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                      <input
                        type="number"
                        step="any"
                        min="0"
                        required
                        value={countedCashInput}
                        onChange={(e) => setCountedCashInput(e.target.value)}
                        placeholder="Contá los billetes y escribí acá"
                        className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden font-bold text-stone-900 text-lg"
                      />
                    </div>
                  </div>

                  {/* Difference box */}
                  <div className="flex flex-col justify-center">
                    <span className="block text-xs font-semibold text-stone-500 mb-1">
                      Diferencia de Arqueo
                    </span>
                    {countedCashInput.trim() === '' ? (
                      <div className="p-2.5 rounded-xl bg-stone-100 text-stone-500 text-xs font-medium border border-stone-200 text-center">
                        Ingresá el dinero contado para calcular
                      </div>
                    ) : Math.abs(diff) < 0.01 ? (
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 flex items-center justify-center gap-1.5">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Caja Perfecta: $0 de diferencia
                      </div>
                    ) : diff > 0 ? (
                      <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-900 text-xs font-bold border border-emerald-300 flex items-center justify-between px-3">
                        <span>🟢 Sobrante de dinero:</span>
                        <span className="text-sm">+{$(diff)}</span>
                      </div>
                    ) : (
                      <div className="p-2.5 rounded-xl bg-rose-100 text-rose-900 text-xs font-bold border border-rose-300 flex items-center justify-between px-3">
                        <span>🔴 Faltante de dinero:</span>
                        <span className="text-sm">−{$(-diff)}</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                    Observaciones de cierre (opcional)
                  </label>
                  <input
                    type="text"
                    value={closeNotes}
                    onChange={(e) => setCloseNotes(e.target.value)}
                    placeholder="Ej: Se retiraron $30.000 para el banco, quedaron $10.000 para mañana"
                    className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:border-orange-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-semibold hover:bg-stone-100 transition-colors"
                  >
                    Mantener abierta
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold shadow-md shadow-rose-600/20 transition-transform active:scale-95 flex items-center gap-2"
                  >
                    <Lock className="w-4 h-4" />
                    Cerrar Caja y Guardar Arqueo
                  </button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'history' && (
            /* =================== HISTORIAL DE TURNOS CERRADOS =================== */
            <div className="space-y-3">
              {selectedHistoryShift ? (
                /* Detalle de turno cerrado seleccionado */
                <div className="space-y-4">
                  <button
                    onClick={() => setSelectedHistoryShift(null)}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    ← Volver a la lista de cierres
                  </button>
                  <div className="border border-stone-200 rounded-xl p-4 bg-stone-50 space-y-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-stone-900 text-base">
                          Turno #{selectedHistoryShift.id}
                        </h4>
                        <p className="text-xs text-stone-500">
                          {fd(selectedHistoryShift.openedDate)} ({selectedHistoryShift.openedTime} - {selectedHistoryShift.closedTime || 'Cierre'})
                        </p>
                      </div>
                      <button
                        onClick={() => onPrintShiftTicket(selectedHistoryShift)}
                        className="px-3 py-1.5 rounded-lg border border-stone-300 text-xs font-bold hover:bg-white flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Imprimir ticket
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <span className="text-stone-500 block">Fondo inicial</span>
                        <b>{$(selectedHistoryShift.initialCash)}</b>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <span className="text-stone-500 block">Efectivo esperado</span>
                        <b>{$(selectedHistoryShift.expectedCash)}</b>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <span className="text-stone-500 block">Efectivo contado</span>
                        <b>{$(selectedHistoryShift.countedCash)}</b>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-stone-200">
                        <span className="text-stone-500 block">Diferencia</span>
                        <b
                          className={
                            (selectedHistoryShift.diffCash || 0) < 0
                              ? 'text-rose-600'
                              : (selectedHistoryShift.diffCash || 0) > 0
                              ? 'text-emerald-600'
                              : 'text-stone-700'
                          }
                        >
                          {(selectedHistoryShift.diffCash || 0) > 0 ? '+' : ''}
                          {$(selectedHistoryShift.diffCash)}
                        </b>
                      </div>
                    </div>

                    {selectedHistoryShift.notes && (
                      <p className="text-xs text-stone-600 italic bg-white p-2 rounded-lg border border-stone-200">
                        Nota: {selectedHistoryShift.notes}
                      </p>
                    )}
                  </div>
                </div>
              ) : data.shifts.filter((s) => s.status === 'closed').length === 0 ? (
                <div className="text-center py-10 text-stone-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">Aún no hay turnos cerrados en el historial.</p>
                </div>
              ) : (
                data.shifts
                  .filter((s) => s.status === 'closed')
                  .sort((a, b) => (b.closedAt || '').localeCompare(a.closedAt || ''))
                  .map((shift) => (
                    <div
                      key={shift.id}
                      onClick={() => setSelectedHistoryShift(shift)}
                      className="p-3.5 rounded-xl border border-stone-200 hover:border-orange-300 hover:bg-orange-50/40 cursor-pointer transition-all flex items-center justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-stone-900 font-bold text-sm">
                            Turno #{shift.id}
                          </strong>
                          <span className="text-xs text-stone-500">
                            {fd(shift.closedDate || shift.openedDate)}
                          </span>
                        </div>
                        <p className="text-xs text-stone-500 mt-0.5">
                          Cajero: {shift.closedBy || shift.openedBy} · {shift.openedTime} a {shift.closedTime} hs
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs text-stone-500 block">Efectivo final</span>
                        <strong className="text-stone-900 font-bold text-sm">
                          {$(shift.countedCash ?? shift.expectedCash)}
                        </strong>
                        {shift.diffCash != null && Math.abs(shift.diffCash) > 0.01 && (
                          <span
                            className={`text-[11px] font-bold block ${
                              shift.diffCash < 0 ? 'text-rose-600' : 'text-emerald-600'
                            }`}
                          >
                            {shift.diffCash < 0 ? 'Faltante: ' : 'Sobrante: '}
                            {$(Math.abs(shift.diffCash))}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
