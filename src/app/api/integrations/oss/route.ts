import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';

const REGIONS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Tlemcen', 'Sétif', 'Blida', 'Batna', 'Béjaïa', 'Tizi Ouzou', 'Biskra', 'Ouargla'];
const VENDORS = ['Ericsson', 'Huawei', 'Nokia', 'ZTE'];
const NE_TYPES: Record<string, string[]> = { '5G': ['gNodeB'], '4G': ['eNodeB'], '3G': ['RNC', 'NodeB'], '2G': ['BSC', 'BTS'], Core: ['MME', 'SGSN', 'MSC', 'AMF', 'SMF', 'UPF', 'HSS'] };
const FAULT_TYPES = ['Link Down', 'High CPU', 'High Memory', 'Interface Flap', 'Sync Loss', 'Power Alarm', 'Temperature', 'Card Failure'];
const SEVERITIES = ['critical', 'major', 'minor', 'warning'];
const STATUSES = ['active', 'degraded', 'maintenance', 'down'];

function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }
function rand(min: number, max: number) { return Math.round(min + Math.random() * (max - min)); }

function generateNEs() {
  const nes: any[] = [];
  let id = 1;
  for (const region of REGIONS) {
    for (const vendor of VENDORS) {
      const count = rand(3, 7);
      for (let i = 0; i < count; i++) {
        const techRoll = Math.random();
        let technology: string, type: string;
        if (techRoll < 0.45) { technology = '5G'; type = 'gNodeB'; }
        else if (techRoll < 0.80) { technology = '4G'; type = 'eNodeB'; }
        else if (techRoll < 0.93) { technology = '3G'; type = pick(NE_TYPES['3G']); }
        else { technology = '2G'; type = pick(NE_TYPES['2G']); }
        const statusRoll = Math.random();
        const status = statusRoll < 0.82 ? 'active' : statusRoll < 0.90 ? 'degraded' : statusRoll < 0.96 ? 'maintenance' : 'down';
        nes.push({
          neId: `NE-${String(id).padStart(4, '0')}`, name: `${region}_${vendor[0]}_${type}_${String(i + 1).padStart(3, '0')}`,
          type, technology, vendor, region, site: `${region}_SITE_${String(i + 1).padStart(3, '0')}`,
          status, lastPoll: new Date(Date.now() - Math.random() * 300000).toISOString(),
          cpuUsage: rand(15, 90), memoryUsage: rand(30, 85),
          carriers: technology === 'Core' ? 0 : rand(1, 4),
        });
        id++;
      }
    }
  }
  for (const ct of NE_TYPES.Core) {
    for (const vendor of VENDORS.slice(0, 3)) {
      nes.push({
        neId: `NE-${String(id).padStart(4, '0')}`, name: `CORE_${ct}_${vendor}`,
        type: ct, technology: 'Core', vendor, region: 'Alger', site: `CORE_${ct}`,
        status: 'active', lastPoll: new Date(Date.now() - Math.random() * 60000).toISOString(),
        cpuUsage: rand(15, 55), memoryUsage: rand(40, 70), carriers: 0,
      });
      id++;
    }
  }
  return nes;
}

function generateFaults(nes: any[]) {
  return Array.from({ length: 25 }, (_, i) => {
    const ne = nes[rand(0, nes.length - 1)];
    const cat = pick(FAULT_TYPES);
    return {
      id: `FAULT-${String(i + 1).padStart(5, '0')}`, neId: ne.neId, neName: ne.name,
      severity: pick(SEVERITIES),
      description: `${cat} detected on ${ne.name}`, category: cat,
      timestamp: new Date(Date.now() - Math.random() * 86400000).toISOString(),
      acknowledged: Math.random() > 0.5,
    };
  });
}

export async function GET(request: Request) {
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 100 });
  if (limited) return rateLimitResponse(resetMs);

  try {
  const elements = generateNEs();
  const faultEvents = generateFaults(elements);

  // Aggregations for charts
  const typeMap: Record<string, number> = {};
  const vendorMap: Record<string, number> = {};
  for (const ne of elements) {
    typeMap[ne.type] = (typeMap[ne.type] || 0) + 1;
    vendorMap[ne.vendor] = (vendorMap[ne.vendor] || 0) + 1;
  }
  const neTypeDistribution = Object.entries(typeMap).map(([name, value]) => ({ name, value }));
  const vendorDistribution = Object.entries(vendorMap).map(([name, count]) => ({ name, count }));

  const performanceTrend = Array.from({ length: 24 }, (_, i) => ({
    time: `${String(i).padStart(2, '0')}:00`,
    cpu: rand(30, 75), memory: rand(45, 75), throughput: rand(200, 700),
  }));

  const summary = {
    total: elements.length,
    active: elements.filter(n => n.status === 'active').length,
    degraded: elements.filter(n => n.status === 'degraded').length,
    down: elements.filter(n => n.status === 'down').length,
    avgCpu: Math.round(elements.reduce((s, n) => s + n.cpuUsage, 0) / elements.length),
    avgMemory: Math.round(elements.reduce((s, n) => s + n.memoryUsage, 0) / elements.length),
  };

  return NextResponse.json({ elements, neTypeDistribution, vendorDistribution, performanceTrend, faultEvents, summary });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
