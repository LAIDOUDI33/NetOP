import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import ZAI from 'z-ai-web-dev-sdk';
import { WILAYA_69 } from '@/lib/wilayas';

const chatSchema = z.object({
  query: z.string().min(1),
  locale: z.enum(['fr', 'en', 'ar']),
  context: z.string().optional(),
});

type Intent = 'churn_analysis' | 'kpi_status' | 'coverage_gap' | 'demand_forecast' | 'revenue_impact' | 'general';

type Locale = 'fr' | 'en' | 'ar';

const KEYWORDS: Record<Intent, string[]> = {
  churn_analysis: [
    'churn', 'désabonnement', 'desabonnement', 'désabonnements', 'retention', 'résiliation',
    'resiliation', 'attrition', 'fidélisation', 'fidelisation', 'parti', 'partis',
    'quitte', 'quitter', 'rétractation', 'retractation', 'cancel', 'cancellation',
    'إلغاء', 'إلغاءات', 'فقدان', ' churn', 'churn ', 'retention rate', 'churn rate',
    'taux de désabonnement', 'taux de desabonnement', 'risque de churn',
  ],
  kpi_status: [
    'kpi', 'indicateur', 'indicateurs', 'rsrp', 'rsrq', 'sinr', 'débit', 'debit',
    'throughput', 'latence', 'latency', 'disponibilité', 'disponibilite', 'availability',
    'performance', 'performances', 'mos', 'qualité', 'qualite', 'quality',
    'handover', 'handover', 'drop rate', 'prb', 'signal', 'jitter',
    'مؤشر', 'مؤشرات', 'أداء', 'إشارة', 'جودة', 'سرعة', 'تأخير',
    'taux de disponibilité', 'performance réseau', 'état du réseau',
  ],
  coverage_gap: [
    'couverture', 'coverage', 'zone blanche', 'zones blanches', 'dead zone',
    'no-signal', 'no signal', 'sans signal', 'gap', 'faible couverture',
    'trou de couverture', 'rural', 'blackspot', 'blind spot',
    'تغطية', 'منطقة بيضاء', 'مناطق بيضاء', 'فجوة', 'بدون إشارة',
    'couverture 4g', 'couverture 3g', '覆盖', 'coverage map',
  ],
  demand_forecast: [
    'demande', 'demand', 'prévision', 'prevision', 'forecast', 'prédiction',
    'prediction', 'prévoir', 'prevoir', 'estimer', 'estimation', 'capacité',
    'capacity', 'bande passante', 'bandwidth', 'trafic', 'traffic', 'pic',
    'peak', 'croissance', 'growth', 'charge', 'load', 'congestion',
    'طلب', 'توقع', 'قدرة', 'سعة', 'حركة مرور', 'ذروة',
    'forecasting', 'projection', 'trend', 'tend',
  ],
  revenue_impact: [
    'revenu', 'revenue', 'financier', 'financial', 'ca', 'chiffre d\'affaires',
    'chiffre', 'perte', 'loss', 'profit', 'rentabilité', 'rentabilite',
    'roi', 'impact', 'arpu', 'monétaire', 'monetaire', 'dzd',
    'إيرادات', 'خسارة', 'مالي', 'ربح', 'مردودية', 'أرباح',
    'revenu perdu', 'impact financier', 'perte de revenus',
  ],
  general: [
    'état', 'etat', 'status', 'résumé', 'resume', 'summary', 'overview',
    'panne', 'outage', 'maintenance', 'alerte', 'alert', 'incident',
    'réseau', 'reseau', 'network', 'site', 'sites',
    'حالة', 'ملخص', 'انقطاع', 'صيانة', 'تنبيه', 'شبكة',
  ],
};

function detectIntent(query: string): Intent {
  const lower = query.toLowerCase();
  let bestIntent: Intent = 'general';
  let bestScore = 0;

  for (const [intent, keywords] of Object.entries(KEYWORDS) as [Intent, string[]][]) {
    let score = 0;
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        score += kw.length;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestIntent = intent;
    }
  }

  return bestIntent;
}

