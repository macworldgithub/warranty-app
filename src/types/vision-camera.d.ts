declare module 'react-native-vision-camera' {
  export const Camera: any;
  export function useCameraDevice(position: 'back' | 'front'): any;
  export function useCodeScanner(config: any): any;
  export type CodeType = string;
}
