import { db } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit';
import { checkApiAuth, authError } from '@/lib/api-auth';

// ─── Wilaya center coordinates and metadata for all 58 wilayas ───
const WILAYA_CENTERS: Record<
  string,
  {
    name: string;
    nameAr: string;
    nameFr: string;
    code: string;
    lat: number;
    lng: number;
    cluster: string;
  }
> = {
  '01': { name: 'Adrar', nameAr: 'أدرار', nameFr: 'Adrar', code: '01', lat: 28.05, lng: -0.3, cluster: 'South' },
  '02': { name: 'Chlef', nameAr: 'الشلف', nameFr: 'Chlef', code: '02', lat: 36.17, lng: 1.33, cluster: 'North' },
  '03': { name: 'Laghouat', nameAr: 'الأغواط', nameFr: 'Laghouat', code: '03', lat: 33.76, lng: 2.88, cluster: 'Highland' },
  '04': { name: 'Oum El Bouaghi', nameAr: 'أم البواقي', nameFr: 'Oum El Bouaghi', code: '04', lat: 35.87, lng: 7.11, cluster: 'East' },
  '05': { name: 'Batna', nameAr: 'باتنة', nameFr: 'Batna', code: '05', lat: 35.56, lng: 6.17, cluster: 'East' },
  '06': { name: 'Béjaïa', nameAr: 'بجاية', nameFr: 'Béjaïa', code: '06', lat: 36.75, lng: 5.08, cluster: 'North' },
  '07': { name: 'Biskra', nameAr: 'بسكرة', nameFr: 'Biskra', code: '07', lat: 34.85, lng: 5.73, cluster: 'Southeast' },
  '08': { name: 'Béchar', nameAr: 'بشار', nameFr: 'Béchar', code: '08', lat: 31.62, lng: -2.22, cluster: 'Southwest' },
  '09': { name: 'Blida', nameAr: 'البليدة', nameFr: 'Blida', code: '09', lat: 36.47, lng: 2.83, cluster: 'North' },
  '10': { name: 'Bouira', nameAr: 'البويرة', nameFr: 'Bouira', code: '10', lat: 36.37, lng: 3.9, cluster: 'North' },
  '11': { name: 'Tamanrasset', nameAr: 'تمنراست', nameFr: 'Tamanrasset', code: '11', lat: 22.79, lng: 5.52, cluster: 'South' },
  '12': { name: 'Tébessa', nameAr: 'تبسة', nameFr: 'Tébessa', code: '12', lat: 35.4, lng: 8.12, cluster: 'East' },
  '13': { name: 'Tlemcen', nameAr: 'تلمسان', nameFr: 'Tlemcen', code: '13', lat: 34.88, lng: -1.32, cluster: 'West' },
  '14': { name: 'Tiaret', nameAr: 'تيارت', nameFr: 'Tiaret', code: '14', lat: 35.37, lng: 1.32, cluster: 'West' },
  '15': { name: 'Tizi Ouzou', nameAr: 'تيزي وزو', nameFr: 'Tizi Ouzou', code: '15', lat: 36.71, lng: 4.05, cluster: 'North' },
  '16': { name: 'Alger', nameAr: 'الجزائر', nameFr: 'Alger', code: '16', lat: 36.75, lng: 3.04, cluster: 'North' },
  '17': { name: 'Djelfa', nameAr: 'الجلفة', nameFr: 'Djelfa', code: '17', lat: 34.67, lng: 3.25, cluster: 'Highland' },
  '18': { name: 'Jijel', nameAr: 'جيجل', nameFr: 'Jijel', code: '18', lat: 36.82, lng: 5.77, cluster: 'North' },
  '19': { name: 'Sétif', nameAr: 'سطيف', nameFr: 'Sétif', code: '19', lat: 36.19, lng: 5.41, cluster: 'East' },
  '20': { name: 'Saïda', nameAr: 'سعيدة', nameFr: 'Saïda', code: '20', lat: 34.84, lng: 0.15, cluster: 'West' },
  '21': { name: 'Skikda', nameAr: 'سكيكدة', nameFr: 'Skikda', code: '21', lat: 36.88, lng: 6.91, cluster: 'North' },
  '22': { name: 'Sidi Bel Abbès', nameAr: 'سيدي بلعباس', nameFr: 'Sidi Bel Abbès', code: '22', lat: 35.19, lng: -0.63, cluster: 'West' },
  '23': { name: 'Annaba', nameAr: 'عنابة', nameFr: 'Annaba', code: '23', lat: 36.91, lng: 7.77, cluster: 'North' },
  '24': { name: 'Guelma', nameAr: 'قالمة', nameFr: 'Guelma', code: '24', lat: 36.46, lng: 7.43, cluster: 'East' },
  '25': { name: 'Constantine', nameAr: 'قسنطينة', nameFr: 'Constantine', code: '25', lat: 36.37, lng: 6.61, cluster: 'East' },
  '26': { name: 'Médéa', nameAr: 'المدية', nameFr: 'Médéa', code: '26', lat: 36.26, lng: 2.75, cluster: 'North' },
  '27': { name: 'Mostaganem', nameAr: 'مستغانم', nameFr: 'Mostaganem', code: '27', lat: 35.93, lng: 0.08, cluster: 'North' },
  '28': { name: "M'Sila", nameAr: 'المسيلة', nameFr: "M'Sila", code: '28', lat: 35.7, lng: 4.54, cluster: 'Highland' },
  '29': { name: 'Mascara', nameAr: 'معسكر', nameFr: 'Mascara', code: '29', lat: 35.39, lng: 0.15, cluster: 'West' },
  '30': { name: 'Ouargla', nameAr: 'ورقلة', nameFr: 'Ouargla', code: '30', lat: 31.95, lng: 5.33, cluster: 'Southeast' },
  '31': { name: 'Oran', nameAr: 'وهران', nameFr: 'Oran', code: '31', lat: 35.7, lng: -0.63, cluster: 'West' },
  '32': { name: 'El Bayadh', nameAr: 'البيض', nameFr: 'El Bayadh', code: '32', lat: 33.68, lng: 1.01, cluster: 'Southwest' },
  '33': { name: 'Illizi', nameAr: 'إليزي', nameFr: 'Illizi', code: '33', lat: 26.5, lng: 8.42, cluster: 'Southeast' },
  '34': { name: 'Bordj Bou Arréridj', nameAr: 'برج بوعريريج', nameFr: 'Bordj Bou Arréridj', code: '34', lat: 36.07, lng: 4.77, cluster: 'East' },
  '35': { name: 'Boumerdès', nameAr: 'بومرداس', nameFr: 'Boumerdès', code: '35', lat: 36.76, lng: 3.48, cluster: 'North' },
  '36': { name: 'El Tarf', nameAr: 'الطارف', nameFr: 'El Tarf', code: '36', lat: 36.79, lng: 8.32, cluster: 'North' },
  '37': { name: 'Tindouf', nameAr: 'تندوف', nameFr: 'Tindouf', code: '37', lat: 27.67, lng: -8.13, cluster: 'Southwest' },
  '38': { name: 'Tissemsilt', nameAr: 'تيسمسيلت', nameFr: 'Tissemsilt', code: '38', lat: 35.61, lng: 1.81, cluster: 'North' },
  '39': { name: 'El Oued', nameAr: 'الوادي', nameFr: 'El Oued', code: '39', lat: 33.35, lng: 6.87, cluster: 'Southeast' },
  '40': { name: 'Khenchela', nameAr: 'خنشلة', nameFr: 'Khenchela', code: '40', lat: 35.43, lng: 7.14, cluster: 'East' },
  '41': { name: 'Souk Ahras', nameAr: 'سوق أهراس', nameFr: 'Souk Ahras', code: '41', lat: 36.29, lng: 7.95, cluster: 'East' },
  '42': { name: 'Tipaza', nameAr: 'تيبازة', nameFr: 'Tipaza', code: '42', lat: 36.59, lng: 2.43, cluster: 'North' },
  '43': { name: 'Mila', nameAr: 'ميلة', nameFr: 'Mila', code: '43', lat: 36.45, lng: 6.27, cluster: 'East' },
  '44': { name: 'Aïn Defla', nameAr: 'عين الدفلى', nameFr: 'Aïn Defla', code: '44', lat: 36.25, lng: 2.15, cluster: 'North' },
  '45': { name: 'Naâma', nameAr: 'النعامة', nameFr: 'Naâma', code: '45', lat: 33.27, lng: -0.31, cluster: 'Southwest' },
  '46': { name: 'Aïn Témouchent', nameAr: 'عين تموشنت', nameFr: 'Aïn Témouchent', code: '46', lat: 35.29, lng: -1.14, cluster: 'West' },
  '47': { name: 'Ghardaïa', nameAr: 'غرداية', nameFr: 'Ghardaïa', code: '47', lat: 32.49, lng: 3.67, cluster: 'Highland' },
  '48': { name: 'Relizane', nameAr: 'غليزان', nameFr: 'Relizane', code: '48', lat: 35.74, lng: 0.56, cluster: 'North' },
  '49': { name: "El M'Ghair", nameAr: 'المغير', nameFr: "El M'Ghair", code: '49', lat: 33.9, lng: 6.2, cluster: 'Southeast' },
  '50': { name: 'El Meniaa', nameAr: 'المنيعة', nameFr: 'El Meniaa', code: '50', lat: 30.58, lng: 2.88, cluster: 'South' },
  '51': { name: 'Ouled Djellal', nameAr: 'أولاد جلال', nameFr: 'Ouled Djellal', code: '51', lat: 34.45, lng: 5.02, cluster: 'Southeast' },
  '52': { name: 'Bordj Baji Mokhtar', nameAr: 'برج باجي مختار', nameFr: 'Bordj Baji Mokhtar', code: '52', lat: 21.37, lng: -0.94, cluster: 'South' },
  '53': { name: 'Béni Abbès', nameAr: 'بني عباس', nameFr: 'Béni Abbès', code: '53', lat: 30.12, lng: -2.15, cluster: 'Southwest' },
  '54': { name: 'Timimoun', nameAr: 'تيميمون', nameFr: 'Timimoun', code: '54', lat: 29.25, lng: -0.24, cluster: 'South' },
  '55': { name: 'Touggourt', nameAr: 'تقرت', nameFr: 'Touggourt', code: '55', lat: 33.1, lng: 6.06, cluster: 'Southeast' },
  '56': { name: 'Djanet', nameAr: 'جانت', nameFr: 'Djanet', code: '56', lat: 24.55, lng: 9.48, cluster: 'Southeast' },
  '57': { name: 'In Salah', nameAr: 'إن صالح', nameFr: 'In Salah', code: '57', lat: 27.19, lng: 2.47, cluster: 'South' },
  '58': { name: 'In Guezzam', nameAr: 'إن قزام', nameFr: 'In Guezzam', code: '58', lat: 23.48, lng: 5.76, cluster: 'South' },
};

