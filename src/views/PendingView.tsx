import React, { useState } from 'react';
import { AppData, PaymentMethod, Purchase, Sale } from '../types';
import { $, num, r2, today, nowTime, fd } from '../utils/formatters';
import { paidOf, sold, bought } from '../utils/financial';
import { ArrowLeft, Check, CheckCircle2, Clock, DollarSign, User, Truck, X } from 'lucide-react';

interface PendingViewProps {
  data: AppData;
  onNavigateHome: () => void;
  onRecordPayment: (kind: 's' | 'p', id: number, amount: number, method: PaymentMethod) => void;
}

export const PendingView: React.FC<PendingViewProps> = ({
  data,
  onNavigateHome,
  onRecordPayment,
}) => {
  // Modal for payment
  const [payingTarget, setPayingTarget] = useState<{
    kind: 's' | 'p';
    order: Sale | Purchase;
    debt: number;
  } | null>(null);

  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('Efectivo');

  const pendingSales = sold(data)
    .map((s) => ({
      sale: s,
      debt: r2(s.total - paidOf(s)),
    }))
    .filter((x) => x.debt > 0.01);

  const pendingPurchases = bought(data)
    .map((p) => ({
      purchase: p,
      debt: r2(p.total - paidOf(p)),
    }))
    .filter((x) => x.debt > 0.01);

  const totalReceivable = pendingSales.reduce((acc, x) => acc + x.debt, 0);
  const totalPayable = pendingPurchases.reduce((acc, x) => acc + x.debt, 0);

  const openPayModal = (kind: 's' | 'p', order: Sale | Purchase, debt: number) => {
    setPayingTarget({ kind, order, debt });
    setPayAmount(String(debt));
    setPayMethod('Efectivo');
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingTarget) return;
    const a = num(payAmount);
    if (a <= 0) {
      alert('El monto a pagar debe ser mayor a 0');
      return;
    }
    if (a > payingTarget.debt + 0.01) {
      alert(`El monto no puede superar la deuda pendiente (${$(payingTarget.debt)})`);
      return;
    }

    onRecordPayment(payingTarget.kind, payingTarget.order.id, a, payMethod);
    setPayingTarget(null);
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Header */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onNavigateHome}
          className="p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            📋 Cuentas Pendientes (Corrientes)
          </h2>
          <p className="text-xs text-stone-500">
            Control de cobros a clientes y deudas con proveedores
          </p>
        </div>
      </div>

      {/* Summary Totals */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block text-amber-800">
              Total a Cobrar a Clientes
            </span>
            <b className="text-2xl font-black text-amber-700 block mt-0.5">
              {$(totalReceivable)}
            </b>
            <span className="text-xs text-amber-700/80">
              {pendingSales.length} {pendingSales.length === 1 ? 'cliente con deuda' : 'clientes con deuda'}
            </span>
          </div>
          <User className="w-10 h-10 text-amber-400 opacity-60" />
        </div>

        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-950 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider block text-rose-800">
              Total a Pagar a Proveedores
            </span>
            <b className="text-2xl font-black text-rose-700 block mt-0.5">
              {$(totalPayable)}
            </b>
            <span className="text-xs text-rose-700/80">
              {pendingPurchases.length} {pendingPurchases.length === 1 ? 'compra pendiente' : 'compras pendientes'}
            </span>
          </div>
          <Truck className="w-10 h-10 text-rose-400 opacity-60" />
        </div>
      </div>

      {/* Two columns: Clients vs Suppliers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Column 1: Clientes (Me deben) */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-1.5">
              <User className="w-4 h-4 text-amber-600" />
              Cuentas de Clientes por Cobrar
            </h3>
            <span className="text-xs font-bold text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full">
              {pendingSales.length}
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
            {pendingSales.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs sm:text-sm flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                ¡Excelente! No hay clientes con deuda pendiente.
              </div>
            ) : (
              pendingSales.map(({ sale, debt }) => (
                <div
                  key={sale.id}
                  className="py-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-[150px]">
                    <strong className="block text-stone-900 font-bold text-sm">
                      {sale.cl || 'Cliente sin nombre'}
                    </strong>
                    <span className="text-stone-400 text-xs block">
                      Venta #{sale.n} · {fd(sale.d)} · Total venta: {$(sale.total)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-stone-400 block">Debe</span>
                    <strong className="text-base font-black text-amber-600 block">
                      {$(debt)}
                    </strong>
                  </div>

                  <button
                    onClick={() => openPayModal('s', sale, debt)}
                    className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Cobrar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Column 2: Proveedores (Tengo que pagar) */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-stone-100 pb-2.5">
            <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-1.5">
              <Truck className="w-4 h-4 text-rose-600" />
              Facturas de Proveedores por Pagar
            </h3>
            <span className="text-xs font-bold text-rose-700 bg-rose-100 px-2.5 py-0.5 rounded-full">
              {pendingPurchases.length}
            </span>
          </div>

          <div className="divide-y divide-stone-100 max-h-[500px] overflow-y-auto">
            {pendingPurchases.length === 0 ? (
              <div className="py-8 text-center text-stone-400 text-xs sm:text-sm flex flex-col items-center">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mb-1" />
                ¡Al día! No tenés pagos pendientes a proveedores.
              </div>
            ) : (
              pendingPurchases.map(({ purchase, debt }) => (
                <div
                  key={purchase.id}
                  className="py-3 px-1 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm hover:bg-stone-50 rounded-lg transition-colors"
                >
                  <div className="flex-1 min-w-[150px]">
                    <strong className="block text-stone-900 font-bold text-sm">
                      {purchase.pv}
                    </strong>
                    <span className="text-stone-400 text-xs block">
                      Compra #{purchase.n} · {fd(purchase.d)} · Total: {$(purchase.total)}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-xs text-stone-400 block">A pagar</span>
                    <strong className="text-base font-black text-rose-600 block">
                      {$(debt)}
                    </strong>
                  </div>

                  <button
                    onClick={() => openPayModal('p', purchase, debt)}
                    className="px-3.5 py-1.5 rounded-xl bg-blue-700 hover:bg-blue-800 text-white font-bold text-xs shadow-xs transition-transform active:scale-95 flex items-center gap-1"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    Pagar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Record Payment Modal */}
      {payingTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden my-6">
            <div className="bg-stone-900 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base flex items-center gap-1.5">
                {payingTarget.kind === 's'
                  ? `Cobrar a Cliente: ${(payingTarget.order as Sale).cl || 'Sin nombre'}`
                  : `Pagar a Proveedor: ${(payingTarget.order as Purchase).pv}`}
              </h3>
              <button onClick={() => setPayingTarget(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-5 space-y-4 text-xs sm:text-sm">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600 flex justify-between items-center">
                <span>Saldo pendiente actual:</span>
                <b className="text-base text-stone-900 font-black">{$(payingTarget.debt)}</b>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Monto a {payingTarget.kind === 's' ? 'cobrar' : 'pagar'} *
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
                  <input
                    type="number"
                    step="any"
                    min="1"
                    max={payingTarget.debt}
                    required
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-stone-300 font-bold text-stone-900 text-lg"
                    autoFocus
                  />
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => setPayAmount(String(payingTarget.debt))}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    Pagar saldo total ({$(payingTarget.debt)})
                  </button>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Forma de pago
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 bg-white font-semibold text-stone-900"
                >
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia Bancaria</option>
                  <option value="Tarjeta">Tarjeta</option>
                  <option value="Mercado Pago">Mercado Pago</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setPayingTarget(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20"
                >
                  Registrar {payingTarget.kind === 's' ? 'Cobro' : 'Pago'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
