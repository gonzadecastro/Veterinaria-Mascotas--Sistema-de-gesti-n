import React, { useState } from 'react';
import { AppData, CashMovement, PaymentMethod } from '../types';
import { $, num, today, nowTime, fd, mk } from '../utils/formatters';
import { getDigitalBalances, getPhysicalCashBalance, getUnifiedLedger } from '../utils/financial';
import { ArrowDownRight, ArrowLeft, ArrowUpRight, DollarSign, Filter, Plus, Search, Wallet, X } from 'lucide-react';

interface MoneyViewProps {
  data: AppData;
  onNavigateHome: () => void;
  onAddManualMovement: (movement: Omit<CashMovement, 'id'>) => void;
  onOpenShiftModal: () => void;
}

export const MoneyView: React.FC<MoneyViewProps> = ({
  data,
  onNavigateHome,
  onAddManualMovement,
  onOpenShiftModal,
}) => {
  const [modalType, setModalType] = useState<'in' | 'out' | null>(null);
  const [concept, setConcept] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [method, setMethod] = useState<PaymentMethod>('Efectivo');
  const [moveDate, setMoveDate] = useState<string>(today());

  // Filters
  const [filterMethod, setFilterMethod] = useState<string>('');
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const physicalCash = getPhysicalCashBalance(data);
  const digitalBalances = getDigitalBalances(data);
  const ledger = getUnifiedLedger(data);

  const currentMonth = mk(today());
  const monthMovements = ledger.filter((x) => mk(x.d) === currentMonth);
  const monthIn = monthMovements.filter((x) => x.t === 'in').reduce((acc, x) => acc + x.a, 0);
  const monthOut = monthMovements.filter((x) => x.t === 'out').reduce((acc, x) => acc + x.a, 0);
  const monthNet = monthIn - monthOut;

  const handleSaveMovement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalType) return;
    const c = concept.trim();
    if (!c) {
      alert('Por favor, indicá el concepto o motivo del movimiento.');
      return;
    }
    const a = num(amount);
    if (a <= 0) {
      alert('El monto debe ser mayor a 0.');
      return;
    }

    const currentShift = data.shifts.find((s) => s.status === 'open');

    onAddManualMovement({
      d: moveDate || today(),
      time: nowTime(),
      t: modalType,
      c,
      a,
      m: method,
      shiftId: currentShift ? currentShift.id : undefined,
    });

    setModalType(null);
    setConcept('');
    setAmount('');
  };

  const filteredLedger = ledger.filter((item) => {
    const matchMethod = !filterMethod || item.m === filterMethod;
    const matchType = !filterType || item.t === filterType;
    const matchSearch =
      !search ||
      item.c.toLowerCase().includes(search.toLowerCase()) ||
      String(item.a).includes(search);
    return matchMethod && matchType && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div className="flex items-center gap-2">
          <button
            onClick={onNavigateHome}
            className="p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              💵 Control de Dinero y Finanzas
            </h2>
            <p className="text-xs text-stone-500">
              Efectivo en cajón, cobros digitales, ingresos y egresos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setModalType('in')}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Entró dinero
          </button>
          <button
            onClick={() => setModalType('out')}
            className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-xs flex items-center gap-1.5 transition-transform active:scale-95"
          >
            <Plus className="w-4 h-4" />
            Salió dinero (gasto)
          </button>
        </div>
      </div>

      {/* Balances Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border-2 border-emerald-300 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Efectivo en Caja Físico
          </span>
          <b className="text-2xl font-black text-emerald-700 block mt-1">
            {$(physicalCash)}
          </b>
          <button
            onClick={onOpenShiftModal}
            className="text-xs text-emerald-800 font-bold hover:underline block mt-1"
          >
            Arqueo / Abrir Cierre →
          </button>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Ingreso Neto del Mes
          </span>
          <b className={`text-2xl font-black block mt-1 ${monthNet >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {monthNet >= 0 ? '+' : ''}
            {$(monthNet)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Entraron {$(monthIn)}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Gastos Totales del Mes
          </span>
          <b className="text-2xl font-black text-rose-600 block mt-1">
            {$(monthOut)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Gastos, compras y retiros
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Medios Digitales
          </span>
          <b className="text-xl font-black text-blue-700 block mt-1">
            {$(digitalBalances['Transferencia'] + digitalBalances['Mercado Pago'] + digitalBalances['Tarjeta'])}
          </b>
          <span className="text-[11px] text-stone-500 mt-0.5 block">
            MP: {$(digitalBalances['Mercado Pago'])} · Transf: {$(digitalBalances['Transferencia'])}
          </span>
        </div>
      </div>

      {/* Movement List with Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 pb-3">
          <h3 className="font-extrabold text-stone-900 text-base">
            Libro de Movimientos de Dinero ({filteredLedger.length})
          </h3>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar movimiento..."
                className="pl-8 pr-2.5 py-1.5 rounded-lg border border-stone-300 text-xs focus:border-orange-500 focus:outline-hidden"
              />
            </div>

            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="py-1.5 px-2 rounded-lg border border-stone-300 text-xs bg-white font-medium"
            >
              <option value="">Todas las operaciones</option>
              <option value="in">Solo Ingresos (+)</option>
              <option value="out">Solo Egresos / Gastos (-)</option>
            </select>

            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="py-1.5 px-2 rounded-lg border border-stone-300 text-xs bg-white font-medium"
            >
              <option value="">Todos los medios</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Mercado Pago">Mercado Pago</option>
            </select>
          </div>
        </div>

        {/* List items */}
        <div className="divide-y divide-stone-100 max-h-[600px] overflow-y-auto">
          {filteredLedger.length === 0 ? (
            <div className="p-8 text-center text-stone-400 text-xs sm:text-sm">
              No hay movimientos que coincidan con la búsqueda.
            </div>
          ) : (
            filteredLedger.map((item) => (
              <div
                key={item.id}
                className="py-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm hover:bg-stone-50 rounded-lg transition-colors"
              >
                <div className="flex-1 min-w-[180px]">
                  <strong className="block text-stone-900 font-bold">
                    {item.c}
                  </strong>
                  <div className="flex items-center gap-2 text-stone-400 text-xs mt-0.5">
                    <span>{fd(item.d)} {item.time || ''}</span>
                    <span className="px-1.5 py-0.2 rounded-md bg-stone-100 font-medium text-stone-600">
                      {item.m}
                    </span>
                    {item.source === 'refund_sale' && (
                      <span className="text-rose-600 font-bold text-[11px]">
                        (Devolución venta)
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span
                    className={`text-base font-black ${
                      item.t === 'in' ? 'text-emerald-700' : 'text-rose-700'
                    }`}
                  >
                    {item.t === 'in' ? '+' : '−'}
                    {$(item.a)}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Manual Movement Modal */}
      {modalType && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden my-6">
            <div
              className={`p-4 text-white flex items-center justify-between ${
                modalType === 'in'
                  ? 'bg-gradient-to-r from-emerald-600 to-emerald-700'
                  : 'bg-gradient-to-r from-rose-600 to-rose-700'
              }`}
            >
              <h3 className="font-bold text-base flex items-center gap-1.5">
                {modalType === 'in' ? (
                  <>
                    <ArrowUpRight className="w-5 h-5" />
                    Registrar Entrada de Dinero
                  </>
                ) : (
                  <>
                    <ArrowDownRight className="w-5 h-5" />
                    Registrar Salida de Dinero / Gasto
                  </>
                )}
              </h3>
              <button onClick={() => setModalType(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-5 space-y-4 text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  ¿De qué fue el movimiento? (Concepto) *
                </label>
                <input
                  type="text"
                  required
                  value={concept}
                  onChange={(e) => setConcept(e.target.value)}
                  placeholder={
                    modalType === 'in'
                      ? 'Ej: Aporte inicial de capital, devolución, cobro de alquiler'
                      : 'Ej: Alquiler del local, factura de luz, bolsas, sueldo, retiro'
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 font-medium text-stone-900 focus:border-orange-500 focus:outline-hidden"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Monto *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0"
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border border-stone-300 font-bold text-stone-900 text-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Medio de pago</label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                  >
                    <option value="Efectivo">Efectivo (Cajón)</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Fecha</label>
                  <input
                    type="date"
                    value={moveDate}
                    onChange={(e) => setMoveDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-medium"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalType(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`px-5 py-2 rounded-xl text-white font-bold shadow-md ${
                    modalType === 'in' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Guardar Movimiento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
