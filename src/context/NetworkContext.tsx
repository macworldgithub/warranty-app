import React, { createContext, useContext, useState, useEffect } from 'react';
import { syncManager, SyncStatus } from '../services/syncManager';
import { ENV, setApiBaseUrl } from '../config/env';

interface NetworkContextType {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  lastSyncTime?: string;
  serverUrl: string;
  setServerUrl: (url: string) => void;
  syncNow: () => Promise<void>;
  checkConnectivity: () => Promise<boolean>;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export const NetworkProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isSyncing: false,
    pendingCount: 0,
  });
  const [serverUrl, setServerUrlState] = useState<string>(ENV.BASE_URL);

  useEffect(() => {
    const unsubscribe = syncManager.subscribe(status => {
      setSyncStatus(status);
    });

    const interval = setInterval(async () => {
      await checkConnectivity();
    }, 10000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [serverUrl]);

  const checkConnectivity = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${ENV.API_URL}/brands`, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });
      const online = res.ok;
      setIsOnline(online);
      return online;
    } catch (err) {
      setIsOnline(false);
      return false;
    }
  };

  const updateServerUrl = (url: string) => {
    setApiBaseUrl(url);
    setServerUrlState(url);
    checkConnectivity();
  };

  const syncNow = async () => {
    await syncManager.syncPendingCases();
  };

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        isSyncing: syncStatus.isSyncing,
        pendingCount: syncStatus.pendingCount,
        lastSyncTime: syncStatus.lastSyncTime,
        serverUrl,
        setServerUrl: updateServerUrl,
        syncNow,
        checkConnectivity,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
};

export const useNetwork = () => {
  const context = useContext(NetworkContext);
  if (!context) {
    throw new Error('useNetwork must be used within a NetworkProvider');
  }
  return context;
};
