import { AppData, AutoBackupSnapshot, Product, Sale } from '../types';
import { today, nowTime, nowIso } from './formatters';

export const STORAGE_KEY = 'vet_v1';
export const AUTO_BACKUPS_KEY = 'vet_auto_backups';

export const initialData: AppData = {
  products: [],
  providers: [],
  sales: [],
  purchases: [],
  cash: [],
  shifts: [],
  currentShiftId: null,
  log: [],
  seq: 1,
  seqSale: 1,
  seqBuy: 1,
  seqShift: 1,
  lastBackupDate: undefined,
};

export function loadData(): AppData {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    if (s) {
      const d = JSON.parse(s);
      d.products = Array.isArray(d.products) ? d.products : [];
      d.providers = Array.isArray(d.providers) ? d.providers : [];
      d.sales = Array.isArray(d.sales) ? d.sales : [];
      d.purchases = Array.isArray(d.purchases) ? d.purchases : [];
      d.cash = Array.isArray(d.cash) ? d.cash : [];
      d.shifts = Array.isArray(d.shifts) ? d.shifts : [];
      d.log = Array.isArray(d.log) ? d.log : [];

      d.seq = Number(d.seq) || 1;
      d.seqSale = Math.max(
        Number(d.seqSale) || 1,
        d.sales.reduce((max: number, x: any) => Math.max(max, Number(x.n) || 0), 0) + 1
      );
      d.seqBuy = Math.max(
        Number(d.seqBuy) || 1,
        d.purchases.reduce((max: number, x: any) => Math.max(max, Number(x.n) || 0), 0) + 1
      );
      d.seqShift = Math.max(
        Number(d.seqShift) || 1,
        d.shifts.reduce((max: number, x: any) => Math.max(max, Number(x.id) || 0), 0) + 1
      );

      // Sanitize sales and purchases
      d.sales.forEach((x: any) => {
        x.pays = Array.isArray(x.pays) ? x.pays : [];
        x.items = Array.isArray(x.items) ? x.items : [];
        x.void = Boolean(x.void);
        x.editHistory = Array.isArray(x.editHistory) ? x.editHistory : [];
      });
      d.purchases.forEach((x: any) => {
        x.pays = Array.isArray(x.pays) ? x.pays : [];
        x.items = Array.isArray(x.items) ? x.items : [];
        x.void = Boolean(x.void);
        x.editHistory = Array.isArray(x.editHistory) ? x.editHistory : [];
      });

      // Find current open shift if any
      const openShift = d.shifts.find((s: any) => s.status === 'open');
      d.currentShiftId = openShift ? openShift.id : null;

      return d as AppData;
    }
  } catch (e) {
    console.error('Error loading data from localStorage:', e);
  }

  return { ...initialData };
}

export function saveData(d: AppData): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    return true;
  } catch (e) {
    console.error('Error saving data to localStorage:', e);
    return false;
  }
}

// ----------------- AUTOMATIC SNAPSHOTS (Priority 3) -----------------
export function getAutoBackups(): AutoBackupSnapshot[] {
  try {
    const s = localStorage.getItem(AUTO_BACKUPS_KEY);
    if (s) {
      const arr = JSON.parse(s);
      if (Array.isArray(arr)) return arr;
    }
  } catch (e) {
    console.error('Error reading auto backups:', e);
  }
  return [];
}

export function createAutoBackup(data: AppData, reason: string): boolean {
  try {
    const list = getAutoBackups();
    const snapshot: AutoBackupSnapshot = {
      id: 'snap_' + Date.now(),
      timestamp: nowIso(),
      dateStr: `${today()} ${nowTime()}`,
      reason,
      data: JSON.parse(JSON.stringify(data)),
      summary: {
        productCount: data.products.length,
        saleCount: data.sales.filter((s) => !s.void).length,
        purchaseCount: data.purchases.filter((p) => !p.void).length,
        shiftCount: data.shifts.length,
      },
    };

    // Keep the most recent 5 snapshots
    const updated = [snapshot, ...list.slice(0, 4)];
    localStorage.setItem(AUTO_BACKUPS_KEY, JSON.stringify(updated));
    return true;
  } catch (e) {
    console.error('Error creating auto backup:', e);
    return false;
  }
}