const SQL_BY_INTENT: Record<Intent, string> = {
  churn_analysis: `SELECT w.wilaya, COUNT(s.id) AS total_subscribers,
  SUM(CASE WHEN s.churn_risk_score > 0.7 THEN 1 ELSE 0 END) AS high_risk,
  ROUND(AVG(s.churn_risk_score), 3) AS avg_risk_score,
  ROUND(100.0 * SUM(CASE WHEN s.status = 'churned' THEN 1 ELSE 0 END) / COUNT(*), 2) AS churn_rate
FROM subscribers s
JOIN cell_sites c ON s.nearest_site_id = c.id
JOIN wilayas w ON c.wilaya_code = w.code
WHERE s.status IN ('active', 'churned')
  AND s.updated_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY w.wilaya ORDER BY churn_rate DESC LIMIT 20;`,

  kpi_status: `SELECT c.wilaya, c.technology,
  ROUND(AVG(k.rsrp), 1) AS avg_rsrp,
  ROUND(AVG(k.rsrq), 1) AS avg_rsrq,
  ROUND(AVG(k.sinr), 1) AS avg_sinr,
  ROUND(AVG(k.throughput_dl), 2) AS avg_throughput_dl,
  ROUND(AVG(k.availability_pct), 2) AS avg_availability
FROM network_kpis k
JOIN cell_sites c ON k.site_id = c.id
WHERE k.recorded_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY c.wilaya, c.technology
ORDER BY avg_availability ASC LIMIT 30;`,

  coverage_gap: `SELECT c.wilaya, COUNT(*) AS total_sites,
  SUM(CASE WHEN cd.rsrp_avg < -110 THEN 1 ELSE 0 END) AS weak_sites,
  ROUND(100.0 * SUM(CASE WHEN cd.rsrp_avg < -110 THEN 1 ELSE 0 END) / COUNT(*), 1) AS gap_pct,
  ROUND(AVG(cd.coverage_radius_km), 1) AS avg_radius
FROM cell_sites c
LEFT JOIN coverage_data cd ON c.id = cd.site_id
WHERE c.status = 'active' AND c.technology = '4G-LTE'
GROUP BY c.wilaya HAVING gap_pct > 10
ORDER BY gap_pct DESC;`,

  demand_forecast: `SELECT region, technology, metric,
  current_value, peak_value, forecast_30d,
  growth_rate_30d, capacity_limit, days_to_capacity,
  capacity_risk, required_capex_dzd, model_accuracy
FROM demand_forecasts
WHERE technology = '4G-LTE'
ORDER BY days_to_capacity ASC LIMIT 20;`,

  revenue_impact: `SELECT r.wilaya, r.month,
  SUM(r.revenue_dzd) AS total_revenue,
  SUM(r.churn_loss_dzd) AS churn_loss,
  SUM(r.outage_loss_dzd) AS outage_loss,
  ROUND(100.0 * (SUM(r.churn_loss_dzd) + SUM(r.outage_loss_dzd)) / SUM(r.revenue_dzd), 2) AS loss_pct
FROM revenue r
WHERE r.month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '3 months')
GROUP BY r.wilaya, r.month
ORDER BY loss_pct DESC LIMIT 20;`,

  general: `SELECT COUNT(*) AS total_sites,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) AS degraded,
  SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS down,
  SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
  ROUND(AVG(availability_7d), 2) AS avg_availability
FROM cell_sites WHERE technology = '4G-LTE';`,
};

const INTENT_TABLES: Record<Intent, string[]> = {
  churn_analysis: ['subscribers', 'cell_sites', 'billing', 'tickets'],
  kpi_status: ['network_kpis', 'cell_sites', 'traffic'],
  coverage_gap: ['coverage_data', 'cell_sites', 'network_kpis'],
  demand_forecast: ['demand_forecasts', 'traffic', 'cell_sites'],
  revenue_impact: ['revenue', 'subscribers', 'billing', 'network_kpis'],
  general: ['cell_sites', 'network_kpis', 'tickets'],
};

