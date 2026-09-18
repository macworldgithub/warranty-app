/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';
import {
  getMessaging,
  setBackgroundMessageHandler,
} from '@react-native-firebase/messaging';

// Register Firebase Cloud Messaging Background Handler
// This MUST be in index.js (outside any component) so it runs in the Headless JS context
// when the app is in background or quit state.
setBackgroundMessageHandler(getMessaging(), async (remoteMessage) => {
  console.log('[FCM Background] Message received in background/quit state:', remoteMessage);
  // The notification banner is handled automatically by FCM for data+notification payloads.
  // Any additional background processing (e.g. local DB updates) can be done here.
});

AppRegistry.registerComponent(appName, () => App);

