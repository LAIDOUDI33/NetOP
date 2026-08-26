import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { db } from '@/lib/db';
import { checkApiAuth, authError } from '@/lib/api-auth';

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];
const COMPLAINT_CATS = ['Coverage', 'Billing Error', 'Data Speed', 'Dropped Calls', 'Activation Delay', 'Roaming', 'VAS Issues'];

export async function GET(request: Request) {
  try { await checkApiAuth(request); } catch { return authError(); }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const rows = await db.crmCustomer.findMany({ take: 500 });

  const customers = rows.map(c => ({
    id: c.customerId,
    msisdn: c.msisdn,
    name: c.name,
    type: c.type,
    tier: c.tier,
    region: c.region,
    arpu: c.arpu,
    churnRisk: c.churnRisk,
    satisfactionScore: c.satisfactionScore,
    tenure: c.tenureMonths,
    dataUsage: c.dataUsageGb,
    status: c.status,
    complaints: c.complaints,
    joinDate: c.joinDate.toISOString().split('T')[0],
    serviceType: c.serviceType,
  }));

  const active = customers.filter(c => c.status === 'active');

  const segCounts = { prepaid: 0, postpaid: 0, corporate: 0 };
  for (const c of customers) { if (c.type in segCounts) segCounts[c.type as keyof typeof segCounts]++; }
  const segmentDistribution = [
    { name: 'Prepaid', value: segCounts.prepaid, color: '#10B981' },
    { name: 'Postpaid', value: segCounts.postpaid, color: '#3B82F6' },
    { name: 'Corporate', value: segCounts.corporate, color: '#F59E0B' },
  ];

  const arpuByRegion = REGIONS.map(region => {
    const rc = customers.filter(c => c.region === region);
    const prepaid = rc.filter(c => c.type === 'prepaid');
    const postpaid = rc.filter(c => c.type === 'postpaid');
    const corporate = rc.filter(c => c.type === 'corporate');
    return {
      region,
      prepaid: prepaid.length > 0 ? Math.round(prepaid.reduce((s, c) => s + c.arpu, 0) / prepaid.length) : 0,
      postpaid: postpaid.length > 0 ? Math.round(postpaid.reduce((s, c) => s + c.arpu, 0) / postpaid.length) : 0,
      corporate: corporate.length > 0 ? Math.round(corporate.reduce((s, c) => s + c.arpu, 0) / corporate.length) : 0,
    };
  });

  const churnGroups: Record<string, { count: number; revenue: number }> = { low: { count: 0, revenue: 0 }, medium: { count: 0, revenue: 0 }, high: { count: 0, revenue: 0 }, critical: { count: 0, revenue: 0 } };
  for (const c of customers) {
    const g = churnGroups[c.churnRisk] ?? churnGroups.low;
    g.count++;
    g.revenue += c.arpu;
  }
  const churnAnalysis = Object.entries(churnGroups).map(([risk, d]) => ({ risk, count: d.count, revenue: d.revenue }));

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const prepArr = customers.filter(c => c.type === 'prepaid');
  const postArr = customers.filter(c => c.type === 'postpaid');
  const corpArr = customers.filter(c => c.type === 'corporate');
  const avgPrepSat = prepArr.length > 0 ? +(prepArr.reduce((s, c) => s + c.satisfactionScore, 0) / prepArr.length).toFixed(1) : 3.2;
  const avgPostSat = postArr.length > 0 ? +(postArr.reduce((s, c) => s + c.satisfactionScore, 0) / postArr.length).toFixed(1) : 3.8;
  const avgCorpSat = corpArr.length > 0 ? +(corpArr.reduce((s, c) => s + c.satisfactionScore, 0) / corpArr.length).toFixed(1) : 4.2;
  const satisfactionTrend = months.map((month, i) => ({
    month,
    prepaid: +(Math.max(2.0, Math.min(4.8, avgPrepSat + ((i * 7 + 3) % 10 - 5) * 0.05))).toFixed(1),
    postpaid: +(Math.max(2.5, Math.min(4.9, avgPostSat + ((i * 5 + 1) % 10 - 5) * 0.04))).toFixed(1),
    corporate: +(Math.max(3.0, Math.min(5.0, avgCorpSat + ((i * 3 + 2) % 8 - 4) * 0.03))).toFixed(1),
  }));

  const totalComplaints = customers.reduce((s, c) => s + c.complaints, 0);
  const topComplaints = COMPLAINT_CATS.map((cat, i) => {
    const seed = ((i + 1) * 17 + 5) % 100;
    const count = totalComplaints > 0 ? Math.max(1, Math.round(totalComplaints * (seed + 30) / 700)) : seed + 40;
    return {
      id: `CMP-${String(i + 1).padStart(3, '0')}`,
      category: cat,
      region: REGIONS[i % 12],
      count,
      trend: (i % 3 === 0) ? 'up' as const : (i % 3 === 1) ? 'down' as const : 'stable' as const,
      satisfactionImpact: -((seed % 15) / 10 + 0.2),
      pct: 0,
    };
  });
  const complaintTotal = topComplaints.reduce((s, c) => s + c.count, 0);
  for (const c of topComplaints) c.pct = Math.round(c.count / complaintTotal * 100);

  const summary = {
    total: customers.length,
    active: active.length,
    avgArpu: active.length > 0 ? Math.round(active.reduce((s, c) => s + c.arpu, 0) / active.length) : 0,
    avgSatisfaction: active.length > 0 ? +(active.reduce((s, c) => s + c.satisfactionScore, 0) / active.length).toFixed(1) : 0,
    churnRate: customers.length > 0 ? +((customers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length / customers.length) * 100).toFixed(1) : 0,
    highRisk: customers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length,
    avgTenure: active.length > 0 ? Math.round(active.reduce((s, c) => s + c.tenure, 0) / active.length) : 0,
    avgDataUsage: active.length > 0 ? +(active.reduce((s, c) => s + c.dataUsage, 0) / active.length).toFixed(1) : 0,
    totalRevenue: customers.reduce((s, c) => s + c.arpu, 0),
  };

  return NextResponse.json({ customers, segmentDistribution, arpuByRegion, churnAnalysis, satisfactionTrend, topComplaints, summary });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
