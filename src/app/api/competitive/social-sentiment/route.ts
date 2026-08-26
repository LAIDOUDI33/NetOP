import { NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { WILAYA_69 } from '@/lib/wilayas';

function seededRandom(seed: number) {
  let s = seed;
  return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
}

const SOURCES = ['twitter', 'facebook', 'instagram', 'youtube', 'google_play'] as const;
const SENTIMENTS = ['positive', 'neutral', 'negative', 'mixed'] as const;
const OPERATORS = ['Us', 'Mobilis', 'Djezzy', 'Ooredoo'] as const;
const TOPICS = ['coverage', 'speed', 'pricing', 'customer_service', 'outage', 'promotion'] as const;
const URBAN_WILAYAS = ['Alger', 'Oran', 'Constantine', 'Annaba', 'Sétif', 'Blida', 'Tizi Ouzou'];

const FRENCH_SNIPPETS = {
  outage: [
    'Réseau {op} coupé depuis 3h à {wilaya}, haram!',
    'Encore une coupure {op} à {wilaya} centre, inadmissible!',
    'Pas de réseau {op} depuis ce matin à {wilaya}',
    '{op} en panne totale à {wilaya}, troisième fois ce mois',
    'Coupure réseau {op} dans tout le quartier de {wilaya}',
  ],
  coverage: [
    'Excellente couverture 4G {op} à {wilaya}, bravo!',
    'Zéro signal {op} à {wilaya} depuis des semaines',
    'La couverture {op} s\'améliore à {wilaya}, bien joué',
    'Toujours pas de 3G {op} à {wilaya}, c\'est ridicule',
    'Couverture {op} parfaite dans tout {wilaya} maintenant',
  ],
  speed: [
    'Masha\'Allah la 4G de {op} à {wilaya} est très rapide',
    'Débit {op} catastrophique à {wilaya}, 0.2 Mbps seulement',
    '{op} vitesse correcte à {wilaya} aujourd\'hui',
    'Le réseau {op} est lent comme l\'escargot à {wilaya}',
    'Vitesse 4G {op} impressionnante à {wilaya}, 50 Mbps!',
  ],
  customer_service: [
    'Service client {op} introuvable à {wilaya}, 2h d\'attente',
    'Le SAV de {op} à {wilaya} est enfin réactif',
    '{op} m\'a ignoré au magasin de {wilaya}',
    'Merci {op} pour la résolution rapide à {wilaya}!',
    'Le service client {op} à {wilaya} est nul',
  ],
  pricing: [
    '{op} trop cher pour la qualité à {wilaya}',
    'Bon rapport qualité-prix {op} à {wilaya}',
    'Les forfaits {op} deviennent abordables à {wilaya}',
    'Frais cachés {op} à {wilaya}, déçu',
    'Prix compétitif {op} par rapport aux autres à {wilaya}',
  ],
  promotion: [
    'Super promo {op} à {wilaya}, j\'ai pris 100Go!',
    '{op} offre le double de données à {wilaya}, génial',
    'Promo trompeuse {op} à {wilaya}, conditions cachées',
    'Offre spéciale {op} à {wilaya} très intéressante',
    '{op} nouvelle promo à {wilaya} à ne pas rater!',
  ],
};

const ARABIC_SNIPPETS = {
  outage: [
    'الشبكة مقطوعة {wilaya} من {op}، حرام!',
    'انقطاع {op} في {wilaya} للمرة الثالثة هذا الشهر',
    '{wilaya} بلا نت مع {op} منذ الصباح',
  ],
  coverage: [
    'تغطية ممتازة لـ {op} في {wilaya}، مبروك!',
    'لا إشارة لـ {op} في {wilaya}، ياهو ماكش',
  ],
  speed: [
    'النت 快 من {op} في {wilaya} ماشاء الله',
    'سرعة {op} بطيئة جدا في {wilaya}',
  ],
  customer_service: [
    'خدمة الزبائن {op} في {wilaya} سيئة',
    'شكرا {op} على الحل السريع في {wilaya}',
  ],
  pricing: [
    'أسعار {op} في {wilaya} غالية',
    'عروض {op} في {wilaya} ممتازة',
  ],
  promotion: [
    'عرض رائع من {op} في {wilaya}!',
    '{op} عرض جديد في {wilaya} لا يفوت!',
  ],
};

const ENGLISH_SNIPPETS = {
  outage: ['{op} network is down again in {wilaya}, frustrating!'],
  coverage: ['Great 4G coverage from {op} in {wilaya}!'],
  speed: ['{op} internet speed in {wilaya} is impressive'],
  customer_service: ['{op} customer service in {wilaya} needs improvement'],
  pricing: ['{op} pricing is reasonable in {wilaya}'],
  promotion: ['Love the new {op} promo in {wilaya}!'],
};

const KEYWORDS = [
  'réseau', 'couverture', '4G', '3G', 'internet', 'coupure', 'panne',
  'vitesse', 'débit', 'forfait', 'promo', 'signal', 'appel', 'données',
  'prix', 'SAV', 'service client', 'qualité', 'antenne', 'LTE',
  'recharge', 'carte SIM', 'wifi', 'mobile', 'algérie télécom',
];

const URGENCY_FOR_TOPIC: Record<string, string[]> = {
  outage: ['high', 'high', 'high', 'medium'],
  customer_service: ['medium', 'medium', 'low'],
  speed: ['medium', 'low', 'low'],
  coverage: ['medium', 'low', 'low'],
  pricing: ['low', 'low'],
  promotion: ['low', 'low'],
};

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function getSnippet(topic: string, lang: string, op: string, wilaya: string, rng: () => number): string {
  const __vars = { op, wilaya };
  let pool: Record<string, string[]>;
  if (lang === 'ar') pool = ARABIC_SNIPPETS;
  else if (lang === 'en') pool = ENGLISH_SNIPPETS;
  else pool = FRENCH_SNIPPETS;
  const snippets = pool[topic] || pool['coverage']!;
  return pick(snippets, rng).replace(/\{op\}/g, op).replace(/\{wilaya\}/g, wilaya);
}

function generatePosts(rng: () => number, filters: Record<string, string | undefined>) {
  const urbanWilayas = WILAYA_69.filter(w => URBAN_WILAYAS.includes(w.name));
  const sourceW = [0.40, 0.25, 0.15, 0.10, 0.10];
  const opW = [0.30, 0.28, 0.25, 0.17];
  const topicW = [0.25, 0.20, 0.15, 0.12, 0.18, 0.10];
  const sentimentW = [0.25, 0.35, 0.30, 0.10];

  const posts: any[] = [];
  const now = new Date('2025-07-15T14:30:00Z');

  for (let i = 0; i < 100; i++) {
    const source = pickWeighted(SOURCES, sourceW, rng);
    const operator = pickWeighted(OPERATORS, opW, rng);
    let topic = pickWeighted(TOPICS, topicW, rng);
    let sentiment = pickWeighted(SENTIMENTS, sentimentW, rng);

    // Source-topic correlation
    if (source === 'facebook' && rng() > 0.3) topic = 'promotion';
    if (source === 'google_play') topic = pick(['speed', 'customer_service', 'coverage'], rng);
    if (source === 'twitter' && rng() > 0.4) topic = pick(['outage', 'coverage', 'speed'], rng);

    // Sentiment-topic correlation
    if (topic === 'outage' && rng() > 0.15) sentiment = 'negative';
    if (topic === 'customer_service' && rng() > 0.3) sentiment = 'negative';
    if (topic === 'promotion' && rng() > 0.2) sentiment = 'positive';

    // Operator sentiment bias
    if (operator === 'Us' && sentiment === 'negative' && rng() > 0.35) sentiment = 'neutral';
    if ((operator === 'Djezzy' || operator === 'Ooredoo') && sentiment === 'positive' && rng() > 0.4) sentiment = 'neutral';
    if (operator === 'Mobilis' && topic === 'customer_service' && rng() > 0.25) sentiment = 'negative';

    // Wilaya selection (urban bias)
    const wilaya = rng() < 0.6
      ? pick(urbanWilayas, rng)
      : pick(WILAYA_69, rng);

    // Language
    const langRoll = rng();
    const language = langRoll < 0.70 ? 'fr' : langRoll < 0.95 ? 'ar' : 'en';

    // Sentiment score
    let baseScore: number;
    if (sentiment === 'positive') baseScore = 0.3 + rng() * 0.55;
    else if (sentiment === 'negative') baseScore = -(0.3 + rng() * 0.55);
    else if (sentiment === 'mixed') baseScore = (rng() - 0.5) * 0.3;
    else baseScore = (rng() - 0.5) * 0.2;
    if (operator === 'Us') baseScore += 0.15;
    if (operator === 'Djezzy' || operator === 'Ooredoo') baseScore -= 0.12;
    const sentimentScore = Math.round(Math.max(-1, Math.min(1, baseScore)) * 100) / 100;

    const likes = Math.floor(rng() * rng() * 500);
    const shares = Math.floor(rng() * rng() * 150);
    const comments = Math.floor(rng() * 80);
    const reach = likes * 5 + shares * 20 + Math.floor(rng() * 2000);
    const isViral = reach > 5000;
    const authorFollowers = Math.floor(100 + rng() * rng() * 20000);

    const daysAgo = Math.floor(rng() * 30);
    const hoursAgo = Math.floor(rng() * 24);
    const collectedAt = new Date(now.getTime() - (daysAgo * 86400000 + hoursAgo * 3600000));

    const urgencyPool = URGENCY_FOR_TOPIC[topic] || ['low'];
    const urgency = pick(urgencyPool, rng);

    // Apply filters
    if (filters.source && source !== filters.source) continue;
    if (filters.sentiment && sentiment !== filters.sentiment) continue;
    if (filters.operator && operator !== filters.operator) continue;
    if (filters.topic && topic !== filters.topic) continue;
    if (filters.wilaya && wilaya.name !== filters.wilaya) continue;

    posts.push({
      id: `ss-${String(i + 1).padStart(4, '0')}`,
      source,
      keyword: pick(KEYWORDS, rng),
      operatorMentioned: operator,
      sentiment,
      sentimentScore,
      textSnippet: getSnippet(topic, language, operator, wilaya.name, rng),
      topic,
      likes,
      shares,
      comments,
      reach,
      isViral,
      urgency,
      wilayaMentioned: wilaya.name,
      wilayaCode: wilaya.code,
      geoLocated: rng() > 0.25,
      authorFollowers,
      language,
      collectedAt: collectedAt.toISOString(),
    });
  }
  return posts;
}

function pickWeighted<T>(items: readonly T[], weights: number[], rng: () => number): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rng() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function buildSummary(posts: any[]) {
  const bySentiment: Record<string, number> = { positive: 0, neutral: 0, negative: 0, mixed: 0 };
  const bySource: Record<string, number> = { twitter: 0, facebook: 0, instagram: 0, youtube: 0, google_play: 0 };
  const byOperator: Record<string, number> = { Us: 0, Mobilis: 0, Djezzy: 0, Ooredoo: 0 };
  const byTopic: Record<string, number> = {};
  let totalScore = 0;
  let usScore = 0;
  let usCount = 0;
  const viralPosts = posts.filter(p => p.isViral).length;
  const wilayaMap: Record<string, { count: number; scores: number[] }> = {};

  for (const p of posts) {
    bySentiment[p.sentiment] = (bySentiment[p.sentiment] || 0) + 1;
    bySource[p.source] = (bySource[p.source] || 0) + 1;
    byOperator[p.operatorMentioned] = (byOperator[p.operatorMentioned] || 0) + 1;
    byTopic[p.topic] = (byTopic[p.topic] || 0) + 1;
    totalScore += p.sentimentScore;
    if (p.operatorMentioned === 'Us') { usScore += p.sentimentScore; usCount++; }
    if (!wilayaMap[p.wilayaMentioned]) wilayaMap[p.wilayaMentioned] = { count: 0, scores: [] };
    wilayaMap[p.wilayaMentioned].count++;
    wilayaMap[p.wilayaMentioned].scores.push(p.sentimentScore);
  }

  const topWilayas = Object.entries(wilayaMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, data]) => ({
      name,
      count: data.count,
      avgSentiment: Math.round((data.scores.reduce((a: number, b: number) => a + b, 0) / data.scores.length) * 100) / 100,
    }));

  const topNegative = [...posts].sort((a, b) => a.sentimentScore - b.sentimentScore).slice(0, 5);

  return {
    totalPosts: posts.length,
    bySentiment,
    bySource,
    byOperator,
    byTopic,
    avgSentimentScore: Math.round((totalScore / posts.length) * 100) / 100,
    ourAvgSentiment: usCount > 0 ? Math.round((usScore / usCount) * 100) / 100 : 0,
    viralPosts,
    topWilayas,
    topNegativePosts: topNegative.map(({ id, textSnippet, sentimentScore, operatorMentioned, wilayaMentioned }) =>
      ({ id, textSnippet, sentimentScore, operatorMentioned, wilayaMentioned })),
  };
}

