<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';
	import { getApiUrl, API_CONFIG } from '$lib/config';

	type Playlist = {
		id: number;
		name: string;
		videoLimit: number;
		doesOwnerVoteCount: number;
		userId: number;
	};

	// Get playlist ID from route params
	let playlistId = $derived($page.params.id);

	// State variables
	let playlist: Playlist | null = $state(null);
	let videoLinks: string[] = $state([]);
	let thumbnails: string[] = $state([]);
	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let error = $state('');
	let success = $state('');
	let validationErrors: string[] = $state([]);

	const convertYoutubeUrlToThumbnailUrl = (url: string) => {
		if (!url.trim()) return '';

		let videoId;
		if (url.startsWith('https://www.youtube.com/watch?v=')) {
			videoId = url.split('v=')[1];
			if (videoId) {
				videoId = videoId.split('&')[0];
			}
		} else if (url.startsWith('https://youtu.be/')) {
			videoId = url.split('youtu.be/')[1];
			if (videoId) {
				videoId = videoId.split('?')[0];
			}
		} else if (url.startsWith('https://drive.google.com/file/d/')) {
			videoId = url.split('/d/')[1];
			if (videoId) {
				videoId = videoId.split('/preview')[0];
			}
		}

		if (videoId) {
			return `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
		}
		return '';
	};

	const validateYouTubeUrl = (url: string) => {
		if (!url.trim()) return true; // Empty is allowed
		return (
			url.startsWith('https://www.youtube.com/watch?v=') ||
			url.startsWith('https://youtu.be/') ||
			url.startsWith('https://drive.google.com/file/d/')
		);
	};

	const convertToEmbedUrl = (url: string) => {
		if (!url.trim()) return '';

		let videoCode;
		if (url.startsWith('https://www.youtube.com/watch?v=')) {
			videoCode = url.split('v=')[1];
			if (videoCode) {
				videoCode = videoCode.split('&')[0];
			}
		} else if (url.startsWith('https://youtu.be/')) {
			videoCode = url.split('/')[3];
			if (videoCode) {
				videoCode = videoCode.split('?')[0];
			}
		}

		if (videoCode) {
			return `https://www.youtube.com/embed/${videoCode}`;
		}
		return url;
	};

	onMount(async () => {
		await loadPlaylistData();
	});

	async function loadPlaylistData() {
		try {
			const token = localStorage.getItem('auth_token');
			if (!token) {
				error = 'You must be logged in to add videos';
				isLoading = false;
				return;
			}

			// Load playlist info
			const playlistResponse = await fetch(
				getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${playlistId}`),
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				}
			);

			const playlistData = await playlistResponse.json();

			if (playlistData.playlist && playlistData.playlist.length > 0) {
				playlist = playlistData.playlist[0];

				if (playlist?.videoLimit) {
					// Initialize video links array based on video limit
					videoLinks = new Array(playlist.videoLimit).fill('');
					thumbnails = new Array(playlist.videoLimit).fill('');
					validationErrors = new Array(playlist.videoLimit).fill('');

					// Load existing submissions
					await loadExistingSubmissions(token);
				}
			} else {
				error = 'Playlist not found';
			}
		} catch {
			error = 'Failed to load playlist data';
		} finally {
			isLoading = false;
		}
	}

	async function loadExistingSubmissions(token: string) {
		try {
			const submissionsResponse = await fetch(
				getApiUrl(`${API_CONFIG.ENDPOINTS.MY_SUBMISSIONS}/${playlistId}`),
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				}
			);

			const submissionsData = await submissionsResponse.json();

			if (submissionsData.videos && !submissionsData.error && submissionsData.videos.length > 0) {
				// Convert embed URLs back to regular YouTube URLs for editing
				submissionsData.videos.forEach((video: any, index: number) => {
					if (index < videoLinks.length) {
						// Convert embed URL back to regular YouTube URL
						let originalUrl = video.link;
						if (originalUrl.includes('youtube.com/embed/')) {
							const videoId = originalUrl.split('embed/')[1];
							originalUrl = `https://www.youtube.com/watch?v=${videoId}`;
						}

						videoLinks[index] = originalUrl;
						thumbnails[index] = convertYoutubeUrlToThumbnailUrl(originalUrl);
					}
				});
			}
		} catch {
			console.log('No existing submissions found or error loading them');
		}
	}

	function handleVideoLinkChange(index: number, value: string) {
		videoLinks[index] = value;
		validationErrors[index] = '';

		if (value.trim()) {
			if (validateYouTubeUrl(value)) {
				thumbnails[index] = convertYoutubeUrlToThumbnailUrl(value);
			} else {
				validationErrors[index] = 'Please enter a valid YouTube URL';
				thumbnails[index] = '';
			}
		} else {
			thumbnails[index] = '';
		}
	}

	async function handleSubmit() {
		if (isSubmitting) return;

		// Reset messages
		error = '';
		success = '';

		// Validate all links
		const errors = videoLinks.map((link) => {
			if (link.trim() && !validateYouTubeUrl(link)) {
				return 'Invalid YouTube URL';
			}
			return '';
		});

		validationErrors = errors;

		if (errors.some((err) => err)) {
			error = 'Please fix the invalid YouTube URLs';
			return;
		}

		// Filter out empty links
		const nonEmptyLinks = videoLinks.filter((link) => link.trim());

		if (nonEmptyLinks.length === 0) {
			error = 'Please add at least one video';
			return;
		}

		isSubmitting = true;

		try {
			const token = localStorage.getItem('auth_token');
			if (!token) {
				error = 'You must be logged in to submit videos';
				isSubmitting = false;
				return;
			}

			// Convert URLs to embed format as the backend expects
			const embedLinks = nonEmptyLinks.map(convertToEmbedUrl);

			const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.VIDEOS}/${playlistId}`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					links: embedLinks
				})
			});

			const data = await response.json();

			if (response.ok && data.message) {
				success = 'Videos submitted successfully!';
				// Optionally redirect after a delay
				setTimeout(() => {
					goto('/add-videos');
				}, 2000);
			} else {
				error = data.error || 'Failed to submit videos';
			}
		} catch {
			error = 'Connection error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Add Videos - {playlist?.name || 'Loading...'}</title>
</svelte:head>

<div class="mx-auto max-w-4xl">
	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<span class="ml-2 text-gray-600">Loading playlist...</span>
		</div>
	{:else if playlist}
		<!-- Header -->
		<div class="mb-8">
			<div class="mb-4 flex items-center justify-between">
				<div>
					<h1 class="text-3xl font-bold text-gray-900">Add Videos</h1>
					<p class="mt-2 text-lg text-gray-600">
						Adding videos to: <span class="font-semibold text-gray-800">{playlist.name}</span>
					</p>
				</div>
				<button
					onclick={() => goto('/add-videos')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					← Back to Playlists
				</button>
			</div>

			<div class="rounded-lg border border-blue-200 bg-blue-50 p-4">
				<div class="flex items-center">
					<svg
						class="mr-2 h-5 w-5 text-blue-400"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						></path>
					</svg>
					<p class="text-sm text-blue-800">
						You can add up to <strong>{playlist.videoLimit}</strong> video{playlist.videoLimit !== 1
							? 's'
							: ''} to this playlist. Paste YouTube links and thumbnails will appear automatically.
					</p>
				</div>
			</div>
		</div>

		<!-- Success Message -->
		{#if success}
			<div class="mb-6 rounded-md bg-green-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-green-800">{success}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Error Message -->
		{#if error}
			<div class="mb-6 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="flex-shrink-0">
						<svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
								clip-rule="evenodd"
							/>
						</svg>
					</div>
					<div class="ml-3">
						<p class="text-sm font-medium text-red-800">{error}</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Video Input Cards -->
		<div class="mb-8 space-y-6">
			{#each { length: playlist.videoLimit } as _, index (index)}
				<div class="rounded-lg border border-gray-200 bg-white shadow">
					<div class="px-6 py-4">
						<div class="mb-4 flex items-center justify-between">
							<h3 class="text-lg font-medium text-gray-900">Video {index + 1}</h3>
						</div>

						<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
							<!-- URL Input -->
							<div>
								<label for="video-{index}" class="mb-2 block text-sm font-medium text-gray-700">
									YouTube URL
								</label>
								<input
									id="video-{index}"
									type="url"
									value={videoLinks[index]}
									onblur={(e) => handleVideoLinkChange(index, (e.target as HTMLInputElement).value)}
									oninput={(e) =>
										handleVideoLinkChange(index, (e.target as HTMLInputElement).value)}
									placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
									class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm {validationErrors[
										index
									]
										? 'border-red-300 focus:border-red-500 focus:ring-red-500'
										: ''}"
									disabled={isSubmitting}
								/>
								{#if validationErrors[index]}
									<p class="mt-1 text-sm text-red-600">{validationErrors[index]}</p>
								{:else}
									<p class="mt-1 text-xs text-gray-500">
										Paste a YouTube link and the thumbnail will appear automatically
									</p>
								{/if}
							</div>

							<!-- Thumbnail Preview -->
							<div>
								<div class="mb-2 block text-sm font-medium text-gray-700">Preview</div>
								<div
									class="flex aspect-video items-center justify-center overflow-hidden rounded-lg bg-gray-100"
								>
									{#if thumbnails[index]}
										<img
											src={thumbnails[index]}
											alt="Video thumbnail"
											class="h-full w-full object-cover"
											onerror={(e) => {
												const target = e.target as HTMLImageElement;
												const parent = target.parentNode as HTMLElement;
												target.style.display = 'none';
												parent.innerHTML =
													'<div class="text-gray-400 text-center"><svg class="h-8 w-8 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg><p class="text-sm">Thumbnail unavailable</p></div>';
											}}
										/>
									{:else}
										<div class="text-center text-gray-400">
											<svg
												class="mx-auto mb-2 h-12 w-12"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
												></path>
											</svg>
											<p class="text-sm">No video selected</p>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Submit Button -->
		<div class="flex justify-end space-x-3">
			<button
				type="button"
				onclick={() => goto('/add-videos')}
				class="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				disabled={isSubmitting}
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleSubmit}
				class="rounded-md border border-transparent bg-indigo-600 px-6 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
				disabled={isSubmitting}
			>
				{isSubmitting ? 'Saving...' : 'Save Videos'}
			</button>
		</div>
	{:else}
		<!-- Error State -->
		<div class="py-12 text-center">
			<div class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
				<svg class="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
					></path>
				</svg>
			</div>
			<h3 class="mb-2 text-lg font-medium text-gray-900">Error Loading Playlist</h3>
			<p class="mb-4 text-gray-600">{error || 'An unexpected error occurred'}</p>
			<button
				onclick={() => goto('/add-videos')}
				class="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				← Back to Playlists
			</button>
		</div>
	{/if}
</div>
