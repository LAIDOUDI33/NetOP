/**
 * seed-wilayas-69.ts
 * Generates deterministic telecom KPI profiles for all 69 Algerian wilayas.
 * Pure data generation — no Prisma imports. Exported for use by seed.ts.
 */

// Deterministic pseudo-random factor (0–~0.86) based on wilaya code
const dv = (code: number, offset: number = 0) => ((code * 7 + offset) % 11) / 10;
const clamp = (min: number, max: number, val: number) => Math.round(Math.min(max, Math.max(min, val)));
const rnd = (base: number, range: number, code: number, offset: number = 0) =>
  Math.round(base + range * dv(code, offset));

function computeKPIs(w: {
  code: number; population: number; densite: number; superficie: number;
  clusterName: string; clusterOrder: number;
}) {
  const { code, population, densite, clusterName } = w;

  // Density classification
  const veryDense = densite >= 500;
  const dense = densite >= 100 && !veryDense;
  const medium = densite >= 30 && !dense && !veryDense;
  const low = densite >= 2 && !medium;
  const veryLow = densite < 2;
  const isSahara = ['Sahara', 'Sud-Ouest', 'Sud-Est'].includes(clusterName);

  // --- Network KPIs ---
  const siteDivisor = veryDense ? 8000 : dense ? 12000 : medium ? 16000 : low ? 20000 : 25000;
  const totalSites = clamp(5, 400, rnd(population / siteDivisor, 10, code, 1));
  const activeSites = clamp(0, totalSites, Math.round(totalSites * (0.92 + dv(code, 2) * 0.05)));

  const avgRsrp = veryDense ? rnd(-92, 5, code, 3) : dense ? rnd(-95, 7, code, 3) :
    medium ? rnd(-100, 8, code, 3) : low ? rnd(-104, 6, code, 3) : rnd(-106, 5, code, 3);

  const avgSinr = veryDense ? rnd(11, 3, code, 4) : dense ? rnd(8, 4, code, 4) :
    medium ? rnd(6, 3, code, 4) : low ? rnd(4, 2, code, 4) : rnd(3, 2, code, 4);

  const avgThroughputDl = veryDense ? rnd(42, 8, code, 5) : dense ? rnd(32, 10, code, 5) :
    medium ? rnd(24, 8, code, 5) : low ? rnd(14, 6, code, 5) : rnd(10, 5, code, 5);

  const avgAvailability = veryDense ? rnd(99, 0.5, code, 6) / 100 : dense ? rnd(98, 1, code, 6) / 100 :
    medium ? rnd(96.5, 1.5, code, 6) / 100 : low ? rnd(94.5, 1.5, code, 6) / 100 : rnd(93.5, 2, code, 6) / 100;

  const avgDropRate = veryDense ? rnd(0.4, 0.3, code, 7) / 100 : dense ? rnd(0.7, 0.5, code, 7) / 100 :
    medium ? rnd(1.2, 0.8, code, 7) / 100 : low ? rnd(2.0, 1.0, code, 7) / 100 : rnd(2.8, 0.7, code, 7) / 100;

  const avgLatencyMs = veryDense ? rnd(17, 6, code, 8) : dense ? rnd(22, 8, code, 8) :
    medium ? rnd(30, 8, code, 8) : low ? rnd(38, 10, code, 8) : rnd(45, 10, code, 8);

  const coveragePercent = veryDense ? rnd(93, 4, code, 9) : dense ? rnd(85, 8, code, 9) :
    medium ? rnd(72, 12, code, 9) : low ? rnd(50, 14, code, 9) : rnd(38, 12, code, 9);

  const tech4gRatio = veryDense ? 0.60 + dv(code, 10) * 0.05 : dense ? 0.55 + dv(code, 10) * 0.10 :
    medium ? 0.40 + dv(code, 10) * 0.10 : low ? 0.25 + dv(code, 10) * 0.10 : 0.15 + dv(code, 10) * 0.10;
  const tech4gSites = Math.round(totalSites * tech4gRatio);
  const tech3gSites = Math.round(totalSites * (0.28 + dv(code, 11) * 0.07));
  const tech2gSites = totalSites - tech4gSites - tech3gSites;

  // --- Commercial KPIs ---
  const marketPenetration = veryDense ? rnd(72, 8, code, 12) / 100 : dense ? rnd(58, 14, code, 12) / 100 :
    medium ? rnd(42, 16, code, 12) / 100 : low ? rnd(24, 14, code, 12) / 100 : rnd(16, 12, code, 12) / 100;

  const totalSubscribers = rnd(population * marketPenetration, population * 0.02, code, 13);

  const avgArpu = veryDense ? rnd(3000, 500, code, 14) : dense ? rnd(2200, 600, code, 14) :
    medium ? rnd(1600, 500, code, 14) : low ? rnd(1100, 300, code, 14) : rnd(900, 250, code, 14);

  const totalRevenue = Math.round(totalSubscribers * avgArpu * 12);

  const churnRate = veryDense ? rnd(3.0, 1.2, code, 15) / 100 : dense ? rnd(4.2, 1.5, code, 15) / 100 :
    medium ? rnd(5.5, 1.8, code, 15) / 100 : low ? rnd(6.8, 1.5, code, 15) / 100 : rnd(7.8, 1.2, code, 15) / 100;

  const satisfactionScore = veryDense ? rnd(82, 6, code, 16) : dense ? rnd(70, 10, code, 16) :
    medium ? rnd(58, 10, code, 16) : low ? rnd(46, 10, code, 16) : rnd(40, 8, code, 16);

  const revenueAtRisk = Math.round(totalRevenue * churnRate * 0.4);

  // --- Geomarketing KPIs ---
  const urbanRatio = veryDense ? rnd(92, 6, code, 17) / 100 : dense ? rnd(65, 10, code, 17) / 100 :
    medium ? rnd(55, 15, code, 17) / 100 : low ? rnd(30, 15, code, 17) / 100 : rnd(12, 8, code, 17) / 100;

  const competitorSites = rnd(totalSites * 1.4, totalSites * 0.8, code, 18);
  const coverageGaps = coveragePercent > 90 ? rnd(0, 2, code, 19) :
    coveragePercent > 75 ? rnd(1, 3, code, 19) :
    coveragePercent > 55 ? rnd(3, 4, code, 19) : rnd(6, 5, code, 19);

  const churnHotspots = medium ? rnd(2, 3, code, 20) : low ? rnd(3, 3, code, 20) :
    veryDense ? rnd(0, 2, code, 20) : rnd(1, 2, code, 20);

  const revenueZones = clamp(1, 8, rnd(population / 200000, 2, code, 21));
  const youthRatio = isSahara ? rnd(0.32, 0.06, code, 22) :
    veryDense ? rnd(0.24, 0.06, code, 22) : rnd(0.27, 0.06, code, 22);

  // --- Computed Scores ---
  const networkScore = clamp(0, 100, Math.round(
    ((avgRsrp + 115) / 30) * 20 +
    (avgSinr / 15) * 15 +
    (avgThroughputDl / 50) * 15 +
    ((avgAvailability - 0.90) / 0.10) * 15 +
    (1 - avgDropRate / 0.05) * 10 +
    (1 - avgLatencyMs / 60) * 10 +
    (coveragePercent / 100) * 10 +
    (tech4gSites / totalSites) * 5
  ));

  const commercialScore = clamp(0, 100, Math.round(
    (marketPenetration / 0.80) * 20 +
    (satisfactionScore / 90) * 25 +
    ((0.08 - churnRate) / 0.06) * 25 +
    (avgArpu / 3500) * 15 +
    clamp(0, 1, totalRevenue / 1000000000) * 15
  ));

  const geomarketingScore = clamp(0, 100, Math.round(
    (coveragePercent / 100) * 25 +
    (1 - coverageGaps / 12) * 20 +
    (1 - churnHotspots / 6) * 15 +
    (revenueZones / 8) * 20 +
    (urbanRatio) * 20
  ));

  const compositeScore = Math.round((networkScore * 0.4 + commercialScore * 0.35 + geomarketingScore * 0.25) * 10) / 10;

  return {
    totalSites, activeSites, avgRsrp, avgSinr, avgThroughputDl, avgAvailability, avgDropRate,
    avgLatencyMs, coveragePercent, tech4gSites, tech3gSites, tech2gSites,
    totalSubscribers, avgArpu, totalRevenue, churnRate, marketPenetration, satisfactionScore, revenueAtRisk,
    competitorSites, coverageGaps, churnHotspots, revenueZones, youthRatio, urbanRatio,
    networkScore, commercialScore, geomarketingScore, compositeScore,
  };
}

