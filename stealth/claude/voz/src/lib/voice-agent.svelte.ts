import type { ConnectionStatus, Message, SessionSettings, TokenResponse } from './types';
import { audioToBase64, base64ToInt16, int16ToFloat32 } from './audio-utils';
import { handleToolCall } from './tool-handlers';

const MAX_BUFFER_SAMPLES = 240_000; // ~10 seconds at 24 kHz
const TOKEN_REFRESH_MARGIN = 5_000; // Refresh 5s before expiry
const CONNECTION_TIMEOUT = 10_000;
const MAX_RETRIES = 5;
const MODEL = 'grok-voice-think-fast-1.0';

export const DEFAULT_INSTRUCTIONS = `You are a friendly and solution-oriented customer support representative. Your goal is to help customers resolve issues quickly while providing a positive experience.

## Core Behaviors
- Look up orders, track shipments, and provide delivery status updates
- Process returns, exchanges, and refunds according to company policy
- Troubleshoot common product issues with clear step-by-step guidance
- Answer frequently asked questions about products, services, and policies
- Escalate complex issues to specialized teams when needed

## Communication Style
- Be patient, helpful, and empathetic — especially with frustrated customers
- Focus on solutions rather than problems
- Confirm you've resolved the issue before ending the conversation
- If you can't solve something immediately, set clear expectations for follow-up

## Guidelines
- Always verify the customer's identity before sharing account details
- Offer alternatives when the first solution isn't possible
- Thank customers for their patience and business`;

export const DEFAULT_SETTINGS: SessionSettings = {
	voice: 'Eve',
	instructions: DEFAULT_INSTRUCTIONS,
	vadThreshold: 0.5,
	silenceDuration: 500,
	prefixPadding: 300,
	enableWebSearch: true,
	enableXSearch: true
};

export class VoiceAgent {
	// --- Reactive state (exposed to UI) ---
	status = $state<ConnectionStatus>('idle');
	messages = $state<Message[]>([]);
	error = $state<string | null>(null);
	micLevel = $state(0);
	settings = $state<SessionSettings>({ ...DEFAULT_SETTINGS });

	// --- Private state ---
	private ws: WebSocket | null = null;
	private audioCtx: AudioContext | null = null;
	private micStream: MediaStream | null = null;
	private workletNode: AudioWorkletNode | null = null;
	private sourceNode: MediaStreamAudioSourceNode | null = null;
	private analyserNode: AnalyserNode | null = null;

	private sessionToken: string | null = null;
	private tokenExpiresAt = 0;
	private tokenRefreshTimer: ReturnType<typeof setTimeout> | null = null;

	private isSessionReady = false;
	private micBuffer: Int16Array[] = [];
	private micBufferSamples = 0;

	private intentionalDisconnect = false;
	private currentResponseId: string | null = null;

	private nextPlayTime = 0;
	private queuedSources: AudioBufferSourceNode[] = [];

	private connectionTimer: ReturnType<typeof setTimeout> | null = null;
	private micLevelInterval: ReturnType<typeof setInterval> | null = null;

	// =========================================================================
	// Public API
	// =========================================================================

	async connect(): Promise<void> {
		if (this.status === 'connecting' || this.status === 'active') return;

		this.status = 'connecting';
		this.error = null;
		this.intentionalDisconnect = false;
		this.isSessionReady = false;
		this.micBuffer = [];
		this.micBufferSamples = 0;
		this.currentResponseId = null;
		this.nextPlayTime = 0;
		this.queuedSources = [];

		try {
			// AudioContext MUST be created in user-gesture handler (Safari requirement)
			if (!this.audioCtx || this.audioCtx.state === 'closed') {
				this.audioCtx = new AudioContext({ sampleRate: 24000 });
			}
			if (this.audioCtx.state === 'suspended') {
				await this.audioCtx.resume();
			}

			// Parallel: mic capture + token fetch
			const results = await Promise.allSettled([
				this.setupMicCapture(),
				this.fetchSessionToken()
			]);

			const micResult = results[0];
			const tokenResult = results[1];

			if (micResult.status === 'rejected') {
				throw this.parseMicError(micResult.reason);
			}
			if (tokenResult.status === 'rejected') {
				throw new Error('Failed to get session token');
			}

			// Connect WebSocket — mic is already capturing & buffering
			await this.connectWebSocket(tokenResult.value);
		} catch (err) {
			this.status = 'error';
			this.error = err instanceof Error ? err.message : 'Connection failed';
			this.cleanup();
		}
	}

