import React from 'react';
import { CashShift, Sale } from '../types';
import { $, fd } from '../utils/formatters';
import { calculateShiftSummary } from '../utils/financial';
import { Printer, X } from 'lucide-react';

interface ReceiptModalProps {
  sale?: Sale | null;
  shift?: CashShift | null;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  sale,
  shift,
  isOpen,
  onClose,
}) => {
  if (!isOpen || (!sale && !shift)) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden my-6 print:m-0 print:border-none print:shadow-none">
        {/* Header (hidden in print) */}
        <div className="bg-stone-800 text-white p-4 flex items-center justify-between print:hidden">
          <span className="font-bold text-sm">
            {sale ? `Comprobante Venta #${sale.n}` : `Ticket Cierre de Caja #${shift?.id}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-lg flex items-center gap-1 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimir
            </button>
            <button onClick={onClose} className="p-1 rounded-lg text-stone-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Ticket Area */}
        <div className="p-6 text-stone-900 font-mono text-xs space-y-4 print:p-0">
          <div className="text-center pb-3 border-b border-dashed border-stone-300">
            <h2 className="text-base font-extrabold uppercase tracking-tight">
              Veterinaria Mascotas
            </h2>
            <p className="text-[11px] text-stone-500">Sistema de Gestión y Punto de Venta</p>
            <p className="text-[11px] text-stone-500">Comprobante Interno</p>
          </div>

          {/* If Sale */}
          {sale && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Venta: #{sale.n}</span>
                <span>{fd(sale.d)} {sale.time || ''}</span>
              </div>
              {sale.cl && (
                <div>
                  Cliente: <b className="font-bold">{sale.cl}</b>
                </div>
              )}
              {sale.void && (
                <div className="p-1.5 bg-rose-100 text-rose-800 font-bold text-center rounded">
                  *** OPERACIÓN ANULADA ***
                </div>
              )}

              <div className="border-t border-b border-dashed border-stone-300 py-2 space-y-1">
                {sale.items.map((i, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>
                      {i.q}x {i.nm}
                    </span>
                    <span>{$(i.q * i.p)}</span>
                  </div>
                ))}
              </div>

              <div className="text-sm font-bold flex justify-between pt-1">
                <span>TOTAL:</span>
                <span className="text-base">{$(sale.total)}</span>
              </div>

              <div className="pt-2 border-t border-stone-200 space-y-1">
                <span className="font-bold block">Pagos realizados:</span>
                {sale.pays.map((p, idx) => (
                  <div key={idx} className="flex justify-between text-stone-600">
                    <span>
                      {fd(p.d)} ({p.m})
                    </span>
                    <span>{$(p.a)}</span>
                  </div>
                ))}
                {sale.total - sale.pays.reduce((acc, p) => acc + p.a, 0) > 0.01 && (
                  <div className="flex justify-between font-bold text-rose-700 pt-1">
                    <span>SALDO DEUDOR:</span>
                    <span>{$(sale.total - sale.pays.reduce((acc, p) => acc + p.a, 0))}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* If Cash Shift Closing */}
          {shift && (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Cierre Turno: #{shift.id}</span>
                <span>{fd(shift.closedDate || shift.openedDate)}</span>
              </div>
              <div>
                Cajero: <b className="font-bold">{shift.closedBy || shift.openedBy}</b>
              </div>
              <div className="text-[11px] text-stone-500">
                Horario: {shift.openedTime} a {shift.closedTime || 'Actual'}
              </div>

              <div className="border-t border-b border-dashed border-stone-300 py-2 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Fondo Inicial de Caja:</span>
                  <b>{$(shift.initialCash)}</b>
                </div>
                {shift.summary && (
                  <>
                    <div className="flex justify-between">
                      <span>Ventas Efectivo:</span>
                      <span>+{$(shift.summary.cashSales)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Cobros Deuda Efectivo:</span>
                      <span>+{$(shift.summary.cashDebtCollections)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Ingresos Manuales:</span>
                      <span>+{$(shift.summary.cashManualInflows)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gastos Efectivo:</span>
                      <span>−{$(shift.summary.cashExpenses)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Devoluciones Efectivo:</span>
                      <span>−{$(shift.summary.cashRefunds)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between font-bold border-t border-stone-200 pt-1">
                  <span>Efectivo Esperado:</span>
                  <span>{$(shift.expectedCash)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Efectivo Real Contado:</span>
                  <span>{$(shift.countedCash)}</span>
                </div>
                {shift.diffCash != null && (
                  <div
                    className={`flex justify-between font-bold ${
                      shift.diffCash < 0 ? 'text-rose-700' : shift.diffCash > 0 ? 'text-emerald-700' : 'text-stone-700'
                    }`}
                  >
                    <span>Diferencia de Caja:</span>
                    <span>
                      {shift.diffCash > 0 ? '+' : ''}
                      {$(shift.diffCash)}
                    </span>
                  </div>
                )}
              </div>

              {shift.summary && shift.summary.digitalTotal > 0 && (
                <div className="pt-1 text-[11px] text-stone-600 space-y-0.5">
                  <span className="font-bold block text-stone-800">
                    Ventas Digitales del Turno: {$(shift.summary.digitalTotal)}
                  </span>
                  <div>Transferencias: {$(shift.summary.salesByMethod['Transferencia'])}</div>
                  <div>Mercado Pago: {$(shift.summary.salesByMethod['Mercado Pago'])}</div>
                  <div>Tarjetas: {$(shift.summary.salesByMethod['Tarjeta'])}</div>
                </div>
              )}

              {shift.notes && (
                <div className="pt-2 text-[11px] text-stone-500 italic border-t border-dashed border-stone-300">
                  Nota: {shift.notes}
                </div>
              )}
            </div>
          )}

          <div className="text-center pt-4 text-[11px] text-stone-400 border-t border-stone-200">
            ¡Muchas gracias por confiar en Veterinaria Mascotas!
          </div>
        </div>
      </div>
    </div>
  );
};
