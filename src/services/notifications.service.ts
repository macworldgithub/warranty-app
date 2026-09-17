import { Platform } from 'react-native';
import { apiClient } from '../api/client';
import { casesApi } from '../api';
import { WarrantyCase } from '../types';

export interface FlagNotificationPayload {
  caseId: string;
  roNumber: string;
  evidenceRuleKey: string;
  reasonCode: string;
  instruction: string;
  timestamp: string;
  caseItem?: WarrantyCase;
}

type NotificationListener = (payload: FlagNotificationPayload) => void;

class NotificationsService {
  private deviceToken: string | null = null;
  private registered: boolean = false;
  private listeners: Set<NotificationListener> = new Set();
  private pollInterval: any = null;
  private lastFlaggedCaseId: string | null = null;

  /**
   * Initializes push token registration.
   * Uses simulated development token when native Firebase is not present,
   * with seamless drop-in compatibility for @react-native-firebase/messaging in production.
   */
  public async registerDevice(userId: string = 'usr_tech_1'): Promise<string> {
    try {
      // Check if real FCM is available via optional import
      let token: string | null = null;
      try {
        const messaging = require('@react-native-firebase/messaging');
        if (messaging && typeof messaging.default === 'function') {
          token = await messaging.default().getToken();
        }
      } catch {
        // Native Firebase not installed; fall back to synthetic development token
      }

      if (!token) {
        token = `fcm_dev_${Platform.OS}_${userId}_${Date.now().toString(36)}`;
      }

      this.deviceToken = token;

      // Register with backend endpoint POST /api/v1/notifications/devices/register
      const res = await apiClient.post('/notifications/devices/register', {
        token: this.deviceToken,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
        userId,
      });

      this.registered = true;
      console.log('[Notifications] Device token registered successfully:', this.deviceToken, res);
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
   * Subscribe to incoming flag notifications (in-app alerts)
   */
  public onNotification(listener: NotificationListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Dispatches a notification payload to all active subscribers.
   */
  public dispatchNotification(payload: FlagNotificationPayload) {
    console.log('[Notifications] Dispatching flag alert:', payload);
    this.listeners.forEach((listener) => {
      try {
        listener(payload);
      } catch (err) {
        console.error('[Notifications] Listener execution error:', err);
      }
    });
  }

  /**
   * Starts light polling to detect when a warranty clerk flags a case for this technician.
   */
  public startFlagPolling(technicianId: string, intervalMs: number = 8000) {
    if (this.pollInterval) clearInterval(this.pollInterval);

    this.pollInterval = setInterval(async () => {
      try {
        // Fetch cases in Flagged status
        let cases: WarrantyCase[] = await casesApi.getCases({
          status: 'Flagged',
          technicianId,
        });

        // Fallback for development/testing if tech ID is generic
        if (!cases || cases.length === 0) {
          cases = await casesApi.getCases({ status: 'Flagged' });
        }

        if (Array.isArray(cases) && cases.length > 0) {
          // Find the most recent flagged case with an unresolved flag
          for (const c of cases) {
            const flags = (c as any).flagHistory || (c as any).flags || [];
            const activeFlag = flags.find((f: any) => !f.resolvedAt);

            if (activeFlag && this.lastFlaggedCaseId !== `${c.id}_${activeFlag.evidenceRuleKey}_${activeFlag.flaggedAt}`) {
              this.lastFlaggedCaseId = `${c.id}_${activeFlag.evidenceRuleKey}_${activeFlag.flaggedAt}`;
              this.dispatchNotification({
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
          }
        }
      } catch {
        // Silent poll error
      }
    }, intervalMs);
  }

  public stopFlagPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }
}

export const notificationsService = new NotificationsService();
