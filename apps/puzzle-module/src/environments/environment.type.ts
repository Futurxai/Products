export interface EmulatorHosts {
  auth: string;
  firestore: { host: string; port: number };
  storage: { host: string; port: number };
  functions: { host: string; port: number };
}

export interface Environment {
  production: boolean;
  useEmulators: boolean;
  firebase: {
    apiKey: string;
    authDomain: string;
    projectId: string;
    storageBucket: string;
    messagingSenderId: string;
    appId: string;
  };
  emulatorHosts: EmulatorHosts | null;
}
