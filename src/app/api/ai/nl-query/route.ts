import { NextResponse } from 'next/server';

interface RecentQuery {
  id: string;
  queryText: string;
  queryLocale: 'fr' | 'en' | 'ar';
  intent: string;
  generatedSql: string;
  responseSummary: string;
  responseData: Record<string, unknown>[];
  tablesAccessed: string[];
  executionTimeMs: number;
  tokenCount: number;
  modelUsed: string;
  satisfaction: number;
  createdAt: string;
}

interface SampleQuery {
  locale: 'fr' | 'en' | 'ar';
  queries: { query: string; intent: string }[];
}

interface SupportedIntent {
  intent: string;
  description: {
    fr: string;
    en: string;
    ar: string;
  };
  exampleQueries: {
    fr: string[];
    en: string[];
    ar: string[];
  };
  requiredTables: string[];
}

function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

const INTENTS = [
  'churn_analysis', 'kpi_status', 'coverage_gap',
  'demand_forecast', 'revenue_impact', 'general',
] as const;

const LOCALES = ['fr', 'en', 'ar'] as const;

const WILAYAS = [
  'Alger', 'Oran', 'Constantine', 'Annaba', 'Sétif', 'Tizi Ouzou',
  'Béjaïa', 'Batna', 'Biskra', 'Tlemcen', 'Blida', 'Ouargla',
];

const __TABLES = [
  'subscribers', 'network_kpis', 'cell_sites', 'coverage_data',
  'revenue', 'tickets', 'traffic', 'demand_forecasts', 'billing',
];