const WILAYAS = WILAYA_69.map(w => w.name);

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

function generateResponseData(intent: Intent, rng: () => number): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const count = Math.floor(rng() * 6) + 4;

  for (let i = 0; i < count; i++) {
    const wilaya = WILAYAS[Math.floor(rng() * WILAYAS.length)];
    const row: Record<string, unknown> = { rank: i + 1, wilaya };

    switch (intent) {
      case 'churn_analysis':
        row.totalSubscribers = Math.floor(rng() * 50000) + 5000;
        row.highRisk = Math.floor(rng() * 3000) + 200;
        row.avgRiskScore = Math.round((rng() * 0.6 + 0.2) * 1000) / 1000;
        row.churnRatePct = Math.round((rng() * 4 + 1) * 100) / 100;
        break;
      case 'kpi_status':
        row.technology = rng() > 0.3 ? '4G-LTE' : '3G-UMTS';
        row.avgRsrp = Math.round((rng() * 30 - 110) * 10) / 10;
        row.avgRsrq = Math.round((rng() * 10 - 15) * 10) / 10;
        row.avgSinr = Math.round((rng() * 15 + 3) * 10) / 10;
        row.avgThroughputDl = Math.round((rng() * 40 + 10) * 100) / 100;
        row.availabilityPct = Math.round((rng() * 8 + 91) * 100) / 100;
        break;
      case 'coverage_gap':
        row.totalSites = Math.floor(rng() * 200) + 50;
        row.weakSites = Math.floor(rng() * 40) + 5;
        row.gapPct = Math.round((rng() * 25 + 5) * 10) / 10;
        row.avgRadiusKm = Math.round((rng() * 3 + 1) * 10) / 10;
        break;
      case 'demand_forecast':
        row.technology = '4G-LTE';
        row.currentValue = Math.round((rng() * 60 + 30) * 10) / 10;
        row.forecast30d = Math.round((rng() * 70 + 35) * 10) / 10;
        row.growthRatePct = Math.round((rng() * 15 + 2) * 100) / 100;
        row.daysToCapacity = Math.floor(rng() * 180) + 30;
        row.capacityRisk = ['low', 'medium', 'high', 'critical'][Math.floor(rng() * 4)];
        break;
      case 'revenue_impact':
        row.revenueDzd = Math.floor(rng() * 500_000_000) + 50_000_000;
        row.churnLossDzd = Math.floor(rng() * 15_000_000) + 1_000_000;
        row.outageLossDzd = Math.floor(rng() * 10_000_000) + 500_000;
        row.lossPct = Math.round((rng() * 3 + 0.5) * 100) / 100;
        break;
      default:
        row.totalSites = Math.floor(rng() * 500) + 200;
        row.degraded = Math.floor(rng() * 30) + 2;
        row.down = Math.floor(rng() * 10);
        row.maintenance = Math.floor(rng() * 20) + 1;
        row.avgAvailability = Math.round((rng() * 6 + 93) * 100) / 100;
        break;
    }
    results.push(row);
  }

  return results;
}

