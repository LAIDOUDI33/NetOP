import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];
const SERVICES = ['Mobile Data', 'Voice Only', 'Data + Voice', 'Enterprise', 'Family Plan', 'Fixed Line', 'IoT Connectivity'];
const PAYMENT_METHODS = ['Carte DZ', 'CCP', 'Edahabia', 'Virement', 'Cash', 'Prélèvement Auto'];
const STATUSES = ['paid', 'pending', 'overdue', 'partial'] as const;
const FIRST = ['Ahmed', 'Mohamed', 'Youcef', 'Amine', 'Karim', 'Sofiane', 'Rami', 'Walid', 'Nabil', 'Fares', 'Lydia', 'Amina', 'Sarah', 'Nour', 'Imane', 'Lina', 'Yasmine', 'Rania', 'Sara', 'Meriem'];
const LAST = ['Benali', 'Haddad', 'Bouzid', 'Kaci', 'Mebarki', 'Djebbar', 'Hamidi', 'Zerrouki', 'Boudiaf', 'Belkacem', 'Ait Ahmed', 'Cherif', 'Mansouri', 'Tlemcani', 'Boumediene', 'Amrani', 'Fekhar', 'Rahmani', 'Mokrani', 'Djamel'];
const CYCLES = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }
function pick<T>(arr: readonly T[] | T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function pickWeighted(items: readonly [string, number][]): string {
  const total = items.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [item, w] of items) { r -= w; if (r <= 0) return item; }
  return items[0][0];
}

function generateInvoices() {
  const invoices: any[] = [];
  const now = Date.now();
  for (let i = 0; i < 100; i++) {
    const status = pickWeighted([
      ['paid', 55], ['pending', 20], ['overdue', 15], ['partial', 10],
    ] as const);
    const cycle = pick(CYCLES);
    const serviceType = pick(SERVICES);
    const baseAmount = { 'Mobile Data': rand(800, 3500), 'Voice Only': rand(500, 2000), 'Data + Voice': rand(1200, 5000), 'Enterprise': rand(15000, 80000), 'Family Plan': rand(2500, 8000), 'Fixed Line': rand(1500, 6000), 'IoT Connectivity': rand(3000, 12000) }[serviceType];
    const amount = baseAmount;
    const tax = Math.round(amount * 0.19);
    const total = amount + tax;
    const dueDay = rand(1, 28);
    const [y, m] = cycle.split('-').map(Number);
    const dueDate = new Date(y, m - 1, dueDay).toISOString().split('T')[0];
    const isOverdue = status === 'overdue' || status === 'partial';
    const daysOverdue = isOverdue ? rand(1, 120) : 0;
    const paidDate = status === 'paid' ? new Date(y, m - 1, rand(1, dueDay)).toISOString().split('T')[0] : null;

    invoices.push({
      id: `INV-${String(i + 1).padStart(6, '0')}`,
      customerId: `CRM-${String(i + 1).padStart(6, '0')}`,
      customerName: `${FIRST[i % 20]} ${LAST[i % 20]}`,
      msisdn: `213${String(50000000 + i * 312457).padStart(9, '0')}`,
      region: REGIONS[i % 12],
      serviceType,
      billingCycle: cycle,
      amount, tax, total,
      status,
      paymentMethod: status === 'paid' ? pick(PAYMENT_METHODS) : status === 'partial' ? pick(PAYMENT_METHODS) : null,
      dueDate,
      paidDate,
      daysOverdue,
    });
  }
  return invoices;
}

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const invoices = generateInvoices();

  // Revenue by month (line chart)
  const monthMap: Record<string, { revenue: number; invoices: number }> = {};
  for (const inv of invoices) {
    if (!monthMap[inv.billingCycle]) monthMap[inv.billingCycle] = { revenue: 0, invoices: 0 };
    monthMap[inv.billingCycle].revenue += inv.total;
    monthMap[inv.billingCycle].invoices++;
  }
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueByMonth = CYCLES.map((c, i) => ({
    month: monthNames[i],
    revenue: monthMap[c]?.revenue || rand(800000, 1500000),
    invoices: monthMap[c]?.invoices || rand(80, 120),
  }));

  // Revenue by region (bar chart)
  const revenueByRegion = REGIONS.map(region => {
    const ri = invoices.filter(inv => inv.region === region);
    return {
      region,
      revenue: ri.reduce((s, inv) => s + inv.total, 0) || rand(200000, 900000),
      count: ri.length || rand(5, 15),
    };
  });

  // Revenue by service (pie chart)
  const serviceMap: Record<string, number> = {};
  for (const inv of invoices) {
    serviceMap[inv.serviceType] = (serviceMap[inv.serviceType] || 0) + inv.total;
  }
  const SERVICE_COLORS: Record<string, string> = {
    'Mobile Data': '#10B981', 'Voice Only': '#F59E0B', 'Data + Voice': '#EF4444',
    'Enterprise': '#8B5CF6', 'Family Plan': '#06B6D4', 'Fixed Line': '#EC4899', 'IoT Connectivity': '#F97316',
  };
  const revenueByService = Object.entries(serviceMap).map(([name, value]) => ({
    name, value, color: SERVICE_COLORS[name] || '#6B7280',
  }));

  // Payment methods distribution
  const payMap: Record<string, number> = {};
  for (const inv of invoices) {
    if (inv.paymentMethod) payMap[inv.paymentMethod] = (payMap[inv.paymentMethod] || 0) + 1;
  }
  const paymentMethods = Object.entries(payMap).map(([method, count]) => ({ method, count }));

  // Top debtors (overdue + partial, sorted by amount desc)
  const debtors = invoices
    .filter(inv => inv.status === 'overdue' || inv.status === 'partial')
    .sort((a, b) => b.total - a.total)
    .slice(0, 15)
    .map(inv => ({
      customerId: inv.customerId,
      customerName: inv.customerName,
      msisdn: inv.msisdn,
      region: inv.region,
      totalDue: inv.total,
      daysOverdue: inv.daysOverdue,
      status: inv.status,
    }));

  // Summary
  const totalRevenue = invoices.reduce((s, inv) => s + inv.total, 0);
  const paidInvoices = invoices.filter(inv => inv.status === 'paid');
  const overdueInvoices = invoices.filter(inv => inv.status === 'overdue');
  const pendingInvoices = invoices.filter(inv => inv.status === 'pending');
  const collectedAmount = paidInvoices.reduce((s, inv) => s + inv.total, 0);

  const summary = {
    totalRevenue,
    totalInvoices: invoices.length,
    paidCount: paidInvoices.length,
    pendingCount: pendingInvoices.length,
    overdueCount: overdueInvoices.length,
    overdueAmount: overdueInvoices.reduce((s, inv) => s + inv.total, 0),
    avgInvoiceAmount: Math.round(totalRevenue / invoices.length),
    collectionRate: +((collectedAmount / totalRevenue) * 100).toFixed(1),
    monthlyGrowth: +((Math.random() * 12 - 3).toFixed(1)),
  };

  return NextResponse.json({
    invoices, revenueByMonth, revenueByRegion, revenueByService,
    paymentMethods, topDebtors: debtors, summary,
  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
