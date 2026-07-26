import { NextResponse } from 'next/server';

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];
const SEGMENTS = ['prepaid', 'postpaid', 'corporate'] as const;
const TIERS = ['bronze', 'silver', 'gold', 'platinum'] as const;
const FIRST = ['Ahmed', 'Mohamed', 'Youcef', 'Amine', 'Karim', 'Sofiane', 'Rami', 'Walid', 'Nabil', 'Fares', 'Lydia', 'Amina', 'Sarah', 'Nour', 'Imane', 'Lina', 'Yasmine', 'Rania', 'Sara', 'Meriem'];
const LAST = ['Benali', 'Haddad', 'Bouzid', 'Kaci', 'Mebarki', 'Djebbar', 'Hamidi', 'Zerrouki', 'Boudiaf', 'Belkacem', 'Ait Ahmed', 'Cherif', 'Mansouri', 'Tlemcani', 'Boumediene', 'Amrani', 'Fekhar', 'Rahmani', 'Mokrani', 'Djamel'];
const SERVICES = ['Mobile Data', 'Voice Only', 'Data + Voice', 'Enterprise', 'Family Plan'];
const COMPLAINT_CATS = ['Coverage', 'Billing Error', 'Data Speed', 'Dropped Calls', 'Activation Delay', 'Roaming', 'VAS Issues'];

function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }
function pick<T>(arr: readonly T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

function generateCustomers() {
  const customers: any[] = [];
  for (let i = 0; i < 120; i++) {
    const segment = pick(SEGMENTS);
    const tier = segment === 'corporate' ? pick(['gold', 'platinum'] as const) : pick(TIERS);
    const arpuBase = { bronze: 800, silver: 2000, gold: 5000, platinum: 12000 }[tier];
    const arpu = rand(Math.round(arpuBase * 0.7), Math.round(arpuBase * 1.3));
    const churnBase = { bronze: 0.4, silver: 0.25, gold: 0.12, platinum: 0.05 }[tier];
    const churnVal = churnBase + Math.random() * 0.2 - 0.1;
    const churnRisk = churnVal > 0.5 ? 'critical' : churnVal > 0.3 ? 'high' : churnVal > 0.15 ? 'medium' : 'low';
    const satisfaction = 2.5 + Math.random() * 2.5;
    customers.push({
      id: `CRM-${String(i + 1).padStart(6, '0')}`,
      msisdn: `213${String(50000000 + i * 312457).padStart(9, '0')}`,
      name: `${FIRST[i % 20]} ${LAST[i % 20]}`,
      type: segment, tier, region: REGIONS[i % 12],
      arpu, churnRisk, satisfactionScore: +satisfaction.toFixed(1),
      tenure: rand(1, 120), dataUsage: rand(2, 60),
      status: Math.random() > 0.05 ? 'active' : 'suspended',
      complaints: rand(0, 6), joinDate: new Date(Date.now() - rand(30, 2920) * 86400000).toISOString().split('T')[0],
      serviceType: pick(SERVICES),
    });
  }
  return customers;
}

export async function GET() {
  const customers = generateCustomers();
  const active = customers.filter(c => c.status === 'active');

  // Segment distribution for pie chart
  const segCounts = { prepaid: 0, postpaid: 0, corporate: 0 };
  for (const c of customers) segCounts[c.type]++;
  const segmentDistribution = [
    { name: 'Prepaid', value: segCounts.prepaid, color: '#10B981' },
    { name: 'Postpaid', value: segCounts.postpaid, color: '#3B82F6' },
    { name: 'Corporate', value: segCounts.corporate, color: '#F59E0B' },
  ];

  // ARPU by region for stacked bar
  const arpuByRegion = REGIONS.map(region => {
    const rc = customers.filter(c => c.region === region);
    return {
      region,
      prepaid: Math.round(rc.filter(c => c.type === 'prepaid').reduce((s, c) => s + c.arpu, 0) / Math.max(rc.filter(c => c.type === 'prepaid').length, 1)),
      postpaid: Math.round(rc.filter(c => c.type === 'postpaid').reduce((s, c) => s + c.arpu, 0) / Math.max(rc.filter(c => c.type === 'postpaid').length, 1)),
      corporate: Math.round(rc.filter(c => c.type === 'corporate').reduce((s, c) => s + c.arpu, 0) / Math.max(rc.filter(c => c.type === 'corporate').length, 1)),
    };
  });

  // Churn analysis for bar chart
  const churnGroups: Record<string, { count: number; revenue: number }> = { low: { count: 0, revenue: 0 }, medium: { count: 0, revenue: 0 }, high: { count: 0, revenue: 0 }, critical: { count: 0, revenue: 0 } };
  for (const c of customers) { churnGroups[c.churnRisk].count++; churnGroups[c.churnRisk].revenue += c.arpu; }
  const churnAnalysis = Object.entries(churnGroups).map(([risk, d]) => ({ risk, count: d.count, revenue: d.revenue }));

  // Satisfaction trend for line chart
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  let prepSat = 3.2, postSat = 3.8, corpSat = 4.2;
  const satisfactionTrend = months.map(month => {
    prepSat = Math.max(2.0, Math.min(4.8, prepSat + (Math.random() - 0.45) * 0.3));
    postSat = Math.max(2.5, Math.min(4.9, postSat + (Math.random() - 0.45) * 0.25));
    corpSat = Math.max(3.0, Math.min(5.0, corpSat + (Math.random() - 0.4) * 0.2));
    return { month, prepaid: +prepSat.toFixed(1), postpaid: +postSat.toFixed(1), corporate: +corpSat.toFixed(1) };
  });

  // Top complaints
  const complaintData = COMPLAINT_CATS.map((cat, i) => ({
    id: `CMP-${String(i + 1).padStart(3, '0')}`,
    category: cat, region: REGIONS[i % 12],
    count: rand(40, 300), trend: pick(['up', 'down', 'stable'] as const),
    satisfactionImpact: -(Math.random() * 1.5 + 0.2), pct: 0,
  }));
  const totalComplaints = complaintData.reduce((s, c) => s + c.count, 0);
  for (const c of complaintData) c.pct = Math.round(c.count / totalComplaints * 100);

  const summary = {
    total: customers.length, active: active.length,
    avgArpu: Math.round(active.reduce((s, c) => s + c.arpu, 0) / active.length),
    avgSatisfaction: +(active.reduce((s, c) => s + c.satisfactionScore, 0) / active.length).toFixed(1),
    churnRate: +(customers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length / customers.length * 100).toFixed(1),
    highRisk: customers.filter(c => c.churnRisk === 'high' || c.churnRisk === 'critical').length,
    avgTenure: Math.round(active.reduce((s, c) => s + c.tenure, 0) / active.length),
    avgDataUsage: +(active.reduce((s, c) => s + c.dataUsage, 0) / active.length).toFixed(1),
    totalRevenue: customers.reduce((s, c) => s + c.arpu, 0),
  };

  return NextResponse.json({ customers, segmentDistribution, arpuByRegion, churnAnalysis, satisfactionTrend, topComplaints: complaintData, summary });
}
