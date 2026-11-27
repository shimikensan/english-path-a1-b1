export interface VerifiedAudioFormat {
  ext: 'mp3' | 'wav' | 'ogg' | 'm4a' | 'webm' | 'aac' | 'flac';
  mime:
    | 'audio/mpeg'
    | 'audio/wav'
    | 'audio/ogg'
    | 'audio/mp4'
    | 'audio/webm'
    | 'audio/aac'
    | 'audio/flac';
}

export const MAX_CLUB_AUDIO_UPLOAD_BYTES = 15 * 1024 * 1024; // 15 MB
// 460,800 bytes is divisible by 3 -> 614,400 base64 chars (~600 KB), well under Firestore's 1 MiB doc limit
export const CLUB_AUDIO_CHUNK_RAW_BYTES = 460_800;
export const MAX_CLUB_AUDIO_CHUNKS = 40;

export const ALLOWED_CLUB_AUDIO_EXTENSIONS = [
  '.mp3',
  '.wav',
  '.ogg',
  '.m4a',
  '.webm',
  '.aac',
  '.flac',
] as const;

export const LEGACY_SERVER_AUDIO_URL_REGEX =
  /^\/api\/club\/music\/files\/club_bgm_[0-9]+_[a-f0-9]{12}\.(mp3|wav|ogg|m4a|webm|aac|flac)$/;

export const FIRESTORE_AUDIO_URL_REGEX =
  /^firestore:\/\/club_music_chunks\/(club_bgm_[0-9]+_[a-f0-9]{12})\/([1-9]|[1-3][0-9]|40)$/;

export function isValidUploadedClubAudioUrl(url: string): boolean {
  return LEGACY_SERVER_AUDIO_URL_REGEX.test(url) || FIRESTORE_AUDIO_URL_REGEX.test(url);
}

export function parseFirestoreClubAudioUrl(
  url: string
): { trackId: string; totalChunks: number } | null {
  const match = FIRESTORE_AUDIO_URL_REGEX.exec(url);
  if (!match) return null;
  const totalChunks = Number.parseInt(match[2], 10);
  if (!Number.isInteger(totalChunks) || totalChunks < 1 || totalChunks > MAX_CLUB_AUDIO_CHUNKS) {
    return null;
  }
  return {
    trackId: match[1],
    totalChunks,
  };
}

function isMpegAudioFrameSync(bytes: Uint8Array, offset: number): boolean {
  if (offset + 3 >= bytes.length) return false;
  const b0 = bytes[offset];
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  // Frame sync: 11 set bits (0xFF followed by 0xE0..0xFF)
  if (b0 !== 0xff || (b1 & 0xe0) !== 0xe0) return false;
  // MPEG version bits (bits 4..3): 01 is reserved
  const versionBits = (b1 >> 3) & 0x03;
  if (versionBits === 1) return false;
  // Layer bits (bits 2..1): 00 is reserved (for ADTS AAC, layer is 00 — checked separately)
  const layerBits = (b1 >> 1) & 0x03;
  if (layerBits === 0) return false;
  // Bitrate index (bits 7..4 of byte 2): 0x0F is invalid
  const bitrateIdx = (b2 >> 4) & 0x0f;
  if (bitrateIdx === 0x0f) return false;
  // Sample rate index (bits 3..2 of byte 2): 0x03 is reserved
  const sampleRateIdx = (b2 >> 2) & 0x03;
  if (sampleRateIdx === 0x03) return false;
  return true;
}

function isAdtsAacFrameSync(bytes: Uint8Array, offset: number): boolean {
  if (offset + 3 >= bytes.length) return false;
  const b0 = bytes[offset];
  const b1 = bytes[offset + 1];
  const b2 = bytes[offset + 2];
  // ADTS syncword: 12 set bits (0xFFF) and layer == 00 -> b1 is 0xF0, 0xF1, 0xF8, or 0xF9
  if (b0 !== 0xff || (b1 & 0xf6) !== 0xf0) return false;
  // Sampling frequency index (bits 5..2 of b2): 15 (0x0F) is forbidden
  const sampleFreqIdx = (b2 >> 2) & 0x0f;
  return sampleFreqIdx < 13;
}

/**
 * Inspects binary magic headers (including padded MP3 frames) to ensure the
 * uploaded file is a genuine supported audio file rather than a disguised payload.
 */
export function detectVerifiedAudioFormat(bytes: Uint8Array): VerifiedAudioFormat | null {
  if (!bytes || bytes.length < 12) return null;

  // 1. MP3 with ID3v2 tag ("ID3")
  if (bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    return { ext: 'mp3', mime: 'audio/mpeg' };
  }

  // 2. WAV ("RIFF" .... "WAVE")
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x41 &&
    bytes[10] === 0x56 &&
    bytes[11] === 0x45
  ) {
    return { ext: 'wav', mime: 'audio/wav' };
  }

  // 3. OGG ("OggS")
  if (bytes[0] === 0x4f && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
    return { ext: 'ogg', mime: 'audio/ogg' };
  }

  // 4. FLAC ("fLaC")
  if (bytes[0] === 0x66 && bytes[1] === 0x4c && bytes[2] === 0x61 && bytes[3] === 0x43) {
    return { ext: 'flac', mime: 'audio/flac' };
  }

  // 5. M4A / MP4 ISO Base Media container (offset 4..7 == "ftyp")
  if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) {
    return { ext: 'm4a', mime: 'audio/mp4' };
  }

  // 6. WebM / Matroska EBML header (0x1A 0x45 0xDF 0xA3)
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    return { ext: 'webm', mime: 'audio/webm' };
  }

  // 7. Raw MP3 or ADTS AAC at byte 0
  if (isMpegAudioFrameSync(bytes, 0)) {
    return { ext: 'mp3', mime: 'audio/mpeg' };
  }
  if (isAdtsAacFrameSync(bytes, 0)) {
    return { ext: 'aac', mime: 'audio/aac' };
  }

  // 8. Real-world MP3s sometimes start with zero padding bytes before the first sync frame or ID3 tag
  const scanLimit = Math.min(bytes.length - 4, 4096);
  let idx = 0;
  while (idx < scanLimit && bytes[idx] === 0x00) {
    idx += 1;
  }
  if (idx > 0 && idx < scanLimit) {
    if (bytes[idx] === 0x49 && bytes[idx + 1] === 0x44 && bytes[idx + 2] === 0x33) {
      return { ext: 'mp3', mime: 'audio/mpeg' };
    }
    if (isMpegAudioFrameSync(bytes, idx)) {
      return { ext: 'mp3', mime: 'audio/mpeg' };
    }
    if (isAdtsAacFrameSync(bytes, idx)) {
      return { ext: 'aac', mime: 'audio/aac' };
    }
  }

  return null;
}

export function bytesToBase64(bytes: Uint8Array): string {
  const sliceSize = 0x8000;
  const parts: string[] = [];
  for (let i = 0; i < bytes.length; i += sliceSize) {
    const chunk = bytes.subarray(i, Math.min(i + sliceSize, bytes.length));
    parts.push(String.fromCharCode(...chunk));
  }
  return btoa(parts.join(''));
}

export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const len = binary.length;
  const out = new Uint8Array(len);
  for (let i = 0; i < len; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

export function generateClubTrackId(): string {
  const randBytes = new Uint8Array(6);
  crypto.getRandomValues(randBytes);
  const hex = Array.from(randBytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
  return `club_bgm_${Date.now()}_${hex}`;
}
