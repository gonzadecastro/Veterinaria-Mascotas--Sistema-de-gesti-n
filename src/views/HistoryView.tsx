import React, { useState } from 'react';
import { AppData, CashShift, Sale } from '../types';
import { $, fd } from '../utils/formatters';
import { ArrowLeft, Edit2, Filter, History, Printer, RotateCcw, Search, Trash2 } from 'lucide-react';

interface HistoryViewProps {
  data: AppData;
  onNavigateHome: () => void;
  onAnular: (kind: 's' | 'p', id: number) => void;
  onEditSale: (sale: Sale) => void;
  onPrintSaleTicket: (sale: Sale) => void;
  onPrintShiftTicket: (shift: CashShift) => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  data,
  onNavigateHome,
  onAnular,
  onEditSale,
  onPrintSaleTicket,
  onPrintShiftTicket,
}) => {
  const [filterType, setFilterType] = useState<string>('');
  const [search, setSearch] = useState<string>('');

  const filteredLogs = data.log
    .filter((x) => {
      const matchType = !filterType || x.t === filterType;
      const matchSearch =
        !search ||
        (x.txt || '').toLowerCase().includes(search.toLowerCase()) ||
        String(x.amt || '').includes(search);
      return matchType && matchSearch;
    })
    .slice(0, 150);

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
            🕘 Historial de Operaciones y Auditoría
          </h2>
          <p className="text-xs text-stone-500">
            Registro cronológico de ventas, compras, caja, ediciones y anulaciones
          </p>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs">
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="sm:col-span-2 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar en el historial (número de venta, cliente, producto, monto)..."
              className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:border-orange-500 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs sm:text-sm focus:border-orange-500 focus:outline-hidden bg-white font-medium"
            >
              <option value="">Todas las actividades</option>
              <option value="venta">Ventas</option>
              <option value="compra">Compras</option>
              <option value="caja">Caja (apertura / cierre)</option>
              <option value="dinero">Dinero manual</option>
              <option value="cobro">Cobro de deudas</option>
              <option value="pago">Pago a proveedores</option>
              <option value="stock">Ajustes de stock</option>
              <option value="producto">Creación/Edición productos</option>
              <option value="anulación">Anulaciones</option>
              <option value="edición">Ediciones</option>
            </select>
          </div>
        </div>
      </div>

      {/* History Log List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-xs sm:text-sm">
            No se encontraron movimientos registrados con los filtros seleccionados.
          </div>
        ) : (
          filteredLogs.map((item) => {
            let refAction: React.ReactNode = null;

            if (item.ref) {
              const [kind, idStr] = item.ref.split(':');
              const id = Number(idStr);

              if (kind === 's') {
                const sale = data.sales.find((s) => s.id === id);
                if (sale) {
                  if (sale.void) {
                    refAction = (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        Anulada
                      </span>
                    );
                  } else {
                    refAction = (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          onClick={() => onPrintSaleTicket(sale)}
                          className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Ver e imprimir ticket"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Ticket
                        </button>
                        <button
                          onClick={() => onEditSale(sale)}
                          className="px-2.5 py-1 rounded-lg border border-stone-300 text-stone-700 hover:bg-stone-100 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Editar venta y pagos"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                          Editar
                        </button>
                        <button
                          onClick={() => onAnular('s', sale.id)}
                          className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Anular venta y devolver stock"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Anular
                        </button>
                      </div>
                    );
                  }
                }
              } else if (kind === 'p') {
                const purchase = data.purchases.find((p) => p.id === id);
                if (purchase) {
                  if (purchase.void) {
                    refAction = (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                        Anulada
                      </span>
                    );
                  } else {
                    refAction = (
                      <button
                        onClick={() => onAnular('p', purchase.id)}
                        className="px-2.5 py-1 rounded-lg border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1 transition-colors"
                        title="Anular compra y descontar stock"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        Anular
                      </button>
                    );
                  }
                }
              }
            }

            return (
              <div
                key={item.id}
                className="p-3.5 sm:p-4 hover:bg-stone-50/70 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="flex-1 min-w-[200px]">
                  <strong className="block text-stone-900 font-bold text-sm">
                    {item.txt}
                  </strong>
                  <div className="flex items-center gap-2 text-stone-400 text-xs mt-0.5">
                    <span>
                      {fd(item.d)} {item.h}
                    </span>
                    <span className="px-1.5 py-0.2 rounded-md bg-stone-100 text-stone-600 font-medium capitalize">
                      {item.t}
                    </span>
                  </div>
                </div>

                {item.amt != null && (
                  <div className="text-right">
                    <span className="text-base font-black text-stone-900">
                      {$(item.amt)}
                    </span>
                  </div>
                )}

                {refAction}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
