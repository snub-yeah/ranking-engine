import { env } from '$env/dynamic/public';

/**
 * API Configuration
 * Centralized configuration for all backend API calls
 */
export const API_CONFIG = {
	/**
	 * Base URL for all API calls
	 * Defaults to localhost:3000 for development
	 */
	BASE_URL: env.PUBLIC_API_BASE_URL || 'http://localhost:3000',

	/**
	 * API endpoints
	 */
	ENDPOINTS: {
		// Auth
		LOGIN: '/api/users/login',

		// Playlists
		PLAYLISTS: '/api/playlists',
		PLAYLISTS_ALL: '/api/playlists/all',

		// Videos
		VIDEOS: '/api/videos',
		MY_SUBMISSIONS: '/api/videos/my-submissions',

		// Scores
		SCORES: '/api/scores',
		SCORES_ALL: '/api/scores/all'
	}
} as const;

/**
 * Helper function to build full API URL
 * @param endpoint - The API endpoint (with leading slash)
 * @returns Full URL for the API call
 */
export function getApiUrl(endpoint: string): string {
	return `${API_CONFIG.BASE_URL}${endpoint}`;
}

/**
 * Helper function to make authenticated fetch requests
 * @param endpoint - The API endpoint
 * @param options - Fetch options
 * @returns Promise with the fetch response
 */
export async function apiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
	const token = localStorage.getItem('auth_token');

	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		...(options.headers as Record<string, string>)
	};

	if (token) {
		headers.Authorization = `Bearer ${token}`;
	}

	return fetch(getApiUrl(endpoint), {
		...options,
		headers
	});
}
