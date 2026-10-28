import React, { useState } from 'react';
import { AppData, CartItem, PaymentMethod, Product, Purchase } from '../types';
import { $, num, r2, today, nowTime } from '../utils/formatters';
import { ArrowLeft, Check, Plus, Trash2, Truck } from 'lucide-react';

interface BuyViewProps {
  data: AppData;
  onSaveBuy: (purchase: Purchase, updateSalePrices: boolean) => void;
  onNavigateHome: () => void;
  onOpenProductModal: () => void;
}

export const BuyView: React.FC<BuyViewProps> = ({
  data,
  onSaveBuy,
  onNavigateHome,
  onOpenProductModal,
}) => {
  const [query, setQuery] = useState<string>('');
  const [cart, setCart] = useState<Array<{ pid: number; nm: string; q: number; c: number }>>([]);
  const [provider, setProvider] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [paidInput, setPaidInput] = useState<string>('');
  const [updateSalePrices, setUpdateSalePrices] = useState<boolean>(true);

  const total = r2(cart.reduce((acc, l) => acc + l.q * l.c, 0));
  const paidNow = paidInput === '' ? total : Math.max(0, num(paidInput));
  const debt = r2(Math.max(0, total - paidNow));

  const filteredProducts = query.trim()
    ? data.products
        .filter((p) => {
          const t = query.toLowerCase();
          return (
            (p.name || '').toLowerCase().includes(t) ||
            (p.code || '').toLowerCase().includes(t) ||
            (p.cat || '').toLowerCase().includes(t)
          );
        })
        .slice(0, 8)
    : [];

  const addToCart = (p: Product) => {
    const existing = cart.find((x) => x.pid === p.id);
    if (existing) {
      existing.q = r2(existing.q + 1);
      setCart([...cart]);
    } else {
      setCart([
        ...cart,
        {
          pid: p.id,
          nm: p.name,
          q: 1,
          c: p.cost,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const newQty = r2(item.q + delta);
    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }
    item.q = newQty;
    setCart([...cart]);
  };

  const setManualQuantity = (index: number, val: number) => {
    if (val <= 0) {
      removeFromCart(index);
      return;
    }
    cart[index].q = r2(val);
    setCart([...cart]);
  };

  const setManualCost = (index: number, val: number) => {
    cart[index].c = Math.max(0, r2(val));
    setCart([...cart]);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleSave = () => {
    if (!cart.length) {
      alert('Agregá al menos un producto a la compra.');
      return;
    }
    const pv = provider.trim();
    if (!pv) {
      alert('Escribí o seleccioná el nombre del proveedor.');
      return;
    }
    if (paidNow > total) {
      alert('Lo pagado no puede superar el total de la compra.');
      return;
    }

    const currentShift = data.shifts.find((s) => s.status === 'open');

    const newPurchase: Purchase = {
      id: data.seq++,
      n: data.seqBuy++,
      d: today(),
      time: nowTime(),
      pv,
      total,
      items: cart.map((i) => ({ ...i })),
      pays: paidNow > 0 ? [{ d: today(), time: nowTime(), a: paidNow, m: paymentMethod }] : [],
      shiftId: currentShift ? currentShift.id : undefined,
    };

    onSaveBuy(newPurchase, updateSalePrices);
    onNavigateHome();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
      <div className="flex items-center gap-2 pt-2">
        <button
          onClick={onNavigateHome}
          className="p-2 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-stone-900 tracking-tight flex items-center gap-2">
            🛒 Registrar Compra a Proveedor
          </h2>
          <p className="text-xs text-stone-500">
            Ingreso de mercadería, actualización de costos y stock
          </p>
        </div>
      </div>

      {/* Search Product Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-stone-700">
          Buscar producto para comprar
        </label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Escribí nombre o código de barras..."
          className="w-full px-4 py-3 rounded-xl border-2 border-stone-300 focus:border-blue-600 focus:outline-hidden text-sm font-medium"
        />

        {filteredProducts.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addToCart(p);
                  setQuery('');
                }}
                className="p-3 rounded-xl border-2 border-stone-200 hover:border-blue-500 hover:bg-blue-50/50 text-left transition-all flex items-center justify-between"
              >
                <div>
                  <strong className="block text-stone-900 text-sm font-bold">
                    {p.name}
                  </strong>
                  <span className="text-xs text-stone-500">
                    Stock actual: {p.stock}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Costo actual:</span>
                  <b className="text-blue-800 text-sm">{$(p.cost)}</b>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Cart & Supplier Checkout */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-5">
        <h3 className="text-base font-black text-stone-900 uppercase tracking-wider text-xs border-b border-stone-100 pb-2">
          Productos de la compra ({cart.length})
        </h3>

        {cart.length === 0 ? (
          <div className="text-center py-6 text-stone-400 text-sm">
            No agregaste productos. Buscá arriba y tocá un producto para ingresar stock.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
            {cart.map((item, idx) => (
              <div
                key={idx}
                className="p-3 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="flex-1 min-w-[150px]">
                  <strong className="block text-stone-900 font-bold text-sm">
                    {item.nm}
                  </strong>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => updateQuantity(idx, -1)}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    step="any"
                    min="0.1"
                    value={item.q}
                    onChange={(e) => setManualQuantity(idx, num(e.target.value))}
                    className="w-16 text-center py-1.5 rounded-lg border-2 border-stone-300 font-bold text-sm"
                  />
                  <button
                    onClick={() => updateQuantity(idx, 1)}
                    className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 font-bold"
                  >
                    +
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  <span className="text-stone-400 text-xs">Costo c/u $</span>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={item.c}
                    onChange={(e) => setManualCost(idx, num(e.target.value))}
                    className="w-24 text-right py-1.5 px-2 rounded-lg border-2 border-stone-300 font-semibold"
                  />
                </div>

                <span className="w-24 text-right font-black text-stone-900 text-base">
                  {$(item.q * item.c)}
                </span>

                <button
                  onClick={() => removeFromCart(idx)}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Total */}
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-between">
          <span className="text-blue-950 font-extrabold text-lg">
            TOTAL DE LA COMPRA:
          </span>
          <span className="text-2xl font-black text-blue-900">
            {$(total)}
          </span>
        </div>

        {/* Provider input */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <Truck className="w-4 h-4 text-stone-500" />
              Proveedor *
            </label>
            <input
              type="text"
              list="providers-list"
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              placeholder="Elegí o escribí un proveedor nuevo..."
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-blue-500 focus:outline-hidden font-medium"
            />
            <datalist id="providers-list">
              {data.providers.map((p, idx) => (
                <option key={idx} value={p} />
              ))}
            </datalist>
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
              Forma de pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-blue-500 focus:outline-hidden font-semibold bg-white"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Tarjeta">Tarjeta</option>
              <option value="Mercado Pago">Mercado Pago</option>
            </select>
          </div>
        </div>

        {/* Payment Amount */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-stone-700">
            ¿Cuánto pagué al proveedor ahora?
          </label>
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold">$</span>
              <input
                type="number"
                step="any"
                min="0"
                max={total}
                value={paidInput}
                onChange={(e) => setPaidInput(e.target.value)}
                placeholder={String(total)}
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-stone-300 font-bold text-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setPaidInput(String(total))}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm shrink-0"
            >
              Pagué todo ({$(total)})
            </button>
          </div>

          {debt > 0.01 && (
            <p className="text-xs font-bold text-rose-700">
              Quedás debiendo al proveedor: {$(debt)}
            </p>
          )}
        </div>

        {/* Auto update prices checkbox */}
        <label className="flex items-center gap-2.5 cursor-pointer select-none text-xs sm:text-sm text-stone-700 font-medium pt-2">
          <input
            type="checkbox"
            checked={updateSalePrices}
            onChange={(e) => setUpdateSalePrices(e.target.checked)}
            className="w-5 h-5 rounded border-stone-300 text-blue-600 focus:ring-blue-500"
          />
          Actualizar automáticamente los precios de venta según mi porcentaje de ganancia habitual
        </label>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button
            onClick={onNavigateHome}
            className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={cart.length === 0}
            className="px-7 py-3 rounded-xl bg-blue-700 hover:bg-blue-800 disabled:opacity-50 text-white font-extrabold text-base shadow-lg shadow-blue-700/20 flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Guardar Compra ({$(total)})
          </button>
        </div>
      </div>
    </div>
  );
};
