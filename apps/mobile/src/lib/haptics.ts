import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

/**
 * รวม haptic feedback เพื่อความรู้สึกมีมิติและสัมผัสที่เป็นธรรมชาติ
 * ปลอดภัยบนทุกแพลตฟอร์ม (web ไม่ crash, อุปกรณ์ที่ไม่รองรับ catch error เงียบๆ)
 */
export const haptic = {
  /** คลิกเบาๆ ตอนสลับแท็บ / กดตัวเลือก / toggle chip */
  selection: () => {
    if (Platform.OS === 'web') return;
    Haptics.selectionAsync().catch(() => {});
  },
  /** สัมผัสปุ่มกดทั่วไป กดหัวใจ / กด avatar */
  light: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  /** สัมผัสปุ่ม Action สำคัญ: กด Like ใน Daily Drop / ส่งบับเบิ้ล / ส่งข้อความ */
  medium: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
  },
  /** สัมผัสหนัก: กดข้าม / ลบ / ออก */
  heavy: () => {
    if (Platform.OS === 'web') return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
  },
  /** สำเร็จ: เกิด Match! / ปลดล็อก Stage สำเร็จ / ส่งรีพอร์ตสำเร็จ */
  success: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  /** เตือน: Scam warning / บล็อก */
  warning: () => {
    if (Platform.OS === 'web') return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
  },
};
