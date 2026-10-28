import { AppData, CashMovement, CashShift, Payment, PaymentMethod, Purchase, Sale, ShiftSummary } from '../types';
import { today, nowTime, nowIso, r2 } from './formatters';

export const paidOf = (o: Sale | Purchase): number => {
  if (!o || !Array.isArray(o.pays)) return 0;
  return r2(o.pays.reduce((acc, p) => acc + (Number(p.a) || 0), 0));
};

export const sold = (data: AppData): Sale[] => {
  return data.sales.filter((s) => !s.void);
};

export const bought = (data: AppData): Purchase[] => {
  return data.purchases.filter((p) => !p.void);
};

export const profitOf = (sale: Sale): number => {
  if (sale.void) return 0;
  return r2(
    sale.items.reduce((acc, i) => {
      const price = Number(i.p) || 0;
      const cost = Number(i.c) || 0;
      const qty = Number(i.q) || 0;
      return acc + (price - cost) * qty;
    }, 0)
  );
};

export interface UnifiedLedgerEntry {
  id: string | number;
  d: string;
  time?: string;
  t: 'in' | 'out';
  c: string;
  a: number;
  m: PaymentMethod;
  source: 'sale' | 'purchase' | 'manual' | 'refund_sale' | 'refund_purchase' | 'opening';
  ref?: string;
  shiftId?: number;
}

/**
 * Builds the complete financial ledger with every transaction,
 * ensuring no double counting and respecting payment methods.
 */
export function getUnifiedLedger(data: AppData): UnifiedLedgerEntry[] {
  const entries: UnifiedLedgerEntry[] = [];

  // 1. Inflows from Sales payments
  data.sales.forEach((s) => {
    s.pays.forEach((p, idx) => {
      entries.push({
        id: `sale_${s.id}_${idx}`,
        d: p.d,
        time: p.time,
        t: 'in',
        c: `Venta #${s.n}${s.cl ? ' – ' + s.cl : ''}${s.void ? ' (Original)' : ''}`,
        a: p.a,
        m: p.m || 'Efectivo',
        source: 'sale',
        ref: `s:${s.id}`,
        shiftId: s.shiftId,
      });
    });

    // If sale was voided, counter-movement (Refund) for whatever was actually paid
    if (s.void) {
      s.pays.forEach((p, idx) => {
        entries.push({
          id: `void_sale_${s.id}_${idx}`,
          d: s.voidDate || p.d,
          time: s.voidTime,
          t: 'out',
          c: `Devolución / Anulación Venta #${s.n}${s.cl ? ' – ' + s.cl : ''}`,
          a: p.a,
          m: p.m || 'Efectivo',
          source: 'refund_sale',
          ref: `void_s:${s.id}`,
          shiftId: s.shiftId,
        });
      });
    }
  });

  // 2. Outflows from Purchases payments
  data.purchases.forEach((c) => {
    c.pays.forEach((p, idx) => {
      entries.push({
        id: `buy_${c.id}_${idx}`,
        d: p.d,
        time: p.time,
        t: 'out',
        c: `Compra #${c.n} – ${c.pv}${c.void ? ' (Original)' : ''}`,
        a: p.a,
        m: p.m || 'Efectivo',
        source: 'purchase',
        ref: `p:${c.id}`,
        shiftId: c.shiftId,
      });
    });

    // If purchase was voided, counter-movement (Refund from provider)
    if (c.void) {
      c.pays.forEach((p, idx) => {
        entries.push({
          id: `void_buy_${c.id}_${idx}`,
          d: c.voidDate || p.d,
          time: c.voidTime,
          t: 'in',
          c: `Anulación Compra #${c.n} – Reintegro de ${c.pv}`,
          a: p.a,
          m: p.m || 'Efectivo',
          source: 'refund_purchase',
          ref: `void_p:${c.id}`,
          shiftId: c.shiftId,
        });
      });
    }
  });

  // 3. Manual Cash movements (Ingresos, Gastos, Fondo de caja)
  data.cash.forEach((x) => {
    // Avoid double counting legacy cash anulations if any exist in older data
    if (x.ref && x.ref.startsWith('void_')) {
      // Legacy void entry handled by the explicit model above
      return;
    }
    entries.push({
      id: `cash_${x.id}`,
      d: x.d,
      time: x.time,
      t: x.t,
      c: x.c,
      a: x.a,
      m: x.m || 'Efectivo',
      source: x.isOpening ? 'opening' : 'manual',
      ref: x.ref,
      shiftId: x.shiftId,
    });
  });

  // Sort descending by date and time
  return entries.sort((a, b) => {
    const cmp = (b.d || '').localeCompare(a.d || '');
    if (cmp !== 0) return cmp;
    return (b.time || '').localeCompare(a.time || '');
  });
}

