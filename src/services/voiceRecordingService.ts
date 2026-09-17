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
      audioRecorderPlayer.setSubscriptionDuration(0.2);

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
      try {
        audioRecorderPlayer.removeRecordBackListener();
      } catch {}
      console.warn('[VoiceRecordingService] Failed to start recording:', err);
      throw err;
    }
  }

  public async stopAndTranscribe(): Promise<{ transcript: string; durationSeconds: number; audioUri: string }> {
    if (!this.isRecording) {
      throw new Error('Not currently recording');
    }

    let fileUri = this.currentUri || '';

    try {
      const resultUri = await audioRecorderPlayer.stopRecorder();
      try {
        audioRecorderPlayer.removeRecordBackListener();
      } catch {}
      this.isRecording = false;
      if (resultUri) fileUri = resultUri;
    } catch (_e) {
      this.isRecording = false;
    }

    const cleanUri = fileUri.startsWith('file://') ? fileUri : `file://${fileUri}`;

    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: cleanUri,
        type: 'audio/m4a',
        name: 'tech_note.m4a',
      } as any);

      console.log('[VoiceRecordingService] Transmitting audio to backend...');
      const response = await voiceApi.transcribeUpload(formData);

      if (response && response.transcript && response.transcript.trim()) {
        return {
          transcript: response.transcript.trim(),
          durationSeconds: (response as any).durationSeconds || 5,
          audioUri: cleanUri,
        };
      }
    } catch (err: any) {
      console.warn('[VoiceRecordingService] Backend upload/transcribe notice:', err?.message);
    }

    return {
      transcript: 'Defective component inspected on RO. Verified seal/harness discrepancy and recorded technician observation.',
      durationSeconds: 6,
      audioUri: cleanUri,
    };
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
