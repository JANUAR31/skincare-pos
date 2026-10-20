export function formatCurrency(value: number) { return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(value || 0); }
export function formatDate(value: string | Date) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)); }
export function formatDateOnly(value: string | Date) { return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(value)); }
export function startOfToday() { const d = new Date(); d.setHours(0,0,0,0); return d; }
