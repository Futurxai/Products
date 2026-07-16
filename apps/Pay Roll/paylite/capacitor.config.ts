import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.futurx.paylite',
  appName: 'Futurx Payroll & Leave',
  webDir: 'www',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#0A0C12',
      overlaysWebView: false
    }
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
