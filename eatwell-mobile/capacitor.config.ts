import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.eatwell.app',
  appName: 'EatWell',
  webDir: 'www',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    GoogleAuth: {
      scopes: ['profile', 'email'],
      serverClientId: '608614212478-1luvpn5n7li82mjc4vb5k1dtjdu7k6nd.apps.googleusercontent.com',
      forceCodeForRefreshToken: true
    }
  }
};

export default config;
