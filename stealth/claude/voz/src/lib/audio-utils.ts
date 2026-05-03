/**
 * Chunked base64 encoding for Int16Array audio data.
 * Avoids stack overflow from spread operator on large buffers.
 */
export function audioToBase64(int16Array: Int16Array): string {
	const bytes = new Uint8Array(int16Array.buffer, int16Array.byteOffset, int16Array.byteLength);
	const CHUNK = 0x2000; // 8 KiB chunks
	const parts: string[] = [];
	for (let i = 0; i < bytes.length; i += CHUNK) {
		parts.push(String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + CHUNK))));
	}
	return btoa(parts.join(''));
}

/**
 * Decode base64-encoded PCM audio to Int16Array.
 */
export function base64ToInt16(base64: string): Int16Array {
	const raw = atob(base64);
	const bytes = new Uint8Array(raw.length);
	for (let i = 0; i < raw.length; i++) {
		bytes[i] = raw.charCodeAt(i);
	}
	return new Int16Array(bytes.buffer);
}

/**
 * Convert Int16 PCM samples to Float32 for Web Audio API playback.
 */
export function int16ToFloat32(int16: Int16Array): Float32Array {
	const float32 = new Float32Array(int16.length);
	for (let i = 0; i < int16.length; i++) {
		float32[i] = int16[i] / 32768;
	}
	return float32;
}
