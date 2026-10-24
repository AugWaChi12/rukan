import { Stack } from 'expo-router';

/** โซนผู้ใช้ที่ยืนยันครบแล้ว — หน้าเต็มจอ (แชท, โปรไฟล์คนอื่น) จะเพิ่มเป็น Stack.Screen ข้างๆ (tabs) */
export default function AppLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