/**
 * Calculates total physical cash currently in drawer.
 */
export function getPhysicalCashBalance(data: AppData): number {
  const ledger = getUnifiedLedger(data);
  // Physical cash = only movements with method 'Efectivo'
  return r2(
    ledger
      .filter((x) => (x.m || 'Efectivo') === 'Efectivo')
      .reduce((acc, x) => acc + (x.t === 'in' ? x.a : -x.a), 0)
  );
}

/**
 * Calculates digital balances breakdown (Transferencia, Tarjeta, Mercado Pago).
 */
export function getDigitalBalances(data: AppData): Record<PaymentMethod, number> {
  const ledger = getUnifiedLedger(data);
  const res: Record<PaymentMethod, number> = {
    'Efectivo': 0,
    'Transferencia': 0,
    'Tarjeta': 0,
    'Mercado Pago': 0,
  };

  ledger.forEach((x) => {
    const m = x.m || 'Efectivo';
    const val = x.t === 'in' ? x.a : -x.a;
    res[m] = (res[m] || 0) + val;
  });

  return {
    'Efectivo': r2(res['Efectivo']),
    'Transferencia': r2(res['Transferencia']),
    'Tarjeta': r2(res['Tarjeta']),
    'Mercado Pago': r2(res['Mercado Pago']),
  };
}

/**
 * Calculates detailed summary for a specific cash shift (Apertura y Cierre).
 */
export function calculateShiftSummary(data: AppData, shift: CashShift): ShiftSummary {
  const summary: ShiftSummary = {
    totalSales: 0,
    salesCount: 0,
    salesByMethod: {
      'Efectivo': 0,
      'Transferencia': 0,
      'Tarjeta': 0,
      'Mercado Pago': 0,
    },
    cashSales: 0,
    cashDebtCollections: 0,
    cashManualInflows: 0,
    cashExpenses: 0,
    cashSupplierPayments: 0,
    cashRefunds: 0,
    digitalTotal: 0,
    netCashFlow: 0,
  };

  // Determine time boundary for the shift
  const shiftStart = shift.openedAt;
  const shiftEnd = shift.closedAt || nowIso();

  // Helper to check if record happened during this shift
  const isInShift = (recordIso?: string, recordDate?: string, recordTime?: string): boolean => {
    if (recordIso) {
      return recordIso >= shiftStart && recordIso <= shiftEnd;
    }
    const combined = `${recordDate || today()}T${recordTime || '00:00'}:00.000Z`;
    return combined >= shiftStart && combined <= shiftEnd;
  };

  // Check sales
  data.sales.forEach((s) => {
    if (s.void) {
      // If voided during this shift, check if cash refund occurred
      if (isInShift(s.voidDate ? `${s.voidDate}T${s.voidTime || '00:00'}` : undefined)) {
        s.pays.forEach((p) => {
          if ((p.m || 'Efectivo') === 'Efectivo') {
            summary.cashRefunds += p.a;
          }
        });
      }
      return;
    }

    // Active sale in shift
    const sTime = s.time || '12:00';
    const sDate = s.d || today();
    const isThisShift = s.shiftId === shift.id || isInShift(undefined, sDate, sTime);

    if (isThisShift) {
      summary.totalSales += s.total;
      summary.salesCount += 1;
    }

    // Check payments made during this shift (could be payment on sale or debt collection)
    s.pays.forEach((p, idx) => {
      const pTime = p.time || s.time || '12:00';
      const pDate = p.d || s.d || today();
      if (s.shiftId === shift.id || isInShift(undefined, pDate, pTime)) {
        const m = p.m || 'Efectivo';
        summary.salesByMethod[m] = (summary.salesByMethod[m] || 0) + p.a;

        if (m === 'Efectivo') {
          if (idx === 0) {
            summary.cashSales += p.a;
          } else {
            summary.cashDebtCollections += p.a;
          }
        } else {
          summary.digitalTotal += p.a;
        }
      }
    });
  });

  // Check purchases in shift
  data.purchases.forEach((c) => {
    if (c.void) return;
    c.pays.forEach((p) => {
      const pTime = p.time || c.time || '12:00';
      const pDate = p.d || c.d || today();
      if (c.shiftId === shift.id || isInShift(undefined, pDate, pTime)) {
        if ((p.m || 'Efectivo') === 'Efectivo') {
          summary.cashSupplierPayments += p.a;
        }
      }
    });
  });

  // Check manual cash movements in shift
  data.cash.forEach((m) => {
    if (m.isOpening) return; // Opening float is handled separately
    const mTime = m.time || '12:00';
    const mDate = m.d || today();
    if (m.shiftId === shift.id || isInShift(undefined, mDate, mTime)) {
      if ((m.m || 'Efectivo') === 'Efectivo') {
        if (m.t === 'in') {
          summary.cashManualInflows += m.a;
        } else {
          summary.cashExpenses += m.a;
        }
      }
    }
  });

  // Calculate Net Cash Flow (Inflows - Outflows)
  const totalCashIn = summary.cashSales + summary.cashDebtCollections + summary.cashManualInflows;
  const totalCashOut = summary.cashExpenses + summary.cashSupplierPayments + summary.cashRefunds;
  summary.netCashFlow = r2(totalCashIn - totalCashOut);

  // Round all values
  summary.totalSales = r2(summary.totalSales);
  summary.cashSales = r2(summary.cashSales);
  summary.cashDebtCollections = r2(summary.cashDebtCollections);
  summary.cashManualInflows = r2(summary.cashManualInflows);
  summary.cashExpenses = r2(summary.cashExpenses);
  summary.cashSupplierPayments = r2(summary.cashSupplierPayments);
  summary.cashRefunds = r2(summary.cashRefunds);
  summary.digitalTotal = r2(summary.digitalTotal);
  Object.keys(summary.salesByMethod).forEach((k) => {
    const key = k as PaymentMethod;
    summary.salesByMethod[key] = r2(summary.salesByMethod[key]);
  });

  return summary;
}

