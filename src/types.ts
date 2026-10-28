export type PaymentMethod = 'Efectivo' | 'Transferencia' | 'Tarjeta' | 'Mercado Pago';

export interface Product {
  id: number;
  name: string;
  code: string;
  cat: string;
  svc: boolean;
  cost: number;
  mg: number;
  price: number;
  stock: number;
  min: number;
}

export interface Payment {
  id?: number;
  d: string;      // YYYY-MM-DD
  time?: string;   // HH:mm
  a: number;      // Amount
  m: PaymentMethod;
  note?: string;
}

export interface CartItem {
  pid: number;
  nm: string;
  q: number;
  p: number;
  c: number;
}

export interface EditAuditRecord {
  date: string;
  time: string;
  note: string;
  prevTotal: number;
  newTotal: number;
  prevItemsSummary: string;
}

export interface Sale {
  id: number;
  n: number;
  d: string;
  time?: string;
  cl: string;
  total: number;
  items: CartItem[];
  pays: Payment[];
  void?: boolean;
  voidDate?: string;
  voidTime?: string;
  voidReason?: string;
  shiftId?: number;
  editHistory?: EditAuditRecord[];
}

export interface PurchaseItem {
  pid: number;
  nm: string;
  q: number;
  c: number;
}

export interface Purchase {
  id: number;
  n: number;
  d: string;
  time?: string;
  pv: string;
  total: number;
  items: PurchaseItem[];
  pays: Payment[];
  void?: boolean;
  voidDate?: string;
  voidTime?: string;
  voidReason?: string;
  shiftId?: number;
  editHistory?: EditAuditRecord[];
}

export interface CashMovement {
  id: number;
  d: string;
  time?: string;
  t: 'in' | 'out';
  c: string;
  a: number;
  m?: PaymentMethod;
  ref?: string;
  shiftId?: number;
  isOpening?: boolean;
  isClosingAdjustment?: boolean;
}

export interface ShiftSummary {
  totalSales: number;
  salesCount: number;
  salesByMethod: Record<PaymentMethod, number>;
  cashSales: number;
  cashDebtCollections: number;
  cashManualInflows: number;
  cashExpenses: number;
  cashSupplierPayments: number;
  cashRefunds: number;
  digitalTotal: number;
  netCashFlow: number;
}

export interface CashShift {
  id: number;
  status: 'open' | 'closed';
  openedAt: string;     // ISO timestamp
  openedDate: string;   // YYYY-MM-DD
  openedTime: string;   // HH:mm
  openedBy: string;
  initialCash: number;  // Base/fondo de caja
  closedAt?: string;
  closedDate?: string;
  closedTime?: string;
  closedBy?: string;
  countedCash?: number; // Arqueo físico
  expectedCash?: number;
  diffCash?: number;    // Counted - Expected (positive = sobrante, negative = faltante)
  notes?: string;
  summary?: ShiftSummary;
}

export interface ActivityLog {
  id: number;
  d: string;
  h: string;
  t: 'venta' | 'compra' | 'stock' | 'dinero' | 'cobro' | 'pago' | 'producto' | 'anulación' | 'edición' | 'caja' | 'backup';
  txt: string;
  amt?: number;
  ref?: string;
}

export interface AppData {
  products: Product[];
  providers: string[];
  sales: Sale[];
  purchases: Purchase[];
  cash: CashMovement[];
  shifts: CashShift[];
  currentShiftId: number | null;
  log: ActivityLog[];
  seq: number;
  seqSale: number;
  seqBuy: number;
  seqShift: number;
  lastBackupDate?: string;
}

export interface AutoBackupSnapshot {
  id: string;
  timestamp: string;
  dateStr: string;
  reason: string;
  data: AppData;
  summary: {
    productCount: number;
    saleCount: number;
    purchaseCount: number;
    shiftCount: number;
  };
}