// ----------------- FILE EXPORT / IMPORT (Priority 3) -----------------
export function downloadJsonFile(data: AppData) {
  const timestamp = `${today()}_${nowTime().replace(':', '')}`;
  const filename = `Veterinaria_Mascotas_Backup_${timestamp}.json`;
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export interface BackupValidation {
  valid: boolean;
  data?: AppData;
  error?: string;
  counts?: {
    products: number;
    sales: number;
    purchases: number;
    shifts: number;
    cash: number;
  };
}

export function validateBackupJson(rawText: string): BackupValidation {
  try {
    const d = JSON.parse(rawText);
    if (!d || typeof d !== 'object') {
      return { valid: false, error: 'El archivo no contiene un objeto JSON válido.' };
    }
    if (!Array.isArray(d.products) || !Array.isArray(d.sales)) {
      return {
        valid: false,
        error: 'El archivo no contiene las listas necesarias de productos y ventas de Veterinaria Mascotas.',
      };
    }

    return {
      valid: true,
      data: d as AppData,
      counts: {
        products: d.products.length,
        sales: d.sales.length,
        purchases: Array.isArray(d.purchases) ? d.purchases.length : 0,
        shifts: Array.isArray(d.shifts) ? d.shifts.length : 0,
        cash: Array.isArray(d.cash) ? d.cash.length : 0,
      },
    };
  } catch (e: any) {
    return { valid: false, error: 'Error de sintaxis JSON: ' + (e?.message || 'Archivo dañado') };
  }
}

// ----------------- EXPORT TO CSV (Human readable) -----------------
export function exportProductsToCsv(products: Product[]) {
  const headers = ['ID', 'Nombre', 'Código', 'Categoría', 'Tipo', 'Costo', 'Margen %', 'Precio Venta', 'Stock Actual', 'Stock Mínimo'];
  const rows = products.map((p) => [
    p.id,
    `"${(p.name || '').replace(/"/g, '""')}"`,
    `"${p.code || ''}"`,
    `"${p.cat || ''}"`,
    p.svc ? 'Servicio' : 'Producto',
    p.cost,
    p.mg,
    p.price,
    p.stock,
    p.min,
  ]);
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `Productos_Veterinaria_${today()}.csv`, 'text/csv;charset=utf-8;');
}

export function exportSalesToCsv(sales: Sale[]) {
  const headers = ['Nro Venta', 'Fecha', 'Hora', 'Cliente', 'Estado', 'Total', 'Total Cobrado', 'Saldo Deuda', 'Items'];
  const rows = sales.map((s) => {
    const paid = s.pays.reduce((acc, p) => acc + p.a, 0);
    const debt = Math.max(0, s.total - paid);
    const itemsStr = s.items.map((i) => `${i.q}x ${i.nm} ($${i.p})`).join(' | ');
    return [
      s.n,
      s.d,
      s.time || '',
      `"${(s.cl || 'Sin nombre').replace(/"/g, '""')}"`,
      s.void ? 'Anulada' : debt > 0.01 ? 'Pendiente' : 'Pagada',
      s.total,
      paid,
      debt,
      `"${itemsStr.replace(/"/g, '""')}"`,
    ];
  });
  const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  downloadBlob(csvContent, `Ventas_Veterinaria_${today()}.csv`, 'text/csv;charset=utf-8;');
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob(['\ufeff' + content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ----------------- DEMO DATA -----------------
export function generateDemoProducts(seqStart: number): { products: Product[]; nextSeq: number } {
  let s = seqStart;
  const demoList: [string, string, string, number, number, number, number][] = [
    ['Alimento perro adulto 15kg', '7790001', 'Alimento', 42000, 35, 3, 20],
    ['Alimento gato 7,5kg', '7790002', 'Alimento', 28000, 40, 5, 8],
    ['Pipeta antipulgas perro grande', '7790003', 'Medicamentos', 6500, 60, 3, 12],
    ['Antiparasitario interno comprimido', '7790004', 'Medicamentos', 3500, 50, 4, 15],
    ['Collar mediano reforzado', '7790005', 'Accesorios', 3200, 80, 2, 10],
    ['Correa extensible 5m', '7790006', 'Accesorios', 8500, 55, 2, 6],
    ['Shampoo medicado dermatológico', '7790007', 'Higiene', 4800, 50, 3, 7],
    ['Snacks dentales bolsa 150g', '7790008', 'Alimento', 2100, 65, 5, 25],
  ];

  const products: Product[] = demoList.map(([name, code, cat, cost, mg, min, stock]) => ({
    id: s++,
    name,
    code,
    cat,
    svc: false,
    cost,
    mg,
    price: Math.round(cost * (1 + mg / 100)),
    stock,
    min,
  }));

  products.push({
    id: s++,
    name: 'Consulta veterinaria general',
    code: '',
    cat: 'Servicios',
    svc: true,
    cost: 0,
    mg: 0,
    price: 15000,
    stock: 0,
    min: 0,
  });

  products.push({
    id: s++,
    name: 'Vacunación Séxtuple / Antirrábica',
    code: '',
    cat: 'Servicios',
    svc: true,
    cost: 4000,
    mg: 150,
    price: 10000,
    stock: 0,
    min: 0,
  });

  return { products, nextSeq: s };
}
