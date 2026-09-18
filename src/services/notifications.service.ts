import { Platform, PermissionsAndroid } from 'react-native';
import { apiClient } from '../api/client';
import { casesApi } from '../api';
import { WarrantyCase } from '../types';

export type NotificationType = 'APPROVED' | 'FLAGGED' | 'AWAITING_REVIEW' | 'INFO';

export interface AppNotificationPayload {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  caseId: string;
  roNumber: string;
  claimNumber?: string;
  evidenceRuleKey?: string;
  reasonCode?: string;
  instruction?: string;
  timestamp: string;
  isRead?: boolean;
  caseItem?: WarrantyCase;
}

// Backwards compatibility alias
export type FlagNotificationPayload = AppNotificationPayload;

type NotificationListener = (payload: AppNotificationPayload, history?: AppNotificationPayload[]) => void;
type NotificationOpenListener = (payload: AppNotificationPayload) => void;

interface FirebaseMessagingAdapter {
  instance: any;
  getToken: () => Promise<string | null>;
  onMessage: (handler: (msg: any) => void) => () => void;
  onNotificationOpenedApp?: (handler: (msg: any) => void) => () => void;
  getInitialNotification?: () => Promise<any>;
  onTokenRefresh?: (handler: (token: string) => void) => () => void;
  subscribeToTopic?: (topic: string) => Promise<void>;
  requestPermission?: () => Promise<any>;
}

function getFirebaseMessagingAdapter(): FirebaseMessagingAdapter | null {
  try {
    const fb = require('@react-native-firebase/messaging');
    if (!fb) return null;

    let instance: any = null;
    if (typeof fb.getMessaging === 'function') {
      instance = fb.getMessaging();
    } else if (typeof fb.default === 'function') {
      instance = fb.default();
    } else if (typeof fb === 'function') {
      instance = fb();
    }

    if (!instance) return null;

    return {
      instance,
      getToken: async () => {
        try {
          if (typeof fb.getToken === 'function') {
            return await fb.getToken(instance);
          }
          if (typeof instance.getToken === 'function') {
            return await instance.getToken();
          }
        } catch (e) {
          console.warn('[FCM] Error obtaining FCM device token:', e);
        }
        return null;
      },
      onMessage: (handler) => {
        if (typeof fb.onMessage === 'function') {
          return fb.onMessage(instance, handler);
        }
        if (typeof instance.onMessage === 'function') {
          return instance.onMessage(handler);
        }
        return () => {};
      },
      onNotificationOpenedApp: (handler) => {
        if (typeof fb.onNotificationOpenedApp === 'function') {
          return fb.onNotificationOpenedApp(instance, handler);
        }
        if (typeof instance.onNotificationOpenedApp === 'function') {
          return instance.onNotificationOpenedApp(handler);
        }
        return () => {};
      },
      getInitialNotification: async () => {
        try {
          if (typeof fb.getInitialNotification === 'function') {
            return await fb.getInitialNotification(instance);
          }
          if (typeof instance.getInitialNotification === 'function') {
            return await instance.getInitialNotification();
          }
        } catch (e) {
          console.warn('[FCM] Error checking initial notification:', e);
        }
        return null;
      },
      onTokenRefresh: (handler) => {
        if (typeof fb.onTokenRefresh === 'function') {
          return fb.onTokenRefresh(instance, handler);
        }
        if (typeof instance.onTokenRefresh === 'function') {
          return instance.onTokenRefresh(handler);
        }
        return () => {};
      },
      subscribeToTopic: async (topic: string) => {
        try {
          if (typeof fb.subscribeToTopic === 'function') {
            await fb.subscribeToTopic(instance, topic);
          } else if (typeof instance.subscribeToTopic === 'function') {
            await instance.subscribeToTopic(topic);
          }
          console.log(`[FCM] Subscribed to topic '${topic}'`);
        } catch (e) {
          console.warn(`[FCM] Error subscribing to topic '${topic}':`, e);
        }
      },
      requestPermission: async () => {
        try {
          if (typeof fb.requestPermission === 'function') {
            return await fb.requestPermission(instance);
          }
          if (typeof instance.requestPermission === 'function') {
            return await instance.requestPermission();
          }
        } catch (e) {
          console.warn('[FCM] Error requesting permission:', e);
        }
      },
    };
  } catch (err) {
    console.warn('[Notifications] Firebase messaging module not available:', err);
    return null;
  }
}

class NotificationsService {
  private deviceToken: string | null = null;
  private registered: boolean = false;
  private listeners: Set<NotificationListener> = new Set();
  private openListeners: Set<NotificationOpenListener> = new Set();
  private pollInterval: any = null;
  private lastKnownCaseStates: Map<string, string> = new Map();
  private fcmUnsubscribeForeground: (() => void) | null = null;
  private fcmUnsubscribeOpenedApp: (() => void) | null = null;
  private fcmUnsubscribeTokenRefresh: (() => void) | null = null;