	disconnect(): void {
		this.intentionalDisconnect = true;
		this.cleanup();
		this.status = 'idle';
		this.error = null;
	}

	sendText(text: string): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN || !this.isSessionReady) return;

		this.messages.push({
			id: crypto.randomUUID(),
			role: 'user',
			content: text,
			timestamp: Date.now(),
			interrupted: false,
			isStreaming: false
		});

		this.wsSend({
			type: 'conversation.item.create',
			item: {
				type: 'message',
				role: 'user',
				content: [{ type: 'input_text', text }]
			}
		});
		this.wsSend({ type: 'response.create' });
	}

	destroy(): void {
		this.intentionalDisconnect = true;
		this.cleanup();
	}

	// =========================================================================
	// Mic capture
	// =========================================================================

	private async setupMicCapture(): Promise<void> {
		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				echoCancellation: true,
				noiseSuppression: true,
				autoGainControl: true,
				sampleRate: 24000
			}
		});

		this.micStream = stream;

		// Detect mic disconnection mid-session
		for (const track of stream.getAudioTracks()) {
			track.onended = () => {
				if (this.status === 'active') {
					this.error = 'Microphone disconnected';
					this.disconnect();
				}
			};
		}

		const ctx = this.audioCtx!;
		await ctx.audioWorklet.addModule('/pcm-processor-worklet.js');

		this.sourceNode = ctx.createMediaStreamSource(stream);
		this.workletNode = new AudioWorkletNode(ctx, 'pcm-processor');

		// Analyser for mic-level visualization
		this.analyserNode = ctx.createAnalyser();
		this.analyserNode.fftSize = 256;
		this.sourceNode.connect(this.analyserNode);
		this.startMicLevelMonitoring();

		// PCM data handler — buffers until session ready
		this.workletNode.port.onmessage = (event: MessageEvent<Int16Array>) => {
			const int16Data = event.data;

			if (this.isSessionReady && this.ws?.readyState === WebSocket.OPEN) {
				this.wsSend({
					type: 'input_audio_buffer.append',
					audio: audioToBase64(int16Data)
				});
			} else if (this.micBufferSamples < MAX_BUFFER_SAMPLES) {
				this.micBuffer.push(int16Data);
				this.micBufferSamples += int16Data.length;
			}
		};

		this.sourceNode.connect(this.workletNode);
	}

	private startMicLevelMonitoring(): void {
		if (!this.analyserNode) return;
		const dataArray = new Uint8Array(this.analyserNode.frequencyBinCount);

		this.micLevelInterval = setInterval(() => {
			if (!this.analyserNode) return;
			this.analyserNode.getByteTimeDomainData(dataArray);

			let sum = 0;
			for (let i = 0; i < dataArray.length; i++) {
				const val = (dataArray[i] - 128) / 128;
				sum += val * val;
			}
			this.micLevel = Math.sqrt(sum / dataArray.length);
		}, 50);
	}

	// =========================================================================
	// Token management
	// =========================================================================

	private async fetchSessionToken(): Promise<string> {
		const res = await fetch('/api/token', { method: 'POST' });
		if (!res.ok) {
			const body = await res.text().catch(() => '');
			throw new Error(`Token fetch failed (${res.status}): ${body}`);
		}

		const data: TokenResponse = await res.json();
		this.sessionToken = data.value;
		this.tokenExpiresAt = data.expires_at * 1000;
		this.scheduleTokenRefresh();
		return data.value;
	}

	private scheduleTokenRefresh(): void {
		if (this.tokenRefreshTimer) clearTimeout(this.tokenRefreshTimer);

		const refreshIn = Math.max(0, this.tokenExpiresAt - Date.now() - TOKEN_REFRESH_MARGIN);
		this.tokenRefreshTimer = setTimeout(async () => {
			try {
				await this.fetchSessionToken();
			} catch {
				await this.retryTokenRefresh();
			}
		}, refreshIn);
	}

	private async retryTokenRefresh(attempt = 0): Promise<void> {
		if (attempt >= MAX_RETRIES) {
			this.error = 'Session expired — please reconnect';
			this.disconnect();
			return;
		}

		const delay = Math.min(1000 * Math.pow(2, attempt), 10_000);
		await new Promise((r) => setTimeout(r, delay));

		try {
			await this.fetchSessionToken();
		} catch {
			await this.retryTokenRefresh(attempt + 1);
		}
	}

	// =========================================================================
	// WebSocket
	// =========================================================================

	private connectWebSocket(token: string): Promise<void> {
		return new Promise((resolve, reject) => {
			const ws = new WebSocket(
				`wss://api.x.ai/v1/realtime?model=${MODEL}`,
				[`xai-client-secret.${token}`]
			);
			this.ws = ws;

			// Connection timeout
			this.connectionTimer = setTimeout(() => {
				if (ws.readyState !== WebSocket.OPEN) {
					ws.close();
					reject(new Error('Connection timed out'));
				}
			}, CONNECTION_TIMEOUT);

			ws.onopen = () => {
				if (this.connectionTimer) {
					clearTimeout(this.connectionTimer);
					this.connectionTimer = null;
				}
				this.wsSend({ type: 'session.update', session: this.buildSessionConfig() });
				resolve();
			};

			ws.onmessage = ({ data }: MessageEvent) => {
				try {
					const event = JSON.parse(data as string);
					this.handleEvent(event);
				} catch (err) {
					console.error('[voz] Failed to parse event:', err);
				}
			};

			ws.onerror = () => {
				if (this.connectionTimer) {
					clearTimeout(this.connectionTimer);
					this.connectionTimer = null;
				}
				if (!this.intentionalDisconnect) {
					reject(new Error('WebSocket error'));
				}
			};

			ws.onclose = () => {
				if (this.connectionTimer) {
					clearTimeout(this.connectionTimer);
					this.connectionTimer = null;
				}
				if (!this.intentionalDisconnect && this.status === 'active') {
					this.status = 'error';
					this.error = 'Connection lost';
					this.cleanup();
				}
			};
		});
	}

	private buildSessionConfig() {
		const tools: unknown[] = [];

		if (this.settings.enableWebSearch) tools.push({ type: 'web_search' });
		if (this.settings.enableXSearch) tools.push({ type: 'x_search' });

		// Custom function tools
		tools.push(
			{
				type: 'function',
				name: 'lookup_order',
				description: 'Look up order details and status',
				parameters: {
					type: 'object',
					properties: {
						order_id: { type: 'string', description: 'Order number or ID' },
						customer_email: {
							type: 'string',
							description: 'Email address associated with the order'
						}
					},
					required: ['order_id'],
					additionalProperties: false
				}
			},
			{
				type: 'function',
				name: 'track_shipment',
				description: 'Get real-time shipping status and estimated delivery',
				parameters: {
					type: 'object',
					properties: {
						order_id: { type: 'string', description: 'Order number' }
					},
					required: ['order_id'],
					additionalProperties: false
				}
			},
			{
				type: 'function',
				name: 'initiate_return',
				description: 'Start a return or exchange process',
				parameters: {
					type: 'object',
					properties: {
						order_id: { type: 'string', description: 'Order number' },
						items: { type: 'string', description: 'Items to return' },
						reason: { type: 'string', description: 'Reason for return' },
						refund_or_exchange: {
							type: 'string',
							enum: ['refund', 'exchange'],
							description: 'Whether the customer wants a refund or exchange'
						}
					},
					required: ['order_id', 'items', 'reason'],
					additionalProperties: false
				}
			},
			{
				type: 'function',
				name: 'escalate_to_specialist',
				description: 'Transfer the case to a specialized support team',
				parameters: {
					type: 'object',
					properties: {
						department: {
							type: 'string',
							description:
								'Department to escalate to (e.g., billing, technical, management)'
						},
						issue_summary: { type: 'string', description: 'Brief summary of the issue' },
						customer_contact: {
							type: 'string',
							description: 'Best way to reach the customer'
						}
					},
					required: ['department', 'issue_summary'],
					additionalProperties: false
				}
			}
		);

		return {
			voice: this.settings.voice,
			instructions: this.settings.instructions,
			turn_detection: { type: 'server_vad' },
			tools,
			input_audio_transcription: { model: 'grok-2-audio' },
			audio: {
				input: { format: { type: 'audio/pcm', rate: 24000 } },
				output: { format: { type: 'audio/pcm', rate: 24000 } }
			}
		};
	}

	// =========================================================================
	// Event routing
	// =========================================================================

	private handleEvent(event: Record<string, unknown>): void {
		switch (event.type) {
			case 'session.created':
				break;

			case 'session.updated':
				this.isSessionReady = true;
				this.status = 'active';
				this.flushMicBuffer();
				break;

			case 'conversation.item.input_audio_transcription.completed':
				this.messages.push({
					id: crypto.randomUUID(),
					role: 'user',
					content: (event.transcript as string) || '',
					timestamp: Date.now(),
					interrupted: false,
					isStreaming: false
				});
				break;

			case 'response.created':
				this.currentResponseId =
					(event.response as Record<string, unknown>)?.id as string | undefined ?? null;
				break;

			case 'response.output_audio.delta':
				this.playPcmChunk(event.delta as string);
				break;

			case 'response.output_audio_transcript.delta':
				this.appendTranscriptDelta((event.delta as string) || '');
				break;

			case 'response.output_audio_transcript.done': {
				const msg = this.findCurrentAssistantMessage();
				if (msg) {
					msg.content = (event.transcript as string) || msg.content;
					msg.isStreaming = false;
				}
				break;
			}

			case 'response.done':
				this.currentResponseId = null;
				break;

			case 'response.function_call_arguments.done':
				this.handleFunctionCall(event);
				break;

			case 'input_audio_buffer.speech_started':
				this.onSpeechStarted();
				break;

			case 'error':
				console.error('[voz] API error:', event.code, event.message);
				this.error = (event.message as string) || 'API error';
				break;
		}
	}

	// =========================================================================
	// Transcript management
	// =========================================================================

	private appendTranscriptDelta(delta: string): void {
		let msg = this.findCurrentAssistantMessage();
		if (!msg && this.currentResponseId) {
			const newMsg: Message = {
				id: crypto.randomUUID(),
				role: 'assistant',
				content: delta,
				timestamp: Date.now(),
				interrupted: false,
				isStreaming: true,
				responseId: this.currentResponseId
			};
			this.messages.push(newMsg);
		} else if (msg) {
			msg.content += delta;
		}
	}

	private findCurrentAssistantMessage(): Message | undefined {
		if (!this.currentResponseId) return undefined;
		const rid = this.currentResponseId;
		for (let i = this.messages.length - 1; i >= 0; i--) {
			const m = this.messages[i];
			if (m.role === 'assistant' && m.responseId === rid) return m;
		}
		return undefined;
	}

	// =========================================================================
	// Audio playback
	// =========================================================================

	private playPcmChunk(base64: string): void {
		if (!this.audioCtx) return;

		const int16 = base64ToInt16(base64);
		const float32 = int16ToFloat32(int16);

		const buf = this.audioCtx.createBuffer(1, float32.length, 24000);
		buf.getChannelData(0).set(float32);

		const src = this.audioCtx.createBufferSource();
		src.buffer = buf;
		src.connect(this.audioCtx.destination);

		const now = this.audioCtx.currentTime;
		const startAt = Math.max(now, this.nextPlayTime);
		src.start(startAt);
		this.nextPlayTime = startAt + buf.duration;

		this.queuedSources.push(src);
		src.onended = () => {
			const idx = this.queuedSources.indexOf(src);
			if (idx !== -1) this.queuedSources.splice(idx, 1);
		};
	}

	private interruptPlayback(): void {
		for (const src of this.queuedSources) {
			try {
				src.stop();
			} catch {
				/* already stopped */
			}
		}
		this.queuedSources.length = 0;
		this.nextPlayTime = 0;
	}

	// =========================================================================
	// Interruption
	// =========================================================================

	private onSpeechStarted(): void {
		this.interruptPlayback();
		this.wsSend({ type: 'response.cancel' });

		const msg = this.findCurrentAssistantMessage();
		if (msg) {
			msg.interrupted = true;
			msg.isStreaming = false;
		}
		this.currentResponseId = null;
	}

	// =========================================================================
	// Tool calls
	// =========================================================================

	private async handleFunctionCall(event: Record<string, unknown>): Promise<void> {
		const name = event.name as string;
		const callId = event.call_id as string;
		const args = event.arguments as string;

		try {
			const result = await handleToolCall(name, JSON.parse(args));

			this.wsSend({
				type: 'conversation.item.create',
				item: {
					type: 'function_call_output',
					call_id: callId,
					output: JSON.stringify(result)
				}
			});
			this.wsSend({ type: 'response.create' });
		} catch (err) {
			console.error('[voz] Tool call failed:', err);
		}
	}

	// =========================================================================
	// Mic buffer flush
	// =========================================================================

	private flushMicBuffer(): void {
		if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

		for (const chunk of this.micBuffer) {
			this.wsSend({
				type: 'input_audio_buffer.append',
				audio: audioToBase64(chunk)
			});
		}
		this.micBuffer = [];
		this.micBufferSamples = 0;
	}

	// =========================================================================
	// Helpers
	// =========================================================================

	private wsSend(data: unknown): void {
		if (this.ws?.readyState === WebSocket.OPEN) {
			this.ws.send(JSON.stringify(data));
		}
	}

	private parseMicError(err: unknown): Error {
		const e = err as { name?: string; message?: string };
		if (e?.name === 'NotAllowedError') {
			return new Error('Microphone access denied — check browser permissions');
		}
		if (e?.name === 'NotFoundError') {
			return new Error('No microphone found');
		}
		return new Error('Microphone error: ' + (e?.message || 'unknown'));
	}

	// =========================================================================
	// Cleanup
	// =========================================================================

	private cleanup(): void {
		// Mic stream
		if (this.micStream) {
			this.micStream.getTracks().forEach((t) => t.stop());
			this.micStream = null;
		}

		// Audio nodes
		this.workletNode?.disconnect();
		this.workletNode = null;
		this.sourceNode?.disconnect();
		this.sourceNode = null;
		this.analyserNode?.disconnect();
		this.analyserNode = null;

		// Mic level monitoring
		if (this.micLevelInterval) {
			clearInterval(this.micLevelInterval);
			this.micLevelInterval = null;
		}
		this.micLevel = 0;

		// AudioContext
		if (this.audioCtx && this.audioCtx.state !== 'closed') {
			this.audioCtx.close().catch(() => {});
			this.audioCtx = null;
		}

		// Playback
		this.interruptPlayback();

		// WebSocket
		if (this.ws) {
			this.ws.onclose = null;
			this.ws.onerror = null;
			this.ws.close();
			this.ws = null;
		}

		// Timers
		if (this.connectionTimer) {
			clearTimeout(this.connectionTimer);
			this.connectionTimer = null;
		}
		if (this.tokenRefreshTimer) {
			clearTimeout(this.tokenRefreshTimer);
			this.tokenRefreshTimer = null;
		}

		this.isSessionReady = false;
		this.micBuffer = [];
		this.micBufferSamples = 0;
	}
}
