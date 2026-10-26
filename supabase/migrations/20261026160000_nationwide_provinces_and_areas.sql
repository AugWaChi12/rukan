-- ============================================================================
-- Migration: 20261026160000_nationwide_provinces_and_areas.sql
-- Description: ขยายพื้นที่ให้บริการครอบคลุม 77 จังหวัดทั่วไทย (Nationwide Location)
-- ไม่จำกัดเฉพาะแค่กรุงเทพฯ รองรับการกรอง Nearby และจับคู่ทั่วประเทศ
-- ============================================================================

insert into public.areas (id, name_th, name_en, city, sort, active) values
  -- กรุงเทพฯ และปริมณฑล
  ('bangkok', 'กรุงเทพมหานคร', 'Bangkok', 'bangkok', 100, true),
  ('nonthaburi', 'นนทบุรี', 'Nonthaburi', 'bangkok', 101, true),
  ('pathum_thani', 'ปทุมธานี', 'Pathum Thani', 'bangkok', 102, true),
  ('samut_prakan', 'สมุทรปราการ', 'Samut Prakan', 'bangkok', 103, true),
  ('samut_sakhon', 'สมุทรสาคร', 'Samut Sakhon', 'bangkok', 104, true),
  ('nakhon_pathom', 'นครปฐม', 'Nakhon Pathom', 'bangkok', 105, true),

  -- ภาคเหนือ
  ('chiang_mai', 'เชียงใหม่', 'Chiang Mai', 'north', 200, true),
  ('chiang_rai', 'เชียงราย', 'Chiang Rai', 'north', 201, true),
  ('lampang', 'ลำปาง', 'Lampang', 'north', 202, true),
  ('lamphun', 'ลำพูน', 'Lamphun', 'north', 203, true),
  ('mae_hong_son', 'แม่ฮ่องสอน', 'Mae Hong Son', 'north', 204, true),
  ('nan', 'น่าน', 'Nan', 'north', 205, true),
  ('phayao', 'พะเยา', 'Phayao', 'north', 206, true),
  ('phrae', 'แพร่', 'Phrae', 'north', 207, true),
  ('uttaradit', 'อุตรดิตถ์', 'Uttaradit', 'north', 208, true),

  -- ภาคตะวันออกเฉียงเหนือ (อีสาน)
  ('khon_kaen', 'ขอนแก่น', 'Khon Kaen', 'northeast', 300, true),
  ('nakhon_ratchasima', 'นครราชสีมา (โคราช)', 'Nakhon Ratchasima (Korat)', 'northeast', 301, true),
  ('udon_thani', 'อุดรธานี', 'Udon Thani', 'northeast', 302, true),
  ('ubon_ratchathani', 'อุบลราชธานี', 'Ubon Ratchathani', 'northeast', 303, true),
  ('buriram', 'บุรีรัมย์', 'Buriram', 'northeast', 304, true),
  ('surin', 'สุรินทร์', 'Surin', 'northeast', 305, true),
  ('sisaket', 'ศรีสะเกษ', 'Sisaket', 'northeast', 306, true),
  ('roi_et', 'ร้อยเอ็ด', 'Roi Et', 'northeast', 307, true),
  ('kalasin', 'กาฬสินธุ์', 'Kalasin', 'northeast', 308, true),
  ('maha_sarakham', 'มหาสารคาม', 'Maha Sarakham', 'northeast', 309, true),
  ('chaiyaphum', 'ชัยภูมิ', 'Chaiyaphum', 'northeast', 310, true),
  ('mukdahan', 'มุกดาหาร', 'Mukdahan', 'northeast', 311, true),
  ('yasothon', 'ยโสธร', 'Yasothon', 'northeast', 312, true),
  ('amnat_charoen', 'อำนาจเจริญ', 'Amnat Charoen', 'northeast', 313, true),
  ('nong_khai', 'หนองคาย', 'Nong Khai', 'northeast', 314, true),
  ('bueng_kan', 'บึงกาฬ', 'Bueng Kan', 'northeast', 315, true),
  ('nong_bua_lamphu', 'หนองบัวลำภู', 'Nong Bua Lamphu', 'northeast', 316, true),
  ('loei', 'เลย', 'Loei', 'northeast', 317, true),
  ('sakon_nakhon', 'สกลนคร', 'Sakon Nakhon', 'northeast', 318, true),
  ('nakhon_phanom', 'นครพนม', 'Nakhon Phanom', 'northeast', 319, true),

  -- ภาคกลาง
  ('phra_nakhon_si_ayutthaya', 'พระนครศรีอยุธยา', 'Ayutthaya', 'central', 400, true),
  ('saraburi', 'สระบุรี', 'Saraburi', 'central', 401, true),
  ('lopburi', 'ลพบุรี', 'Lopburi', 'central', 402, true),
  ('sing_buri', 'สิงห์บุรี', 'Sing Buri', 'central', 403, true),
  ('chai_nat', 'ชัยนาท', 'Chai Nat', 'central', 404, true),
  ('ang_thong', 'อ่างทอง', 'Ang Thong', 'central', 405, true),
  ('suphan_buri', 'สุพรรณบุรี', 'Suphan Buri', 'central', 406, true),
  ('nakhon_nayok', 'นครนายก', 'Nakhon Nayok', 'central', 407, true),
  ('samut_songkhram', 'สมุทรสงคราม', 'Samut Songkhram', 'central', 408, true),
  ('nakhon_sawan', 'นครสวรรค์', 'Nakhon Sawan', 'central', 409, true),
  ('uthai_thani', 'อุทัยธานี', 'Uthai Thani', 'central', 410, true),
  ('kamphaeng_phet', 'กำแพงเพชร', 'Kamphaeng Phet', 'central', 411, true),
  ('phitsanulok', 'พิษณุโลก', 'Phitsanulok', 'central', 412, true),
  ('phichit', 'พิจิตร', 'Phichit', 'central', 413, true),
  ('phetchabun', 'เพชรบูรณ์', 'Phetchabun', 'central', 414, true),
  ('sukhothai', 'สุโขทัย', 'Sukhothai', 'central', 415, true),

  -- ภาคตะวันออก
  ('chonburi', 'ชลบุรี / พัทยา', 'Chonburi / Pattaya', 'east', 500, true),
  ('rayong', 'ระยอง', 'Rayong', 'east', 501, true),
  ('chanthaburi', 'จันทบุรี', 'Chanthaburi', 'east', 502, true),
  ('trat', 'ตราด', 'Trat', 'east', 503, true),
  ('chachoengsao', 'ฉะเชิงเทรา', 'Chachoengsao', 'east', 504, true),
  ('prachinburi', 'ปราจีนบุรี', 'Prachinburi', 'east', 505, true),
  ('sa_kaeo', 'สระแก้ว', 'Sa Kaeo', 'east', 506, true),

  -- ภาคตะวันตก
  ('kanchanaburi', 'กาญจนบุรี', 'Kanchanaburi', 'west', 600, true),
  ('ratchaburi', 'ราชบุรี', 'Ratchaburi', 'west', 601, true),
  ('phetchaburi', 'เพชรบุรี', 'Phetchaburi', 'west', 602, true),
  ('prachuap_khiri_khan', 'ประจวบคีรีขันธ์ / หัวหิน', 'Prachuap / Hua Hin', 'west', 603, true),
  ('tak', 'ตาก', 'Tak', 'west', 604, true),

  -- ภาคใต้
  ('phuket', 'ภูเก็ต', 'Phuket', 'south', 700, true),
  ('songkhla', 'สงขลา / หาดใหญ่', 'Songkhla / Hat Yai', 'south', 701, true),
  ('surat_thani', 'สุราษฎร์ธานี / เกาะสมุย', 'Surat Thani / Samui', 'south', 702, true),
  ('krabi', 'กระบี่', 'Krabi', 'south', 703, true),
  ('phang_nga', 'พังงา', 'Phang Nga', 'south', 704, true),
  ('nakhon_si_thammarat', 'นครศรีธรรมราช', 'Nakhon Si Thammarat', 'south', 705, true),
  ('trang', 'ตรัง', 'Trang', 'south', 706, true),
  ('chumphon', 'ชุมพร', 'Chumphon', 'south', 707, true),
  ('ranong', 'ระนอง', 'Ranong', 'south', 708, true),
  ('phatthalung', 'พัทลุง', 'Phatthalung', 'south', 709, true),
  ('satun', 'สตูล', 'Satun', 'south', 710, true),
  ('pattani', 'ปัตตานี', 'Pattani', 'south', 711, true),
  ('yala', 'ยะลา', 'Yala', 'south', 712, true),
  ('narathiwat', 'นราธิวาส', 'Narathiwat', 'south', 713, true)
on conflict (id) do update set
  name_th = excluded.name_th,
  name_en = excluded.name_en,
  city = excluded.city,
  sort = excluded.sort,
  active = true;
