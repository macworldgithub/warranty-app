/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register Firebase Cloud Messaging Background Handler (Headless JS for background/quit states)
try {
  const messaging = require('@react-native-firebase/messaging');
  if (messaging && typeof messaging.default === 'function') {
    messaging.default().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('[FCM Background] Message received in background Headless JS:', remoteMessage);
    });
  }
} catch {
  // Native Firebase messaging fallback
}

AppRegistry.registerComponent(appName, () => App);
