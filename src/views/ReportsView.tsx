import React from 'react';
import { AppData } from '../types';
import { $, mk, today } from '../utils/formatters';
import { bought, profitOf, sold } from '../utils/financial';
import { ArrowLeft, BarChart3, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';

interface ReportsViewProps {
  data: AppData;
  onNavigateHome: () => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  data,
  onNavigateHome,
}) => {
  const currentMonth = mk(today());
  const activeSalesMonth = sold(data).filter((s) => mk(s.d) === currentMonth);
  const activePurchasesMonth = bought(data).filter((p) => mk(p.d) === currentMonth);

  const totalSalesMonth = activeSalesMonth.reduce((acc, s) => acc + s.total, 0);
  const totalProfitMonth = activeSalesMonth.reduce((acc, s) => acc + profitOf(s), 0);
  const totalPurchasesMonth = activePurchasesMonth.reduce((acc, p) => acc + p.total, 0);

  // Valuation of inventory at cost
  const stockValuation = data.products
    .filter((p) => !p.svc)
    .reduce((acc, p) => acc + Math.max(0, p.stock) * p.cost, 0);

  // Products performance this month
  const productStats: Record<string, { q: number; t: number; g: number }> = {};
  activeSalesMonth.forEach((s) => {
    s.items.forEach((item) => {
      if (!productStats[item.nm]) {
        productStats[item.nm] = { q: 0, t: 0, g: 0 };
      }
      productStats[item.nm].q += item.q;
      productStats[item.nm].t += item.q * item.p;
      productStats[item.nm].g += item.q * (item.p - item.c);
    });
  });

  const topProducts = Object.entries(productStats)
    .sort((a, b) => b[1].t - a[1].t)
    .slice(0, 8);

  // Last 6 months trend
  const months: Array<{ key: string; name: string; sales: number }> = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = d.toISOString().slice(0, 7);
    const name = d.toLocaleDateString('es-AR', { month: 'short' });
    const sMonth = sold(data).filter((s) => mk(s.d) === key);
    const sales = sMonth.reduce((acc, s) => acc + s.total, 0);
    months.push({ key, name, sales });
  }

  const maxMonthSale = Math.max(1, ...months.map((m) => m.sales));

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
            📊 Informes y Rendimiento del Mes
          </h2>
          <p className="text-xs text-stone-500">
            Métricas de ventas, margen de ganancia y valorización de stock
          </p>
        </div>
      </div>

      {/* 4 Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Vendido este mes
          </span>
          <b className="text-2xl font-black text-stone-900 block mt-1">
            {$(totalSalesMonth)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            {activeSalesMonth.length} ventas realizadas
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Ganancia del mes
          </span>
          <b className="text-2xl font-black text-emerald-700 block mt-1">
            {$(totalProfitMonth)}
          </b>
          <span className="text-xs text-emerald-700/80 mt-0.5 block font-bold">
            {totalSalesMonth > 0 ? Math.round((totalProfitMonth / totalSalesMonth) * 100) : 0}% de lo vendido
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Compras de mercadería
          </span>
          <b className="text-2xl font-black text-blue-700 block mt-1">
            {$(totalPurchasesMonth)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            {activePurchasesMonth.length} compras a proveedores
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-bold text-stone-500 uppercase tracking-wider block">
            Valor del Inventario
          </span>
          <b className="text-2xl font-black text-stone-900 block mt-1">
            {$(stockValuation)}
          </b>
          <span className="text-xs text-stone-400 mt-0.5 block">
            Stock actual a precio de costo
          </span>
        </div>
      </div>

      {/* Two columns: Chart & Best Sellers */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Months progression chart */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-orange-600" />
            Evolución de Ventas (Últimos 6 meses)
          </h3>

          <div className="space-y-3 pt-2">
            {months.map((m) => (
              <div key={m.key} className="space-y-1">
                <div className="flex justify-between text-xs font-semibold text-stone-700">
                  <span className="capitalize">{m.name}</span>
                  <span className="font-bold text-stone-900">{$(m.sales)}</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-orange-600 h-full rounded-full transition-all duration-500"
                    style={{ width: `${Math.max(2, (m.sales / maxMonthSale) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top products sold this month */}
        <div className="bg-white rounded-2xl border border-stone-200 shadow-xs p-5 space-y-4">
          <h3 className="font-extrabold text-stone-900 text-base flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-600" />
            Lo Más Vendido Este Mes
          </h3>

          <div className="divide-y divide-stone-100 max-h-[350px] overflow-y-auto">
            {topProducts.length === 0 ? (
              <div className="py-10 text-center text-stone-400 text-xs sm:text-sm">
                Todavía no hay ventas registradas este mes.
              </div>
            ) : (
              topProducts.map(([name, stat], idx) => (
                <div key={idx} className="py-2.5 flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex-1 min-w-[140px]">
                    <strong className="block text-stone-900 font-bold">
                      {name}
                    </strong>
                    <span className="text-stone-400 text-xs">
                      {stat.q} unidades · Ganancia: {$(stat.g)}
                    </span>
                  </div>
                  <b className="text-stone-900 font-black text-sm">
                    {$(stat.t)}
                  </b>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
