/**
 * 77 จังหวัดทั่วไทย พร้อมพิกัดศูนย์กลาง (Centroid) และภูมิภาค
 * รองรับการ Auto-detect จาก GPS อุปกรณ์ และขยายบริการครอบคลุมทั่วประเทศ
 */

export interface ProvinceInfo {
  id: string;
  name_th: string;
  name_en: string;
  region: 'bangkok' | 'central' | 'north' | 'northeast' | 'south' | 'east' | 'west';
  lat: number;
  lng: number;
}

export const THAILAND_PROVINCES: readonly ProvinceInfo[] = [
  // กรุงเทพฯ และปริมณฑล
  {
    id: 'bangkok',
    name_th: 'กรุงเทพมหานคร',
    name_en: 'Bangkok',
    region: 'bangkok',
    lat: 13.7563,
    lng: 100.5018,
  },
  {
    id: 'nonthaburi',
    name_th: 'นนทบุรี',
    name_en: 'Nonthaburi',
    region: 'bangkok',
    lat: 13.8621,
    lng: 100.5144,
  },
  {
    id: 'pathum_thani',
    name_th: 'ปทุมธานี',
    name_en: 'Pathum Thani',
    region: 'bangkok',
    lat: 14.0208,
    lng: 100.525,
  },
  {
    id: 'samut_prakan',
    name_th: 'สมุทรปราการ',
    name_en: 'Samut Prakan',
    region: 'bangkok',
    lat: 13.5991,
    lng: 100.5998,
  },
  {
    id: 'samut_sakhon',
    name_th: 'สมุทรสาคร',
    name_en: 'Samut Sakhon',
    region: 'bangkok',
    lat: 13.5475,
    lng: 100.2744,
  },
  {
    id: 'nakhon_pathom',
    name_th: 'นครปฐม',
    name_en: 'Nakhon Pathom',
    region: 'bangkok',
    lat: 13.8196,
    lng: 100.0601,
  },

  // ภาคเหนือ
  {
    id: 'chiang_mai',
    name_th: 'เชียงใหม่',
    name_en: 'Chiang Mai',
    region: 'north',
    lat: 18.7883,
    lng: 98.9853,
  },
  {
    id: 'chiang_rai',
    name_th: 'เชียงราย',
    name_en: 'Chiang Rai',
    region: 'north',
    lat: 19.9072,
    lng: 99.8325,
  },
  {
    id: 'lampang',
    name_th: 'ลำปาง',
    name_en: 'Lampang',
    region: 'north',
    lat: 18.2888,
    lng: 99.4928,
  },
  {
    id: 'lamphun',
    name_th: 'ลำพูน',
    name_en: 'Lamphun',
    region: 'north',
    lat: 18.5745,
    lng: 99.0087,
  },
  {
    id: 'mae_hong_son',
    name_th: 'แม่ฮ่องสอน',
    name_en: 'Mae Hong Son',
    region: 'north',
    lat: 19.3021,
    lng: 97.9654,
  },
  { id: 'nan', name_th: 'น่าน', name_en: 'Nan', region: 'north', lat: 18.7832, lng: 100.7782 },
  {
    id: 'phayao',
    name_th: 'พะเยา',
    name_en: 'Phayao',
    region: 'north',
    lat: 19.1664,
    lng: 99.9019,
  },
  { id: 'phrae', name_th: 'แพร่', name_en: 'Phrae', region: 'north', lat: 18.1446, lng: 100.1412 },
  {
    id: 'uttaradit',
    name_th: 'อุตรดิตถ์',
    name_en: 'Uttaradit',
    region: 'north',
    lat: 17.6201,
    lng: 100.0993,
  },

  // ภาคตะวันออกเฉียงเหนือ (อีสาน)
  {
    id: 'khon_kaen',
    name_th: 'ขอนแก่น',
    name_en: 'Khon Kaen',
    region: 'northeast',
    lat: 16.4419,
    lng: 102.836,
  },
  {
    id: 'nakhon_ratchasima',
    name_th: 'นครราชสีมา',
    name_en: 'Nakhon Ratchasima',
    region: 'northeast',
    lat: 14.9799,
    lng: 102.0978,
  },
  {
    id: 'udon_thani',
    name_th: 'อุดรธานี',
    name_en: 'Udon Thani',
    region: 'northeast',
    lat: 17.4138,
    lng: 102.7872,
  },
  {
    id: 'ubon_ratchathani',
    name_th: 'อุบลราชธานี',
    name_en: 'Ubon Ratchathani',
    region: 'northeast',
    lat: 15.2449,
    lng: 104.8473,
  },
  {
    id: 'buriram',
    name_th: 'บุรีรัมย์',
    name_en: 'Buriram',
    region: 'northeast',
    lat: 14.993,
    lng: 103.1029,
  },
  {
    id: 'surin',
    name_th: 'สุรินทร์',
    name_en: 'Surin',
    region: 'northeast',
    lat: 14.8818,
    lng: 103.4936,
  },
  {
    id: 'sisaket',
    name_th: 'ศรีสะเกษ',
    name_en: 'Sisaket',
    region: 'northeast',
    lat: 15.1186,
    lng: 104.3228,
  },
  {
    id: 'roi_et',
    name_th: 'ร้อยเอ็ด',
    name_en: 'Roi Et',
    region: 'northeast',
    lat: 16.0538,
    lng: 103.652,
  },
  {
    id: 'kalasin',
    name_th: 'กาฬสินธุ์',
    name_en: 'Kalasin',
    region: 'northeast',
    lat: 16.4322,
    lng: 103.5063,
  },
  {
    id: 'maha_sarakham',
    name_th: 'มหาสารคาม',
    name_en: 'Maha Sarakham',
    region: 'northeast',
    lat: 16.1851,
    lng: 103.3007,
  },
  {
    id: 'chaiyaphum',
    name_th: 'ชัยภูมิ',
    name_en: 'Chaiyaphum',
    region: 'northeast',
    lat: 15.8063,
    lng: 102.0315,
  },
  {
    id: 'mukdahan',
    name_th: 'มุกดาหาร',
    name_en: 'Mukdahan',
    region: 'northeast',
    lat: 16.5434,
    lng: 104.7235,
  },
  {
    id: 'yasothon',
    name_th: 'ยโสธร',
    name_en: 'Yasothon',
    region: 'northeast',
    lat: 15.7926,
    lng: 104.1451,
  },
  {
    id: 'amnat_charoen',
    name_th: 'อำนาจเจริญ',
    name_en: 'Amnat Charoen',
    region: 'northeast',
    lat: 15.8585,
    lng: 104.6258,
  },
  {
    id: 'nong_khai',
    name_th: 'หนองคาย',
    name_en: 'Nong Khai',
    region: 'northeast',
    lat: 17.8783,
    lng: 102.742,
  },
  {
    id: 'bueng_kan',
    name_th: 'บึงกาฬ',
    name_en: 'Bueng Kan',
    region: 'northeast',
    lat: 18.363,
    lng: 103.6528,
  },
  {
    id: 'nong_bua_lamphu',
    name_th: 'หนองบัวลำภู',
    name_en: 'Nong Bua Lamphu',
    region: 'northeast',
    lat: 17.2039,
    lng: 102.4407,
  },
  { id: 'loei', name_th: 'เลย', name_en: 'Loei', region: 'northeast', lat: 17.486, lng: 101.7223 },
  {
    id: 'sakon_nakhon',
    name_th: 'สกลนคร',
    name_en: 'Sakon Nakhon',
    region: 'northeast',
    lat: 17.1546,
    lng: 104.1486,
  },
  {
    id: 'nakhon_phanom',
    name_th: 'นครพนม',
    name_en: 'Nakhon Phanom',
    region: 'northeast',
    lat: 17.4069,
    lng: 104.7808,
  },

  // ภาคกลาง
  {
    id: 'phra_nakhon_si_ayutthaya',
    name_th: 'พระนครศรีอยุธยา',
    name_en: 'Phra Nakhon Si Ayutthaya',
    region: 'central',
    lat: 14.3532,
    lng: 100.5684,
  },
  {
    id: 'saraburi',
    name_th: 'สระบุรี',
    name_en: 'Saraburi',
    region: 'central',
    lat: 14.5289,
    lng: 100.9108,
  },
  {
    id: 'lopburi',
    name_th: 'ลพบุรี',
    name_en: 'Lopburi',
    region: 'central',
    lat: 14.7995,
    lng: 100.6534,
  },
  {
    id: 'sing_buri',
    name_th: 'สิงห์บุรี',
    name_en: 'Sing Buri',
    region: 'central',
    lat: 14.8879,
    lng: 100.4043,
  },
  {
    id: 'chai_nat',
    name_th: 'ชัยนาท',
    name_en: 'Chai Nat',
    region: 'central',
    lat: 15.1852,
    lng: 100.1251,
  },
  {
    id: 'ang_thong',
    name_th: 'อ่างทอง',
    name_en: 'Ang Thong',
    region: 'central',
    lat: 14.5896,
    lng: 100.455,
  },
  {
    id: 'suphan_buri',
    name_th: 'สุพรรณบุรี',
    name_en: 'Suphan Buri',
    region: 'central',
    lat: 14.4745,
    lng: 100.1177,
  },
  {
    id: 'nakhon_nayok',
    name_th: 'นครนายก',
    name_en: 'Nakhon Nayok',
    region: 'central',
    lat: 14.2069,
    lng: 101.2131,
  },
  {
    id: 'samut_songkhram',
    name_th: 'สมุทรสงคราม',
    name_en: 'Samut Songkhram',
    region: 'central',
    lat: 13.4098,
    lng: 99.9997,
  },
  {
    id: 'nakhon_sawan',
    name_th: 'นครสวรรค์',
    name_en: 'Nakhon Sawan',
    region: 'central',
    lat: 15.7047,
    lng: 100.1371,
  },
  {
    id: 'uthai_thani',
    name_th: 'อุทัยธานี',
    name_en: 'Uthai Thani',
    region: 'central',
    lat: 15.3835,
    lng: 100.0245,
  },
  {
    id: 'kamphaeng_phet',
    name_th: 'กำแพงเพชร',
    name_en: 'Kamphaeng Phet',
    region: 'central',
    lat: 16.4828,
    lng: 99.5227,
  },
  {
    id: 'phitsanulok',
    name_th: 'พิษณุโลก',
    name_en: 'Phitsanulok',
    region: 'central',
    lat: 16.8211,
    lng: 100.2659,
  },
  {
    id: 'phichit',
    name_th: 'พิจิตร',
    name_en: 'Phichit',
    region: 'central',
    lat: 16.4429,
    lng: 100.3496,
  },
  {
    id: 'phetchabun',
    name_th: 'เพชรบูรณ์',
    name_en: 'Phetchabun',
    region: 'central',
    lat: 16.419,
    lng: 101.1567,
  },
  {
    id: 'sukhothai',
    name_th: 'สุโขทัย',
    name_en: 'Sukhothai',
    region: 'central',
    lat: 17.0078,
    lng: 99.8234,
  },

  // ภาคตะวันออก
  {
    id: 'chonburi',
    name_th: 'ชลบุรี / พัทยา',
    name_en: 'Chonburi / Pattaya',
    region: 'east',
    lat: 13.3611,
    lng: 100.9847,
  },
  {
    id: 'rayong',
    name_th: 'ระยอง',
    name_en: 'Rayong',
    region: 'east',
    lat: 12.6815,
    lng: 101.2816,
  },
  {
    id: 'chanthaburi',
    name_th: 'จันทบุรี',
    name_en: 'Chanthaburi',
    region: 'east',
    lat: 12.6114,
    lng: 102.1039,
  },
  { id: 'trat', name_th: 'ตราด', name_en: 'Trat', region: 'east', lat: 12.2428, lng: 102.5175 },
  {
    id: 'chachoengsao',
    name_th: 'ฉะเชิงเทรา',
    name_en: 'Chachoengsao',
    region: 'east',
    lat: 13.6904,
    lng: 101.078,
  },
  {
    id: 'prachinburi',
    name_th: 'ปราจีนบุรี',
    name_en: 'Prachinburi',
    region: 'east',
    lat: 14.051,
    lng: 101.3734,
  },
  {
    id: 'sa_kaeo',
    name_th: 'สระแก้ว',
    name_en: 'Sa Kaeo',
    region: 'east',
    lat: 13.814,
    lng: 102.0718,
  },

  // ภาคตะวันตก
  {
    id: 'kanchanaburi',
    name_th: 'กาญจนบุรี',
    name_en: 'Kanchanaburi',
    region: 'west',
    lat: 14.0228,
    lng: 99.5328,
  },
  {
    id: 'ratchaburi',
    name_th: 'ราชบุรี',
    name_en: 'Ratchaburi',
    region: 'west',
    lat: 13.5283,
    lng: 99.8134,
  },
  {
    id: 'phetchaburi',
    name_th: 'เพชรบุรี',
    name_en: 'Phetchaburi',
    region: 'west',
    lat: 13.1111,
    lng: 99.9392,
  },
  {
    id: 'prachuap_khiri_khan',
    name_th: 'ประจวบคีรีขันธ์ / หัวหิน',
    name_en: 'Prachuap / Hua Hin',
    region: 'west',
    lat: 11.8124,
    lng: 99.7974,
  },
  { id: 'tak', name_th: 'ตาก', name_en: 'Tak', region: 'west', lat: 16.884, lng: 99.1259 },

  // ภาคใต้
  {
    id: 'phuket',
    name_th: 'ภูเก็ต',
    name_en: 'Phuket',
    region: 'south',
    lat: 7.8804,
    lng: 98.3923,
  },
  {
    id: 'songkhla',
    name_th: 'สงขลา / หาดใหญ่',
    name_en: 'Songkhla / Hat Yai',
    region: 'south',
    lat: 7.1898,
    lng: 100.5954,
  },
  {
    id: 'surat_thani',
    name_th: 'สุราษฎร์ธานี / สมุย',
    name_en: 'Surat Thani / Samui',
    region: 'south',
    lat: 9.1382,
    lng: 99.3215,
  },
  { id: 'krabi', name_th: 'กระบี่', name_en: 'Krabi', region: 'south', lat: 8.0863, lng: 98.9063 },
  {
    id: 'phang_nga',
    name_th: 'พังงา',
    name_en: 'Phang Nga',
    region: 'south',
    lat: 8.4501,
    lng: 98.5255,
  },
  {
    id: 'nakhon_si_thammarat',
    name_th: 'นครศรีธรรมราช',
    name_en: 'Nakhon Si Thammarat',
    region: 'south',
    lat: 8.4326,
    lng: 99.9631,
  },
  { id: 'trang', name_th: 'ตรัง', name_en: 'Trang', region: 'south', lat: 7.5563, lng: 99.6114 },
  {
    id: 'chumphon',
    name_th: 'ชุมพร',
    name_en: 'Chumphon',
    region: 'south',
    lat: 10.493,
    lng: 99.18,
  },
  { id: 'ranong', name_th: 'ระนอง', name_en: 'Ranong', region: 'south', lat: 9.9529, lng: 98.6348 },
  {
    id: 'phatthalung',
    name_th: 'พัทลุง',
    name_en: 'Phatthalung',
    region: 'south',
    lat: 7.6167,
    lng: 100.074,
  },
  { id: 'satun', name_th: 'สตูล', name_en: 'Satun', region: 'south', lat: 6.6238, lng: 100.0674 },
  {
    id: 'pattani',
    name_th: 'ปัตตานี',
    name_en: 'Pattani',
    region: 'south',
    lat: 6.8675,
    lng: 101.2501,
  },
  { id: 'yala', name_th: 'ยะลา', name_en: 'Yala', region: 'south', lat: 6.5411, lng: 101.2804 },
  {
    id: 'narathiwat',
    name_th: 'นราธิวาส',
    name_en: 'Narathiwat',
    region: 'south',
    lat: 6.4255,
    lng: 101.8253,
  },
];

/**
 * คำนวณระยะทางแบบ Haversine เพื่อหาจังหวัดที่ใกล้พิกัด GPS ที่สุด
 */
export function findClosestProvince(lat: number, lng: number): ProvinceInfo {
  let closest: ProvinceInfo = THAILAND_PROVINCES[0] as ProvinceInfo;
  let minDistance = Infinity;

  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km

  for (const prov of THAILAND_PROVINCES) {
    const dLat = toRad(prov.lat - lat);
    const dLng = toRad(prov.lng - lng);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat)) * Math.cos(toRad(prov.lat)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;

    if (dist < minDistance) {
      minDistance = dist;
      closest = prov;
    }
  }

  return closest;
}

/**
 * ค้นหาจังหวัดจากข้อความชื่อ (ไทยหรืออังกฤษ)
 */
export function findProvinceByName(query: string): ProvinceInfo | undefined {
  if (!query || !query.trim()) return undefined;
  const q = query.trim().toLowerCase();

  return THAILAND_PROVINCES.find(
    (p) =>
      p.id === q ||
      p.name_en.toLowerCase() === q ||
      p.name_en.toLowerCase().includes(q) ||
      p.name_th === q ||
      p.name_th.includes(q),
  );
}