  // Notification History and Read Tracking
  private history: AppNotificationPayload[] = [];
  private readIds: Set<string> = new Set();

  /**
   * Initializes push token registration.
   */
  public async registerDevice(userId: string = 'usr_tech_1'): Promise<string> {
    try {
      let token: string | null = null;

      // 1. Request Android 13+ (API 33+) POST_NOTIFICATIONS permission
      if (Platform.OS === 'android' && Number(Platform.Version) >= 33) {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS
          );
          console.log('[Notifications] Android 13+ notification permission status:', granted);
        } catch (_err) {
          // Silent permission error
        }
      }

      // 2. Resolve Firebase Messaging Adapter (v26 modular or legacy)
      const fbAdapter = getFirebaseMessagingAdapter();

      if (fbAdapter) {
        // Request FCM/APNs permission if required
        await fbAdapter.requestPermission?.();

        // Obtain real Google FCM device token
        token = await fbAdapter.getToken();
        console.log('[FCM] Native device token retrieved:', token);

        // Subscribe to relevant FCM topics for guaranteed delivery
        await fbAdapter.subscribeToTopic?.('warranty-techs');
        await fbAdapter.subscribeToTopic?.('warranty-all');
        if (userId) {
          await fbAdapter.subscribeToTopic?.(`tech-${userId}`);
        }

        // Setup foreground message listener
        if (this.fcmUnsubscribeForeground) {
          this.fcmUnsubscribeForeground();
        }
        this.fcmUnsubscribeForeground = fbAdapter.onMessage((remoteMessage: any) => {
          console.log('[FCM] Foreground push received:', remoteMessage);
          this.handleIncomingFcmMessage(remoteMessage);
        });

        // Setup background notification click listener
        if (this.fcmUnsubscribeOpenedApp) {
          this.fcmUnsubscribeOpenedApp();
        }
        if (fbAdapter.onNotificationOpenedApp) {
          this.fcmUnsubscribeOpenedApp = fbAdapter.onNotificationOpenedApp((remoteMessage: any) => {
            console.log('[FCM] Notification opened app from background:', remoteMessage);
            const payload = this.handleIncomingFcmMessage(remoteMessage);
            if (payload) {
              this.notifyOpenListeners(payload);
            }
          });
        }

        // Setup token refresh listener
        if (this.fcmUnsubscribeTokenRefresh) {
          this.fcmUnsubscribeTokenRefresh();
        }
        if (fbAdapter.onTokenRefresh) {
          this.fcmUnsubscribeTokenRefresh = fbAdapter.onTokenRefresh(async (newToken: string) => {
            console.log('[FCM] Token refreshed by Google:', newToken);
            this.deviceToken = newToken;
            try {
              await apiClient.post('/notifications/devices/register', {
                token: newToken,
                platform: Platform.OS === 'ios' ? 'ios' : 'android',
                userId,
              });
            } catch (err: any) {
              console.warn('[FCM] Failed to update refreshed token with backend:', err?.message);
            }
          });
        }

        // Check cold-start notification (app was closed / quit state)
        if (fbAdapter.getInitialNotification) {
          fbAdapter.getInitialNotification().then((remoteMessage: any) => {
            if (remoteMessage) {
              console.log('[FCM] App opened from quit state via notification:', remoteMessage);
              const payload = this.handleIncomingFcmMessage(remoteMessage);
              if (payload) {
                setTimeout(() => this.notifyOpenListeners(payload), 800);
              }
            }
          }).catch(() => {});
        }
      }

      if (!token) {
        token = `fcm_dev_${Platform.OS}_${userId}_${Date.now().toString(36)}`;
        console.warn('[Notifications] Real FCM token unavailable; using dev fallback token:', token);
      }

      this.deviceToken = token;

      const res = await apiClient.post('/notifications/devices/register', {
        token: this.deviceToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        userId,
      });