/**
 * Expected physical cash in drawer for a shift =
 * Initial Cash Float + Net Cash Flow of the shift.
 */
export function calculateExpectedShiftCash(data: AppData, shift: CashShift): number {
  const summary = calculateShiftSummary(data, shift);
  return r2(shift.initialCash + summary.netCashFlow);
}

// ----------------- PRIORITY 1: CORREGIR LAS ANULACIONES -----------------
export interface AnularResult {
  success: boolean;
  message: string;
}

export function anularOperacion(
  data: AppData,
  kind: 's' | 'p',
  id: number,
  reason: string = 'Anulación solicitada por el usuario'
): AnularResult {
  if (kind === 's') {
    const sale = data.sales.find((x) => x.id === id);
    if (!sale) return { success: false, message: 'Venta no encontrada' };
    if (sale.void) return { success: false, message: 'La venta ya fue anulada previamente' };

    // 1. Mark as void
    sale.void = true;
    sale.voidDate = today();
    sale.voidTime = nowTime();
    sale.voidReason = reason;

    // 2. Return physical stock
    sale.items.forEach((item) => {
      const prod = data.products.find((p) => p.id === item.pid);
      if (prod && !prod.svc) {
        prod.stock = r2(prod.stock + item.q);
      }
    });

    // 3. Log
    const totalPaid = paidOf(sale);
    data.log.unshift({
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'anulación',
      txt: `Venta #${sale.n}${sale.cl ? ' a ' + sale.cl : ''} anulada (${reason})`,
      amt: sale.total,
      ref: `s:${sale.id}`,
    });

    return {
      success: true,
      message: `Venta #${sale.n} anulada correctamente. Stock devuelto a inventario.${
        totalPaid > 0 ? ` Se registraron devoluciones por ${totalPaid}.` : ''
      }`,
    };
  } else {
    const buy = data.purchases.find((x) => x.id === id);
    if (!buy) return { success: false, message: 'Compra no encontrada' };
    if (buy.void) return { success: false, message: 'La compra ya fue anulada previamente' };

    // 1. Mark as void
    buy.void = true;
    buy.voidDate = today();
    buy.voidTime = nowTime();
    buy.voidReason = reason;

    // 2. Deduct stock
    buy.items.forEach((item) => {
      const prod = data.products.find((p) => p.id === item.pid);
      if (prod && !prod.svc) {
        prod.stock = r2(prod.stock - item.q);
      }
    });

    // 3. Log
    data.log.unshift({
      id: data.seq++,
      d: today(),
      h: nowTime(),
      t: 'anulación',
      txt: `Compra #${buy.n} a ${buy.pv} anulada (${reason})`,
      amt: buy.total,
      ref: `p:${buy.id}`,
    });

    return {
      success: true,
      message: `Compra #${buy.n} anulada correctamente. Stock ajustado.`,
    };
  }
}