const QUERY_TEMPLATES: Record<string, Record<string, string[]>> = {
  fr: {
    churn_analysis: [
      'Quel est le taux de désabonnement à Alger ce mois ?',
      'Montre-moi les clients à risque de churn dans la région Oran',
      'Analyse les causes principales de désabonnement en Q4 2024',
      'Quels sont les indicateurs de churn pour les abonnés 4G ?',
    ],
    kpi_status: [
      'Quelle est la qualité du signal RSRP à Constantine ?',
      'Donne-moi les KPIs réseau de la wilaya de Sétif',
      'Quel est le taux de disponibilité du réseau 4G national ?',
      'Compare les performances 3G vs 4G à Tizi Ouzou',
    ],
    coverage_gap: [
      'Où sont les zones blanches dans le nord-est ?',
      'Quelles zones rurales manquent de couverture 4G ?',
      'Identifie les gaps de couverture autour de Biskra',
      'Cartographie les zones sans signal dans la wilaya de Tlemcen',
    ],
    demand_forecast: [
      'Prévois la demande de bande passante pour les 30 prochains jours',
      'Quelle sera la consommation data à Alger en 2025 ?',
      'Estime le pic de trafic pendant le Ramadan',
      'Quand le seuil de capacité sera-t-il atteint à Oran ?',
    ],
    revenue_impact: [
      'Quel est l\'impact financier de la dégradation réseau ?',
      'Calcule la perte de revenus due aux coupures à Annaba',
      'Analyse la corrélation entre KPIs et revenus',
      'Estime le revenu perdu par les désabonnements du trimestre',
    ],
    general: [
      'Résume l\'état du réseau national',
      'Quelles sont les pannes critiques en cours ?',
      'Donne un aperçu des performances de la semaine',
      'Combien de sites sont en maintenance ?',
    ],
  },
  en: {
    churn_analysis: [
      'What is the churn rate in Algiers this month?',
      'Show me at-risk customers in the Oran region',
      'Analyze the main churn causes in Q4 2024',
      'What are the churn indicators for 4G subscribers?',
    ],
    kpi_status: [
      'What is the RSRP signal quality in Constantine?',
      'Give me the network KPIs for Sétif wilaya',
      'What is the 4G network availability rate nationwide?',
      'Compare 3G vs 4G performance in Tizi Ouzou',
    ],
    coverage_gap: [
      'Where are the coverage dead zones in the northeast?',
      'Which rural areas lack 4G coverage?',
      'Identify coverage gaps around Biskra',
      'Map out no-signal zones in Tlemcen wilaya',
    ],
    demand_forecast: [
      'Forecast bandwidth demand for the next 30 days',
      'What will data consumption be in Algiers in 2025?',
      'Estimate the traffic peak during Ramadan',
      'When will the capacity threshold be reached in Oran?',
    ],
    revenue_impact: [
      'What is the financial impact of network degradation?',
      'Calculate revenue loss due to outages in Annaba',
      'Analyze the correlation between KPIs and revenue',
      'Estimate revenue lost from quarterly churn',
    ],
    general: [
      'Summarize the national network status',
      'What are the current critical outages?',
      'Give a weekly performance overview',
      'How many sites are under maintenance?',
    ],
  },
  ar: {
    churn_analysis: [
      'ما هو معدل إلغاء الاشتراك في الجزائر العاصمة هذا الشهر؟',
      'أظهر لي العملاء المعرضين لخطر الإلغاء في منطقة وهران',
      'حلل أسباب إلغاء الاشتراك الرئيسية في الربع الرابع 2024',
      'ما هي مؤشرات إلغاء الاشتراك لمشتركي 4G؟',
    ],
    kpi_status: [
      'ما هي جودة إشارة RSRP في قسنطينة؟',
      'أعطني مؤشرات الأداء لولاية سطيف',
      'ما هو معدل توفر شبكة 4G على المستوى الوطني؟',
      'قارن أداء 3G مقابل 4G في تيزي وزو',
    ],
    coverage_gap: [
      'أين المناطق البيضاء في الشمال الشرقي؟',
      'أي المناطق الريفية تفتقر لتغطية 4G؟',
      'حدد فجوات التغطية حول بسكرة',
      'ارسم خريطة المناطق بدون إشارة في ولاية تلمسان',
    ],
    demand_forecast: [
      'توقع طلب عرض النطاق للـ 30 يوما القادمة',
      'ماذا سيكون استهلاك البيانات في الجزائر العاصمة 2025؟',
      'قدر ذروة حركة المرور خلال رمضان',
      'متى سيتم بلوغ عتبة السعة في وهران؟',
    ],
    revenue_impact: [
      'ما هو التأثير المالي لتدهور الشبكة؟',
      'احسب خسارة الإيرادات بسبب الانقطاعات في عنابة',
      'حلل الارتباط بين المؤشرات والإيرادات',
      'قدر الإيرادات المفقودة من إلغاءات الاشتراك الفصلية',
    ],
    general: [
      'لخص حالة الشبكة الوطنية',
      'ما هي الانقطاعات الحرجة الحالية؟',
      'أعط نظرة عامة على الأداء الأسبوعي',
      'كم عدد المواقع قيد الصيانة؟',
    ],
  },
};