      this.registered = true;
      console.log('[Notifications] Device token registered successfully with backend:', this.deviceToken, res);
      return this.deviceToken;
    } catch (err: any) {
      console.warn('[Notifications] Failed to register device token with backend:', err?.message);
      return this.deviceToken || 'dev_token_fallback';
    }
  }

  public getDeviceToken(): string | null {
    return this.deviceToken;
  }

  public isRegistered(): boolean {
    return this.registered;
  }

  /**
   * Returns current notification history
   */
  public getNotificationsHistory(): AppNotificationPayload[] {
    return this.history.map((item) => ({
      ...item,
      isRead: this.readIds.has(item.id),
    }));
  }

  /**
   * Returns unread notification count
   */
  public getUnreadCount(): number {
    return this.history.filter((item) => !this.readIds.has(item.id)).length;
  }

  /**
   * Marks a specific notification as read
   */
  public markAsRead(id: string) {
    this.readIds.add(id);
    this.notifyListeners(null);
  }

  /**
   * Marks all notifications as read
   */
  public markAllAsRead() {
    this.history.forEach((item) => this.readIds.add(item.id));
    this.notifyListeners(null);
  }

  /**
   * Clears notification history
   */
  public clearNotifications() {
    this.history = [];
    this.readIds.clear();
    this.notifyListeners(null);
  }

  /**
   * Subscribe to incoming notifications (in-app alerts & history updates)
   */
  public onNotification(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispatches a notification payload to all active subscribers.
   */
  public dispatchNotification(payload: AppNotificationPayload) {
    const itemWithId: AppNotificationPayload = {
      ...payload,
      id: payload.id || `notif_${payload.caseId || ''}_${payload.type}_${Date.now()}`,
    };

    // Prepend to history, avoiding duplicate IDs
    const existingIndex = this.history.findIndex((h) => h.id === itemWithId.id);
    if (existingIndex >= 0) {
      this.history[existingIndex] = itemWithId;
    } else {
      this.history = [itemWithId, ...this.history];
    }

    console.log('[Notifications] Dispatching alert:', itemWithId);
    this.notifyListeners(itemWithId);
  }

  private notifyListeners(payload: AppNotificationPayload | null) {
    const historySnapshot = this.getNotificationsHistory();
    this.listeners.forEach((listener) => {
      try {
        if (payload) {
          listener(payload, historySnapshot);
        } else {
          listener(historySnapshot[0] || ({} as any), historySnapshot);
        }
      } catch (err) {
        console.error('[Notifications] Listener execution error:', err);
      }
    });
  }

  /**
   * Subscribe to notification tap / open events (from system tray background or quit state)
   */
  public onNotificationOpen(listener: NotificationOpenListener): () => void {
    this.openListeners.add(listener);
    return () => this.openListeners.delete(listener);
  }

  private notifyOpenListeners(payload: AppNotificationPayload) {
    this.openListeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[Notifications] Open listener execution error:', err);
      }
    });
  }

  /**
   * Processes incoming FCM remote message (data + notification payload)
   */
  private handleIncomingFcmMessage(remoteMessage: any): AppNotificationPayload {
    const data = remoteMessage?.data || {};
    const notification = remoteMessage?.notification || {};

    let type: NotificationType = 'INFO';
    if (data.event === 'CASE_ACCEPTED' || data.claimNumber) {
      type = 'APPROVED';
    } else if (data.event === 'CASE_FLAGGED' || data.evidenceRuleKey) {
      type = 'FLAGGED';
    } else if (data.event === 'AWAITING_REVIEW') {
      type = 'AWAITING_REVIEW';
    }

    const payload: AppNotificationPayload = {
      id: remoteMessage?.messageId || `fcm_${Date.now()}`,
      type,
      title: notification.title || data.title || (type === 'APPROVED' ? 'Warranty Claim Approved' : 'Action Required'),
      body: notification.body || data.body || 'Case status updated',
      caseId: data.caseId || '',
      roNumber: data.roNumber || '',
      claimNumber: data.claimNumber,
      evidenceRuleKey: data.evidenceRuleKey,
      reasonCode: data.reasonCode,
      instruction: data.instruction,
      timestamp: new Date().toISOString(),
    };

    this.dispatchNotification(payload);
    return payload;
  }

  /**
   * Starts light polling to detect warranty case status updates (Flagged, Approved, Awaiting Review).
   */
  public startNotificationPolling(technicianId: string, intervalMs: number = 8000) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    const poll = async () => {
      try {
        let cases: WarrantyCase[] = await casesApi.getCases({ technicianId });

        if (!cases || cases.length === 0) {
          cases = await casesApi.getCases({});
        }

        if (Array.isArray(cases) && cases.length > 0) {
          for (const c of cases) {
            const flags = (c as any).flagHistory || (c as any).flags || [];
            const activeFlag = flags.find((f: any) => !f.resolvedAt);

            const currentStateKey = `${c.id}_${c.status}_${c.claimNumber || ''}_${activeFlag ? activeFlag.flaggedAt || activeFlag.evidenceRuleKey : ''}`;
            const lastState = this.lastKnownCaseStates.get(c.id);

            // Populate baseline past notifications on first pass
            if (lastState === undefined) {
              this.lastKnownCaseStates.set(c.id, currentStateKey);

              if (c.status === 'Flagged' && activeFlag) {
                const notifId = `init_${c.id}_flagged_${activeFlag.evidenceRuleKey}`;
                if (!this.history.some((h) => h.id === notifId)) {
                  this.history.push({
                    id: notifId,
                    type: 'FLAGGED',
                    title: `Action Required: RO #${c.roNumber}`,
                    body: `Evidence rejected: ${(activeFlag.reasonCode || '').replace(/_/g, ' ')}. ${activeFlag.instruction || 'Tap to recapture.'}`,
                    caseId: c.id,
                    roNumber: c.roNumber,
                    evidenceRuleKey: activeFlag.evidenceRuleKey,
                    reasonCode: activeFlag.reasonCode,
                    instruction: activeFlag.instruction,
                    timestamp: activeFlag.flaggedAt || new Date().toISOString(),
                    caseItem: c,
                  });
                }
              } else if (c.status === 'Submitted' || c.claimNumber) {
                const notifId = `init_${c.id}_approved_${c.claimNumber || 'approved'}`;
                if (!this.history.some((h) => h.id === notifId)) {
                  this.history.push({
                    id: notifId,
                    type: 'APPROVED',
                    title: `Warranty Claim Approved: RO #${c.roNumber}`,
                    body: `Approved under OEM Claim #${c.claimNumber || 'OEM-APPROVED'}. Case file locked.`,
                    caseId: c.id,
                    roNumber: c.roNumber,
                    claimNumber: c.claimNumber || 'OEM-APPROVED',
                    timestamp: new Date().toISOString(),
                    caseItem: c,
                  });
                }
              }
              continue;
            }

            if (lastState !== currentStateKey) {
              this.lastKnownCaseStates.set(c.id, currentStateKey);

              // 1. Case Flagged by Admin
              if (c.status === 'Flagged' && activeFlag) {
                this.dispatchNotification({
                  id: `poll_${c.id}_flag_${Date.now()}`,
                  type: 'FLAGGED',
                  title: `Action Required: RO #${c.roNumber}`,
                  body: `Evidence rejected: ${(activeFlag.reasonCode || '').replace(/_/g, ' ')}. ${activeFlag.instruction || 'Tap to recapture.'}`,
                  caseId: c.id,
                  roNumber: c.roNumber,
                  evidenceRuleKey: activeFlag.evidenceRuleKey,
                  reasonCode: activeFlag.reasonCode,
                  instruction: activeFlag.instruction,
                  timestamp: activeFlag.flaggedAt || new Date().toISOString(),
                  caseItem: c,
                });
                break;
              }

              // 2. Case Approved / Submitted to OEM
              if (c.status === 'Submitted' || c.claimNumber) {
                this.dispatchNotification({
                  id: `poll_${c.id}_approved_${Date.now()}`,
                  type: 'APPROVED',
                  title: `Warranty Claim Approved: RO #${c.roNumber}`,
                  body: `Approved under OEM Claim #${c.claimNumber || 'OEM-APPROVED'}. Case file locked.`,
                  caseId: c.id,
                  roNumber: c.roNumber,
                  claimNumber: c.claimNumber || 'OEM-APPROVED',
                  timestamp: new Date().toISOString(),
                  caseItem: c,
                });
                break;
              }

              // 3. Case Awaiting Review
              if (c.status === 'Awaiting Review') {
                this.dispatchNotification({
                  id: `poll_${c.id}_awaiting_${Date.now()}`,
                  type: 'AWAITING_REVIEW',
                  title: `Case Awaiting Review: RO #${c.roNumber}`,
                  body: `Updated evidence transmitted to warranty reviewer.`,
                  caseId: c.id,
                  roNumber: c.roNumber,
                  timestamp: new Date().toISOString(),
                  caseItem: c,
                });
                break;
              }
            }
          }
        }
      } catch {
        // Silent poll error
      }
    };

    poll();
    this.pollInterval = setInterval(poll, intervalMs);
  }

  public startFlagPolling(technicianId: string, intervalMs: number = 8000) {
    this.startNotificationPolling(technicianId, intervalMs);
  }

  public stopFlagPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
    if (this.fcmUnsubscribeForeground) {
      this.fcmUnsubscribeForeground();
      this.fcmUnsubscribeForeground = null;
    }
    if (this.fcmUnsubscribeOpenedApp) {
      this.fcmUnsubscribeOpenedApp();
      this.fcmUnsubscribeOpenedApp = null;
    }
    if (this.fcmUnsubscribeTokenRefresh) {
      this.fcmUnsubscribeTokenRefresh();
      this.fcmUnsubscribeTokenRefresh = null;
    }
  }
}

export const notificationsService = new NotificationsService();

