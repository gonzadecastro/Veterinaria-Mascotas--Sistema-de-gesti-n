import React, { useState } from 'react';
import { AppData, Product } from '../types';
import { $, num, r2 } from '../utils/formatters';
import { AlertTriangle, ArrowLeft, Edit2, Filter, Package, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';

interface ProductsViewProps {
  data: AppData;
  onNavigateHome: () => void;
  onSaveProduct: (product: Product, isNew: boolean) => void;
  onAdjustStock: (productId: number, newStock: number, reason: string) => void;
  onDeleteProduct: (productId: number) => void;
}

export const ProductsView: React.FC<ProductsViewProps> = ({
  data,
  onNavigateHome,
  onSaveProduct,
  onAdjustStock,
  onDeleteProduct,
}) => {
  const [query, setQuery] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<string>('all'); // all, low, out

  // Modal states
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isNewProduct, setIsNewProduct] = useState<boolean>(false);
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustStockVal, setAdjustStockVal] = useState<string>('0');
  const [adjustReason, setAdjustReason] = useState<string>('Conteo del inventario');

  // Product Form states
  const [pName, setPName] = useState<string>('');
  const [pCode, setPCode] = useState<string>('');
  const [pCat, setPCat] = useState<string>('Alimento');
  const [pSvc, setPSvc] = useState<boolean>(false);
  const [pCost, setPCost] = useState<string>('0');
  const [pMg, setPMg] = useState<string>('40');
  const [pPrice, setPPrice] = useState<string>('0');
  const [pStock, setPStock] = useState<string>('0');
  const [pMin, setPMin] = useState<string>('3');

  const categories = Array.from(
    new Set(['Alimento', 'Medicamentos', 'Accesorios', 'Higiene', 'Servicios', 'Otros', ...data.products.map((p) => p.cat)])
  );

  const openNewModal = () => {
    setIsNewProduct(true);
    setEditingProduct({
      id: 0,
      name: '',
      code: '',
      cat: 'Alimento',
      svc: false,
      cost: 0,
      mg: 40,
      price: 0,
      stock: 0,
      min: 3,
    });
    setPName('');
    setPCode('');
    setPCat('Alimento');
    setPSvc(false);
    setPCost('0');
    setPMg('40');
    setPPrice('0');
    setPStock('0');
    setPMin('3');
  };

  const openEditModal = (p: Product) => {
    setIsNewProduct(false);
    setEditingProduct(p);
    setPName(p.name);
    setPCode(p.code);
    setPCat(p.cat);
    setPSvc(p.svc);
    setPCost(String(p.cost));
    setPMg(String(p.mg));
    setPPrice(String(p.price));
    setPStock(String(p.stock));
    setPMin(String(p.min));
  };

  const handleCostChange = (val: string) => {
    setPCost(val);
    const c = num(val);
    const m = num(pMg);
    setPPrice(String(Math.round(c * (1 + m / 100))));
  };

  const handleMarginChange = (val: string) => {
    setPMg(val);
    const c = num(pCost);
    const m = num(val);
    setPPrice(String(Math.round(c * (1 + m / 100))));
  };

  const handlePriceChange = (val: string) => {
    setPPrice(val);
    const pr = num(val);
    const c = num(pCost);
    if (c > 0) {
      setPMg(String(Math.round((pr / c - 1) * 100)));
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const name = pName.trim();
    if (!name) {
      alert('Escribí el nombre del producto');
      return;
    }
    const price = num(pPrice);
    if (price <= 0) {
      alert('El precio de venta debe ser mayor a 0');
      return;
    }

    const code = pCode.trim();
    if (code) {
      const exists = data.products.some(
        (p) => p.code.toLowerCase() === code.toLowerCase() && p.id !== (editingProduct?.id || 0)
      );
      if (exists) {
        alert('Ya existe otro producto registrado con ese código de barras.');
        return;
      }
    }

    const prodToSave: Product = {
      id: editingProduct?.id || 0,
      name,
      code,
      cat: pCat.trim() || 'Otros',
      svc: pSvc,
      cost: num(pCost),
      mg: num(pMg),
      price,
      stock: pSvc ? 0 : num(pStock),
      min: pSvc ? 0 : num(pMin),
    };

    onSaveProduct(prodToSave, isNewProduct);
    setEditingProduct(null);
  };

  const openAdjustStock = (p: Product) => {
    setAdjustingProduct(p);
    setAdjustStockVal(String(p.stock));
    setAdjustReason('Conteo del inventario');
  };

  const handleSaveStock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;
    const v = num(adjustStockVal);
    if (v < 0) {
      alert('El stock no puede ser negativo.');
      return;
    }
    onAdjustStock(adjustingProduct.id, v, adjustReason);
    setAdjustingProduct(null);
  };

  // Filter
  const filtered = data.products
    .filter((p) => {
      const q = query.toLowerCase();
      const matchText = (p.name || '').toLowerCase().includes(q) || (p.code || '').toLowerCase().includes(q);
      const matchCat = !catFilter || p.cat === catFilter;
      const matchStock =
        stockFilter === 'all'
          ? true
          : stockFilter === 'low'
          ? !p.svc && p.stock <= p.min && p.stock > 0
          : stockFilter === 'out'
          ? !p.svc && p.stock <= 0
          : true;

      return matchText && matchCat && matchStock;
    })
    .sort((a, b) => a.name.localeCompare(b.name));

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
              📦 Catálogo y Control de Stock
            </h2>
            <p className="text-xs text-stone-500">
              {data.products.length} productos y servicios registrados
            </p>
          </div>
        </div>

        <button
          onClick={openNewModal}
          className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-transform active:scale-95 flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Producto Nuevo
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-stone-200 p-4 shadow-xs space-y-3">
        <div className="grid sm:grid-cols-3 gap-2.5">
          <div className="sm:col-span-1 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por nombre o código..."
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-sm focus:border-orange-500 focus:outline-hidden"
            />
          </div>

          <div>
            <select
              value={catFilter}
              onChange={(e) => setCatFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:border-orange-500 focus:outline-hidden bg-white"
            >
              <option value="">Todas las categorías</option>
              {categories.map((c, idx) => (
                <option key={idx} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={stockFilter}
              onChange={(e) => setStockFilter(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-300 text-sm focus:border-orange-500 focus:outline-hidden bg-white"
            >
              <option value="all">Todo el stock</option>
              <option value="low">⚠️ Stock bajo (alerta)</option>
              <option value="out">🔴 Sin stock (0 unidades)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Products List */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs divide-y divide-stone-100">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-stone-400 text-sm">
            No se encontraron productos con los filtros seleccionados.
          </div>
        ) : (
          filtered.map((p) => {
            const isLow = !p.svc && p.stock <= p.min && p.stock > 0;
            const isOut = !p.svc && p.stock <= 0;
            const profit = p.price - p.cost;

            return (
              <div
                key={p.id}
                className="p-3.5 sm:p-4 hover:bg-stone-50/70 transition-colors flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm"
              >
                <div className="flex-1 min-w-[180px]">
                  <div className="flex items-center gap-2">
                    <strong className="text-stone-900 font-bold text-sm sm:text-base">
                      {p.name}
                    </strong>
                    {p.svc ? (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800">
                        Servicio
                      </span>
                    ) : (
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                          isOut
                            ? 'bg-rose-100 text-rose-800 font-black'
                            : isLow
                            ? 'bg-amber-100 text-amber-900'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {isOut ? '¡Sin stock!' : `Stock: ${p.stock}`}
                      </span>
                    )}
                  </div>
                  <p className="text-stone-500 text-xs mt-0.5">
                    {p.cat} {p.code ? `· #${p.code}` : ''} · Ganancia: {$(profit)} (
                    {p.cost ? Math.round((profit / p.cost) * 100) : 0}%)
                  </p>
                </div>

                {/* Price */}
                <div className="text-right">
                  <span className="text-xs text-stone-400 block">Venta</span>
                  <span className="text-base sm:text-lg font-black text-stone-900">
                    {$(p.price)}
                  </span>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => openEditModal(p)}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 font-semibold text-xs text-stone-700 transition-colors flex items-center gap-1"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  {!p.svc && (
                    <button
                      onClick={() => openAdjustStock(p)}
                      className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 font-semibold text-xs text-stone-700 transition-colors flex items-center gap-1"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5" />
                      Stock
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (window.confirm(`¿Eliminar ${p.name}?`)) {
                        onDeleteProduct(p.id);
                      }
                    }}
                    className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg"
                    title="Eliminar producto"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* CREATE / EDIT PRODUCT MODAL */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-lg w-full overflow-hidden my-6">
            <div className="bg-gradient-to-r from-orange-600 to-amber-700 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-lg">
                {isNewProduct ? 'Crear Producto Nuevo' : 'Editar Producto'}
              </h3>
              <button onClick={() => setEditingProduct(null)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs sm:text-sm">
              <div>
                <label className="block font-semibold text-stone-700 mb-1">Nombre del producto *</label>
                <input
                  type="text"
                  required
                  value={pName}
                  onChange={(e) => setPName(e.target.value)}
                  placeholder="Ej: Alimento perro adulto 15kg"
                  className="w-full px-3.5 py-2 rounded-xl border border-stone-300 focus:border-orange-500 focus:outline-hidden font-medium text-stone-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Código de barras (opcional)</label>
                  <input
                    type="text"
                    value={pCode}
                    onChange={(e) => setPCode(e.target.value)}
                    placeholder="Ej: 7790001"
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-orange-500 focus:outline-hidden text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Categoría</label>
                  <input
                    type="text"
                    list="cat-datalist"
                    value={pCat}
                    onChange={(e) => setPCat(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-orange-500 focus:outline-hidden text-xs"
                  />
                  <datalist id="cat-datalist">
                    {categories.map((c, idx) => (
                      <option key={idx} value={c} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Tipo</label>
                <select
                  value={pSvc ? '1' : '0'}
                  onChange={(e) => setPSvc(e.target.value === '1')}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 focus:border-orange-500 focus:outline-hidden bg-white"
                >
                  <option value="0">Producto Físico (controla inventario y stock)</option>
                  <option value="1">Servicio (consulta veterinaria, baño, vacuna, etc.)</option>
                </select>
              </div>

              {/* Cost & Margins */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Cuánto me cuesta (Costo) $</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={pCost}
                    onChange={(e) => handleCostChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-stone-700 mb-1">Mi ganancia habitual %</label>
                  <input
                    type="number"
                    step="any"
                    value={pMg}
                    onChange={(e) => handleMarginChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">
                  Precio de venta final $ (se calcula solo, podés modificarlo)
                </label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  required
                  value={pPrice}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-orange-500 font-black text-orange-800 text-base"
                />
              </div>

              {/* Stock controls (if physical product) */}
              {!pSvc && (
                <div className="grid grid-cols-2 gap-3 border-t border-stone-200 pt-3">
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Stock actual en local</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={pStock}
                      onChange={(e) => setPStock(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-stone-700 mb-1">Avisarme si quedan menos de</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      value={pMin}
                      onChange={(e) => setPMin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-stone-300 font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-200">
                <button
                  type="button"
                  onClick={() => setEditingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-md shadow-orange-600/20"
                >
                  Guardar Producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-md w-full overflow-hidden my-6">
            <div className="bg-stone-800 text-white p-4 flex items-center justify-between">
              <h3 className="font-bold text-base">
                Ajustar Stock: {adjustingProduct.name}
              </h3>
              <button onClick={() => setAdjustingProduct(null)} className="text-stone-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStock} className="p-5 space-y-4 text-xs sm:text-sm">
              <p className="text-stone-500">
                Actualmente figuran <b>{adjustingProduct.stock}</b> unidades en el sistema. Contá físicamente lo que hay y escribilo acá:
              </p>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Cantidad real contada</label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  required
                  value={adjustStockVal}
                  onChange={(e) => setAdjustStockVal(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border-2 border-stone-300 font-bold text-stone-900 text-lg"
                  autoFocus
                />
              </div>

              <div>
                <label className="block font-semibold text-stone-700 mb-1">Motivo del ajuste</label>
                <select
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 bg-white font-medium"
                >
                  <option value="Conteo del inventario">Conteo del inventario periódico</option>
                  <option value="Rotura o vencimiento">Rotura o producto vencido</option>
                  <option value="Regalo o muestra">Muestra médica o regalo</option>
                  <option value="Consumo interno">Consumo interno de la veterinaria</option>
                  <option value="Otro motivo">Otro motivo</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-xl border border-stone-300 text-stone-700 font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold"
                >
                  Actualizar Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