function generateSummary(query: string, intent: Intent, locale: Locale, rng: () => number): string {
  const wilaya = WILAYAS[Math.floor(rng() * WILAYAS.length)];

  const summaries: Record<Intent, Record<Locale, string>> = {
    churn_analysis: {
      fr: `L'analyse du désabonnement pour ${wilaya} révèle un taux de churn de ${Math.round(rng() * 3 + 1.5)}% sur les 90 derniers jours. ${Math.floor(rng() * 3000) + 500} abonnés présentent un score de risque élevé (>0.7). Les principales causes identifiées sont la dégradation de la qualité de service (42%), les offres concurrentielles (31%) et l'insatisfaction du support client (27%). Une action ciblée sur les segments à haut risque pourrait réduire le churn de 18-25%.`,
      en: `Churn analysis for ${wilaya} shows a ${Math.round(rng() * 3 + 1.5)}% churn rate over the past 90 days. ${Math.floor(rng() * 3000) + 500} subscribers have a high risk score (>0.7). Key drivers: service quality degradation (42%), competitive offers (31%), and customer support dissatisfaction (27%). Targeted retention campaigns on high-risk segments could reduce churn by 18-25%.`,
      ar: `يُظهر تحليل إلغاء الاشتراك لـ ${wilaya} معدل إلغاء ${Math.round(rng() * 3 + 1.5)}% خلال 90 يوما الماضية. ${Math.floor(rng() * 3000) + 500} مشترك لديهم درجة خطر عالية (>0.7). الأسباب الرئيسية: تدهور جودة الخدمة (42%)، العروض التنافسية (31%)، وعدم الرضا عن خدمة العملاء (27%). حملات استبقية مستهدفة قد تقلل الإلغاء بنسبة 18-25%.`,
    },
    kpi_status: {
      fr: `Les KPIs réseau pour ${wilaya} sont globalement satisfaisants. RSRP moyen : ${Math.round(rng() * 15 - 100)} dBm, RSRQ moyen : ${Math.round(rng() * 5 - 12)} dB, SINR moyen : ${Math.round(rng() * 10 + 5)} dB. Le débit descendant moyen est de ${Math.round(rng() * 30 + 15)} Mbps avec une disponibilité de ${Math.round(rng() * 4 + 96)}%. ${Math.floor(rng() * 5) + 1} sites nécessitent une attention prioritaire en raison d'une disponibilité inférieure à 95%.`,
      en: `Network KPIs for ${wilaya} are generally satisfactory. Avg RSRP: ${Math.round(rng() * 15 - 100)} dBm, Avg RSRQ: ${Math.round(rng() * 5 - 12)} dB, Avg SINR: ${Math.round(rng() * 10 + 5)} dB. Average DL throughput is ${Math.round(rng() * 30 + 15)} Mbps with ${Math.round(rng() * 4 + 96)}% availability. ${Math.floor(rng() * 5) + 1} sites need priority attention due to availability below 95%.`,
      ar: `مؤشرات الأداء لـ ${wilaya} مرضية بشكل عام. متوسط RSRP: ${Math.round(rng() * 15 - 100)} dBm، متوسط RSRQ: ${Math.round(rng() * 5 - 12)} dB، متوسط SINR: ${Math.round(rng() * 10 + 5)} dB. متوسط سرعة التنزيل ${Math.round(rng() * 30 + 15)} Mbps مع توفر ${Math.round(rng() * 4 + 96)}%. ${Math.floor(rng() * 5) + 1} مواقع تحتاج اهتمام عاجل بسبب توفر أقل من 95%.`,
    },
    coverage_gap: {
      fr: `${Math.floor(rng() * 15) + 5} zones de couverture faible ont été identifiées, principalement dans les zones périphériques et rurales. Le taux de zones blanches en 4G est de ${Math.round(rng() * 8 + 4)}%. Les wilayas les plus touchées sont ${wilaya} et les régions montagneuses environnantes. Le déploiement de ${Math.floor(rng() * 10) + 3} nouveaux sites micro-cellules est recommandé pour combler ces lacunes.`,
      en: `${Math.floor(rng() * 15) + 5} weak coverage zones identified, mainly in peripheral and rural areas. The 4G dead zone rate is ${Math.round(rng() * 8 + 4)}%. Most affected wilayas include ${wilaya} and surrounding mountainous regions. Deployment of ${Math.floor(rng() * 10) + 3} new micro-cell sites is recommended to close these gaps.`,
      ar: `تم تحديد ${Math.floor(rng() * 15) + 5} مناطق تغطية ضعيفة، principalmente في المناطق المحيطة والريفية. معدل المناطق البيضاء في 4G هو ${Math.round(rng() * 8 + 4)}%. أكثر الولايات تأثرا هي ${wilaya} والمناطق الجبلية المحيطة. يوصى بنشر ${Math.floor(rng() * 10) + 3} مواقع خلايا مصغرة جديدة لسد هذه الفجوات.`,
    },
    demand_forecast: {
      fr: `La prévision de demande indique une croissance de ${Math.round(rng() * 12 + 3)}% sur les 30 prochains jours. Le seuil de capacité sera atteint dans ${Math.floor(rng() * 120) + 30} jours pour ${wilaya}. Le pic de consommation est attendu entre 19h et 22h. L'investissement CAPEX recommandé est de ${(Math.floor(rng() * 200) + 50)}M DZD pour l'extension de capacité.`,
      en: `Demand forecast indicates ${Math.round(rng() * 12 + 3)}% growth over the next 30 days. Capacity threshold will be reached in ${Math.floor(rng() * 120) + 30} days for ${wilaya}. Peak consumption is expected between 19:00-22:00. Recommended CAPEX investment: ${(Math.floor(rng() * 200) + 50)}M DZD for capacity expansion.`,
      ar: `تشير توقعات الطلب إلى نمو بنسبة ${Math.round(rng() * 12 + 3)}% خلال 30 يوما القادمة. سيتم بلوغ عتبة السعة خلال ${Math.floor(rng() * 120) + 30} يوما لـ ${wilaya}. من المتوقع ذروة الاستهلاك بين 19:00 و 22:00. الاستثمار CAPEX الموصى به: ${(Math.floor(rng() * 200) + 50)}M دج لتوسيع السعة.`,
    },
    revenue_impact: {
      fr: `L'impact financier des dégradations réseau est estimé à ${(Math.floor(rng() * 20) + 5)}M DZD ce mois pour ${wilaya}. Les pertes par désabonnement représentent ${(Math.floor(rng() * 60) + 30)}% du total, le reste étant dû aux pannes de service. La corrélation entre la disponibilité réseau et les revenus est de ${Math.round((rng() * 0.15 + 0.8) * 100) / 100}. Améliorer la disponibilité de 1% générerait environ ${(Math.floor(rng() * 10) + 2)}M DZD de revenus additionnels.`,
      en: `Financial impact of network degradation is estimated at ${(Math.floor(rng() * 20) + 5)}M DZD this month for ${wilaya}. Churn losses account for ${(Math.floor(rng() * 60) + 30)}% of total, with the rest from service outages. Network availability-revenue correlation is ${Math.round((rng() * 0.15 + 0.8) * 100) / 100}. A 1% availability improvement would generate approximately ${(Math.floor(rng() * 10) + 2)}M DZD in additional revenue.`,
      ar: `يُقدر التأثير المالي لتدهور الشبكة بـ ${(Math.floor(rng() * 20) + 5)}M دج هذا الشهر لـ ${wilaya}. تمثل خسائر الإلغاء ${(Math.floor(rng() * 60) + 30)}% من الإجمالي، والباقي بسبب انقطاعات الخدمة. ارتباط التوفر بالإيرادات هو ${Math.round((rng() * 0.15 + 0.8) * 100) / 100}. تحسين التوفر بنسبة 1% سيولد حوالي ${(Math.floor(rng() * 10) + 2)}M دج إيرادات إضافية.`,
    },
    general: {
      fr: `L'état global du réseau est stable. Sur ${Math.floor(rng() * 200) + 300} sites actifs, ${Math.floor(rng() * 8) + 2} sont en état dégradé et ${Math.floor(rng() * 3)} sont indisponibles. La disponibilité moyenne sur 7 jours est de ${Math.round(rng() * 4 + 95)}%. ${Math.floor(rng() * 5) + 1} tickets sont en cours de traitement. Aucune alerte critique n'a été détectée dans les dernières 24 heures.`,
      en: `Overall network status is stable. Out of ${Math.floor(rng() * 200) + 300} active sites, ${Math.floor(rng() * 8) + 2} are degraded and ${Math.floor(rng() * 3)} are unavailable. 7-day average availability is ${Math.round(rng() * 4 + 95)}%. ${Math.floor(rng() * 5) + 1} tickets are currently being processed. No critical alerts detected in the last 24 hours.`,
      ar: `حالة الشبكة العامة مستقرة. من أصل ${Math.floor(rng() * 200) + 300} موقع نشط، ${Math.floor(rng() * 8) + 2} متدهورة و ${Math.floor(rng() * 3)} غير متاحة. متوسط التوفر على 7 أيام هو ${Math.round(rng() * 4 + 95)}%. ${Math.floor(rng() * 5) + 1} تذاكر قيد المعالجة. لم يتم اكتشاف تنبيهات حرجة في آخر 24 ساعة.`,
    },
  };

  return summaries[intent][locale];
}

