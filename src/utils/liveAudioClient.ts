/**
 * Browser Web Audio & WebSocket client for Gemini Live API (gemini-3.8-live).
 * - Captures microphone audio and encodes 16-bit PCM little-endian at 16kHz.
 * - Plays back 24kHz 16-bit PCM chunks seamlessly via scheduled AudioBufferSourceNodes.
 * - Handles instant barge-in interruption flush and live RMS volume metering.
 */

export type LiveConnectionState = 'idle' | 'connecting' | 'connected' | 'error';

export interface LiveAudioCallbacks {
  onStateChange: (state: LiveConnectionState) => void;
  onInputTranscript: (text: string) => void;
  onOutputTranscript: (text: string) => void;
  onTurnComplete: () => void;
  onInterrupted: () => void;
  onInputLevel: (level: number) => void;
  onOutputLevel: (level: number) => void;
  onError: (message: string) => void;
}

export interface LiveSessionOptions {
  level: string;
  scenario: string;
  voice: string;
  learnerName?: string;
  targetWords?: string[];
}

function downsampleTo16k(input: Float32Array, sourceSampleRate: number): Float32Array {
  if (sourceSampleRate === 16000) {
    return input;
  }
  const ratio = sourceSampleRate / 16000;
  const newLength = Math.max(1, Math.round(input.length / ratio));
  const result = new Float32Array(newLength);
  for (let i = 0; i < newLength; i++) {
    const srcPos = i * ratio;
    const idx = Math.floor(srcPos);
    const frac = srcPos - idx;
    const s0 = input[idx] ?? 0;
    const s1 = input[Math.min(idx + 1, input.length - 1)] ?? s0;
    result[i] = s0 + (s1 - s0) * frac;
  }
  return result;
}

function float32ToPcm16Base64(floatData: Float32Array): string {
  const pcm = new Int16Array(floatData.length);
  for (let i = 0; i < floatData.length; i++) {
    const clamped = Math.max(-1, Math.min(1, floatData[i]));
    pcm[i] = clamped < 0 ? Math.round(clamped * 32768) : Math.round(clamped * 32767);
  }
  const bytes = new Uint8Array(pcm.buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const sub = bytes.subarray(i, Math.min(i + chunkSize, bytes.length));
    binary += String.fromCharCode(...sub);
  }
  return btoa(binary);
}

