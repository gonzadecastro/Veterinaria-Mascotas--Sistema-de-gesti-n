export const F = new Intl.NumberFormat('es-AR', {
  style: 'currency',
  currency: 'ARS',
  maximumFractionDigits: 2,
});

export const $ = (n: number | null | undefined): string => F.format(n || 0);

export const num = (v: any): number => {
  if (v == null) return 0;
  const s = String(v).replace(/\s/g, '').replace(',', '.');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const r2 = (n: number): number => Math.round(n * 100) / 100;

export const today = (): string => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
};

export const nowTime = (): string => {
  return new Date().toTimeString().slice(0, 5);
};

export const nowIso = (): string => {
  return new Date().toISOString();
};

export const fd = (s: string | null | undefined): string => {
  if (!s) return '';
  return s.split('T')[0].split('-').reverse().join('/');
};

export const mk = (d: string | null | undefined): string => {
  if (!d) return '';
  return d.slice(0, 7);
};

export const greeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return 'Buenos días';
  if (h < 20) return 'Buenas tardes';
  return 'Buenas noches';
};
