import { Platform, PermissionsAndroid } from 'react-native';
import AudioRecorderPlayer, { RecordBackType } from 'react-native-audio-recorder-player';
import { voiceApi } from '../api/voice.api';

// v3 uses class instances, not static methods
const audioRecorderPlayer = new AudioRecorderPlayer();

class VoiceRecordingService {
  private isRecording: boolean = false;
  private currentUri: string | null = null;

  public async requestPermissions(): Promise<boolean> {
    if (Platform.OS === 'android') {
      try {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
          {
            title: 'Microphone Permission',
            message: 'Warranty App needs microphone access to transcribe your voice notes.',
            buttonPositive: 'Allow',
            buttonNegative: 'Deny',
          }
        );
        return granted === PermissionsAndroid.RESULTS.GRANTED;
      } catch (err) {
        console.warn('[VoiceRecordingService] Permission error:', err);
        return false;
      }
    }
    return true;
  }

  public async startRecording(onProgress?: (seconds: number) => void): Promise<boolean> {
    const hasPermission = await this.requestPermissions();
    if (!hasPermission) {
      throw new Error('Microphone permission not granted');
    }

    try {
      this.isRecording = true;

      if (onProgress) {
        audioRecorderPlayer.addRecordBackListener((e: RecordBackType) => {
          const sec = Math.floor((e.currentPosition || 0) / 1000);
          onProgress(sec);
        });
      }

      const uri = await audioRecorderPlayer.startRecorder();
      this.currentUri = uri;

      console.log('[VoiceRecordingService] Started recording at:', uri);
      return true;
    } catch (err) {
      this.isRecording = false;
      audioRecorderPlayer.removeRecordBackListener();
      console.warn('[VoiceRecordingService] Failed to start recording:', err);
      throw err;
    }
  }

  public async stopAndTranscribe(): Promise<{ transcript: string; durationSeconds: number; audioUri: string }> {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    try {
      const resultUri = await audioRecorderPlayer.stopRecorder();
      audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;

      const fileUri = resultUri || this.currentUri || '';
      console.log('[VoiceRecordingService] Stopped recording, file at:', fileUri);

      // Build multipart form — field must be named 'audio' to match backend FileInterceptor
      const formData = new FormData();
      const cleanUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

      formData.append('audio', {
        uri: cleanUri,
        type: 'audio/m4a',
        name: 'tech_note.m4a',
      } as any);

      console.log('[VoiceRecordingService] Sending audio to Deepgram via backend...');
      const response = await voiceApi.transcribeUpload(formData);

      return {
        transcript: response.transcript || '',
        durationSeconds: (response as any).durationSeconds || 0,
        audioUri: cleanUri,
      };
    } catch (err) {
      audioRecorderPlayer.removeRecordBackListener();
      this.isRecording = false;
      console.warn('[VoiceRecordingService] Transcription error:', err);
      throw err;
    }
  }

  public async cancelRecording(): Promise<void> {
    if (this.isRecording) {
      try {
        await audioRecorderPlayer.stopRecorder();
        audioRecorderPlayer.removeRecordBackListener();
      } catch (err) {
        console.warn('[VoiceRecordingService] Error cancelling recorder:', err);
      } finally {
        this.isRecording = false;
      }
    }
  }
}

export const voiceRecordingService = new VoiceRecordingService();
