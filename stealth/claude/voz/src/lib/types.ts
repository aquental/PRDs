export type ConnectionStatus = 'idle' | 'connecting' | 'active' | 'error';

export type Voice = 'Eve' | 'Ara' | 'Leo' | 'Rex' | 'Sal';

export interface Message {
	id: string;
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
	interrupted: boolean;
	isStreaming: boolean;
	responseId?: string;
}

export interface SessionSettings {
	voice: Voice;
	instructions: string;
	vadThreshold: number;
	silenceDuration: number;
	prefixPadding: number;
	enableWebSearch: boolean;
	enableXSearch: boolean;
}

export interface TokenResponse {
	value: string;
	expires_at: number;
}