function base64Pcm24kToFloat32(base64: string): Float32Array<ArrayBuffer> {
  const binary = atob(base64);
  const byteLength = binary.length;
  const bytes = new Uint8Array(byteLength);
  for (let i = 0; i < byteLength; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const sampleCount = Math.floor(bytes.byteLength / 2);
  const view = new DataView(bytes.buffer, bytes.byteOffset, sampleCount * 2);
  const float32 = new Float32Array(new ArrayBuffer(sampleCount * 4));
  for (let i = 0; i < sampleCount; i++) {
    float32[i] = view.getInt16(i * 2, true) / 32768;
  }
  return float32;
}

function computeRms(samples: Float32Array): number {
  if (samples.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < samples.length; i++) {
    const v = samples[i];
    sum += v * v;
  }
  return Math.min(1, Math.sqrt(sum / samples.length) * 3.5);
}

export class LiveVoiceClient {
  private ws: WebSocket | null = null;
  private inputCtx: AudioContext | null = null;
  private outputCtx: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private silentGainNode: GainNode | null = null;
  private activeSources = new Set<AudioBufferSourceNode>();
  private nextStartTime = 0;
  private muted = false;
  private stopped = false;
  private outputDecayTimer: number | null = null;
  private callbacks: LiveAudioCallbacks;

  constructor(callbacks: LiveAudioCallbacks) {
    this.callbacks = callbacks;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) {
      this.callbacks.onInputLevel(0);
    }
  }

  public sendTextPrompt(text: string): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN && text.trim()) {
      this.ws.send(JSON.stringify({ text: text.trim() }));
    }
  }

  public async connect(options: LiveSessionOptions): Promise<void> {
    this.stop();
    this.stopped = false;
    this.callbacks.onStateChange('connecting');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.callbacks.onStateChange('error');
      this.callbacks.onError('Trình duyệt hiện tại không hỗ trợ thu âm micro.');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        },
      });
    } catch (err) {
      this.callbacks.onStateChange('error');
      const msg =
        err instanceof DOMException && err.name === 'NotAllowedError'
          ? 'Bạn chưa cấp quyền truy cập Micro. Hãy cho phép sử dụng Micro trên trình duyệt để luyện nói trực tiếp.'
          : 'Không thể khởi động Micro. Vui lòng kiểm tra thiết bị ghi âm của bạn.';
      this.callbacks.onError(msg);
      return;
    }

    if (this.stopped) {
      this.stop();
      return;
    }

    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    this.inputCtx = new AudioCtx({ sampleRate: 16000 });
    this.outputCtx = new AudioCtx({ sampleRate: 24000 });

    if (this.inputCtx.state === 'suspended') {
      await this.inputCtx.resume();
    }
    if (this.outputCtx.state === 'suspended') {
      await this.outputCtx.resume();
    }

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const params = new URLSearchParams({
      level: options.level,
      scenario: options.scenario,
      voice: options.voice,
    });
    if (options.learnerName) {
      params.set('learnerName', options.learnerName);
    }
    if (options.targetWords && options.targetWords.length > 0) {
      params.set('targetWords', options.targetWords.slice(0, 8).join(','));
    }

    const wsUrl = `${protocol}//${window.location.host}/api/ai/live?${params.toString()}`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      // Wait for server "ready" signal once Gemini Live handshake completes
    };

    ws.onmessage = (event) => {
      let msg: {
        type?: string;
        audio?: string;
        text?: string;
        error?: string;
      };
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }

      switch (msg.type) {
        case 'ready':
          this.callbacks.onStateChange('connected');
          this.startMicCapture();
          // Prompt the AI coach to open the conversation warmly in English
          this.sendTextPrompt(
            'Please greet me warmly in English as my cockpit speaking coach, introduce our practice topic briefly, and ask me the first easy question to start.'
          );
          break;
        case 'audio':
          if (msg.audio) {
            this.enqueueAudioChunk(msg.audio);
          }
          break;
        case 'inputTranscript':
          if (msg.text) {
            this.callbacks.onInputTranscript(msg.text);
          }
          break;
        case 'outputTranscript':
          if (msg.text) {
            this.callbacks.onOutputTranscript(msg.text);
          }
          break;
        case 'interrupted':
          this.flushPlayback();
          this.callbacks.onInterrupted();
          break;
        case 'turnComplete':
          this.callbacks.onTurnComplete();
          break;
        case 'error':
          this.callbacks.onStateChange('error');
          this.callbacks.onError(msg.error || 'Đã xảy ra lỗi khi kết nối Gemini Live.');
          this.stop(true);
          break;
        case 'closed':
          if (!this.stopped) {
            this.stop();
          }
          break;
        default:
          break;
      }
    };

    ws.onerror = () => {
      if (!this.stopped) {
        this.callbacks.onStateChange('error');
        this.callbacks.onError('Không thể kết nối máy chủ thoại AI. Vui lòng thử lại.');
        this.stop(true);
      }
    };

    ws.onclose = () => {
      if (!this.stopped) {
        this.stop();
      }
    };
  }

  private startMicCapture(): void {
    if (!this.inputCtx || !this.mediaStream) return;

    this.sourceNode = this.inputCtx.createMediaStreamSource(this.mediaStream);
    // 4096 samples at 16kHz = ~256ms per chunk
    this.processorNode = this.inputCtx.createScriptProcessor(4096, 1, 1);
    this.silentGainNode = this.inputCtx.createGain();
    this.silentGainNode.gain.value = 0;

    const sampleRate = this.inputCtx.sampleRate;

    this.processorNode.onaudioprocess = (event) => {
      if (this.stopped || this.muted || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
        return;
      }
      const rawChannel = event.inputBuffer.getChannelData(0);
      const rms = computeRms(rawChannel);
      this.callbacks.onInputLevel(rms);

      const pcm16k = downsampleTo16k(rawChannel, sampleRate);
      const base64Audio = float32ToPcm16Base64(pcm16k);
      this.ws.send(JSON.stringify({ audio: base64Audio }));
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.silentGainNode);
    this.silentGainNode.connect(this.inputCtx.destination);
  }

  private enqueueAudioChunk(base64Audio: string): void {
    if (!this.outputCtx || this.stopped) return;

    if (this.outputCtx.state === 'suspended') {
      void this.outputCtx.resume();
    }

    const float32 = base64Pcm24kToFloat32(base64Audio);
    if (float32.length === 0) return;

    const rms = computeRms(float32);
    this.callbacks.onOutputLevel(rms);
    if (this.outputDecayTimer !== null) {
      window.clearTimeout(this.outputDecayTimer);
    }
    this.outputDecayTimer = window.setTimeout(() => {
      this.callbacks.onOutputLevel(0);
    }, 320);

    const buffer = this.outputCtx.createBuffer(1, float32.length, 24000);
    buffer.copyToChannel(float32, 0);

    const source = this.outputCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(this.outputCtx.destination);

    const now = this.outputCtx.currentTime;
    const startAt = Math.max(now + 0.015, this.nextStartTime);
    source.start(startAt);
    this.nextStartTime = startAt + buffer.duration;

    this.activeSources.add(source);
    source.onended = () => {
      this.activeSources.delete(source);
      if (this.activeSources.size === 0) {
        this.callbacks.onOutputLevel(0);
      }
    };
  }

  public flushPlayback(): void {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // already stopped
      }
    }
    this.activeSources.clear();
    this.nextStartTime = 0;
    this.callbacks.onOutputLevel(0);
  }

  public stop(keepErrorState = false): void {
    this.stopped = true;
    this.flushPlayback();

    if (this.outputDecayTimer !== null) {
      window.clearTimeout(this.outputDecayTimer);
      this.outputDecayTimer = null;
    }

    if (this.processorNode) {
      this.processorNode.onaudioprocess = null;
      try {
        this.processorNode.disconnect();
      } catch {
        // ignore
      }
      this.processorNode = null;
    }

    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch {
        // ignore
      }
      this.sourceNode = null;
    }

    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch {
        // ignore
      }
      this.silentGainNode = null;
    }

    if (this.mediaStream) {
      for (const track of this.mediaStream.getTracks()) {
        track.stop();
      }
      this.mediaStream = null;
    }

    if (this.inputCtx) {
      void this.inputCtx.close().catch(() => undefined);
      this.inputCtx = null;
    }

    if (this.outputCtx) {
      void this.outputCtx.close().catch(() => undefined);
      this.outputCtx = null;
    }

    if (this.ws) {
      const ws = this.ws;
      this.ws = null;
      ws.onopen = null;
      ws.onmessage = null;
      ws.onerror = null;
      ws.onclose = null;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    }

    this.callbacks.onInputLevel(0);
    this.callbacks.onOutputLevel(0);
    if (!keepErrorState) {
      this.callbacks.onStateChange('idle');
    }
  }
}
