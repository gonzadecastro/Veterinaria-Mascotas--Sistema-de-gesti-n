import React, { useState, useRef, useEffect } from 'react';
import { AppData, CartItem, PaymentMethod, Product, Sale } from '../types';
import { $, num, r2, today, nowTime } from '../utils/formatters';
import { AlertCircle, AlertTriangle, ArrowLeft, Barcode, Check, Plus, Search, Trash2, User, Printer } from 'lucide-react';

interface SellViewProps {
  data: AppData;
  onSaveSale: (sale: Sale) => void;
  onNavigateHome: () => void;
  onOpenProductModal: () => void;
  onOpenShiftModal: () => void;
}

export const SellView: React.FC<SellViewProps> = ({
  data,
  onSaveSale,
  onNavigateHome,
  onOpenProductModal,
  onOpenShiftModal,
}) => {
  const [query, setQuery] = useState<string>('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [client, setClient] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Efectivo');
  const [paidInput, setPaidInput] = useState<string>('');
  const [savedLastSale, setSavedLastSale] = useState<Sale | null>(null);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  const total = r2(cart.reduce((acc, l) => acc + l.q * l.p, 0));
  const paidNow = paidInput === '' ? total : Math.max(0, num(paidInput));
  const debt = r2(Math.max(0, total - paidNow));

  // Current shift check
  const currentShift = data.shifts.find((s) => s.status === 'open');

  // Filter products by search
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

  const handleBarcodeScan = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const code = query.trim().toLowerCase();
      if (!code) return;

      const exact = data.products.find(
        (p) => p.code && p.code.toLowerCase() === code
      );
      if (exact) {
        addToCart(exact);
        setQuery('');
      } else if (filteredProducts.length === 1) {
        addToCart(filteredProducts[0]);
        setQuery('');
      }
    }
  };

  const addToCart = (p: Product) => {
    const existing = cart.find((x) => x.pid === p.id);
    if (existing) {
      if (!p.svc && existing.q + 1 > p.stock) {
        alert(`No alcanza el stock de ${p.name}: solo quedan ${p.stock}`);
        return;
      }
      existing.q = r2(existing.q + 1);
      setCart([...cart]);
    } else {
      if (!p.svc && p.stock <= 0) {
        if (!window.confirm(`¡Atención! ${p.name} figura sin stock (0). ¿Deseás agregarlo de todos modos?`)) {
          return;
        }
      }
      setCart([
        ...cart,
        {
          pid: p.id,
          nm: p.name,
          q: 1,
          p: p.price,
          c: p.cost,
        },
      ]);
    }
  };

  const updateQuantity = (index: number, delta: number) => {
    const item = cart[index];
    const p = data.products.find((prod) => prod.id === item.pid);
    const newQty = r2(item.q + delta);

    if (newQty <= 0) {
      removeFromCart(index);
      return;
    }

    if (p && !p.svc && newQty > p.stock) {
      alert(`No podés agregar más de ${p.stock} unidades de ${p.name}.`);
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
    const item = cart[index];
    const p = data.products.find((prod) => prod.id === item.pid);
    if (p && !p.svc && val > p.stock) {
      alert(`Stock insuficiente: solo quedan ${p.stock} unidades de ${p.name}.`);
      return;
    }
    item.q = r2(val);
    setCart([...cart]);
  };

  const setManualPrice = (index: number, val: number) => {
    cart[index].p = Math.max(0, r2(val));
    setCart([...cart]);
  };

  const removeFromCart = (index: number) => {
    const updated = [...cart];
    updated.splice(index, 1);
    setCart(updated);
  };

  const handleSave = () => {
    if (!cart.length) {
      alert('Agregá al menos un producto al carrito para vender.');
      return;
    }

    // Check stock
    for (const item of cart) {
      const prod = data.products.find((p) => p.id === item.pid);
      if (prod && !prod.svc && item.q > prod.stock) {
        alert(`Stock insuficiente de ${prod.name}: intentás vender ${item.q} pero quedan ${prod.stock}.`);
        return;
      }
    }

    if (debt > 0.01 && !client.trim()) {
      alert('Para dejar saldo pendiente o deuda, es obligatorio escribir el nombre del cliente.');
      return;
    }

    if (paidNow > total) {
      alert('El monto pagado no puede ser mayor al total de la venta.');
      return;
    }

    const newSale: Sale = {
      id: data.seq++,
      n: data.seqSale++,
      d: today(),
      time: nowTime(),
      cl: client.trim(),
      total,
      items: cart.map((i) => ({ ...i })),
      pays: paidNow > 0 ? [{ d: today(), time: nowTime(), a: paidNow, m: paymentMethod }] : [],
      shiftId: currentShift ? currentShift.id : undefined,
    };

    onSaveSale(newSale);
    setSavedLastSale(newSale);

    // Reset state for next sale
    setCart([]);
    setClient('');
    setPaidInput('');
    setQuery('');
    searchInputRef.current?.focus();
  };

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Top Header */}
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
              💰 Punto de Venta
            </h2>
            <p className="text-xs text-stone-500">
              Buscá productos o escaneá con lector de código de barras
            </p>
          </div>
        </div>

        {!currentShift && (
          <button
            onClick={onOpenShiftModal}
            className="text-xs px-3 py-1.5 rounded-lg bg-amber-100 text-amber-900 border border-amber-300 font-bold hover:bg-amber-200 transition-colors flex items-center gap-1.5"
          >
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Caja no abierta hoy · Clic para abrir
          </button>
        )}
      </div>

      {/* Search Input Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <label className="block text-xs sm:text-sm font-bold text-stone-700">
          Buscar producto o servicio por nombre o código de barras
        </label>
        <div className="relative">
          <Barcode className="w-5 h-5 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleBarcodeScan}
            placeholder="Escribí o escaneá con el lector (Presioná Enter)..."
            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden text-base font-medium text-stone-900"
          />
        </div>

        {/* Search Results list */}
        {filteredProducts.length > 0 && (
          <div className="grid sm:grid-cols-2 gap-2 pt-1">
            {filteredProducts.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  addToCart(p);
                  setQuery('');
                  searchInputRef.current?.focus();
                }}
                className="p-3 rounded-xl border-2 border-stone-200 hover:border-orange-400 hover:bg-orange-50/50 text-left transition-all flex items-center justify-between group active:scale-98"
              >
                <div>
                  <strong className="block text-stone-900 text-sm font-bold group-hover:text-orange-950">
                    {p.name}
                  </strong>
                  <span className="text-xs text-stone-500">
                    {p.svc ? 'Servicio' : `Stock: ${p.stock}`} {p.code ? `· #${p.code}` : ''}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-black text-orange-700">
                    {$(p.price)}
                  </span>
                  <span className="block text-[11px] text-stone-400">
                    + agregar
                  </span>
                </div>
              </button>
            ))}
          </div>
        )}

        {query.trim() && filteredProducts.length === 0 && (
          <div className="text-center py-4 text-xs sm:text-sm text-stone-500 flex flex-wrap items-center justify-center gap-2">
            <span>No se encontró ningún producto con ese nombre o código.</span>
            <button
              onClick={onOpenProductModal}
              className="text-orange-600 font-bold hover:underline"
            >
              + Crear producto nuevo
            </button>
          </div>
        )}
      </div>

      {/* Cart & Checkout Box */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 sm:p-6 shadow-xs space-y-6">
        <h3 className="text-base font-black text-stone-900 uppercase tracking-wider text-xs border-b border-stone-100 pb-2">
          Carrito de Venta ({cart.length} {cart.length === 1 ? 'producto' : 'productos'})
        </h3>

        {cart.length === 0 ? (
          <div className="text-center py-8 text-stone-400 text-sm">
            El carrito está vacío. Buscá arriba y hacé clic en un producto para agregarlo.
          </div>
        ) : (
          <div className="divide-y divide-stone-100 border border-stone-200 rounded-xl overflow-hidden">
            {cart.map((item, idx) => {
              const p = data.products.find((prod) => prod.id === item.pid);
              const isLow = p && !p.svc && item.q > p.stock;
              const isBelowCost = p && item.p < p.cost;

              return (
                <div
                  key={idx}
                  className="p-3 sm:p-4 bg-white flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
                >
                  <div className="flex-1 min-w-[150px]">
                    <strong className="block text-stone-900 font-bold text-sm">
                      {item.nm}
                    </strong>
                    {isLow && (
                      <span className="text-rose-600 font-bold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        ¡Supera el stock disponible ({p?.stock})!
                      </span>
                    )}
                    {isBelowCost && (
                      <span className="text-amber-600 font-semibold text-xs block">
                        Precio por debajo del costo ({$(p?.cost)})
                      </span>
                    )}
                  </div>

                  {/* Quantity selector */}
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => updateQuantity(idx, -1)}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      step="any"
                      min="0.1"
                      value={item.q}
                      onChange={(e) => setManualQuantity(idx, num(e.target.value))}
                      className="w-16 text-center py-1.5 rounded-lg border-2 border-stone-300 font-bold text-stone-900 text-sm"
                    />
                    <button
                      onClick={() => updateQuantity(idx, 1)}
                      className="w-8 h-8 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-base flex items-center justify-center transition-colors"
                    >
                      +
                    </button>
                  </div>

                  {/* Price adjustment */}
                  <div className="flex items-center gap-1">
                    <span className="text-stone-400 text-xs">c/u $</span>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={item.p}
                      onChange={(e) => setManualPrice(idx, num(e.target.value))}
                      className="w-24 text-right py-1.5 px-2.5 rounded-lg border-2 border-stone-300 font-semibold text-stone-900"
                    />
                  </div>

                  {/* Subtotal */}
                  <span className="w-24 text-right font-black text-stone-900 text-base">
                    {$(item.q * item.p)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={() => removeFromCart(idx)}
                    className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-700 transition-colors"
                    title="Eliminar de la venta"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Total Banner */}
        <div className="p-4 rounded-xl bg-stone-100 flex items-center justify-between">
          <span className="text-stone-700 font-extrabold text-lg sm:text-xl">
            TOTAL A PAGAR:
          </span>
          <span className="text-2xl sm:text-3xl font-black text-orange-700">
            {$(total)}
          </span>
        </div>

        {/* Customer & Payment Form */}
        <div className="grid sm:grid-cols-2 gap-4 border-t border-stone-200 pt-5">
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1 flex items-center gap-1">
              <User className="w-4 h-4 text-stone-500" />
              Cliente (opcional, obligatorio si queda deuda)
            </label>
            <input
              type="text"
              value={client}
              onChange={(e) => setClient(e.target.value)}
              placeholder="Nombre del cliente / Mascota / Teléfono"
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden font-medium text-stone-900"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-semibold text-stone-700 mb-1">
              Forma de pago
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden font-semibold text-stone-900 bg-white"
            >
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia Bancaria</option>
              <option value="Tarjeta">Tarjeta (Débito / Crédito)</option>
              <option value="Mercado Pago">Mercado Pago / QR</option>
            </select>
          </div>
        </div>

        {/* Amount Paid Now */}
        <div className="space-y-2">
          <label className="block text-xs sm:text-sm font-semibold text-stone-700">
            ¿Cuánto pagó el cliente ahora?
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
                className="w-full pl-8 pr-3.5 py-2.5 rounded-xl border-2 border-stone-300 focus:border-orange-500 focus:outline-hidden font-bold text-stone-900 text-lg"
              />
            </div>
            <button
              type="button"
              onClick={() => setPaidInput(String(total))}
              className="px-4 py-2.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold text-xs sm:text-sm transition-colors shrink-0"
            >
              Pagó todo ({$(total)})
            </button>
          </div>

          {debt > 0.01 && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 text-amber-900 text-xs sm:text-sm font-bold flex items-center justify-between">
              <span>⚠️ Queda pendiente en cuenta corriente del cliente:</span>
              <span className="text-base text-amber-700">{$(debt)}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-stone-200">
          <button
            onClick={onNavigateHome}
            className="px-5 py-3 rounded-xl border border-stone-300 text-stone-700 font-semibold text-sm hover:bg-stone-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={cart.length === 0}
            className="px-7 py-3 rounded-xl bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:pointer-events-none text-white font-extrabold text-base shadow-lg shadow-orange-600/30 transition-transform active:scale-95 flex items-center gap-2"
          >
            <Check className="w-5 h-5" />
            Guardar Venta ({$(total)})
          </button>
        </div>
      </div>
    </div>
  );
};