const SQL_TEMPLATES: Record<string, string> = {
  churn_analysis: `SELECT w.wilaya, COUNT(s.id) AS total_subscribers,
  SUM(CASE WHEN s.churn_risk_score > 0.7 THEN 1 ELSE 0 END) AS high_risk,
  ROUND(AVG(s.churn_risk_score), 3) AS avg_risk_score
FROM subscribers s
JOIN cell_sites c ON s.nearest_site_id = c.id
JOIN wilayas w ON c.wilaya_code = w.code
WHERE s.status = 'active' AND s.created_at >= CURRENT_DATE - INTERVAL '90 days'
GROUP BY w.wilaya ORDER BY avg_risk_score DESC LIMIT 20;`,

  kpi_status: `SELECT c.wilaya, c.technology,
  ROUND(AVG(k.rsrp), 1) AS avg_rsrp,
  ROUND(AVG(k.rsrq), 1) AS avg_rsrq,
  ROUND(AVG(k.sinr), 1) AS avg_sinr,
  ROUND(AVG(k.throughput_dl), 2) AS avg_throughput_dl,
  ROUND(AVG(k.availability_pct), 2) AS avg_availability
FROM network_kpis k
JOIN cell_sites c ON k.site_id = c.id
WHERE k.recorded_at >= CURRENT_DATE - INTERVAL '7 days'
  AND c.technology IN ('4G-LTE', '3G-UMTS')
GROUP BY c.wilaya, c.technology
ORDER BY avg_availability ASC LIMIT 30;`,

  coverage_gap: `SELECT c.wilaya, COUNT(*) AS total_sites,
  SUM(CASE WHEN cd.rsrp_avg < -110 THEN 1 ELSE 0 END) AS weak_sites,
  ROUND(100.0 * SUM(CASE WHEN cd.rsrp_avg < -110 THEN 1 ELSE 0 END) / COUNT(*), 1) AS gap_pct,
  ROUND(AVG(cd.coverage_radius_km), 1) AS avg_radius
FROM cell_sites c
LEFT JOIN coverage_data cd ON c.id = cd.site_id
WHERE c.status = 'active' AND c.technology = '4G-LTE'
GROUP BY c.wilaya HAVING gap_pct > 15
ORDER BY gap_pct DESC;`,

  demand_forecast: `SELECT region, technology, metric,
  current_value, peak_value, avg_value,
  forecast_30d, growth_rate_30d,
  capacity_limit, days_to_capacity, capacity_risk,
  required_capex_dzd, model_version, model_accuracy
FROM demand_forecasts
WHERE region IN ('Alger-Centre', 'Oran-Ouest', 'Constantine-Est')
  AND technology = '4G-LTE'
ORDER BY days_to_capacity ASC LIMIT 20;`,

  revenue_impact: `SELECT r.wilaya, r.month,
  SUM(r.revenue_dzd) AS total_revenue,
  SUM(r.churn_loss_dzd) AS churn_loss,
  SUM(r.outage_loss_dzd) AS outage_loss,
  ROUND(100.0 * SUM(r.churn_loss_dzd + r.outage_loss_dzd) / SUM(r.revenue_dzd), 2) AS loss_pct
FROM revenue r
WHERE r.month >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '6 months')
GROUP BY r.wilaya, r.month
ORDER BY loss_pct DESC LIMIT 30;`,

  general: `SELECT COUNT(*) AS total_sites,
  SUM(CASE WHEN status = 'degraded' THEN 1 ELSE 0 END) AS degraded,
  SUM(CASE WHEN status = 'down' THEN 1 ELSE 0 END) AS down,
  SUM(CASE WHEN status = 'maintenance' THEN 1 ELSE 0 END) AS maintenance,
  ROUND(AVG(availability_7d), 2) AS avg_availability
FROM cell_sites
WHERE technology = '4G-LTE' AND region = 'national';`,
};

const INTENT_TABLES: Record<string, string[]> = {
  churn_analysis: ['subscribers', 'cell_sites', 'billing', 'tickets'],
  kpi_status: ['network_kpis', 'cell_sites', 'traffic'],
  coverage_gap: ['coverage_data', 'cell_sites', 'network_kpis'],
  demand_forecast: ['demand_forecasts', 'traffic', 'cell_sites'],
  revenue_impact: ['revenue', 'subscribers', 'billing', 'network_kpis'],
  general: ['cell_sites', 'network_kpis', 'tickets'],
};

