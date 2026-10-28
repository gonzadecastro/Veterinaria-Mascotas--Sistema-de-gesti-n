import React, { useState, useEffect } from 'react';
import { AppData, CashMovement, CashShift, PaymentMethod, Product, Purchase, Sale } from './types';
import {
  createAutoBackup,
  generateDemoProducts,
  loadData,
  saveData,
} from './utils/storage';
import { anularOperacion, calculateExpectedShiftCash, calculateShiftSummary, paidOf } from './utils/financial';
import { $, nowIso, nowTime, r2, today } from './utils/formatters';

// Components
import { Header } from './components/Header';
import { CashShiftModal } from './components/CashShiftModal';
import { EditSaleModal } from './components/EditSaleModal';
import { BackupModal } from './components/BackupModal';
import { ReceiptModal } from './components/ReceiptModal';

// Views
import { HomeView } from './views/HomeView';
import { SellView } from './views/SellView';
import { BuyView } from './views/BuyView';
import { ProductsView } from './views/ProductsView';
import { MoneyView } from './views/MoneyView';
import { PendingView } from './views/PendingView';
import { HistoryView } from './views/HistoryView';
import { ReportsView } from './views/ReportsView';

export default function App() {
  const [data, setData] = useState<AppData>(() => loadData());
  const [view, setView] = useState<string>('home');

  // Modals state
  const [isShiftModalOpen, setIsShiftModalOpen] = useState<boolean>(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState<boolean>(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [receiptState, setReceiptState] = useState<{ sale?: Sale | null; shift?: CashShift | null; isOpen: boolean }>({
    sale: null,
    shift: null,
    isOpen: false,
  });

  // Toast state
  const [toastMessage, setToastMessage] = useState<{ text: string; bad?: boolean } | null>(null);

  const showToast = (text: string, bad: boolean = false) => {
    setToastMessage({ text, bad });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4000);
  };

  // Sync to localStorage
  const updateData = (newData: AppData) => {
    setData(newData);
    saveData(newData);
  };

  // On initial mount: daily auto backup
  useEffect(() => {
    const lastBackup = data.lastBackupDate;
    const todayStr = today();
    if (lastBackup !== todayStr && (data.products.length > 0 || data.sales.length > 0)) {
      createAutoBackup(data, `Copia automática diaria (${todayStr})`);
      const updated = { ...data, lastBackupDate: todayStr };
      updateData(updated);
    }
  }, []);

  const currentShift = data.shifts.find((s) => s.status === 'open') || null;
  const currentExpectedCash = currentShift ? calculateExpectedShiftCash(data, currentShift) : 0;

  // ----------------- VENTA ACTIONS -----------------
  const handleSaveSale = (sale: Sale) => {
    // 1. Deduct stock for physical items
    const updatedProducts = data.products.map((p) => {
      const item = sale.items.find((i) => i.pid === p.id);
      if (item && !p.svc) {
        return { ...p, stock: r2(p.stock - item.q) };
      }
      return p;
    });

    // 2. Add log entry
    const logItem = {
      id: data.seq++,
      d: sale.d,
      h: sale.time || nowTime(),
      t: 'venta' as const,
      txt: `Venta #${sale.n}${sale.cl ? ' a ' + sale.cl : ''}: ${sale.items.map((i) => `${i.q}x ${i.nm}`).join(', ')}`,
      amt: sale.total,
      ref: `s:${sale.id}`,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      sales: [...data.sales, sale],
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`✔ Venta #${sale.n} guardada exitosamente: ${$(sale.total)}`);
    setView('sell');
  };

  // ----------------- COMPRA ACTIONS -----------------
  const handleSaveBuy = (purchase: Purchase, updateSalePrices: boolean) => {
    const updatedProducts = data.products.map((p) => {
      const item = purchase.items.find((i) => i.pid === p.id);
      if (item) {
        const newStock = p.svc ? 0 : r2(p.stock + item.q);
        const newCost = item.c;
        const newPrice = updateSalePrices ? Math.round(newCost * (1 + p.mg / 100)) : p.price;
        return {
          ...p,
          stock: newStock,
          cost: newCost,
          price: newPrice,
        };
      }
      return p;
    });

    const updatedProviders = data.providers.includes(purchase.pv)
      ? data.providers
      : [...data.providers, purchase.pv];

    const logItem = {
      id: data.seq++,
      d: purchase.d,
      h: purchase.time || nowTime(),
      t: 'compra' as const,
      txt: `Compra #${purchase.n} a ${purchase.pv}: ${purchase.items.map((i) => `${i.q}x ${i.nm}`).join(', ')}`,
      amt: purchase.total,
      ref: `p:${purchase.id}`,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      providers: updatedProviders,
      purchases: [...data.purchases, purchase],
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`✔ Compra #${purchase.n} guardada: ${$(purchase.total)}`);
  };

  // ----------------- PRIORITY 1: CORREGIR LAS ANULACIONES -----------------
  const handleAnular = (kind: 's' | 'p', id: number) => {
    const confirmMsg =
      kind === 's'
        ? '¿Anular esta venta? Se devolverá el stock al inventario y se registrará la devolución exacta sin duplicar saldos.'
        : '¿Anular esta compra? Se ajustará el stock descontándolo.';

    if (!window.confirm(confirmMsg)) return;

    const copy = JSON.parse(JSON.stringify(data)) as AppData;
    const result = anularOperacion(copy, kind, id, 'Anulación confirmada por el usuario');

    if (result.success) {
      updateData(copy);
      showToast(result.message);
    } else {
      showToast(result.message, true);
    }
  };

  // ----------------- PRIORITY 2: CORREGIR LA EDICIÓN DE VENTAS Y PAGOS -----------------
  const handleSaveEditedSale = (updatedSale: Sale) => {
    const oldSale = data.sales.find((s) => s.id === updatedSale.id);
    if (!oldSale) return;

    // 1. Calculate stock difference for physical products
    const updatedProducts = data.products.map((p) => {
      if (p.svc) return p;
      const oldItem = oldSale.items.find((i) => i.pid === p.id);
      const newItem = updatedSale.items.find((i) => i.pid === p.id);

      const oldQty = oldItem ? oldItem.q : 0;
      const newQty = newItem ? newItem.q : 0;
      const delta = newQty - oldQty; // positive means we sold more, so stock decreases

      if (delta !== 0) {
        return { ...p, stock: r2(p.stock - delta) };
      }
      return p;
    });

    // 2. Update sale in array
    const updatedSales = data.sales.map((s) => (s.id === updatedSale.id ? updatedSale : s));

    // 3. Add activity log
    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'edición' as const,
      txt: `Venta #${updatedSale.n} editada. Total: ${$(oldSale.total)} -> ${$(updatedSale.total)}. Pagos preservados: ${updatedSale.pays.length}.`,
      amt: updatedSale.total,
      ref: `s:${updatedSale.id}`,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      sales: updatedSales,
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    setEditingSale(null);
    showToast(`✔ Venta #${updatedSale.n} modificada con éxito. Historial financiero preservado.`);
  };

  // ----------------- PRIORITY 4: APERTURA Y CIERRE DE CAJA -----------------
  const handleOpenShift = (initialCash: number, openedBy: string, notes?: string) => {
    const newShift: CashShift = {
      id: data.seqShift++,
      status: 'open',
      openedAt: nowIso(),
      openedDate: today(),
      openedTime: nowTime(),
      openedBy,
      initialCash,
      notes,
    };

    // Also register manual opening cash movement
    const openingMovement: CashMovement = {
      id: data.seq++,
      d: today(),
      time: nowTime(),
      t: 'in',
      c: `Apertura de Caja Turno #${newShift.id} – Fondo Inicial`,
      a: initialCash,
      m: 'Efectivo',
      shiftId: newShift.id,
      isOpening: true,
    };

    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'caja' as const,
      txt: `Apertura de Caja Turno #${newShift.id} por ${openedBy} con fondo inicial de ${$(initialCash)}`,
      amt: initialCash,
    };

    const updatedData: AppData = {
      ...data,
      shifts: [...data.shifts, newShift],
      currentShiftId: newShift.id,
      cash: [...data.cash, openingMovement],
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    setIsShiftModalOpen(false);
    showToast(`✔ Caja Abierta Turno #${newShift.id}: Fondo inicial ${$(initialCash)}`);
  };

  const handleCloseShift = (shiftId: number, countedCash: number, notes?: string) => {
    const shift = data.shifts.find((s) => s.id === shiftId);
    if (!shift) return;

    const summary = calculateShiftSummary(data, shift);
    const expectedCash = calculateExpectedShiftCash(data, shift);
    const diffCash = r2(countedCash - expectedCash);

    const closedShift: CashShift = {
      ...shift,
      status: 'closed',
      closedAt: nowIso(),
      closedDate: today(),
      closedTime: nowTime(),
      closedBy: shift.openedBy,
      countedCash,
      expectedCash,
      diffCash,
      notes,
      summary,
    };

    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'caja' as const,
      txt: `Cierre de Caja Turno #${shift.id}. Esperado: ${$(expectedCash)}, Contado: ${$(countedCash)}, Dif: ${$(diffCash)}`,
      amt: countedCash,
    };

    const updatedShifts = data.shifts.map((s) => (s.id === shiftId ? closedShift : s));

    const updatedData: AppData = {
      ...data,
      shifts: updatedShifts,
      currentShiftId: null,
      log: [logItem, ...data.log],
    };

    // Priority 3: Automatic backup snapshot upon closing cash shift!
    createAutoBackup(updatedData, `Cierre de Caja Turno #${shift.id}`);

    updateData(updatedData);
    setIsShiftModalOpen(false);
    showToast(`✔ Caja cerrada exitosamente. Arqueo guardado.`);

    // Open receipt modal with shift closing summary
    setReceiptState({
      shift: closedShift,
      isOpen: true,
    });
  };

  // ----------------- PRIORITY 3: REFORZAR COPIAS DE SEGURIDAD -----------------
  const handleRestoreData = (restoredData: AppData, reason: string) => {
    // 1. Safety automatic backup of current state
    createAutoBackup(data, `Respaldo preventivo antes de: ${reason}`);

    // 2. Set new data
    updateData(restoredData);
    showToast(`✔ Datos restaurados con éxito. Se guardó una copia de seguridad previa de seguridad.`);
    setView('home');
  };

  // ----------------- MANUAL MOVEMENTS & DEBT PAYMENTS -----------------
  const handleAddManualMovement = (movement: Omit<CashMovement, 'id'>) => {
    const newMovement: CashMovement = {
      id: data.seq++,
      ...movement,
    };

    const logItem = {
      id: data.seq++,
      d: movement.d,
      h: movement.time || nowTime(),
      t: 'dinero' as const,
      txt: `${movement.t === 'in' ? 'Entrada' : 'Gasto'}: ${movement.c} (${movement.m || 'Efectivo'})`,
      amt: movement.a,
    };

    const updatedData: AppData = {
      ...data,
      cash: [...data.cash, newMovement],
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`✔ Movimiento guardado: ${movement.t === 'in' ? '+' : '−'}${$(movement.a)}`);
  };

  const handleRecordPayment = (kind: 's' | 'p', id: number, amount: number, method: PaymentMethod) => {
    if (kind === 's') {
      const sale = data.sales.find((s) => s.id === id);
      if (!sale) return;

      const newPayment = {
        d: today(),
        time: nowTime(),
        a: amount,
        m: method,
        note: 'Cobro de cuenta corriente',
      };

      const updatedSale = {
        ...sale,
        pays: [...sale.pays, newPayment],
      };

      const logItem = {
        id: data.seq++,
        d: today(),
        h: nowTime(),
        t: 'cobro' as const,
        txt: `Cobro de deuda Venta #${sale.n} – Cliente: ${sale.cl || 'Sin nombre'} (${method})`,
        amt: amount,
        ref: `s:${sale.id}`,
      };

      const updatedData: AppData = {
        ...data,
        sales: data.sales.map((s) => (s.id === id ? updatedSale : s)),
        log: [logItem, ...data.log],
      };

      updateData(updatedData);
      showToast(`✔ Cobro registrado: ${$(amount)}`);
    } else {
      const buy = data.purchases.find((p) => p.id === id);
      if (!buy) return;

      const newPayment = {
        d: today(),
        time: nowTime(),
        a: amount,
        m: method,
        note: 'Pago a proveedor',
      };

      const updatedPurchase = {
        ...buy,
        pays: [...buy.pays, newPayment],
      };

      const logItem = {
        id: data.seq++,
        d: today(),
        h: nowTime(),
        t: 'pago' as const,
        txt: `Pago a proveedor Compra #${buy.n} – ${buy.pv} (${method})`,
        amt: amount,
        ref: `p:${buy.id}`,
      };

      const updatedData: AppData = {
        ...data,
        purchases: data.purchases.map((p) => (p.id === id ? updatedPurchase : p)),
        log: [logItem, ...data.log],
      };

      updateData(updatedData);
      showToast(`✔ Pago a proveedor registrado: ${$(amount)}`);
    }
  };

  // ----------------- PRODUCT ACTIONS -----------------
  const handleSaveProduct = (prod: Product, isNew: boolean) => {
    let updatedProducts: Product[];
    if (isNew) {
      const newP = { ...prod, id: data.seq++ };
      updatedProducts = [...data.products, newP];
    } else {
      updatedProducts = data.products.map((p) => (p.id === prod.id ? prod : p));
    }

    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'producto' as const,
      txt: `${isNew ? 'Producto creado' : 'Producto modificado'}: ${prod.name} (${prod.cat})`,
      amt: prod.price,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`✔ Producto ${prod.name} guardado correctamente.`);
  };

  const handleAdjustStock = (productId: number, newStock: number, reason: string) => {
    const prod = data.products.find((p) => p.id === productId);
    if (!prod) return;

    const oldStock = prod.stock;
    const updatedProducts = data.products.map((p) =>
      p.id === productId ? { ...p, stock: newStock } : p
    );

    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'stock' as const,
      txt: `Ajuste stock ${prod.name}: ${oldStock} -> ${newStock} (${reason})`,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`✔ Stock de ${prod.name} actualizado a ${newStock}.`);
  };

  const handleDeleteProduct = (productId: number) => {
    const prod = data.products.find((p) => p.id === productId);
    const updatedProducts = data.products.filter((p) => p.id !== productId);

    const logItem = {
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'producto' as const,
      txt: `Producto eliminado: ${prod?.name || productId}`,
    };

    const updatedData: AppData = {
      ...data,
      products: updatedProducts,
      log: [logItem, ...data.log],
    };

    updateData(updatedData);
    showToast(`Producto eliminado.`);
  };

  const handleLoadDemo = () => {
    const { products: demo, nextSeq } = generateDemoProducts(data.seq);
    const updatedData: AppData = {
      ...data,
      products: [...data.products, ...demo],
      seq: nextSeq,
    };
    updateData(updatedData);
    showToast(`✔ Se cargaron ${demo.length} productos de ejemplo.`);
  };

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 flex flex-col font-sans selection:bg-orange-200">
      {/* Top Header with Brand and Live Cash Shift Chip */}
      <Header
        currentShift={currentShift}
        expectedCash={currentExpectedCash}
        onOpenShiftModal={() => setIsShiftModalOpen(true)}
        onGoHome={() => setView('home')}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-5">
        {view === 'home' && (
          <HomeView
            data={data}
            onNavigate={(v) => setView(v)}
            onOpenCashModal={() => setIsShiftModalOpen(true)}
            onOpenBackupModal={() => setIsBackupModalOpen(true)}
            onLoadDemo={handleLoadDemo}
          />
        )}

        {view === 'sell' && (
          <SellView
            data={data}
            onSaveSale={handleSaveSale}
            onNavigateHome={() => setView('home')}
            onOpenProductModal={() => setView('prods')}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
          />
        )}

        {view === 'buy' && (
          <BuyView
            data={data}
            onSaveBuy={handleSaveBuy}
            onNavigateHome={() => setView('home')}
            onOpenProductModal={() => setView('prods')}
          />
        )}

        {view === 'prods' && (
          <ProductsView
            data={data}
            onNavigateHome={() => setView('home')}
            onSaveProduct={handleSaveProduct}
            onAdjustStock={handleAdjustStock}
            onDeleteProduct={handleDeleteProduct}
          />
        )}

        {view === 'money' && (
          <MoneyView
            data={data}
            onNavigateHome={() => setView('home')}
            onAddManualMovement={handleAddManualMovement}
            onOpenShiftModal={() => setIsShiftModalOpen(true)}
          />
        )}

        {view === 'pend' && (
          <PendingView
            data={data}
            onNavigateHome={() => setView('home')}
            onRecordPayment={handleRecordPayment}
          />
        )}

        {view === 'hist' && (
          <HistoryView
            data={data}
            onNavigateHome={() => setView('home')}
            onAnular={handleAnular}
            onEditSale={(sale) => setEditingSale(sale)}
            onPrintSaleTicket={(sale) => setReceiptState({ sale, isOpen: true })}
            onPrintShiftTicket={(shift) => setReceiptState({ shift, isOpen: true })}
          />
        )}

        {view === 'rep' && (
          <ReportsView
            data={data}
            onNavigateHome={() => setView('home')}
          />
        )}
      </main>

      {/* MODAL 1: Cash Shift (Apertura y Cierre - Priority 4) */}
      <CashShiftModal
        data={data}
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onOpenShift={handleOpenShift}
        onCloseShift={handleCloseShift}
        onPrintShiftTicket={(shift) => setReceiptState({ shift, isOpen: true })}
      />

      {/* MODAL 2: Edit Sale (Priority 2) */}
      {editingSale && (
        <EditSaleModal
          sale={editingSale}
          data={data}
          isOpen={Boolean(editingSale)}
          onClose={() => setEditingSale(null)}
          onSave={handleSaveEditedSale}
        />
      )}

      {/* MODAL 3: Backup & Security (Priority 3) */}
      <BackupModal
        data={data}
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        onRestoreData={handleRestoreData}
      />

      {/* MODAL 4: Printable Receipt Ticket */}
      <ReceiptModal
        sale={receiptState.sale}
        shift={receiptState.shift}
        isOpen={receiptState.isOpen}
        onClose={() => setReceiptState({ sale: null, shift: null, isOpen: false })}
      />

      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`fixed bottom-5 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-2xl font-bold text-sm flex items-center gap-2 max-w-[92%] transition-all animate-fade-in ${
            toastMessage.bad
              ? 'bg-rose-600 text-white shadow-rose-600/30'
              : 'bg-emerald-700 text-white shadow-emerald-700/30'
          }`}
        >
          {toastMessage.text}
        </div>
      )}
    </div>
  );
}
