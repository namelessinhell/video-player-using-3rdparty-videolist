import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hatbyte.videostreamer',
  appName: 'video-streamer',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
