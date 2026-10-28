import React, { useState } from 'react';
import { AppData, CartItem, Payment, PaymentMethod, Sale } from '../types';
import { $, num, r2, today, nowTime, fd } from '../utils/formatters';
import { AlertCircle, Calendar, Check, DollarSign, History, Plus, Trash2, X } from 'lucide-react';

interface EditSaleModalProps {
  sale: Sale;
  data: AppData;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedSale: Sale) => void;
}

export const EditSaleModal: React.FC<EditSaleModalProps> = ({
  sale,
  data,
  isOpen,
  onClose,
  onSave,
}) => {
  if (!isOpen || !sale) return null;

  const [client, setClient] = useState<string>(sale.cl || '');
  const [items, setItems] = useState<CartItem[]>(
    sale.items.map((i) => ({ ...i }))
  );
  const [payments, setPayments] = useState<Payment[]>(
    sale.pays.map((p) => ({ ...p }))
  );

  // New payment entry state
  const [newPayAmount, setNewPayAmount] = useState<string>('');
  const [newPayMethod, setNewPayMethod] = useState<PaymentMethod>('Efectivo');
  const [newPayDate, setNewPayDate] = useState<string>(today());
  const [editReason, setEditReason] = useState<string>('');

  // Product search to add item
  const [searchProd, setSearchProd] = useState<string>('');

  // Total calculation
  const total = r2(items.reduce((acc, i) => acc + i.q * i.p, 0));
  const totalPaid = r2(payments.reduce((acc, p) => acc + p.a, 0));
  const debt = r2(Math.max(0, total - totalPaid));

  // Item adjustments
  const handleQtyChange = (index: number, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(index);
      return;
    }
    const updated = [...items];
    const item = updated[index];
    const prod = data.products.find((p) => p.id === item.pid);

    if (prod && !prod.svc) {
      // Find original quantity in this sale before editing
      const origItem = sale.items.find((i) => i.pid === item.pid);
      const origQty = origItem ? origItem.q : 0;
      const additionalNeeded = newQty - origQty;

      if (additionalNeeded > 0 && prod.stock < additionalNeeded) {
        alert(`No alcanza el stock de ${prod.name}: quedan ${prod.stock} disponibles adicionales.`);
        return;
      }
    }

    item.q = r2(newQty);
    setItems(updated);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const updated = [...items];
    updated[index].p = Math.max(0, r2(newPrice));
    setItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert('La venta debe tener al menos un producto.');
      return;
    }
    const updated = [...items];
    updated.splice(index, 1);
    setItems(updated);
  };

  const handleAddItem = (prodId: number) => {
    const prod = data.products.find((p) => p.id === prodId);
    if (!prod) return;

    if (!prod.svc && prod.stock <= 0) {
      alert(`No hay stock disponible de ${prod.name}.`);
      return;
    }

    const existingIndex = items.findIndex((i) => i.pid === prodId);
    if (existingIndex >= 0) {
      handleQtyChange(existingIndex, items[existingIndex].q + 1);
    } else {
      setItems([
        ...items,
        {
          pid: prod.id,
          nm: prod.name,
          q: 1,
          p: prod.price,
          c: prod.cost,
        },
      ]);
    }
    setSearchProd('');
  };

  // Payment adjustments (Priority 2: Preserve financial history!)
  const handleAddPayment = () => {
    const amt = r2(num(newPayAmount));
    if (amt <= 0) {
      alert('Ingresá un monto válido mayor a 0');
      return;
    }
    if (totalPaid + amt > total + 0.01) {
      alert(`El total pagado no puede superar el total de la venta (${$(total)}).`);
      return;
    }

    setPayments([
      ...payments,
      {
        d: newPayDate || today(),
        time: nowTime(),
        a: amt,
        m: newPayMethod,
        note: 'Pago agregado en edición',
      },
    ]);
    setNewPayAmount('');
  };

  const handleRemovePayment = (index: number) => {
    if (window.confirm('¿Eliminar este registro de pago de la venta?')) {
      const updated = [...payments];
      updated.splice(index, 1);
      setPayments(updated);
    }
  };

  const handlePaymentMethodChange = (index: number, newMethod: PaymentMethod) => {
    const updated = [...payments];
    updated[index].m = newMethod;
    setPayments(updated);
  };

  const handleSave = () => {
    if (!items.length) {
      alert('La venta debe contener al menos un producto.');
      return;
    }
    if (debt > 0.01 && !client.trim()) {
      alert('Si queda saldo pendiente/deuda, es obligatorio ingresar el nombre del cliente.');
      return;
    }
    if (totalPaid > total + 0.01) {
      alert(`El total cobrado (${$(totalPaid)}) no puede ser mayor al total de la venta (${$(total)}).`);
      return;
    }

    // Build audit record
    const prevItemsStr = sale.items.map((i) => `${i.q}x ${i.nm}`).join(', ');
    const note = editReason.trim() || 'Modificación general de ítems/pagos';

    const updatedSale: Sale = {
      ...sale,
      cl: client.trim(),
      total,
      items,
      pays: payments,
      editHistory: [
        ...(sale.editHistory || []),
        {
          date: today(),
          time: nowTime(),
          note,
          prevTotal: sale.total,
          newTotal: total,
          prevItemsSummary: prevItemsStr,
        },
      ],
    };

    onSave(updatedSale);
  };

  const searchResults = searchProd.trim()
    ? data.products
        .filter(
          (p) =>
            p.name.toLowerCase().includes(searchProd.toLowerCase()) ||
            p.code.toLowerCase().includes(searchProd.toLowerCase())
        )
        .slice(0, 5)
    : [];

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-3xl w-full overflow-hidden my-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white p-4 sm:p-5 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Editar Venta #{sale.n}
            </h3>
            <p className="text-xs text-orange-100">
              Fecha original: {fd(sale.d)} {sale.time || ''} · Preservando historial financiero
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/80 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-6">
          {/* Client input */}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                Cliente (obligatorio si hay deuda)
              </label>
              <input
                type="text"
                value={client}
                onChange={(e) => setClient(e.target.value)}
                placeholder="Nombre o teléfono del cliente"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 font-medium text-stone-900 focus:border-orange-500 focus:outline-hidden text-sm"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
                Motivo del cambio (para el historial)
              </label>
              <input
                type="text"
                value={editReason}
                onChange={(e) => setEditReason(e.target.value)}
                placeholder="Ej: Cliente cambió de producto / corrección de pago"
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-sm focus:border-orange-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-xs">
                Productos / Servicios en la venta
              </h4>
            </div>

            {/* Add product quick search */}
            <div className="relative">
              <input
                type="text"
                value={searchProd}
                onChange={(e) => setSearchProd(e.target.value)}
                placeholder="🔍 Agregar otro producto o servicio (escribí nombre o código)..."
                className="w-full px-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:border-orange-500 focus:outline-hidden bg-stone-50"
              />
              {searchResults.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-stone-200 rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-stone-100">
                  {searchResults.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => handleAddItem(p.id)}
                      className="w-full px-4 py-2 text-left hover:bg-orange-50 flex items-center justify-between text-xs sm:text-sm"
                    >
                      <span>
                        <b>{p.name}</b> <small className="text-stone-500">({p.svc ? 'Servicio' : `Stock: ${p.stock}`})</small>
                      </span>
                      <b className="text-orange-700 font-bold">{$(p.price)}</b>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items list */}
            <div className="border border-stone-200 rounded-xl divide-y divide-stone-200 overflow-hidden">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 bg-white flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                  <div className="flex-1 min-w-[140px]">
                    <strong className="block text-stone-900">{item.nm}</strong>
                    <span className="text-stone-400 text-xs">Costo c/u: {$(item.c)}</span>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.q - 1)}
                      className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold text-sm flex items-center justify-center"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={item.q}
                      onChange={(e) => handleQtyChange(idx, num(e.target.value))}
                      className="w-14 text-center py-1 rounded-lg border border-stone-300 font-bold text-stone-900"
                    />
                    <button
                      type="button"
                      onClick={() => handleQtyChange(idx, item.q + 1)}
                      className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200 font-bold text-sm flex items-center justify-center"
                    >
                      +
                    </button>
                  </div>

                  {/* Price control */}
                  <div className="flex items-center gap-1">
                    <span className="text-stone-400 text-xs">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.p}
                      onChange={(e) => handlePriceChange(idx, num(e.target.value))}
                      className="w-20 text-right py-1 px-2 rounded-lg border border-stone-300 font-semibold"
                    />
                  </div>

                  {/* Subtotal */}
                  <span className="w-20 text-right font-bold text-stone-900">
                    {$(item.q * item.p)}
                  </span>

                  {/* Remove */}
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700"
                    title="Quitar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {/* Total Sale */}
            <div className="bg-stone-100 rounded-xl p-3 flex justify-between items-center text-sm font-bold text-stone-900">
              <span>Nuevo Total de la Venta:</span>
              <span className="text-xl text-orange-700">{$(total)}</span>
            </div>
          </div>

          {/* Payments Section (Priority 2: Preserved Financial History) */}
          <div className="space-y-3 border-t border-stone-200 pt-5">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-stone-900 uppercase tracking-wider text-xs">
                  Historial de Pagos y Cobros Registrados
                </h4>
                <p className="text-xs text-stone-500">
                  Los pagos anteriores se conservan con su fecha y medio de pago exacto.
                </p>
              </div>
            </div>

            {/* Payments table */}
            <div className="border border-stone-200 rounded-xl overflow-hidden divide-y divide-stone-100 bg-white">
              {payments.length === 0 ? (
                <div className="p-4 text-center text-xs text-stone-400">
                  No hay pagos registrados para esta venta (deuda completa).
                </div>
              ) : (
                payments.map((pay, pIdx) => (
                  <div key={pIdx} className="p-3 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-medium text-xs">
                        {fd(pay.d)} {pay.time || ''}
                      </span>
                      <select
                        value={pay.m || 'Efectivo'}
                        onChange={(e) => handlePaymentMethodChange(pIdx, e.target.value as PaymentMethod)}
                        className="py-1 px-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white"
                      >
                        <option value="Efectivo">Efectivo</option>
                        <option value="Transferencia">Transferencia</option>
                        <option value="Tarjeta">Tarjeta</option>
                        <option value="Mercado Pago">Mercado Pago</option>
                      </select>
                    </div>

                    <div className="flex items-center gap-3">
                      <b className="text-emerald-700 text-sm font-bold">{$(pay.a)}</b>
                      <button
                        type="button"
                        onClick={() => handleRemovePayment(pIdx)}
                        className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                        title="Eliminar este pago específico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Balance summary */}
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
              <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200">
                <span className="text-stone-500 block text-xs">Total Venta</span>
                <b>{$(total)}</b>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200">
                <span className="text-emerald-700 block text-xs">Total Cobrado</span>
                <b className="text-emerald-800">{$(totalPaid)}</b>
              </div>
              <div
                className={`p-2.5 rounded-xl border ${
                  debt > 0.01 ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-stone-50 border-stone-200'
                }`}
              >
                <span className="block text-xs text-stone-500">Saldo Pendiente</span>
                <b className={debt > 0.01 ? 'text-amber-700' : 'text-stone-700'}>{$(debt)}</b>
              </div>
            </div>

            {/* Add new payment row if there is a debt */}
            {debt > 0.01 && (
              <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 space-y-2">
                <span className="block text-xs font-bold text-orange-900">
                  ¿El cliente pagó algo más en esta edición?
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative flex-1 min-w-[110px]">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-400 text-xs">$</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      max={debt}
                      value={newPayAmount}
                      onChange={(e) => setNewPayAmount(e.target.value)}
                      placeholder={`Máx: ${debt}`}
                      className="w-full pl-6 pr-2 py-1.5 rounded-lg border border-stone-300 text-xs font-bold text-stone-900 bg-white"
                    />
                  </div>
                  <select
                    value={newPayMethod}
                    onChange={(e) => setNewPayMethod(e.target.value as PaymentMethod)}
                    className="py-1.5 px-2 rounded-lg border border-stone-300 text-xs font-semibold bg-white"
                  >
                    <option value="Efectivo">Efectivo</option>
                    <option value="Transferencia">Transferencia</option>
                    <option value="Tarjeta">Tarjeta</option>
                    <option value="Mercado Pago">Mercado Pago</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => setNewPayAmount(String(debt))}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-100 hover:bg-orange-200 text-orange-800 text-xs font-bold transition-colors"
                  >
                    Pagar todo
                  </button>
                  <button
                    type="button"
                    onClick={handleAddPayment}
                    className="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Registrar Cobro
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Audit History Timeline */}
          {sale.editHistory && sale.editHistory.length > 0 && (
            <div className="border-t border-stone-200 pt-4 space-y-2">
              <span className="text-xs font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1">
                <History className="w-3.5 h-3.5" /> Historial de Modificaciones Anteriores ({sale.editHistory.length})
              </span>
              <div className="space-y-1.5">
                {sale.editHistory.map((hist, hIdx) => (
                  <div key={hIdx} className="p-2 rounded-lg bg-stone-50 border border-stone-200 text-xs text-stone-600">
                    <span className="font-semibold text-stone-800">
                      {fd(hist.date)} {hist.time}:
                    </span>{' '}
                    Total cambió de {$(hist.prevTotal)} a {$(hist.newTotal)}. Motivo: {hist.note}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-stone-50 border-t border-stone-200 p-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 text-sm font-semibold hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold shadow-md shadow-orange-600/20 transition-transform active:scale-95 flex items-center gap-2"
          >
            <Check className="w-4 h-4" />
            Guardar Cambios Seguros
          </button>
        </div>
      </div>
    </div>
  );
};
