// เนื้อหาหน้าเอกสารกฎหมาย (/rules, /privacy, /terms) ทั้งไทยและอังกฤษ — อ้างอิงจาก docs/POLICY.md
import type { Locale } from './dictionaries';

export type LegalDocKey = 'rules' | 'privacy' | 'terms';

export interface LegalTable {
  headers: [string, string, string];
  rows: Array<[string, string, string]>;
}

export interface LegalSection {
  id: string;
  title: string;
  paragraphs?: string[];
  bullets?: string[];
  table?: LegalTable;
  callout?: {
    title: string;
    body: string;
  };
}

export interface LegalDocumentContent {
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  version: string;
  updatedAt: string;
  sections: LegalSection[];
}

export interface LegalDictionary {
  draftBadge: string;
  draftNotice: string;
  versionLabel: string;
  updatedLabel: string;
  backHome: string;
  contactLabel: string;
  contactEmail: string;
  nav: Record<LegalDocKey, string>;
  docs: Record<LegalDocKey, LegalDocumentContent>;
}

const th: LegalDictionary = {
  draftBadge: 'ร่าง (Draft)',
  draftNotice:
    'เอกสารฉบับนี้เป็นร่างเบื้องต้นตามแนวทางความปลอดภัยและ PDPA ของรู้กัน อยู่ระหว่างการตรวจทานโดยที่ปรึกษาทางกฎหมายก่อนเปิดให้บริการจริง',
  versionLabel: 'เวอร์ชัน',
  updatedLabel: 'อัปเดตล่าสุด',
  backHome: '← กลับหน้าแรก',
  contactLabel: 'ติดต่อเรื่องความปลอดภัยหรือข้อมูลส่วนบุคคล:',
  contactEmail: 'support@rukan.app',
  nav: {
    rules: 'กติกาชุมชน',
    privacy: 'นโยบายความเป็นส่วนตัว',
    terms: 'ข้อกำหนดการใช้งาน',
  },
  docs: {
    rules: {
      metaTitle: 'กติกาชุมชน — รู้กัน (rukan)',
      metaDescription:
        'กติกาการอยู่ร่วมกันในรู้กัน (rukan) เพื่อให้ทุกคนคุยและระบายได้อย่างปลอดภัย ไม่คุกคาม ไม่หลอกลวง และไม่เปิดเผยตัวตนผู้อื่น',
      eyebrow: 'Community Guidelines',
      title: 'กติกาชุมชน',
      subtitle:
        'ไม่ระบุตัวตนใน Space ไม่ได้แปลว่าทำอะไรก็ได้ — เราตั้งกติกาให้ชัดเจนเพื่อให้รู้กันเป็นพื้นที่ที่ปลอดภัยและใจดีต่อกัน',
      version: 'v1',
      updatedAt: '24 ตุลาคม 2026',
      sections: [
        {
          id: 'everywhere',
          title: '1. สิ่งที่ห้ามทำในทุกพื้นที่ (Space, โปรไฟล์, แชท)',
          bullets: [
            'ด่าทอ บูลลี่ คุกคาม ขู่ทำร้าย หรือยุยงให้ผู้อื่นกระทำ',
            'เหยียดเชื้อชาติ ศาสนา เพศ เพศวิถี ความพิการ หรือสถานะทางสังคม',
            'ส่งเนื้อหาทางเพศโจ่งแจ้ง ส่งรูปโป๊เปลือยโดยอีกฝ่ายไม่ยินยอม หรือชักชวน/เสนอบริการทางเพศ',
            'เนื้อหาเกี่ยวกับผู้เยาว์ในทางเพศทุกรูปแบบ (แบนถาวรทันทีและแจ้งเจ้าหน้าที่)',
            'หลอกลวง: ชวนลงทุน ขอยืมเงิน ขอให้โอนเงิน Romance Scam หรือส่งลิงก์ฟิชชิ่ง',
            'ปลอมตัวเป็นบุคคลอื่น หรือนำรูปของคนอื่นมาใช้เป็นรูปโปรไฟล์ตัวเอง',
            'ขายของ โฆษณา หาสมาชิก MLM หรือดึงคนออกไปแอปอื่นเพื่อการค้า',
            'เกี่ยวข้องกับยาเสพติด อาวุธ การพนัน หรือสิ่งผิดกฎหมายทุกชนิด',
          ],
        },
        {
          id: 'space',
          title: '2. กฎเฉพาะของ Space (โพสต์และตอบกลับแบบไม่ระบุตัวตน)',
          paragraphs: [
            'ใน Space ผู้ใช้อื่นเห็นเฉพาะนามแฝงของคุณ ระบบไม่ส่งตัวตนจริงออกไปให้ผู้ใช้อื่นเห็น แต่เพื่อปกป้องทุกคนจากปัญหาการคุกคามและหมิ่นประมาท:',
          ],
          bullets: [
            'ห้ามระบุตัวคนจริง (No Doxxing): ห้ามใส่ชื่อ-นามสกุล ชื่อเล่นคู่กับคณะ/บริษัทที่ทำให้รู้ว่าเป็นใคร รูปภาพ ข้อมูลติดต่อ หรือที่อยู่ของผู้อื่น',
            'ห้ามโพสต์ข้อมูลติดต่อของตัวเองใน Space เช่น เบอร์โทรศัพท์ LINE ID หรือบัญชีโซเชียลมีเดีย เพื่อป้องกันมิจฉาชีพและการแอบอ้าง',
            'ห้ามใช้ Space เพื่อแฉ ประจาน หรือกล่าวหาบุคคล/องค์กรที่ระบุตัวได้',
            'ระบายความเหนื่อย เล่าเรื่องตัวเอง หรือขอกำลังใจได้เต็มที่ ตราบใดที่ไม่ทำร้ายใคร',
          ],
        },
        {
          id: 'match-chat',
          title: '3. การ Match และการคุยในแชท',
          bullets: [
            'เคารพการตัดสินใจของอีกฝ่าย — "ไม่" คือ "ไม่" ห้ามตื๊อหรือสร้างบัญชีใหม่มาทักซ้ำหลังถูกปฏิเสธหรือถูกบล็อก',
            'ห้ามกดดันให้อีกฝ่ายเปิดรูปหรือเปิดเผยข้อมูลส่วนตัวก่อนที่เขาจะพร้อม',
            'ห้ามแคปหน้าจอแชทหรือรูปโปรไฟล์ของคู่สนทนาไปเผยแพร่หรือประจานข้างนอก',
          ],
        },
        {
          id: 'care',
          title: '4. เรื่องที่เราอยากช่วย ไม่ใช่ลงโทษ',
          paragraphs: [
            'ความรู้สึกล้า เหงา หรือเศร้า เป็นเรื่องธรรมดาที่เล่าในรู้กันได้ แต่หากโพสต์หรือข้อความมีสัญญาณของการทำร้ายตัวเอง ระบบและทีมดูแลจะแสดงช่องทางช่วยเหลือแทนการลงโทษ',
          ],
          callout: {
            title: 'ต้องการคนรับฟังตอนนี้?',
            body: 'สายด่วนสุขภาพจิต โทร 1323 (ฟรี ตลอด 24 ชั่วโมง) หรือสมาคมสะมาริตันส์แห่งประเทศไทย โทร 02-113-6789',
          },
        },
        {
          id: 'enforcement',
          title: '5. การบังคับใช้กติกาและการรายงาน',
          paragraphs: [
            'คุณกดรายงานหรือบล็อกได้ทันทีในทุกโพสต์ ทุกโปรไฟล์ และทุกแชท โดยอีกฝ่ายจะไม่ทราบว่าใครเป็นผู้รายงานหรือถูกบล็อก เมื่อตรวจพบการทำผิดกติกา เราดำเนินการตามระดับความรุนแรงดังนี้:',
          ],
          table: {
            headers: ['ระดับ', 'ตัวอย่างพฤติกรรม', 'การดำเนินการ'],
            rows: [
              ['ระดับ 1 · เล็กน้อย', 'ใช้คำหยาบคาย หรือสแปมเล็กน้อย', 'ซ่อนเนื้อหา + แจ้งเตือน'],
              [
                'ระดับ 2 · ซ้ำ / ปานกลาง',
                'ทำผิดซ้ำ คุกคาม หรือระบุตัวคนจริงใน Space',
                'ระงับการใช้งานชั่วคราว 3–30 วัน',
              ],
              [
                'ระดับ 3 · ร้ายแรง',
                'หลอกโอนเงิน ปลอมตัว ส่งรูปไม่เหมาะสมโดยไม่ยินยอม ขู่ทำร้าย',
                'แบนถาวร (ไม่สามารถใช้เบอร์เดิมสมัครใหม่ได้)',
              ],
              [
                'ระดับ 4 · ผิดกฎหมายร้ายแรง',
                'เนื้อหาเกี่ยวกับผู้เยาว์ การค้ามนุษย์ หรือความผิดอาญาร้ายแรง',
                'แบนถาวร + เก็บหลักฐาน + แจ้งเจ้าหน้าที่ตามกฎหมาย',
              ],
            ],
          },
          bullets: [
            'ทุกการลงโทษจะแจ้งเหตุผลชัดเจน และคุณสามารถยื่นอุทธรณ์ได้ภายใน 14 วัน โดยจะมีผู้ดูแลคนอื่นเป็นผู้ตรวจทานซ้ำ',
          ],
        },
      ],
    },
    privacy: {
      metaTitle: 'นโยบายความเป็นส่วนตัว (PDPA) — รู้กัน (rukan)',
      metaDescription:
        'รายละเอียดการเก็บ ใช้ และคุ้มครองข้อมูลส่วนบุคคลของรู้กัน (rukan) ตาม พ.ร.บ. คุ้มครองข้อมูลส่วนบุคคล (PDPA)',
      eyebrow: 'Privacy Policy · PDPA',
      title: 'นโยบายความเป็นส่วนตัว',
      subtitle:
        'เราเก็บข้อมูลเท่าที่จำเป็นต่อการยืนยันว่าเป็นคนจริงและการทำงานของแอป ไม่ขายข้อมูลให้บุคคลที่สาม และออกแบบฐานข้อมูลให้ตัวตนของคุณแยกออกจากโพสต์ใน Space',
      version: 'v1',
      updatedAt: '24 ตุลาคม 2026',
      sections: [
        {
          id: 'collected-data',
          title: '1. ข้อมูลที่เราจัดเก็บและฐานทางกฎหมาย (PDPA)',
          table: {
            headers: ['ประเภทข้อมูล', 'ฐานทางกฎหมาย', 'วัตถุประสงค์และหมายเหตุ'],
            rows: [
              [
                'บัญชีผู้ใช้ เบอร์โทรศัพท์ วันเกิด',
                'การปฏิบัติตามสัญญา',
                'สร้างบัญชี ป้องกันบัญชีซ้ำ/สแปม และตรวจอายุ 18+ (แสดงเฉพาะอายุ ไม่แสดงวันเกิด)',
              ],
              [
                'ชื่อเล่น โปรไฟล์ รูปภาพ คำตอบการ์ด',
                'การปฏิบัติตามสัญญา',
                'แสดงให้คู่สนทนาตามระดับการเปิดรูปที่คุณคุยกัน',
              ],
              [
                'ข้อมูลใบหน้า (Selfie Liveness)',
                'ความยินยอมโดยชัดแจ้ง (มาตรา 26)',
                'ตรวจว่าเป็นบุคคลจริงขณะสมัคร ลบวิดีโอภายใน 30 วัน เก็บเฉพาะผลการตรวจ',
              ],
              [
                'ย่านที่เลือก / ระยะทางคร่าวๆ',
                'การปฏิบัติตามสัญญา / ความยินยอม',
                'คัดกรองโพสต์ใกล้เคียงและ Daily Drop โดยไม่เก็บพิกัดละเอียดและไม่มีแผนที่ระบุจุด',
              ],
              [
                'โพสต์ใน Space ข้อความแชท',
                'การปฏิบัติตามสัญญา',
                'ให้บริการฟีเจอร์หลักของแอป (ผู้ใช้อื่นไม่เห็น user_id ของผู้โพสต์ใน Space)',
              ],
              [
                'รายงานการทำผิดกติกา ข้อมูลความปลอดภัย',
                'ประโยชน์โดยชอบด้วยกฎหมาย / กฎหมาย',
                'ดูแลความปลอดภัยของชุมชน ป้องกันมิจฉาชีพ และปฏิบัติตามกฎหมาย',
              ],
            ],
          },
        },
        {
          id: 'biometric',
          title: '2. ข้อมูลชีวภาพและการประมวลผลใบหน้า (Selfie Liveness)',
          bullets: [
            'เราขอความยินยอมแยกต่างหากก่อนเริ่มขั้นตอนยืนยันใบหน้า (Selfie Liveness) เพื่อป้องกันบัญชีปลอมและการแอบอ้าง',
            'ข้อมูลวิดีโอ/ภาพใบหน้าใช้เพื่อตรวจสอบความเป็นบุคคลจริงเท่านั้น และอาจถูกส่งไปประมวลผลผ่านผู้ให้บริการคลาวด์ที่ได้มาตรฐานความปลอดภัยในต่างประเทศ (เช่น ภูมิภาคเอเชียแปซิฟิก/โตเกียว)',
            'ไฟล์วิดีโอจากการยืนยันตัวตนจะถูกลบออกภายในไม่เกิน 30 วัน โดยระบบจะคงไว้เฉพาะสถานะว่าผ่านการยืนยันเมื่อใด',
          ],
        },
        {
          id: 'visibility',
          title: '3. ใครเห็นข้อมูลอะไรบ้าง',
          bullets: [
            'ตัวตนของผู้โพสต์ใน Space: ผู้ใช้อื่นไม่มีวันเห็น (เห็นเฉพาะนามแฝง) ทีมดูแลสามารถตรวจสอบได้เฉพาะเมื่อมีการรายงานการทำผิดกติการ้ายแรงหรือมีคำสั่งตามกฎหมาย โดยทุกการเปิดดูจะถูกบันทึก log ไว้ทั้งหมด',
            'เบอร์โทรศัพท์ อีเมล และวันเกิด: ไม่แสดงให้ผู้ใช้อื่นเห็นทุกกรณี',
            'รูปโปรไฟล์: เก็บในระบบจัดเก็บแบบส่วนตัว (Private Storage) และเปิดให้คู่สนทนาดูทีละขั้นตามจำนวนข้อความที่ต่างคนต่างส่ง หรือเมื่อคุณทั้งคู่กดเปิดรูป',
            'ป้ายมหาวิทยาลัย/ที่ทำงาน (ไม่บังคับ): หากคุณยืนยันอีเมลองค์กร ระบบจะแสดงเฉพาะชื่อองค์กรหรือโดเมน ไม่แสดงและไม่เก็บอีเมลเต็มของคุณให้คนอื่นเห็น',
          ],
        },
        {
          id: 'retention',
          title: '4. ระยะเวลาการเก็บรักษาข้อมูล',
          table: {
            headers: ['ข้อมูล', 'ระยะเวลาที่เก็บ', 'เมื่อครบกำหนด'],
            rows: [
              ['วิดีโอ Selfie Liveness', 'ไม่เกิน 30 วัน', 'ลบออกจากระบบจัดเก็บอัตโนมัติ'],
              [
                'โพสต์ใน Space ที่คุณกดลบ',
                'ซ่อนทันที เก็บสำรองไม่เกิน 30 วัน',
                'ลบถาวรจากฐานข้อมูล',
              ],
              [
                'แชทของ Match ที่หมดอายุหรือจบแล้ว',
                '90 วัน (เผื่อการตรวจสอบรายงานย้อนหลัง)',
                'ลบถาวรจากฐานข้อมูล',
              ],
              [
                'อีเมลในรายการรอใช้งาน (Waitlist)',
                'จนกว่าจะเปิดตัวหรือคุณกดยกเลิก',
                'ลบเมื่อถอนความยินยอม',
              ],
            ],
          },
        },
        {
          id: 'rights',
          title: '5. สิทธิ์ของเจ้าของข้อมูลส่วนบุคคล',
          bullets: [
            'คุณมีสิทธิ์เข้าถึง ขอสำเนา แก้ไขข้อมูลให้ถูกต้อง ถอนความยินยอม และสั่งลบบัญชีของตนเองได้จากเมนูตั้งค่าภายในแอป',
            'เมื่อสั่งลบบัญชี โปรไฟล์และรูปภาพของคุณจะถูกนำออกทันที และข้อมูลที่เกี่ยวข้องจะถูกลบภายใน 30 วัน ยกเว้นข้อมูลที่กฎหมายกำหนดให้ต้องเก็บรักษาหรือหลักฐานการกระทำผิดร้ายแรง',
          ],
        },
      ],
    },
    terms: {
      metaTitle: 'ข้อกำหนดการใช้งาน — รู้กัน (rukan)',
      metaDescription: 'ข้อกำหนดและเงื่อนไขการใช้บริการแอปพลิเคชันและเว็บไซต์ รู้กัน (rukan)',
      eyebrow: 'Terms of Use',
      title: 'ข้อกำหนดการใช้งาน',
      subtitle:
        'ข้อตกลงระหว่างคุณกับรู้กัน (rukan) เพื่อให้การใช้บริการเป็นไปอย่างโปร่งใส ปลอดภัย และเคารพซึ่งกันและกัน',
      version: 'v1',
      updatedAt: '24 ตุลาคม 2026',
      sections: [
        {
          id: 'eligibility',
          title: '1. คุณสมบัติของผู้ใช้งาน',
          bullets: [
            'คุณต้องมีอายุครบ 18 ปีบริบูรณ์ขึ้นไป ณ วันที่สมัครใช้งาน (ทั้งโหมดเพื่อนและโหมดเดท)',
            '1 คน สามารถมีได้ 1 บัญชีเท่านั้น โดยต้องผูกกับเบอร์โทรศัพท์และผ่านการยืนยันตัวตน (Selfie Liveness) ของตนเอง',
            'ผู้ที่เคยถูกระงับบัญชีถาวรจากพฤติกรรมร้ายแรง ไม่สามารถสมัครบัญชีใหม่เพื่อเข้าใช้งานได้',
          ],
        },
        {
          id: 'account-rules',
          title: '2. การใช้งานบัญชีและขอบเขตบริการ',
          bullets: [
            'รู้กันออกแบบมาเพื่อการหาเพื่อนคุย เพื่อนทำกิจกรรม หรือคนพิเศษ ห้ามใช้เพื่อการค้า การตลาด การหาสมาชิก MLM หรือการชักชวนลงทุนทุกชนิด',
            'คุณต้องปฏิบัติตาม "กติกาชุมชน" อย่างเคร่งครัด การละเมิดกติกาอาจส่งผลให้เนื้อหาถูกซ่อน บัญชีถูกระงับชั่วคราว หรือถูกยกเลิกบัญชีถาวร',
            'คุณเป็นเจ้าของเนื้อหาที่คุณโพสต์หรือส่งในแอป แต่คุณอนุญาตให้รู้กันประมวลผลและแสดงผลเนื้อหานั้นภายในขอบเขตการให้บริการของแอป',
          ],
        },
        {
          id: 'safety-disclaimer',
          title: '3. ความปลอดภัยในการพูดคุยและนัดพบ',
          bullets: [
            'แม้เราจะบังคับยืนยันเบอร์โทรศัพท์และใบหน้าว่าเป็นคนจริง แต่เราไม่สามารถรับรองพฤติกรรมส่วนบุคคลของผู้ใช้ทุกคนนอกแอปได้',
            'ห้ามโอนเงินหรือทำธุรกรรมทางการเงินกับบุคคลที่รู้จักผ่านแอปทุกกรณี',
            'เมื่อนัดพบกันจริง ควรเลือกสถานที่สาธารณะที่มีคนพลุกพล่าน และแจ้งรายละเอียดการนัดหมายให้เพื่อนหรือคนที่ไว้ใจทราบเสมอ',
          ],
        },
        {
          id: 'termination',
          title: '4. การยกเลิกบัญชีและการเปลี่ยนแปลงข้อกำหนด',
          bullets: [
            'คุณสามารถลบบัญชีและยุติการใช้งานได้ทุกเมื่อผ่านหน้าตั้งค่าในแอป',
            'รู้กันขอสงวนสิทธิ์ในการระงับหรือยกเลิกบัญชีที่ละเมิดข้อกำหนดการใช้งานหรือกติกาชุมชนโดยไม่ต้องแจ้งล่วงหน้าในกรณีร้ายแรง',
            'หากมีการปรับปรุงข้อกำหนดการใช้งานหรือนโยบายความเป็นส่วนตัวในสาระสำคัญ ระบบจะแจ้งเตือนและขอให้คุณกดยอมรับเวอร์ชันใหม่ก่อนใช้งานต่อ',
          ],
        },
      ],
    },
  },
};