function generateRecentQueries(rng: () => number): RecentQuery[] {
  const queries: RecentQuery[] = [];
  const now = Date.now();

  for (let i = 0; i < 20; i++) {
    const locale = LOCALES[Math.floor(rng() * LOCALES.length)];
    const intent = INTENTS[Math.floor(rng() * INTENTS.length)];
    const templates = QUERY_TEMPLATES[locale][intent];
    const queryText = templates[Math.floor(rng() * templates.length)];
    const wilaya = WILAYAS[Math.floor(rng() * WILAYAS.length)];
    const tables = INTENT_TABLES[intent];
    const numResults = Math.floor(rng() * 8) + 3;
    const executionTimeMs = Math.floor(rng() * 800) + 120;
    const tokenCount = Math.floor(rng() * 400) + 80;
    const satisfaction = Math.round((rng() * 0.4 + 0.6) * 100) / 100;
    const minutesAgo = Math.floor(rng() * 10080);
    const createdAt = new Date(now - minutesAgo * 60_000).toISOString();

    const responseData: Record<string, unknown>[] = [];
    for (let j = 0; j < numResults; j++) {
      const row: Record<string, unknown> = { rank: j + 1, wilaya };
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
          row.availabilityPct = Math.round((rng() * 8 + 91) * 100) / 100;
          break;
        case 'coverage_gap':
          row.totalSites = Math.floor(rng() * 200) + 50;
          row.weakSites = Math.floor(rng() * 40) + 5;
          row.gapPct = Math.round((rng() * 20 + 5) * 10) / 10;
          row.avgRadiusKm = Math.round((rng() * 3 + 1) * 10) / 10;
          break;
        case 'demand_forecast':
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
      responseData.push(row);
    }

    const summaries: Record<string, Record<string, string>> = {
      fr: {
        churn_analysis: `Analyse de churn pour ${wilaya} : ${numResults} résultats trouvés. Le taux de désabonnement moyen est de ${Math.round(rng() * 3 + 1.5)}%.`,
        kpi_status: `KPIs réseau pour ${wilaya} : RSRP moyen ${Math.round(rng() * 20 - 100)} dBm, disponibilité ${Math.round(rng() * 5 + 95)}%.`,
        coverage_gap: `Zones de couverture faible identifiées à ${wilaya} : ${numResults} zones avec RSRP < -110 dBm.`,
        demand_forecast: `Prévision de demande pour ${wilaya} : croissance prévue de ${Math.round(rng() * 15 + 3)}% sur 30 jours.`,
        revenue_impact: `Impact financier à ${wilaya} : perte estimée de ${(Math.floor(rng() * 15) + 2)}M DZD ce mois.`,
        general: `État du réseau : ${Math.floor(rng() * 5) + 1} sites dégradés, ${Math.floor(rng() * 500) + 200} sites actifs.`,
      },
      en: {
        churn_analysis: `Churn analysis for ${wilaya}: ${numResults} results found. Average churn rate is ${Math.round(rng() * 3 + 1.5)}%.`,
        kpi_status: `Network KPIs for ${wilaya}: Avg RSRP ${Math.round(rng() * 20 - 100)} dBm, availability ${Math.round(rng() * 5 + 95)}%.`,
        coverage_gap: `Weak coverage zones identified in ${wilaya}: ${numResults} zones with RSRP < -110 dBm.`,
        demand_forecast: `Demand forecast for ${wilaya}: projected growth of ${Math.round(rng() * 15 + 3)}% over 30 days.`,
        revenue_impact: `Financial impact in ${wilaya}: estimated loss of ${(Math.floor(rng() * 15) + 2)}M DZD this month.`,
        general: `Network status: ${Math.floor(rng() * 5) + 1} degraded sites, ${Math.floor(rng() * 500) + 200} active sites.`,
      },
      ar: {
        churn_analysis: `تحليل إلغاء الاشتراك لـ ${wilaya}: تم العثور على ${numResults} نتيجة. معدل الإلغاء المتوسط ${Math.round(rng() * 3 + 1.5)}%.`,
        kpi_status: `مؤشرات الأداء لـ ${wilaya}: متوسط RSRP ${Math.round(rng() * 20 - 100)} dBm، التوفر ${Math.round(rng() * 5 + 95)}%.`,
        coverage_gap: `مناطق تغطية ضعيفة في ${wilaya}: ${numResults} مناطق بـ RSRP أقل من -110 dBm.`,
        demand_forecast: `توقع الطلب لـ ${wilaya}: نمو متوقع ${Math.round(rng() * 15 + 3)}% خلال 30 يوما.`,
        revenue_impact: `التأثير المالي في ${wilaya}: خسارة مقدرة ${(Math.floor(rng() * 15) + 2)}M دج هذا الشهر.`,
        general: `حالة الشبكة: ${Math.floor(rng() * 5) + 1} مواقع متدهورة، ${Math.floor(rng() * 500) + 200} موقع نشط.`,
      },
    };

    queries.push({
      id: `nq-${String(i + 1).padStart(4, '0')}`,
      queryText,
      queryLocale: locale,
      intent,
      generatedSql: SQL_TEMPLATES[intent],
      responseSummary: summaries[locale][intent],
      responseData,
      tablesAccessed: tables,
      executionTimeMs,
      tokenCount,
      modelUsed: 'llm-v2.1',
      satisfaction,
      createdAt,
    });
  }

  return queries;
}

