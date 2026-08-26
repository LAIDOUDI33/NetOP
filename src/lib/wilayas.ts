/**
 * wilayas.ts
 * Master reference for all 69 Algerian wilayas.
 * Used by APIs and views that need wilaya-level data.
 */

export interface WilayaRef {
  code: string;       // '01'–'69', zero-padded
  name: string;       // French name
  nameAr: string;     // Arabic name
  cluster: string;    // Strategic cluster
  population: number; // Census population
  dairas: number;
  communes: number;
  superficieKm2: number;
  density: number;    // inhabitants/km²
  lat: number;
  lng: number;
}

export const WILAYA_69: WilayaRef[] = [
  { code:'01', name:'Adrar',                   nameAr:'أدرار',               cluster:'Sud-Ouest',             population:399714,   dairas:6,  communes:16,  superficieKm2:242942,  density:0.94,  lat:28.05,  lng:-0.28  },
  { code:'02', name:'Chlef',                   nameAr:'الشلف',               cluster:'Nord-Ouest',            population:1002088,  dairas:13, communes:35,  superficieKm2:4795,    density:209,   lat:36.17,  lng:1.33   },
  { code:'03', name:'Laghouat',                nameAr:'الأغواط',             cluster:'Sud-Ouest',             population:273402,   dairas:5,  communes:12,  superficieKm2:18404,   density:15,    lat:33.45,  lng:2.87   },
  { code:'04', name:'Oum El Bouaghi',          nameAr:'أم البواقي',          cluster:'Sud-Est',               population:621612,   dairas:12, communes:29,  superficieKm2:7638,    density:81,    lat:35.88,  lng:7.11   },
  { code:'05', name:'Batna',                   nameAr:'باتنة',               cluster:'Hauts Plateaux',        population:938075,   dairas:18, communes:53,  superficieKm2:8681,    density:108,   lat:35.56,  lng:6.17   },
  { code:'06', name:'Béjaïa',                  nameAr:'بجاية',               cluster:'Kabylie',               population:912577,   dairas:19, communes:52,  superficieKm2:3268,    density:279,   lat:36.75,  lng:5.08   },
  { code:'07', name:'Biskra',                  nameAr:'بسكرة',               cluster:'Sud-Est',               population:678246,   dairas:7,  communes:22,  superficieKm2:19543,   density:35,    lat:34.85,  lng:5.73   },
  { code:'08', name:'Béchar',                  nameAr:'بشار',               cluster:'Sud-Ouest',             population:270061,   dairas:6,  communes:11,  superficieKm2:162200,  density:1.7,   lat:31.62,  lng:-2.22  },
  { code:'09', name:'Blida',                   nameAr:'البليدة',             cluster:'Grand Alger',           population:1002937,  dairas:10, communes:25,  superficieKm2:1575,    density:591,   lat:36.47,  lng:2.83   },
  { code:'10', name:'Bouira',                  nameAr:'البويرة',             cluster:'Kabylie',               population:695583,   dairas:12, communes:45,  superficieKm2:4439,    density:157,   lat:36.37,  lng:3.90   },
  { code:'11', name:'Tamanrasset',             nameAr:'تمنراست',             cluster:'Sahara',                population:176637,   dairas:3,  communes:5,   superficieKm2:335563,  density:0.32,  lat:22.79,  lng:5.52   },
  { code:'12', name:'Tébessa',                 nameAr:'تبسة',               cluster:'Hauts Plateaux',        population:550262,   dairas:10, communes:24,  superficieKm2:9168,    density:60,    lat:35.40,  lng:8.12   },
  { code:'13', name:'Tlemcen',                 nameAr:'تلمسان',              cluster:'Nord-Ouest',            population:918521,   dairas:19, communes:49,  superficieKm2:6131,    density:150,   lat:34.88,  lng:-1.32  },
  { code:'14', name:'Tiaret',                  nameAr:'تيارت',              cluster:'Hauts Plateaux',        population:846823,   dairas:11, communes:36,  superficieKm2:20673,   density:41,    lat:35.37,  lng:1.32   },
  { code:'15', name:'Tizi Ouzou',              nameAr:'تيزي وزو',            cluster:'Kabylie',               population:1127608,  dairas:21, communes:67,  superficieKm2:2956,    density:316,   lat:36.71,  lng:4.04   },
  { code:'16', name:'Alger',                   nameAr:'الجزائر',             cluster:'Grand Alger',           population:2988145,  dairas:13, communes:57,  superficieKm2:1190,    density:2511,  lat:36.75,  lng:3.06   },
  { code:'17', name:'Djelfa',                  nameAr:'الجلفة',             cluster:'Hauts Plateaux',        population:621077,   dairas:6,  communes:18,  superficieKm2:10461,   density:46,    lat:34.67,  lng:3.25   },
  { code:'18', name:'Jijel',                   nameAr:'جيجل',               cluster:'Kabylie',               population:636948,   dairas:11, communes:28,  superficieKm2:2577,    density:247,   lat:36.82,  lng:5.77   },
  { code:'19', name:'Sétif',                   nameAr:'سطيف',               cluster:'Nord-Est',              population:1489979,  dairas:20, communes:60,  superficieKm2:6504,    density:229,   lat:36.19,  lng:5.41   },
  { code:'20', name:'Saïda',                   nameAr:'سعيدة',               cluster:'Hauts Plateaux',        population:330641,   dairas:6,  communes:16,  superficieKm2:6764,    density:49,    lat:34.84,  lng:0.15   },
  { code:'21', name:'Skikda',                  nameAr:'سكيكدة',             cluster:'Nord-Est',              population:898680,   dairas:13, communes:38,  superficieKm2:4026,    density:223,   lat:36.88,  lng:6.91   },
  { code:'22', name:'Sidi Bel Abbès',          nameAr:'سيدي بلعباس',        cluster:'Nord-Ouest',            population:604744,   dairas:15, communes:52,  superficieKm2:9096,    density:66,    lat:35.19,  lng:-0.63  },
  { code:'23', name:'Annaba',                  nameAr:'عنابة',               cluster:'Nord-Est',              population:609499,   dairas:6,  communes:12,  superficieKm2:1439,    density:424,   lat:36.91,  lng:7.75   },
  { code:'24', name:'Guelma',                  nameAr:'قالمة',               cluster:'Nord-Est',              population:482430,   dairas:10, communes:34,  superficieKm2:4101,    density:118,   lat:36.46,  lng:7.43   },
  { code:'25', name:'Constantine',             nameAr:'قسنطينة',             cluster:'Nord-Est',              population:938475,   dairas:7,  communes:12,  superficieKm2:2187,    density:427,   lat:36.37,  lng:6.61   },
  { code:'26', name:'Médéa',                   nameAr:'المدية',              cluster:'Hauts Plateaux',        population:563012,   dairas:13, communes:43,  superficieKm2:4142,    density:136,   lat:36.26,  lng:2.75   },
  { code:'27', name:'Mostaganem',              nameAr:'مستغانم',             cluster:'Nord-Ouest',            population:737118,   dairas:10, communes:32,  superficieKm2:2175,    density:325,   lat:35.93,  lng:0.08   },
  { code:'28', name:"M'Sila",                  nameAr:'المسيلة',             cluster:'Hauts Plateaux',        population:574462,   dairas:7,  communes:24,  superficieKm2:18718,   density:30.69, lat:35.70,  lng:4.54   },
  { code:'29', name:'Mascara',                 nameAr:'معسكر',              cluster:'Nord-Ouest',            population:784073,   dairas:16, communes:47,  superficieKm2:5941,    density:132,   lat:35.39,  lng:0.14   },
  { code:'30', name:'Ouargla',                 nameAr:'ورقلة',              cluster:'Sud-Est',               population:558558,   dairas:5,  communes:8,   superficieKm2:145805,  density:2.6,   lat:31.95,  lng:5.33   },
  { code:'31', name:'Oran',                    nameAr:'وهران',               cluster:'Nord-Ouest',            population:1584607,  dairas:9,  communes:26,  superficieKm2:2121,    density:688,   lat:35.70,  lng:-0.64  },
  { code:'32', name:'El Bayadh',               nameAr:'البيض',              cluster:'Sud-Ouest',             population:185347,   dairas:5,  communes:15,  superficieKm2:42038,   density:4.4,   lat:33.68,  lng:1.00   },
  { code:'33', name:'Illizi',                  nameAr:'إليزي',              cluster:'Sahara',                population:52333,    dairas:4,  communes:4,   superficieKm2:198433,  density:0.18,  lat:26.50,  lng:8.42   },
  { code:'34', name:'Bordj Bou Arreridj',      nameAr:'برج بوعريريج',        cluster:'Hauts Plateaux',        population:628475,   dairas:10, communes:34,  superficieKm2:4115,    density:160,   lat:36.07,  lng:4.77   },
  { code:'35', name:'Boumerdès',               nameAr:'بومرداس',             cluster:'Grand Alger',           population:802083,   dairas:9,  communes:32,  superficieKm2:1356,    density:504,   lat:36.76,  lng:3.48   },
  { code:'36', name:'El Tarf',                 nameAr:'الطارف',              cluster:'Nord-Est',              population:408414,   dairas:7,  communes:24,  superficieKm2:3339,    density:122,   lat:36.76,  lng:8.32   },
  { code:'37', name:'Tindouf',                 nameAr:'تندوف',              cluster:'Sud-Ouest',             population:49149,    dairas:1,  communes:2,   superficieKm2:159000,  density:0.31,  lat:27.67,  lng:-8.13  },
  { code:'38', name:'Tissemsilt',              nameAr:'تيسمسيلت',           cluster:'Hauts Plateaux',        population:294476,   dairas:8,  communes:22,  superficieKm2:3152,    density:93,    lat:35.51,  lng:1.81   },
  { code:'39', name:'El Oued',                 nameAr:'الوادي',              cluster:'Sud-Est',               population:647548,   dairas:10, communes:22,  superficieKm2:54573,   density:12,    lat:33.35,  lng:6.87   },
  { code:'40', name:'Khenchela',               nameAr:'خنشلة',              cluster:'Hauts Plateaux',        population:386683,   dairas:8,  communes:21,  superficieKm2:9811,    density:40,    lat:35.43,  lng:7.14   },
  { code:'41', name:'Souk Ahras',              nameAr:'سوق أهراس',          cluster:'Nord-Est',              population:438127,   dairas:10, communes:26,  superficieKm2:4541,    density:95,    lat:36.29,  lng:7.95   },
  { code:'42', name:'Tipaza',                  nameAr:'تيبازة',             cluster:'Grand Alger',           population:591010,   dairas:10, communes:28,  superficieKm2:1605,    density:273,   lat:36.59,  lng:2.45   },
  { code:'43', name:'Mila',                    nameAr:'ميلة',               cluster:'Nord-Est',              population:766886,   dairas:13, communes:32,  superficieKm2:3407,    density:220,   lat:36.45,  lng:6.27   },
  { code:'44', name:'Aïn Defla',               nameAr:'عين الدفلى',          cluster:'Hauts Plateaux',        population:766013,   dairas:14, communes:36,  superficieKm2:4891,    density:156,   lat:36.25,  lng:2.25   },
  { code:'45', name:'Naâma',                   nameAr:'النعامة',             cluster:'Sud-Ouest',             population:192891,   dairas:7,  communes:12,  superficieKm2:29950,   density:6.5,   lat:33.27,  lng:-0.31  },
  { code:'46', name:'Aïn Témouchent',          nameAr:'عين تموشنت',        cluster:'Nord-Ouest',            population:371239,   dairas:8,  communes:28,  superficieKm2:2379,    density:156,   lat:35.30,  lng:-1.14  },
  { code:'47', name:'Ghardaïa',                nameAr:'غرداية',             cluster:'Sud-Ouest',             population:363598,   dairas:8,  communes:10,  superficieKm2:86105,   density:4.2,   lat:32.49,  lng:3.67   },
  { code:'48', name:'Relizane',                nameAr:'غليزان',             cluster:'Nord-Ouest',            population:726180,   dairas:13, communes:38,  superficieKm2:4870,    density:152,   lat:35.74,  lng:0.56   },
  { code:'49', name:'Timimoun',                nameAr:'تيميمون',             cluster:'Nouvelles 2023 Sud',    population:122019,   dairas:4,  communes:10,  superficieKm2:65203,   density:1.87,  lat:29.25,  lng:-0.23  },
  { code:'50', name:'Bordj Badji Mokhtar',    nameAr:'برج باجي مختار',     cluster:'Sahara',                population:16437,    dairas:1,  communes:2,   superficieKm2:120026,  density:0.13,  lat:21.34,  lng:-1.37  },
  { code:'51', name:'Ouled Djellal',           nameAr:'أولاد جلال',         cluster:'Sud-Est',               population:174219,   dairas:2,  communes:6,   superficieKm2:11410,   density:15.26, lat:34.44,  lng:5.97   },
  { code:'52', name:'Béni Abbès',             nameAr:'بني عباس',          cluster:'Nouvelles 2023 Sud',    population:50163,    dairas:6,  communes:10,  superficieKm2:101350,  density:0.49,  lat:30.74,  lng:-2.15  },
  { code:'53', name:'In Salah',                nameAr:'إن صالح',            cluster:'Sahara',                population:50392,    dairas:2,  communes:3,   superficieKm2:134218,  density:0.38,  lat:27.19,  lng:2.47   },
  { code:'54', name:'In Guezzam',              nameAr:'إن قزام',            cluster:'Sahara',                population:11202,    dairas:2,  communes:2,   superficieKm2:88126,   density:0.12,  lat:23.47,  lng:5.76   },
  { code:'55', name:'Touggourt',               nameAr:'تقرت',              cluster:'Sud-Est',               population:247221,   dairas:5,  communes:13,  superficieKm2:17428,   density:14.18, lat:33.11,  lng:6.07   },
  { code:'56', name:'Djanet',                  nameAr:'جانت',              cluster:'Sahara',                population:17618,    dairas:1,  communes:2,   superficieKm2:86185,   density:0.2,   lat:24.55,  lng:9.48   },
  { code:'57', name:"El M'Ghair",             nameAr:'المغير',              cluster:'Nouvelles 2023 Sud',    population:162267,   dairas:2,  communes:8,   superficieKm2:8835,    density:18.36, lat:33.36,  lng:6.63   },
  { code:'58', name:'El Meniaa',               nameAr:'المنيعة',             cluster:'Nouvelles 2023 Sud',    population:57276,    dairas:2,  communes:3,   superficieKm2:62215,   density:0.92,  lat:30.59,  lng:2.88   },
  { code:'59', name:'Aflou',                   nameAr:'أفلو',               cluster:'Nouvelles 2023 Nord',   population:182938,   dairas:5,  communes:12,  superficieKm2:6653,    density:27,    lat:34.11,  lng:2.18   },
  { code:'60', name:'Barika',                  nameAr:'بريكة',              cluster:'Nouvelles 2023 Nord',   population:181716,   dairas:3,  communes:8,   superficieKm2:3511,    density:58,    lat:35.39,  lng:5.38   },
  { code:'61', name:'El Kantara',              nameAr:'القنطرة',            cluster:'Nouvelles 2023 Nord',   population:43110,    dairas:3,  communes:5,   superficieKm2:1443,    density:29,    lat:35.13,  lng:5.95   },
  { code:'62', name:'Bir El Ater',             nameAr:'بئر العاتر',        cluster:'Nouvelles 2023 Nord',   population:98441,    dairas:2,  communes:4,   superficieKm2:5059,    density:19.45, lat:34.69,  lng:8.07   },
  { code:'63', name:'El Aricha',               nameAr:'العريشة',           cluster:'Nouvelles 2023 Nord',   population:30614,    dairas:2,  communes:4,   superficieKm2:2930,    density:10.44, lat:34.28,  lng:-0.87  },
  { code:'64', name:'Ksar Chellala',           nameAr:'قصر الشلالة',        cluster:'Nouvelles 2023 Nord',   population:120000,   dairas:3,  communes:6,   superficieKm2:3500,    density:34,    lat:35.17,  lng:2.49   },
  { code:'65', name:'Aïn Ouessara',            nameAr:'عين وسارة',          cluster:'Nouvelles 2023 Sud',    population:251038,   dairas:4,  communes:10,  superficieKm2:6265,    density:40,    lat:35.44,  lng:2.89   },
  { code:'66', name:'Messaad',                 nameAr:'مسعد',              cluster:'Nouvelles 2023 Sud',    population:220069,   dairas:2,  communes:8,   superficieKm2:15530,   density:14.17, lat:35.04,  lng:4.54   },
  { code:'67', name:'Ksar El Boukhari',        nameAr:'قصربوخاري',         cluster:'Nouvelles 2023 Sud',    population:256920,   dairas:6,  communes:21,  superficieKm2:4724,    density:54,    lat:35.18,  lng:3.63   },
  { code:'68', name:'Bou Saâda',               nameAr:'بو سعادة',           cluster:'Nouvelles 2023 Sud',    population:416129,   dairas:8,  communes:23,  superficieKm2:8500,    density:49,    lat:35.33,  lng:4.57   },
  { code:'69', name:'El Abiodh Sidi Cheikh',   nameAr:'البيض سيدي الشيخ',   cluster:'Nouvelles 2023 Sud',    population:43277,    dairas:3,  communes:7,   superficieKm2:36832,   density:1.17,  lat:33.45,  lng:-0.49  },
];

/** Unique clusters sorted alphabetically */
export const CLUSTERS = [...new Set(WILAYA_69.map(w => w.cluster))].sort();

/** Lookup by code */
export const BY_CODE = Object.fromEntries(WILAYA_69.map(w => [w.code, w])) as Record<string, WilayaRef>;

/** Lookup by name */
export const BY_NAME = Object.fromEntries(WILAYA_69.map(w => [w.name.toLowerCase(), w])) as Record<string, WilayaRef>;

/** Wilayas grouped by cluster */
export const BY_CLUSTER: Record<string, WilayaRef[]> = {};
for (const w of WILAYA_69) {
  if (!BY_CLUSTER[w.cluster]) BY_CLUSTER[w.cluster] = [];
  BY_CLUSTER[w.cluster].push(w);
}