function buildTrendByDay(posts: any[]) {
  const dayMap: Record<string, { positive: number; neutral: number; negative: number; mixed: number; scores: number[] }> = {};
  for (const p of posts) {
    const day = p.collectedAt.slice(0, 10);
    if (!dayMap[day]) dayMap[day] = { positive: 0, neutral: 0, negative: 0, mixed: 0, scores: [] };
    dayMap[day][p.sentiment]++;
    dayMap[day].scores.push(p.sentimentScore);
  }
  return Object.entries(dayMap)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, d]) => {
      const total = d.positive + d.neutral + d.negative + d.mixed;
      return {
        date,
        positive: d.positive,
        neutral: d.neutral,
        negative: d.negative,
        total,
        avgScore: Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 100) / 100,
      };
    });
}

function buildWordCloud(posts: any[]) {
  const wordMap: Record<string, { count: number; scores: number[] }> = {};
  for (const p of posts) {
    for (const w of [p.keyword, ...p.textSnippet.split(/[\s,!.?;:'"()\-]+/).filter((x: string) => x.length > 3)]) {
      const lower = w.toLowerCase();
      if (lower.length < 4) continue;
      if (!wordMap[lower]) wordMap[lower] = { count: 0, scores: [] };
      wordMap[lower].count++;
      wordMap[lower].scores.push(p.sentimentScore);
    }
  }
  return Object.entries(wordMap)
    .filter(([, d]) => d.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 30)
    .map(([word, d]) => ({
      word,
      count: d.count,
      sentiment: Math.round((d.scores.reduce((a, b) => a + b, 0) / d.scores.length) * 100) / 100,
    }));
}

export async function GET(request: Request) {
  if (!rateLimit(request)) return rateLimitResponse();

  const { searchParams } = new URL(request.url);
  const filters = {
    source: searchParams.get('source') || undefined,
    sentiment: searchParams.get('sentiment') || undefined,
    operator: searchParams.get('operator') || undefined,
    topic: searchParams.get('topic') || undefined,
    wilaya: searchParams.get('wilaya') || undefined,
  };

  // Validate filters
  if (filters.source && !SOURCES.includes(filters.source as any)) {
    return NextResponse.json({ error: 'Invalid source. Use: twitter, facebook, instagram, youtube, google_play' }, { status: 400 });
  }
  if (filters.sentiment && !SENTIMENTS.includes(filters.sentiment as any)) {
    return NextResponse.json({ error: 'Invalid sentiment. Use: positive, neutral, negative, mixed' }, { status: 400 });
  }
  if (filters.operator && !OPERATORS.includes(filters.operator as any)) {
    return NextResponse.json({ error: 'Invalid operator. Use: Us, Mobilis, Djezzy, Ooredoo' }, { status: 400 });
  }
  if (filters.topic && !TOPICS.includes(filters.topic as any)) {
    return NextResponse.json({ error: 'Invalid topic. Use: coverage, speed, pricing, customer_service, outage, promotion' }, { status: 400 });
  }
  if (filters.wilaya && !WILAYA_69.some(w => w.name === filters.wilaya)) {
    return NextResponse.json({ error: 'Invalid wilaya name' }, { status: 400 });
  }

  const seed = 42 + (filters.source ? SOURCES.indexOf(filters.source as any) * 17 : 0)
    + (filters.operator ? OPERATORS.indexOf(filters.operator as any) * 13 : 0);
  const rng = seededRandom(seed);
  const posts = generatePosts(rng, filters);

  return NextResponse.json({
    posts,
    summary: buildSummary(posts),
    trendByDay: buildTrendByDay(posts),
    wordCloud: buildWordCloud(posts),
  });
}
