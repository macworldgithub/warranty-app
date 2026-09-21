import { Platform } from 'react-native';

// Default API Base URL:
// - Android: http://localhost:4000 (via adb reverse tcp:4000 tcp:4000) or http://10.0.2.2:4000
// - iOS / Desktop: http://localhost:4000
export const DEFAULT_API_HOST = Platform.select({
  android: 'http://localhost:4000',
  ios: 'http://localhost:4000',
  default: 'http://localhost:4000',
});

export const API_BASE_PATH = '/api/v1';

export const ENV = {
  API_URL: `${DEFAULT_API_HOST}${API_BASE_PATH}`,
  BASE_URL: DEFAULT_API_HOST,
  TIMEOUT_MS: 30000,
  MAX_PHOTO_SIZE_MB: 10,
  MAX_VIDEO_DURATION_SEC: 60,
  MIN_VIDEO_DURATION_SEC: 5,
};

let currentBaseUrl = DEFAULT_API_HOST;

export const setApiBaseUrl = (newUrl: string) => {
  currentBaseUrl = newUrl.replace(/\/+$/, '');
  ENV.BASE_URL = currentBaseUrl;
  ENV.API_URL = `${currentBaseUrl}${API_BASE_PATH}`;
};

export const getApiBaseUrl = () => ENV.API_URL;
export const getBaseServerUrl = () => ENV.BASE_URL;