export function generateAllWilayaProfiles(): any[] {
  // --- Grand Alger ---
  const ga: any[] = [
    { code: 16, name: 'Alger', nameAr: 'الجزائر', dairas: 13, communes: 57, superficie: 1190, population: 2988145, densite: 2511, lat: 36.75, lng: 3.06, clusterName: 'Grand Alger', clusterOrder: 1 },
    { code: 9, name: 'Blida', nameAr: 'البليدة', dairas: 10, communes: 25, superficie: 1575, population: 1002937, densite: 591, lat: 36.47, lng: 2.83, clusterName: 'Grand Alger', clusterOrder: 2 },
    { code: 42, name: 'Tipaza', nameAr: 'تيبازة', dairas: 10, communes: 28, superficie: 1605, population: 591010, densite: 273, lat: 36.59, lng: 2.45, clusterName: 'Grand Alger', clusterOrder: 3 },
    { code: 35, name: 'Boumerdès', nameAr: 'بومرداس', dairas: 9, communes: 32, superficie: 1356, population: 802083, densite: 504, lat: 36.76, lng: 3.48, clusterName: 'Grand Alger', clusterOrder: 4 },
  ];

  // --- Kabylie ---
  const kb: any[] = [
    { code: 15, name: 'Tizi Ouzou', nameAr: 'تيزي وزو', dairas: 21, communes: 67, superficie: 2956, population: 1127608, densite: 316, lat: 36.71, lng: 4.04, clusterName: 'Kabylie', clusterOrder: 1 },
    { code: 6, name: 'Béjaïa', nameAr: 'بجاية', dairas: 19, communes: 52, superficie: 3268, population: 912577, densite: 279, lat: 36.75, lng: 5.08, clusterName: 'Kabylie', clusterOrder: 2 },
    { code: 10, name: 'Bouira', nameAr: 'البويرة', dairas: 12, communes: 45, superficie: 4439, population: 695583, densite: 157, lat: 36.37, lng: 3.90, clusterName: 'Kabylie', clusterOrder: 3 },
    { code: 18, name: 'Jijel', nameAr: 'جيجل', dairas: 11, communes: 28, superficie: 2577, population: 636948, densite: 247, lat: 36.82, lng: 5.77, clusterName: 'Kabylie', clusterOrder: 4 },
  ];

  // --- Nord-Est ---
  const ne: any[] = [
    { code: 25, name: 'Constantine', nameAr: 'قسنطينة', dairas: 7, communes: 12, superficie: 2187, population: 938475, densite: 427, lat: 36.37, lng: 6.61, clusterName: 'Nord-Est', clusterOrder: 1 },
    { code: 23, name: 'Annaba', nameAr: 'عنابة', dairas: 6, communes: 12, superficie: 1439, population: 609499, densite: 424, lat: 36.91, lng: 7.75, clusterName: 'Nord-Est', clusterOrder: 2 },
    { code: 19, name: 'Sétif', nameAr: 'سطيف', dairas: 20, communes: 60, superficie: 6504, population: 1489979, densite: 229, lat: 36.19, lng: 5.41, clusterName: 'Nord-Est', clusterOrder: 3 },
    { code: 21, name: 'Skikda', nameAr: 'سكيكدة', dairas: 13, communes: 38, superficie: 4026, population: 898680, densite: 223, lat: 36.88, lng: 6.91, clusterName: 'Nord-Est', clusterOrder: 4 },
    { code: 24, name: 'Guelma', nameAr: 'قالمة', dairas: 10, communes: 34, superficie: 4101, population: 482430, densite: 118, lat: 36.46, lng: 7.43, clusterName: 'Nord-Est', clusterOrder: 5 },
    { code: 43, name: 'Mila', nameAr: 'ميلة', dairas: 13, communes: 32, superficie: 3407, population: 766886, densite: 220, lat: 36.45, lng: 6.27, clusterName: 'Nord-Est', clusterOrder: 6 },
    { code: 41, name: 'Souk Ahras', nameAr: 'سوق أهراس', dairas: 10, communes: 26, superficie: 4541, population: 438127, densite: 95, lat: 36.29, lng: 7.95, clusterName: 'Nord-Est', clusterOrder: 7 },
    { code: 36, name: 'El Tarf', nameAr: 'الطارف', dairas: 7, communes: 24, superficie: 3339, population: 408414, densite: 122, lat: 36.76, lng: 8.32, clusterName: 'Nord-Est', clusterOrder: 8 },
  ];

  // --- Nord-Ouest ---
  const no: any[] = [
    { code: 31, name: 'Oran', nameAr: 'وهران', dairas: 9, communes: 26, superficie: 2121, population: 1584607, densite: 688, lat: 35.70, lng: -0.64, clusterName: 'Nord-Ouest', clusterOrder: 1 },
    { code: 13, name: 'Tlemcen', nameAr: 'تلمسان', dairas: 19, communes: 49, superficie: 6131, population: 918521, densite: 150, lat: 34.88, lng: -1.32, clusterName: 'Nord-Ouest', clusterOrder: 2 },
    { code: 22, name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', dairas: 15, communes: 52, superficie: 9096, population: 604744, densite: 66, lat: 35.19, lng: -0.63, clusterName: 'Nord-Ouest', clusterOrder: 3 },
    { code: 27, name: 'Mostaganem', nameAr: 'مستغانم', dairas: 10, communes: 32, superficie: 2175, population: 737118, densite: 325, lat: 35.93, lng: 0.08, clusterName: 'Nord-Ouest', clusterOrder: 4 },
    { code: 29, name: 'Mascara', nameAr: 'معسكر', dairas: 16, communes: 47, superficie: 5941, population: 784073, densite: 132, lat: 35.39, lng: 0.14, clusterName: 'Nord-Ouest', clusterOrder: 5 },
    { code: 46, name: 'Aïn Témouchent', nameAr: 'عين تموشنت', dairas: 8, communes: 28, superficie: 2379, population: 371239, densite: 156, lat: 35.30, lng: -1.14, clusterName: 'Nord-Ouest', clusterOrder: 6 },
    { code: 48, name: 'Relizane', nameAr: 'غليزان', dairas: 13, communes: 38, superficie: 4870, population: 726180, densite: 152, lat: 35.74, lng: 0.56, clusterName: 'Nord-Ouest', clusterOrder: 7 },
    { code: 2, name: 'Chlef', nameAr: 'الشلف', dairas: 13, communes: 35, superficie: 4795, population: 1002088, densite: 209, lat: 36.17, lng: 1.33, clusterName: 'Nord-Ouest', clusterOrder: 8 },
  ];

  // --- Hauts Plateaux ---
  const hp: any[] = [
    { code: 26, name: 'Médéa', nameAr: 'المدية', dairas: 13, communes: 43, superficie: 4142, population: 563012, densite: 136, lat: 36.26, lng: 2.75, clusterName: 'Hauts Plateaux', clusterOrder: 1 },
    { code: 44, name: 'Aïn Defla', nameAr: 'عين الدفلى', dairas: 14, communes: 36, superficie: 4891, population: 766013, densite: 156, lat: 36.25, lng: 2.25, clusterName: 'Hauts Plateaux', clusterOrder: 2 },
    { code: 28, name: "M'Sila", nameAr: 'المسيلة', dairas: 7, communes: 24, superficie: 18718, population: 574462, densite: 30.69, lat: 35.70, lng: 4.54, clusterName: 'Hauts Plateaux', clusterOrder: 3 },
    { code: 34, name: 'Bordj Bou Arreridj', nameAr: 'برج بوعريريج', dairas: 10, communes: 34, superficie: 4115, population: 628475, densite: 160, lat: 36.07, lng: 4.77, clusterName: 'Hauts Plateaux', clusterOrder: 4 },
    { code: 38, name: 'Tissemsilt', nameAr: 'تيسمسيلت', dairas: 8, communes: 22, superficie: 3152, population: 294476, densite: 93, lat: 35.51, lng: 1.81, clusterName: 'Hauts Plateaux', clusterOrder: 5 },
    { code: 5, name: 'Batna', nameAr: 'باتنة', dairas: 18, communes: 53, superficie: 8681, population: 938075, densite: 108, lat: 35.56, lng: 6.17, clusterName: 'Hauts Plateaux', clusterOrder: 6 },
    { code: 12, name: 'Tébessa', nameAr: 'تبسة', dairas: 10, communes: 24, superficie: 9168, population: 550262, densite: 60, lat: 35.40, lng: 8.12, clusterName: 'Hauts Plateaux', clusterOrder: 7 },
    { code: 40, name: 'Khenchela', nameAr: 'خنشلة', dairas: 8, communes: 21, superficie: 9811, population: 386683, densite: 40, lat: 35.43, lng: 7.14, clusterName: 'Hauts Plateaux', clusterOrder: 8 },
    { code: 14, name: 'Tiaret', nameAr: 'تيارت', dairas: 11, communes: 36, superficie: 20673, population: 846823, densite: 41, lat: 35.37, lng: 1.32, clusterName: 'Hauts Plateaux', clusterOrder: 9 },
    { code: 20, name: 'Saïda', nameAr: 'سعيدة', dairas: 6, communes: 16, superficie: 6764, population: 330641, densite: 49, lat: 34.84, lng: 0.15, clusterName: 'Hauts Plateaux', clusterOrder: 10 },
    { code: 17, name: 'Djelfa', nameAr: 'الجلفة', dairas: 6, communes: 18, superficie: 10461, population: 621077, densite: 46, lat: 34.67, lng: 3.25, clusterName: 'Hauts Plateaux', clusterOrder: 11 },
  ];

  // --- Sud-Est ---
  const se: any[] = [
    { code: 7, name: 'Biskra', nameAr: 'بسكرة', dairas: 7, communes: 22, superficie: 19543, population: 678246, densite: 35, lat: 34.85, lng: 5.73, clusterName: 'Sud-Est', clusterOrder: 1 },
    { code: 30, name: 'Ouargla', nameAr: 'ورقلة', dairas: 5, communes: 8, superficie: 145805, population: 558558, densite: 2.6, lat: 31.95, lng: 5.33, clusterName: 'Sud-Est', clusterOrder: 2 },
    { code: 39, name: 'El Oued', nameAr: 'الوادي', dairas: 10, communes: 22, superficie: 54573, population: 647548, densite: 12, lat: 33.35, lng: 6.87, clusterName: 'Sud-Est', clusterOrder: 3 },
    { code: 55, name: 'Touggourt', nameAr: 'تقرت', dairas: 5, communes: 13, superficie: 17428, population: 247221, densite: 14.18, lat: 33.11, lng: 6.07, clusterName: 'Sud-Est', clusterOrder: 4 },
    { code: 51, name: 'Ouled Djellal', nameAr: 'أولاد جلال', dairas: 2, communes: 6, superficie: 11410, population: 174219, densite: 15.26, lat: 34.44, lng: 5.97, clusterName: 'Sud-Est', clusterOrder: 5 },
    { code: 4, name: 'Oum El Bouaghi', nameAr: 'أم البواقي', dairas: 12, communes: 29, superficie: 7638, population: 621612, densite: 81, lat: 35.88, lng: 7.11, clusterName: 'Sud-Est', clusterOrder: 6 },
  ];

  // --- Sud-Ouest ---
  const so: any[] = [
    { code: 8, name: 'Béchar', nameAr: 'بشار', dairas: 6, communes: 11, superficie: 162200, population: 270061, densite: 1.7, lat: 31.62, lng: -2.22, clusterName: 'Sud-Ouest', clusterOrder: 1 },
    { code: 1, name: 'Adrar', nameAr: 'أدرار', dairas: 6, communes: 16, superficie: 242942, population: 399714, densite: 0.94, lat: 28.05, lng: -0.28, clusterName: 'Sud-Ouest', clusterOrder: 2 },
    { code: 37, name: 'Tindouf', nameAr: 'تندوف', dairas: 1, communes: 2, superficie: 159000, population: 49149, densite: 0.31, lat: 27.67, lng: -8.13, clusterName: 'Sud-Ouest', clusterOrder: 3 },
    { code: 45, name: 'Naâma', nameAr: 'النعامة', dairas: 7, communes: 12, superficie: 29950, population: 192891, densite: 6.5, lat: 33.27, lng: -0.31, clusterName: 'Sud-Ouest', clusterOrder: 4 },
    { code: 47, name: 'Ghardaïa', nameAr: 'غرداية', dairas: 8, communes: 10, superficie: 86105, population: 363598, densite: 4.2, lat: 32.49, lng: 3.67, clusterName: 'Sud-Ouest', clusterOrder: 5 },
    { code: 3, name: 'Laghouat', nameAr: 'الأغواط', dairas: 5, communes: 12, superficie: 18404, population: 273402, densite: 15, lat: 33.45, lng: 2.87, clusterName: 'Sud-Ouest', clusterOrder: 6 },
    { code: 32, name: 'El Bayadh', nameAr: 'البيض', dairas: 5, communes: 15, superficie: 42038, population: 185347, densite: 4.4, lat: 33.68, lng: 1.00, clusterName: 'Sud-Ouest', clusterOrder: 7 },
  ];

  // --- Sahara ---
  const sa: any[] = [
    { code: 11, name: 'Tamanrasset', nameAr: 'تمنراست', dairas: 3, communes: 5, superficie: 335563, population: 176637, densite: 0.32, lat: 22.79, lng: 5.52, clusterName: 'Sahara', clusterOrder: 1 },
    { code: 33, name: 'Illizi', nameAr: 'إليزي', dairas: 4, communes: 4, superficie: 198433, population: 52333, densite: 0.18, lat: 26.50, lng: 8.42, clusterName: 'Sahara', clusterOrder: 2 },
    { code: 54, name: 'In Guezzam', nameAr: 'إن قزام', dairas: 2, communes: 2, superficie: 88126, population: 11202, densite: 0.12, lat: 23.47, lng: 5.76, clusterName: 'Sahara', clusterOrder: 3 },
    { code: 53, name: 'In Salah', nameAr: 'إن صالح', dairas: 2, communes: 3, superficie: 134218, population: 50392, densite: 0.38, lat: 27.19, lng: 2.47, clusterName: 'Sahara', clusterOrder: 4 },
    { code: 56, name: 'Djanet', nameAr: 'جانت', dairas: 1, communes: 2, superficie: 86185, population: 17618, densite: 0.2, lat: 24.55, lng: 9.48, clusterName: 'Sahara', clusterOrder: 5 },
    { code: 50, name: 'Bordj Badji Mokhtar', nameAr: 'برج باجي مختار', dairas: 1, communes: 2, superficie: 120026, population: 16437, densite: 0.13, lat: 21.34, lng: -1.37, clusterName: 'Sahara', clusterOrder: 6 },
  ];

  // --- Nouvelles 2023 Nord ---
  const nn: any[] = [
    { code: 59, name: 'Aflou', nameAr: 'أفلو', dairas: 5, communes: 12, superficie: 6653, population: 182938, densite: 27, lat: 34.11, lng: 2.18, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 1 },
    { code: 60, name: 'Barika', nameAr: 'بريكة', dairas: 3, communes: 8, superficie: 3511, population: 181716, densite: 58, lat: 35.39, lng: 5.38, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 2 },
    { code: 61, name: 'El Kantara', nameAr: 'القنطرة', dairas: 3, communes: 5, superficie: 1443, population: 43110, densite: 29, lat: 35.13, lng: 5.95, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 3 },
    { code: 62, name: 'Bir El Ater', nameAr: 'بئر العاتر', dairas: 2, communes: 4, superficie: 5059, population: 98441, densite: 19.45, lat: 34.69, lng: 8.07, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 4 },
    { code: 63, name: 'El Aricha', nameAr: 'العريشة', dairas: 2, communes: 4, superficie: 2930, population: 30614, densite: 10.44, lat: 34.28, lng: -0.87, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 5 },
    { code: 64, name: 'Ksar Chellala', nameAr: 'قصر الشلالة', dairas: 3, communes: 6, superficie: 3500, population: 120000, densite: 34, lat: 35.17, lng: 2.49, clusterName: 'Nouvelles 2023 Nord', clusterOrder: 6 },
  ];

  // --- Nouvelles 2023 Sud ---
  const ns: any[] = [
    { code: 49, name: 'Timimoun', nameAr: 'تيميمون', dairas: 4, communes: 10, superficie: 65203, population: 122019, densite: 1.87, lat: 29.25, lng: -0.23, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 1 },
    { code: 52, name: 'Béni Abbès', nameAr: 'بني عباس', dairas: 6, communes: 10, superficie: 101350, population: 50163, densite: 0.49, lat: 30.74, lng: -2.15, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 2 },
    { code: 57, name: "El M'Ghair", nameAr: 'المغير', dairas: 2, communes: 8, superficie: 8835, population: 162267, densite: 18.36, lat: 33.36, lng: 6.63, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 3 },
    { code: 58, name: 'El Meniaa', nameAr: 'المنيعة', dairas: 2, communes: 3, superficie: 62215, population: 57276, densite: 0.92, lat: 30.59, lng: 2.88, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 4 },
    { code: 65, name: 'Aïn Ouessara', nameAr: 'عين وسارة', dairas: 4, communes: 10, superficie: 6265, population: 251038, densite: 40, lat: 35.44, lng: 2.89, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 5 },
    { code: 66, name: 'Messaad', nameAr: 'مسعد', dairas: 2, communes: 8, superficie: 15530, population: 220069, densite: 14.17, lat: 35.04, lng: 4.54, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 6 },
    { code: 67, name: 'Ksar El Boukhari', nameAr: 'قصربوخاري', dairas: 6, communes: 21, superficie: 4724, population: 256920, densite: 54, lat: 35.18, lng: 3.63, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 7 },
    { code: 68, name: 'Bou Saâda', nameAr: 'بو سعادة', dairas: 8, communes: 23, superficie: 8500, population: 416129, densite: 49, lat: 35.33, lng: 4.57, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 8 },
    { code: 69, name: 'El Abiodh Sidi Cheikh', nameAr: 'البيض سيدي الشيخ', dairas: 3, communes: 7, superficie: 36832, population: 43277, densite: 1.17, lat: 33.45, lng: -0.49, clusterName: 'Nouvelles 2023 Sud', clusterOrder: 9 },
  ];

  // Combine all clusters and compute KPIs for each
  const all = [...ga, ...kb, ...ne, ...no, ...hp, ...se, ...so, ...sa, ...nn, ...ns];

  const wilayas = all.map((w) => {
    const kpis = computeKPIs(w);
    return {
      wilayaCode: String(w.code).padStart(2, '0'),
      wilayaName: w.name,
      cluster: w.clusterName,
      clusterOrder: w.clusterOrder,
      latitude: w.lat,
      longitude: w.lng,
      population: w.population,
      dairas: w.dairas,
      communes: w.communes,
      superficieKm2: w.superficie,
      densiteHabKm2: w.densite,
      ...kpis,
    };
  });

  console.log(`Generated ${wilayas.length} wilaya profiles`);
  return wilayas;
}
