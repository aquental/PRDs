/**
 * Integração Google Calendar para a Interface Paciente (sync bidirecional).
 * Um paciente NÃO se autentica no Psi — ele apenas recebe convites como
 * `attendee` no evento criado pelo calendar do terapeuta.
 *
 * O `refresh_token` do terapeuta fica criptografado em
 * `therapists.google_refresh_token_encrypted` (pgcrypto).
 */
import { serverConfig } from '$lib/config.server';

export interface GCalEvent {
	summary: string;
	description?: string;
	start: { dateTime: string; timeZone: string };
	end: { dateTime: string; timeZone: string };
	attendees?: { email: string }[];
	reminders?: { useDefault: boolean };
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
	const cfg = serverConfig();
	const res = await fetch('https://oauth2.googleapis.com/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			client_id: cfg.GOOGLE_CLIENT_ID,
			client_secret: cfg.GOOGLE_CLIENT_SECRET,
			refresh_token: refreshToken,
			grant_type: 'refresh_token'
		})
	});
	if (!res.ok) throw new Error(`Google token refresh failed: ${res.status}`);
	const data = await res.json();
	return data.access_token as string;
}

export async function upsertCalendarEvent(params: {
	refreshToken: string;
	calendarId: string;
	eventId?: string;
	event: GCalEvent;
}): Promise<{ id: string }> {
	const accessToken = await refreshAccessToken(params.refreshToken);
	const url = params.eventId
		? `https://www.googleapis.com/calendar/v3/calendars/${params.calendarId}/events/${params.eventId}?sendUpdates=all`
		: `https://www.googleapis.com/calendar/v3/calendars/${params.calendarId}/events?sendUpdates=all`;

	const res = await fetch(url, {
		method: params.eventId ? 'PATCH' : 'POST',
		headers: {
			Authorization: `Bearer ${accessToken}`,
			'Content-Type': 'application/json'
		},
		body: JSON.stringify(params.event)
	});
	if (!res.ok) {
		const text = await res.text();
		throw new Error(`GCal upsert error ${res.status}: ${text}`);
	}
	const data = await res.json();
	return { id: data.id };
}

export async function deleteCalendarEvent(params: {
	refreshToken: string;
	calendarId: string;
	eventId: string;
}): Promise<void> {
	const accessToken = await refreshAccessToken(params.refreshToken);
	const res = await fetch(
		`https://www.googleapis.com/calendar/v3/calendars/${params.calendarId}/events/${params.eventId}?sendUpdates=all`,
		{ method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
	);
	if (!res.ok && res.status !== 410 /* already gone */) {
		throw new Error(`GCal delete error ${res.status}`);
	}
}