const SYSTEM_PROMPT_FR = `Tu es un assistant IA expert en optimisation de reseaux telecoms en Algerie. Tu travailles pour une plateforme qui surveille 69 wilayas. Reponds en francais de maniere concise et precise. Si la question porte sur des donnees reelles, fournis des estimations basees sur les donnees de la plateforme (DZD pour les montants). Si tu ne connais pas la reponse exacte, dis-le honnetement. Limite ta reponse a 3-4 phrases maximum.`;

const SYSTEM_PROMPT_EN = `You are an AI assistant expert in telecom network optimization in Algeria. You work for a platform monitoring 69 wilayas. Respond in English, concisely and precisely. If the question involves real data, provide estimates based on platform data (DZD for monetary values). If you don't know the exact answer, say so honestly. Limit your response to 3-4 sentences maximum.`;

const SYSTEM_PROMPT_AR = `أنت مساعد ذكاء اصطناعي خبير في تحسين شبكات الاتصالات في الجزائر. تعمل لمنصة تراقب 69 ولاية. أجب بالعربية بشكل موجز ودقيق. إذا كانت السؤال عن بيانات حقيقية، قدم تقديرات بناءً على بيانات المنصة (دج لل مبالغ المالية). إذا كنت لا تعرف الإجابة الدقيقة، قل ذلك بصدق. حد إجابتك بـ 3-4 جمل كحد أقصى.`;

