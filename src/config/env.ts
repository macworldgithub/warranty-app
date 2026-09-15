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
  TIMEOUT_MS: 6000,
  MAX_PHOTO_SIZE_MB: 10,
  MAX_VIDEO_DURATION_SEC: 60,
  MIN_VIDEO_DURATION_SEC: 5,
  // Scanbot SDK configuration:
  // App ID on Android: com.warrantyapp
  // App ID on iOS: com.warrantyapp
  // Replace this license key with your 7-day trial or production Scanbot license key
  SCANBOT_LICENSE_KEY: "B7tB/s+5Miu63ZiW6yLJW3jTHmWIYl" +
    "ssyjz4SQDeVJL/QMqJB9BeGCe5F/zs" +
    "tpecZiL4mXGiIyNcB6UAPS8O48QhYh" +
    "x4erR/0iX9T+Qd7DvSvOQzlp9J0lg/" +
    "qYaReR1MeP1q10p2zjaCPEydAITfIK" +
    "kJvV15CwI9zIzXmr9uvLP5DSdNbwwN" +
    "nDnoxnxTP01rxRFmUTwQVsl9IQqTxF" +
    "m/RCNm32xVTZiS/YD62PGfQlsiwIzE" +
    "cZ6VteZGooWeSqNRwgrjcbLhXxC5le" +
    "HoRaG5+I6hb7JSalM2YwfU7/JBVeYf" +
    "sCVB8d5vehBG6IjRzE54K3xMcDbc6A" +
    "If29MKd+V0Ng==\nU2NhbmJvdFNESw" +
    "pjb20ud2FycmFudHlhcHAKMTc5MDEy" +
    "MTU5OQo4Mzg4NjA3CjE5\n",
  SCANBOT_APP_ID: 'com.warrantyapp',
};

let currentBaseUrl = DEFAULT_API_HOST;

export const setApiBaseUrl = (newUrl: string) => {
  currentBaseUrl = newUrl.replace(/\/+$/, '');
  ENV.BASE_URL = currentBaseUrl;
  ENV.API_URL = `${currentBaseUrl}${API_BASE_PATH}`;
};

export const getApiBaseUrl = () => ENV.API_URL;
export const getBaseServerUrl = () => ENV.BASE_URL;
export const getScanbotLicenseKey = () => ENV.SCANBOT_LICENSE_KEY;