export async function GET() {
  try {
    const rng = seededRandom(42);

    const recentQueries = generateRecentQueries(rng);

    const totalExecutionTime = recentQueries.reduce((s, q) => s + q.executionTimeMs, 0);
    const totalSatisfaction = recentQueries.reduce((s, q) => s + q.satisfaction, 0);

    const intentCounts: Record<string, number> = {};
    const localeCounts: Record<string, number> = {};
    for (const q of recentQueries) {
      intentCounts[q.intent] = (intentCounts[q.intent] || 0) + 1;
      localeCounts[q.queryLocale] = (localeCounts[q.queryLocale] || 0) + 1;
    }

    const topIntents = Object.entries(intentCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([intent, count]) => ({ intent, count }));

    const queriesByLocale = Object.entries(localeCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([locale, count]) => ({ locale, count }));

    const summary = {
      totalQueries: 1847,
      avgExecutionTimeMs: Math.round(totalExecutionTime / recentQueries.length),
      avgSatisfaction: Math.round((totalSatisfaction / recentQueries.length) * 100) / 100,
      topIntents,
      queriesByLocale,
    };

    const sampleQueries: SampleQuery[] = LOCALES.map((locale) => {
      const localeSamples: { query: string; intent: string }[] = [];
      const usedIntents = new Set<string>();
      const shuffledIntents = [...INTENTS].sort(() => rng() - 0.5);
      for (const intent of shuffledIntents) {
        if (usedIntents.size >= 5) break;
        const templates = QUERY_TEMPLATES[locale][intent];
        localeSamples.push({
          query: templates[0],
          intent,
        });
        usedIntents.add(intent);
      }
      return { locale, queries: localeSamples };
    });

    const supportedIntents: SupportedIntent[] = INTENTS.map((intent) => {
      const descriptions: Record<string, { fr: string; en: string; ar: string }> = {
        churn_analysis: {
          fr: "Analyse des risques de désabonnement et identification des clients à haut risque de churn",
          en: 'Churn risk analysis and identification of high-risk customers',
          ar: 'تحليل مخاطر إلغاء الاشتراك وتحديد العملاء المعرضين لخطر كبير',
        },
        kpi_status: {
          fr: "Consultation des indicateurs de performance réseau (RSRP, RSRQ, SINR, débit, disponibilité)",
          en: 'Network performance KPIs consultation (RSRP, RSRQ, SINR, throughput, availability)',
          ar: 'استعراض مؤشرات أداء الشبكة (RSRP, RSRQ, SINR, سرعة النقل, التوفر)',
        },
        coverage_gap: {
          fr: 'Identification des zones de couverture faible et des zones blanches',
          en: 'Identification of weak coverage zones and dead spots',
          ar: 'تحديد مناطق التغطية الضعيفة والمناطق البيضاء',
        },
        demand_forecast: {
          fr: "Prévision de la demande de bande passante et de la capacité réseau",
          en: 'Bandwidth demand and network capacity forecasting',
          ar: 'توقع طلب عرض النطاق وسعة الشبكة',
        },
        revenue_impact: {
          fr: "Analyse de l'impact financier des problèmes réseau sur les revenus",
          en: 'Financial impact analysis of network issues on revenue',
          ar: 'تحليل التأثير المالي لمشاكل الشبكة على الإيرادات',
        },
        general: {
          fr: "Requêtes générales sur l'état du réseau et les opérations",
          en: 'General queries about network status and operations',
          ar: 'استعلامات عامة حول حالة الشبكة والعمليات',
        },
      };

      return {
        intent,
        description: descriptions[intent],
        exampleQueries: {
          fr: QUERY_TEMPLATES.fr[intent].slice(0, 3),
          en: QUERY_TEMPLATES.en[intent].slice(0, 3),
          ar: QUERY_TEMPLATES.ar[intent].slice(0, 3),
        },
        requiredTables: INTENT_TABLES[intent],
      };
    });

    return NextResponse.json({
      summary,
      recentQueries,
      sampleQueries,
      supportedIntents,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
