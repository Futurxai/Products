import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.futurx.paycore',
  appName: 'PayCore',
  webDir: 'www',
  plugins: {
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
      overlaysWebView: false
    }
  },
  android: {
    allowMixedContent: false
  }
};

export default config;
