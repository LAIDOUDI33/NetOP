import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { getDemoNow, demoHoursAgo } from '@/lib/demo-time';
import { checkApiAuth, authError } from '@/lib/api-auth';

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];
const SERVICE_COLORS: Record<string, string> = {
  'Mobile Data': '#10B981', 'Voice Only': '#F59E0B', 'Data + Voice': '#EF4444',
  'Enterprise': '#8B5CF6', 'Family Plan': '#06B6D4', 'Fixed Line': '#EC4899', 'IoT Connectivity': '#F97316',
};

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const rows = await db.billingInvoice.findMany({ take: 500 });

  const invoices = rows.map(inv => ({
    id: inv.invoiceId,
    customerId: inv.customerId,
    customerName: inv.customerName,
    msisdn: inv.msisdn,
    region: inv.region,
    serviceType: inv.serviceType,
    billingCycle: inv.billingCycle,
    amount: inv.amount,
    tax: inv.tax,
    total: inv.total,
    status: inv.status,
    paymentMethod: inv.paymentMethod,
    dueDate: inv.dueDate.toISOString().split('T')[0],
    paidDate: inv.paidDate?.toISOString().split('T')[0] ?? null,
    daysOverdue: inv.daysOverdue,
  }));

  // Revenue by month (line chart)
  const monthMap: Record<string, { revenue: number; invoices: number }> = {};
  for (const inv of invoices) {
    if (!monthMap[inv.billingCycle]) monthMap[inv.billingCycle] = { revenue: 0, invoices: 0 };
    monthMap[inv.billingCycle].revenue += inv.total;
    monthMap[inv.billingCycle].invoices++;
  }
  const CYCLES = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06', '2024-07', '2024-08', '2024-09', '2024-10', '2024-11', '2024-12'];
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const revenueByMonth = CYCLES.map((c, i) => ({
    month: monthNames[i],
    revenue: monthMap[c]?.revenue || 0,
    invoices: monthMap[c]?.invoices || 0,
  }));

  // Revenue by region (bar chart)
  const revenueByRegion = REGIONS.map(region => {
    const ri = invoices.filter(inv => inv.region === region);
    return {
      region,
      revenue: ri.reduce((s, inv) => s + inv.total, 0),
      count: ri.length,
    };
  });

  // Revenue by service (pie chart)
  const serviceMap: Record<string, number> = {};
  for (const inv of invoices) {
    serviceMap[inv.serviceType] = (serviceMap[inv.serviceType] || 0) + inv.total;
  }
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
    avgInvoiceAmount: invoices.length > 0 ? Math.round(totalRevenue / invoices.length) : 0,
    collectionRate: totalRevenue > 0 ? +((collectedAmount / totalRevenue) * 100).toFixed(1) : 0,
    monthlyGrowth: 0,
  };

  return NextResponse.json({
    invoices, revenueByMonth, revenueByRegion, revenueByService,
    paymentMethods, topDebtors: debtors, summary,
  });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