/** Generate approximate circular polygon around a center coordinate */
function generateCirclePolygon(
  lat: number,
  lng: number,
  radiusDeg: number,
  points: number = 12
): number[][] {
  const coords: number[][] = [];
  for (let i = 0; i < points; i++) {
    const angle = (2 * Math.PI * i) / points;
    coords.push([
      Number((lat + radiusDeg * Math.cos(angle)).toFixed(4)),
      Number(
        (lng +
          (radiusDeg * Math.sin(angle)) /
            Math.cos((lat * Math.PI) / 180)).toFixed(4)
      ),
    ]);
  }
  coords.push(coords[0]); // close the polygon
  return coords;
}

/** Determine polygon radius based on cluster (southern wilayas are larger) */
function getWilayaRadius(cluster: string): number {
  switch (cluster) {
    case 'South':
    case 'Southeast':
    case 'Southwest':
      return 1.3;
    case 'Highland':
      return 0.7;
    case 'East':
    case 'West':
      return 0.55;
    case 'North':
    default:
      return 0.4;
  }
}

export async function GET(request: NextRequest) {
  try {
    await checkApiAuth(request);
  } catch {
    return authError();
  }
  const { limited, resetMs } = rateLimit(request, { windowMs: 60_000, max: 60 });
  if (limited) return rateLimitResponse(resetMs);

  try {
    // Fetch latest WilayaProfile records for all wilayas
    const profiles = await db.wilayaProfile.findMany({
      orderBy: { periodMonth: 'desc' },
    });

    // Index profiles by wilayaCode (keep latest per code)
    const profileMap = new Map<string, (typeof profiles)[number]>();
    for (const p of profiles) {
      if (!profileMap.has(p.wilayaCode)) {
        profileMap.set(p.wilayaCode, p);
      }
    }

    // Build GeoJSON FeatureCollection
    const features = Object.values(WILAYA_CENTERS).map((w) => {
      const profile = profileMap.get(w.code);
      const radius = getWilayaRadius(w.cluster);
      const polygon = generateCirclePolygon(w.lat, w.lng, radius);

      // Flip to [lng, lat] for GeoJSON
      const coordinates = polygon.map(([la, ln]) => [ln, la]);

      return {
        type: 'Feature' as const,
        properties: {
          code: w.code,
          name: w.name,
          nameAr: w.nameAr,
          nameFr: w.nameFr,
          cluster: w.cluster,
          networkScore: profile ? Math.round(profile.networkScore) : 0,
          totalSites: profile?.totalSites ?? 0,
          activeSites: profile?.activeSites ?? 0,
          coveragePercent: profile
            ? Number(profile.coveragePercent.toFixed(1))
            : 0,
          avgRsrp: profile ? Number(profile.avgRsrp.toFixed(1)) : 0,
          totalSubscribers: profile?.totalSubscribers ?? 0,
          avgArpu: profile?.avgArpu ?? 0,
          churnRate: profile
            ? Number(profile.churnRate.toFixed(1))
            : 0,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [coordinates],
        },
      };
    });

    const geojson = {
      type: 'FeatureCollection' as const,
      features,
    };

    return NextResponse.json(geojson);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
