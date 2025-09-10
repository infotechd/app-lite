// Ambient module declaration for expo-constants to satisfy the TS compiler
// in editors/workspaces where module types may not be picked up immediately.
// This only declares the minimal surface used by the app.

declare module 'expo-constants' {
  interface ExpoIOSConfig {
    buildNumber?: string | number | null | undefined;
  }

  interface ExpoAndroidConfig {
    versionCode?: number | null | undefined;
  }

  interface ExpoConfig {
    version?: string;
    ios?: ExpoIOSConfig | null | undefined;
    android?: ExpoAndroidConfig | null | undefined;
  }

  const Constants: {
    expoConfig?: ExpoConfig | null;
  };

  export default Constants;
}
