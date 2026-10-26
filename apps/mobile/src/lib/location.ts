import { findClosestProvince, type ProvinceInfo } from '@rukan/shared';
import * as Location from 'expo-location';
import { Platform } from 'react-native';

export interface LocationDetectionResult {
  success: boolean;
  province?: ProvinceInfo;
  error?: string;
}

/**
 * ขอสิทธิ์และดึงตำแหน่ง GPS ปัจจุบันของอุปกรณ์
 * แล้วคำนวณหาจังหวัดในไทยที่ใกล้เคียงที่สุด เพื่อตั้งเป็น area ของผู้ใช้อัตโนมัติ
 * (ไม่เก็บพิกัด lat/lng ลงเซิร์ฟเวอร์ เพื่อความเป็นส่วนตัวสูงสุดตาม PDPA & รั้วความปลอดภัย)
 */
export async function detectCurrentProvince(): Promise<LocationDetectionResult> {
  try {
    // 1. Web Geolocation Fallback หรือ Expo Location
    if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const lat = pos.coords.latitude;
            const lng = pos.coords.longitude;
            const prov = findClosestProvince(lat, lng);
            resolve({ success: true, province: prov });
          },
          (err) => {
            resolve({ success: false, error: err.message || 'permission_denied' });
          },
          { timeout: 10000, enableHighAccuracy: false },
        );
      });
    }

    // 2. Native Expo Location
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return { success: false, error: 'permission_denied' };
    }

    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });

    const lat = loc.coords.latitude;
    const lng = loc.coords.longitude;
    const province = findClosestProvince(lat, lng);

    return {
      success: true,
      province,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'failed_to_detect_location';
    return { success: false, error: msg };
  }
}