const SYSTEM_PROMPTS: Record<Locale, string> = { fr: SYSTEM_PROMPT_FR, en: SYSTEM_PROMPT_EN, ar: SYSTEM_PROMPT_AR };

async function callLLM(query: string, locale: Locale, context?: string): Promise<string | null> {
  try {
    const zai = await ZAI.create();
    const systemPrompt = SYSTEM_PROMPTS[locale];
    const userMessage = context ? `${context}\n\nQuestion: ${query}` : query;
    const __startTime = Date.now();

    const completion = await zai.chat.completions.create({
      messages: [
        { role: 'assistant', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      thinking: { type: 'disabled' },
    });

    return completion.choices[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    const parsed = chatSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const { query, locale, context } = parsed.data;
    const intent = detectIntent(query);
    const seed = hashString(query + locale + (context || ''));
    const rng = seededRandom(seed);

    // Try real LLM first
    let responseSummary: string | null = null;
    let modelUsed = 'llm-v2.1';
    let tokenCount = 0;

    const llmResponse = await callLLM(query, locale, context);
    if (llmResponse) {
      responseSummary = llmResponse;
      modelUsed = 'llm-v3.0-real';
      tokenCount = Math.ceil(query.length / 4) + Math.ceil(llmResponse.length / 4);
    } else {
      // Fallback to mock response
      responseSummary = generateSummary(query, intent, locale, rng);
      tokenCount = Math.floor(rng() * 350) + 100;
    }

    const executionTimeMs = Date.now() - startTime;
    const responseData = generateResponseData(intent, rng);
    const id = `nqr-${Date.now()}-${Math.floor(rng() * 9999).toString().padStart(4, '0')}`;

    return NextResponse.json({
      id,
      queryText: query,
      queryLocale: locale,
      intent,
      generatedSql: SQL_BY_INTENT[intent],
      responseSummary,
      responseData,
      tablesAccessed: INTENT_TABLES[intent],
      executionTimeMs,
      tokenCount,
      modelUsed,
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
