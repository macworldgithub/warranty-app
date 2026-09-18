/**
 * @format
 */

import { AppRegistry } from 'react-native';
import App from './App';
import { name as appName } from './app.json';

// Register Firebase Cloud Messaging Background Handler (Headless JS for background/quit states)
try {
  const firebaseMessaging = require('@react-native-firebase/messaging');
  if (firebaseMessaging) {
    const messagingInstance = typeof firebaseMessaging.getMessaging === 'function'
      ? firebaseMessaging.getMessaging()
      : (typeof firebaseMessaging.default === 'function'
          ? firebaseMessaging.default()
          : (typeof firebaseMessaging === 'function' ? firebaseMessaging() : null));

    const setBgHandler = firebaseMessaging.setBackgroundMessageHandler ||
      (messagingInstance && messagingInstance.setBackgroundMessageHandler);

    if (typeof setBgHandler === 'function') {
      const handler = async (remoteMessage) => {
        console.log('[FCM Background] Message received in background Headless JS:', remoteMessage);
      };

      if (firebaseMessaging.setBackgroundMessageHandler && messagingInstance) {
        try {
          firebaseMessaging.setBackgroundMessageHandler(messagingInstance, handler);
        } catch {
          if (typeof messagingInstance.setBackgroundMessageHandler === 'function') {
            messagingInstance.setBackgroundMessageHandler(handler);
          }
        }
      } else if (typeof messagingInstance?.setBackgroundMessageHandler === 'function') {
        messagingInstance.setBackgroundMessageHandler(handler);
      }
    }
  }
} catch (err) {
  console.warn('[FCM Background] Failed to register background message handler:', err);
}

AppRegistry.registerComponent(appName, () => App);
