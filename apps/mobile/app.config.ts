import type { ExpoConfig } from 'expo/config';

// ค่าที่ต่างกันตาม environment ให้ใส่ผ่าน EXPO_PUBLIC_* ใน .env หรือ env ของ eas.json
const config: ExpoConfig = {
  // ชื่อที่แสดงใต้ไอคอนบนมือถือ
  name: 'รู้กัน',
  slug: 'rukan',
  scheme: 'rukan',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    icon: './assets/expo.icon',
    // reverse-domain ของ rukan.app — เปลี่ยนไม่ได้หลังส่งขึ้น store ครั้งแรก
    bundleIdentifier: 'app.rukan',
  },
  android: {
    package: 'app.rukan',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/images/android-icon-foreground.png',
      backgroundImage: './assets/images/android-icon-background.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#208AEF',
        image: './assets/images/splash-icon.png',
        imageWidth: 76,
      },
    ],
    'expo-secure-store',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
};

export default config;
