import React from 'react';
import { AppData } from '../types';
import { $, greeting, mk, today } from '../utils/formatters';
import { getPhysicalCashBalance, paidOf, sold, bought } from '../utils/financial';
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarCheck,
  CheckCircle,
  Clock,
  Coins,
  DollarSign,
  FileText,
  History,
  Lock,
  Package,
  Plus,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Unlock,
  Users,
} from 'lucide-react';

interface HomeViewProps {
  data: AppData;
  onNavigate: (view: string) => void;
  onOpenCashModal: () => void;
  onOpenBackupModal: () => void;
  onLoadDemo: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
  data,
  onNavigate,
  onOpenCashModal,
  onOpenBackupModal,
  onLoadDemo,
}) => {
  const currentMonth = mk(today());
  const todaySales = sold(data).filter((s) => s.d === today());
  const todayTotal = todaySales.reduce((acc, s) => acc + s.total, 0);

  const cashInDrawer = getPhysicalCashBalance(data);

  // Debts
  const receivable = sold(data).reduce(
    (acc, s) => acc + Math.max(0, s.total - paidOf(s)),
    0
  );
  const payable = bought(data).reduce(
    (acc, c) => acc + Math.max(0, c.total - paidOf(c)),
    0
  );

  // Low stock
  const lowStock = data.products.filter(
    (p) => !p.svc && Number(p.stock) <= Number(p.min)
  );

  const currentShift = data.shifts.find((s) => s.status === 'open') || null;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      {/* Welcome & Shift status alert */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
        <div>
          <h2 className="text-2xl font-extrabold text-stone-900 tracking-tight">
            {greeting()}, ¿qué querés hacer hoy?
          </h2>
          <p className="text-sm text-stone-500">
            Panel principal de Veterinaria Mascotas
          </p>
        </div>

        {/* Quick Shift Button */}
        <button
          onClick={onOpenCashModal}
          className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 shadow-xs transition-transform active:scale-95 ${
            currentShift
              ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300'
              : 'bg-amber-500 hover:bg-amber-600 text-white shadow-amber-500/20'
          }`}
        >
          {currentShift ? (
            <>
              <Unlock className="w-4 h-4 text-emerald-700" />
              Caja Abierta: Arqueo / Cierre
            </>
          ) : (
            <>
              <Lock className="w-4 h-4" />
              Abrir Caja Diaria Ahora
            </>
          )}
        </button>
      </div>

      {/* Notice if cash shift is closed */}
      {!currentShift && (
        <div
          onClick={onOpenCashModal}
          className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 flex items-center justify-between gap-3 cursor-pointer hover:bg-amber-100/80 transition-colors shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/20 text-amber-800 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div>
              <strong className="block font-bold text-sm">
                Control de Caja: El turno no ha sido abierto hoy
              </strong>
              <p className="text-xs text-amber-800">
                Tocá acá para declarar tu fondo inicial de cambio y llevar el control exacto del dinero.
              </p>
            </div>
          </div>
          <span className="text-xs font-bold px-3 py-1.5 rounded-lg bg-amber-600 text-white shrink-0">
            Abrir Caja →
          </span>
        </div>
      )}

      {/* Top 4 Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Vendido hoy
          </span>
          <b className="text-2xl font-black text-stone-900 block mt-1">
            {$(todayTotal)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            {todaySales.length} {todaySales.length === 1 ? 'venta' : 'ventas'}
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Dinero en caja
          </span>
          <b className="text-2xl font-black text-emerald-700 block mt-1">
            {$(cashInDrawer)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Efectivo real disponible
          </span>
        </div>

        <div
          onClick={() => onNavigate('pend')}
          className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow cursor-pointer hover:border-amber-300"
        >
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block flex items-center justify-between">
            Me deben cobrar
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          </span>
          <b className="text-2xl font-black text-amber-600 block mt-1">
            {$(receivable)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Cuentas de clientes
          </span>
        </div>

        <div
          onClick={() => onNavigate('pend')}
          className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs hover:shadow-md transition-shadow cursor-pointer hover:border-rose-300"
        >
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block flex items-center justify-between">
            Tengo que pagar
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-600" />
          </span>
          <b className="text-2xl font-black text-rose-600 block mt-1">
            {$(payable)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Deuda a proveedores
          </span>
        </div>
      </div>

      {/* Low stock warning banner */}
      {lowStock.length > 0 && (
        <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-extrabold text-amber-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Alerta de Stock Bajo ({lowStock.length} productos)
            </h3>
            <button
              onClick={() => onNavigate('prods')}
              className="text-xs font-bold text-amber-700 hover:underline"
            >
              Ver inventario completo →
            </button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {lowStock.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className={`p-2.5 rounded-xl border text-xs flex justify-between items-center ${
                  p.stock <= 0
                    ? 'bg-rose-50 border-rose-200 text-rose-950 font-semibold'
                    : 'bg-amber-50/70 border-amber-200 text-amber-950'
                }`}
              >
                <span className="truncate pr-2 font-medium">{p.name}</span>
                <span
                  className={`font-bold shrink-0 px-2 py-0.5 rounded-md ${
                    p.stock <= 0 ? 'bg-rose-200/80 text-rose-900' : 'bg-amber-200/80 text-amber-900'
                  }`}
                >
                  {p.stock <= 0 ? '¡SIN STOCK!' : `Quedan ${p.stock}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Big Action Tiles */}
      <div className="space-y-3">
        <h3 className="text-xs font-bold text-stone-400 uppercase tracking-wider">
          Acciones Rápidas
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
          {/* Vender (POS) */}
          <button
            onClick={() => onNavigate('sell')}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">💰</span>
            <span className="text-lg font-black tracking-tight">Vender</span>
            <span className="text-xs text-emerald-100 font-medium mt-0.5">
              Punto de venta / Scanner
            </span>
          </button>

          {/* Registrar Compra */}
          <button
            onClick={() => onNavigate('buy')}
            className="group relative flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-blue-700 to-blue-800 hover:from-blue-600 hover:to-blue-700 text-white shadow-md hover:shadow-xl hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🛒</span>
            <span className="text-lg font-black tracking-tight">Registrar compra</span>
            <span className="text-xs text-blue-100 font-medium mt-0.5">
              Stock de proveedores
            </span>
          </button>

          {/* Apertura / Cierre de Caja */}
          <button
            onClick={onOpenCashModal}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">
              {currentShift ? '🔓' : '🔒'}
            </span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              {currentShift ? 'Cierre de Caja' : 'Apertura de Caja'}
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              Control y arqueo diario
            </span>
          </button>

          {/* Productos y Stock */}
          <button
            onClick={() => onNavigate('prods')}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📦</span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Productos y stock
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              {data.products.length} cargados
            </span>
          </button>

          {/* Dinero */}
          <button
            onClick={() => onNavigate('money')}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">💵</span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Dinero en caja
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              Ingresos y gastos
            </span>
          </button>

          {/* Pendientes */}
          <button
            onClick={() => onNavigate('pend')}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📋</span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Cuentas pendientes
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              Cobros y pagos
            </span>
          </button>

          {/* Historial */}
          <button
            onClick={() => onNavigate('hist')}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">🕘</span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Historial
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              Auditoría y edición
            </span>
          </button>

          {/* Informes del mes */}
          <button
            onClick={() => onNavigate('rep')}
            className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white hover:bg-orange-50/60 border-2 border-stone-200 hover:border-orange-400 text-stone-800 shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all active:scale-95 text-center"
          >
            <span className="text-4xl mb-2 group-hover:scale-110 transition-transform">📊</span>
            <span className="text-base font-extrabold tracking-tight text-stone-900">
              Informes del mes
            </span>
            <span className="text-xs text-stone-500 font-medium mt-0.5">
              Ganancias y ventas
            </span>
          </button>
        </div>
      </div>

      {/* Backup banner */}
      <div className="bg-gradient-to-r from-stone-800 to-stone-900 text-white rounded-2xl p-5 flex flex-wrap items-center justify-between gap-4 shadow-md">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-white/10 rounded-xl text-orange-300">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <h4 className="font-extrabold text-base tracking-tight">
              Copia de Seguridad y Respaldo
            </h4>
            <p className="text-xs text-stone-300 max-w-md mt-0.5">
              Descargá el archivo de respaldo de tu veterinaria o restaura datos anteriores con total seguridad.
            </p>
          </div>
        </div>
        <button
          onClick={onOpenBackupModal}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-orange-600/30 transition-transform active:scale-95 flex items-center gap-2 shrink-0"
        >
          <ShieldCheck className="w-4 h-4" />
          Administrar Copias
        </button>
      </div>

      {/* If empty database prompt */}
      {data.products.length === 0 && (
        <div className="bg-white rounded-2xl border-2 border-dashed border-stone-300 p-8 text-center space-y-3">
          <Package className="w-12 h-12 text-stone-400 mx-auto" />
          <h4 className="font-bold text-stone-800 text-base">
            Todavía no hay productos cargados en tu veterinaria
          </h4>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Podés cargar productos manualmente o cargar una lista de ejemplo con alimentos, vacunas y pipetas.
          </p>
          <div className="pt-2 flex justify-center gap-2">
            <button
              onClick={() => onNavigate('prods')}
              className="px-4 py-2 rounded-xl bg-stone-100 text-stone-800 font-bold text-xs hover:bg-stone-200"
            >
              Crear Producto Nuevo
            </button>
            <button
              onClick={onLoadDemo}
              className="px-4 py-2 rounded-xl bg-orange-600 text-white font-bold text-xs hover:bg-orange-700 shadow-xs"
            >
              Cargar Productos de Ejemplo
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