const en: LegalDictionary = {
  draftBadge: 'Draft',
  draftNotice:
    'This document is an initial draft based on rukan’s safety architecture and Thailand PDPA principles. It is undergoing legal review prior to public launch.',
  versionLabel: 'Version',
  updatedLabel: 'Last updated',
  backHome: '← Back to home',
  contactLabel: 'Questions about safety or personal data:',
  contactEmail: 'support@rukan.app',
  nav: {
    rules: 'Community Rules',
    privacy: 'Privacy Policy',
    terms: 'Terms of Use',
  },
  docs: {
    rules: {
      metaTitle: 'Community Rules — rukan',
      metaDescription:
        'Community guidelines for rukan so everyone can vent, chat, and meet safely without harassment, scams, or doxxing.',
      eyebrow: 'Community Guidelines',
      title: 'Community Rules',
      subtitle:
        'Anonymous in Space does not mean anything goes — these clear rules keep rukan safe, honest, and kind for everyone.',
      version: 'v1',
      updatedAt: 'October 24, 2026',
      sections: [
        {
          id: 'everywhere',
          title: '1. Prohibited Everywhere (Space, Profiles, Chats)',
          bullets: [
            'Insults, bullying, harassment, threats of violence, or encouraging others to harm someone.',
            'Hate speech or discrimination based on race, religion, gender, sexual orientation, disability, or background.',
            'Explicit sexual content, unsolicited nude photos, or soliciting/offering sexual services.',
            'Any sexual content involving minors (immediate permanent ban and report to authorities).',
            'Scams and fraud: investment pitches, asking for money/transfers, romance scams, or phishing links.',
            'Impersonating others or using someone else’s photos on your profile.',
            'Commercial sales, advertising, MLM recruiting, or funneling users off-platform for commercial gain.',
            'Illegal drugs, weapons, gambling, or any unlawful activity.',
          ],
        },
        {
          id: 'space',
          title: '2. Rules Specific to Space (Anonymous Feed)',
          paragraphs: [
            'In Space, other users only see your alias — our database never sends your user ID to other clients. To protect everyone from defamation and doxxing:',
          ],
          bullets: [
            'No doxxing or naming real people: never post full names, nicknames combined with a faculty/company that identifies someone, photos, contact details, or addresses.',
            'Do not post your own personal contact info in Space (phone number, LINE ID, IG) to protect yourself from scammers and spam.',
            'No public shaming, call-outs, or accusations against identifiable individuals or organizations.',
            'Venting, sharing your day, or asking for encouragement is always welcome as long as it doesn’t hurt anyone.',
          ],
        },
        {
          id: 'match-chat',
          title: '3. Matches and 1:1 Chats',
          bullets: [
            'Respect boundaries — “no” means “no.” Do not pester or create new accounts to contact someone who declined or blocked you.',
            'Never pressure someone to unlock photos or share personal details before they are ready.',
            'Do not screenshot or share private chats or profile photos to shame or expose others.',
          ],
        },
        {
          id: 'care',
          title: '4. Support Over Punishment',
          paragraphs: [
            'Feeling lonely, exhausted, or sad is normal here. However, if a post shows signs of self-harm, our system and moderation team will surface support resources rather than punish you.',
          ],
          callout: {
            title: 'Need someone to listen right now?',
            body: 'Thailand Department of Mental Health Hotline: call 1323 (free, 24/7) or Samaritans of Thailand: 02-113-6789.',
          },
        },
        {
          id: 'enforcement',
          title: '5. Enforcement and Reporting',
          paragraphs: [
            'You can report or block any post, profile, or message immediately. The other person is never notified that you blocked or reported them. Violations are handled by severity:',
          ],
          table: {
            headers: ['Level', 'Examples', 'Action'],
            rows: [
              ['Level 1 · Minor', 'Mild profanity or minor spam', 'Hide content + warning'],
              [
                'Level 2 · Repeat / Moderate',
                'Repeated violations, harassment, or naming real people in Space',
                'Temporary suspension (3–30 days)',
              ],
              [
                'Level 3 · Severe',
                'Financial scams, impersonation, non-consensual explicit images, threats',
                'Permanent ban (phone number & verification locked)',
              ],
              [
                'Level 4 · Severe Illegal',
                'Child sexual exploitation, human trafficking, or severe crimes',
                'Permanent ban + preserve evidence + report to law enforcement',
              ],
            ],
          },
          bullets: [
            'Every moderation action states the specific rule broken, and you may appeal within 14 days for review by a different moderator.',
          ],
        },
      ],
    },
    privacy: {
      metaTitle: 'Privacy Policy (PDPA) — rukan',
      metaDescription:
        'How rukan collects, uses, and protects your personal data under Thailand’s Personal Data Protection Act (PDPA).',
      eyebrow: 'Privacy Policy · PDPA',
      title: 'Privacy Policy',
      subtitle:
        'We collect only what is needed to verify real people and run the app, never sell your data, and isolate your identity from anonymous Space posts at the database level.',
      version: 'v1',
      updatedAt: 'October 24, 2026',
      sections: [
        {
          id: 'collected-data',
          title: '1. Data We Collect and Legal Basis (PDPA)',
          table: {
            headers: ['Data Category', 'Legal Basis', 'Purpose & Notes'],
            rows: [
              [
                'Account, phone number, birthdate',
                'Contractual necessity',
                'Create your account, prevent duplicate/bot accounts, and verify 18+ age (only your age is shown, never your birthdate).',
              ],
              [
                'Nickname, profile details, photos, prompts',
                'Contractual necessity',
                'Shown to matches according to the photo reveal stage you reach together.',
              ],
              [
                'Face data (Selfie Liveness)',
                'Explicit consent (PDPA Sec. 26)',
                'Verify you are a real person during onboarding. Video is deleted within 30 days; only pass/fail status is kept.',
              ],
              [
                'Selected area / rough distance',
                'Contract / Consent',
                'Filter nearby Space posts and Daily Drops without storing exact GPS coordinates or showing maps.',
              ],
              [
                'Space posts and chat messages',
                'Contractual necessity',
                'Deliver core app features (other users never receive the author’s user_id in Space).',
              ],
              [
                'Abuse reports & security logs',
                'Legitimate interest / Legal obligation',
                'Keep the community safe, prevent fraud, and comply with applicable laws.',
              ],
            ],
          },
        },
        {
          id: 'biometric',
          title: '2. Biometric Data & Selfie Liveness Processing',
          bullets: [
            'We ask for explicit, separate consent before starting Selfie Liveness verification to keep fake accounts out.',
            'Face video/frames are used strictly to verify liveness and may be processed via secure cloud infrastructure outside Thailand (such as the Asia-Pacific / Tokyo region).',
            'Liveness video recordings are permanently deleted within 30 days. We retain only the verification result and timestamp.',
          ],
        },
        {
          id: 'visibility',
          title: '3. Who Can See What',
          bullets: [
            'Space post authors: Other users never see your real identity (only your alias). Moderators can reveal an author’s identity only when investigating a serious rule violation report or complying with a legal order, and every reveal is permanently audit-logged.',
            'Phone number, email, and birthdate: Never shown to other users.',
            'Profile photos: Stored in a private bucket and served via short-lived signed URLs only according to your conversation’s reveal stage.',
            'University / workplace badge (optional): Only the organization name or domain is stored and displayed — never your full work/student email address.',
          ],
        },
        {
          id: 'retention',
          title: '4. Data Retention Schedule',
          table: {
            headers: ['Data', 'Retention Period', 'Afterward'],
            rows: [
              ['Selfie Liveness video', 'Up to 30 days', 'Automatically deleted from storage'],
              [
                'Deleted Space posts',
                'Hidden immediately; kept up to 30 days',
                'Permanently purged',
              ],
              [
                'Chats from expired/closed matches',
                '90 days (for safety/report review)',
                'Permanently purged',
              ],
              ['Waitlist email entries', 'Until launch or unsubscribe', 'Deleted upon withdrawal'],
            ],
          },
        },
        {
          id: 'rights',
          title: '5. Your Rights Under PDPA',
          bullets: [
            'You can access, export, update, withdraw consent, or delete your account directly from the in-app Settings menu.',
            'When you delete your account, your profile and photos are removed immediately and associated data is purged within 30 days, except where retention is required by law or for severe abuse investigations.',
          ],
        },
      ],
    },
    terms: {
      metaTitle: 'Terms of Use — rukan',
      metaDescription: 'Terms and conditions for using the rukan mobile application and website.',
      eyebrow: 'Terms of Use',
      title: 'Terms of Use',
      subtitle:
        'The agreement between you and rukan to keep our community transparent, safe, and respectful.',
      version: 'v1',
      updatedAt: 'October 24, 2026',
      sections: [
        {
          id: 'eligibility',
          title: '1. Eligibility',
          bullets: [
            'You must be at least 18 years old to use rukan (in both Friends and Dating modes).',
            'Each person may maintain only one account, verified with their own phone number and Selfie Liveness check.',
            'Anyone previously banned for severe violations is not permitted to create a new account.',
          ],
        },
        {
          id: 'account-rules',
          title: '2. Acceptable Use',
          bullets: [
            'rukan is for personal social connection — finding friends, activity partners, or dates. Commercial use, advertising, MLM recruitment, and investment solicitation are strictly prohibited.',
            'You agree to follow our Community Rules at all times. Violations may result in content removal, temporary suspension, or permanent account termination.',
            'You retain ownership of the content you post, and grant rukan a limited license to host, moderate, and display that content within the service.',
          ],
        },
        {
          id: 'safety-disclaimer',
          title: '3. Offline Meetings and Safety Disclaimer',
          bullets: [
            'While we require phone and selfie liveness verification for all active users, rukan cannot guarantee the offline conduct of any individual.',
            'Never transfer money or enter financial transactions with anyone you meet on the platform.',
            'When meeting in person, always choose a busy public venue and share your meeting details with a trusted friend.',
          ],
        },
        {
          id: 'termination',
          title: '4. Account Deletion and Updates to Terms',
          bullets: [
            'You may delete your account at any time from the in-app Settings screen.',
            'We reserve the right to suspend or terminate accounts that violate these Terms or our Community Rules.',
            'If we make material updates to these Terms, Privacy Policy, or Community Rules, we will notify you and ask you to accept the updated version before continuing to use the app.',
          ],
        },
      ],
    },
  },
};

export const legalDictionaries: Record<Locale, LegalDictionary> = { th, en };
