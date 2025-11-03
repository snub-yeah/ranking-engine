<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getApiUrl, API_CONFIG } from '$lib/config';

	type Video = {
		id: number;
		link: string;
		userId: number;
		playlistId: number;
	};

	type Score = {
		id?: number;
		score: number;
		comment: string | null;
		userId: number;
		videoId: number;
	};

	// Route parameter
	const playlistId = page.params.id;

	// State
	let videos: Video[] = $state([]);
	let currentVideo: Video | null = $state(null);
	let currentScore: number = $state(0);
	let currentComment: string = $state('');
	let userScores: Record<number, Score> = $state({});
	let isLoading = $state(true);
	let isScoreLoading = $state(false);
	let error = $state('');
	let scoreError = $state('');
	let userId: number | null = $state(null);
	let hasUsedEleven = $state(false);
	let isPlaylistOwner = $state(false);
	let showContributorModal = $state(false);
	let contributors: Array<{ user_id: number; username: string }> = $state([]);
	let searchUsers: Array<{ id: number; username: string }> = $state([]);
	let searchQuery = $state('');
	let isContributorLoading = $state(false);
	let contributorError = $state('');

	onMount(async () => {
		// Get user ID from token
		const token = localStorage.getItem('auth_token');
		if (token) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				userId = payload.id;
			} catch {
				goto('/');
				return;
			}
		} else {
			goto('/');
			return;
		}

		await loadVideos();
		await checkPlaylistOwnership();
	});

	async function checkPlaylistOwnership() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${playlistId}`), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include'
			});

			const data = await response.json();
			if (data.playlist && data.playlist.length > 0) {
				isPlaylistOwner = data.playlist[0].userId === userId;
				if (isPlaylistOwner) {
					await loadContributors();
				}
			}
		} catch {
			// Silently fail - user just won't see the button
		}
	}

	async function loadContributors() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(
				getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS_CONTRIBUTORS}/${playlistId}/contributors`),
				{
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					credentials: 'include'
				}
			);

			const data = await response.json();
			if (data.contributors) {
				contributors = data.contributors;
			}
		} catch {
			contributors = [];
		}
	}

	async function openContributorModal() {
		showContributorModal = true;
		searchQuery = '';
		await loadUsers();
	}

	async function loadUsers() {
		try {
			const token = localStorage.getItem('auth_token');
			const url = new URL(getApiUrl(API_CONFIG.ENDPOINTS.USERS_SEARCH));
			if (searchQuery.trim()) {
				url.searchParams.set('q', searchQuery);
			}
			url.searchParams.set('limit', '10');

			const response = await fetch(url.toString(), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include'
			});

			const data = await response.json();
			if (data.users) {
				searchUsers = data.users;
			}
		} catch {
			searchUsers = [];
		}
	}

	async function handleSearchInput(e: Event) {
		const target = e.target as HTMLInputElement;
		searchQuery = target.value;
		// Debounce search
		setTimeout(() => {
			if (target.value === searchQuery) {
				loadUsers();
			}
		}, 300);
	}

	async function toggleContributor(userId: number) {
		const isContributor = contributors.some((c) => c.user_id === userId);
		isContributorLoading = true;
		contributorError = '';

		try {
			const token = localStorage.getItem('auth_token');
			if (isContributor) {
				// Remove contributor
				const response = await fetch(
					getApiUrl(
						`${API_CONFIG.ENDPOINTS.PLAYLISTS_CONTRIBUTORS}/${playlistId}/contributors/${userId}`
					),
					{
						method: 'DELETE',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`
						},
						credentials: 'include'
					}
				);

				const data = await response.json();
				if (data.success) {
					contributors = contributors.filter((c) => c.user_id !== userId);
				} else {
					contributorError = data.error || 'Failed to remove contributor';
				}
			} else {
				// Add contributor
				const response = await fetch(
					getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS_CONTRIBUTORS}/${playlistId}/contributors`),
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Authorization: `Bearer ${token}`
						},
						credentials: 'include',
						body: JSON.stringify({ userId })
					}
				);

				const data = await response.json();
				if (data.success) {
					// Reload users to get updated list with username
					await loadUsers();
					await loadContributors();
				} else {
					contributorError = data.error || 'Failed to add contributor';
				}
			}
		} catch {
			contributorError = 'Connection error. Please try again.';
		} finally {
			isContributorLoading = false;
		}
	}

	function closeContributorModal() {
		showContributorModal = false;
		searchQuery = '';
		searchUsers = [];
		contributorError = '';
	}

	async function loadVideos() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.VIDEOS}/${playlistId}`), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include'
			});

			const data = await response.json();

			if (data.videos && data.videos.length > 0) {
				videos = data.videos;
				videos = shuffleArray(videos);
				// Load scores for all videos
				await loadAllScores();
				// Set first video as current
				await selectVideo(videos[0]);
			} else {
				error = 'No videos found in this playlist';
			}
		} catch {
			error = 'Failed to load videos. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function shuffleArray(array: Video[]) {
		for (let i = array.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[array[i], array[j]] = [array[j], array[i]];
		}
		return array;
	}

	async function loadAllScores() {
		const token = localStorage.getItem('auth_token');
		const scorePromises = videos.map(async (video) => {
			try {
				const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.SCORES}/${video.id}`), {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					},
					credentials: 'include'
				});
				const data = await response.json();
				return { videoId: video.id, score: data };
			} catch {
				return { videoId: video.id, score: { score: 0, comment: null } };
			}
		});

		const scores = await Promise.all(scorePromises);
		const scoresMap: Record<number, Score> = {};
		let foundEleven = false;

		scores.forEach(({ videoId, score }) => {
			if (score.score) {
				scoresMap[videoId] = score;
				if (score.score === 11) {
					foundEleven = true;
				}
			}
		});

		userScores = scoresMap;
		hasUsedEleven = foundEleven;
	}

	async function selectVideo(video: Video) {
		currentVideo = video;
		const existingScore = userScores[video.id];
		if (existingScore) {
			currentScore = existingScore.score;
			currentComment = existingScore.comment || '';
		} else {
			currentScore = 0;
			currentComment = '';
		}
	}

	async function submitScore(newScore: number) {
		if (!currentVideo || isScoreLoading) return;

		// Check if trying to give 11 to own video
		if (newScore === 11 && currentVideo.userId === userId) {
			scoreError = "You can't give an 11 to your own video";
			return;
		}

		// Check if trying to give 11 when already used (and it's a different video)
		if (newScore === 11 && hasUsedEleven) {
			const existingScore = userScores[currentVideo.id];
			if (!existingScore || existingScore.score !== 11) {
				scoreError = 'You have already used your 11 score on another video';
				return;
			}
		}

		isScoreLoading = true;
		scoreError = '';

		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.SCORES}/${currentVideo.id}`), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include',
				body: JSON.stringify({
					score: newScore,
					comment: currentComment.trim() || null
				})
			});

			const data = await response.json();

			if (data.success) {
				currentScore = newScore;

				// Update userScores object
				const prevScore = userScores[currentVideo.id];
				userScores[currentVideo.id] = {
					score: newScore,
					comment: currentComment.trim() || null,
					userId: userId!,
					videoId: currentVideo.id
				};

				// Update hasUsedEleven flag
				if (newScore === 11) {
					hasUsedEleven = true;
				} else if (prevScore?.score === 11) {
					// Check if 11 is still used on any other video
					const stillHasEleven = Object.values(userScores).some(
						(score) => score.videoId !== currentVideo!.id && score.score === 11
					);
					hasUsedEleven = stillHasEleven;
				}
			} else {
				scoreError = data.error || 'Failed to submit score';
			}
		} catch {
			scoreError = 'Failed to submit score. Please try again.';
		} finally {
			isScoreLoading = false;
		}
	}

	async function submitComment(videoId?: number, score?: number, comment?: string) {
		// Use provided parameters or fall back to current state
		const targetVideoId = videoId || currentVideo?.id;
		const targetScore = score !== undefined ? score : currentScore;
		const targetComment = comment !== undefined ? comment : currentComment;

		if (!targetVideoId || targetScore === 0) return;

		// Temporarily update state to submit for the correct video
		const originalVideo = currentVideo;
		const originalScore = currentScore;
		const originalComment = currentComment;

		// Find the target video
		const targetVideo = videos.find((v) => v.id === targetVideoId);
		if (!targetVideo) return;

		// Temporarily set state for submission
		currentVideo = targetVideo;
		currentScore = targetScore;
		currentComment = targetComment;

		await submitScore(targetScore);

		// Restore original state if we're not looking at the target video anymore
		if (originalVideo?.id !== targetVideoId) {
			currentVideo = originalVideo;
			currentScore = originalScore;
			currentComment = originalComment;
		}
	}

	function extractVideoTitle(embedUrl: string): string {
		try {
			const videoId = embedUrl.split('/embed/')[1]?.split('?')[0];
			return videoId ? `Video: ${videoId.substring(0, 11)}...` : 'Unknown Video';
		} catch {
			return 'Unknown Video';
		}
	}

	function handleRatingClick(score: number) {
		submitScore(score);
	}
</script>

<svelte:head>
	<title>Rate Videos - Playlist {playlistId}</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-gray-900">Rate Videos</h1>
				<p class="text-lg text-gray-600">Playlist {playlistId}</p>
			</div>
			<div class="flex gap-2">
				{#if isPlaylistOwner}
					<button
						onclick={openContributorModal}
						class="rounded-md border border-indigo-300 bg-indigo-50 px-4 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-100 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						Manage Contributors
					</button>
				{/if}
				<button
					onclick={() => goto('/rate')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					← Back to Playlists
				</button>
			</div>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<span class="ml-2 text-gray-600">Loading videos...</span>
		</div>
	{/if}

	<!-- Error State -->
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

	<!-- Main Content -->
	{#if !isLoading && !error && currentVideo}
		<div class="grid grid-cols-1 gap-8 lg:grid-cols-3">
			<!-- Main Video and Rating Section -->
			<div class="lg:col-span-2">
				<!-- Video Embed -->
				<div class="mb-6 aspect-video w-full overflow-hidden rounded-lg bg-gray-100 shadow-lg">
					<iframe
						src={currentVideo.link}
						title="YouTube video player"
						frameborder="0"
						allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
						allowfullscreen
						class="h-full w-full"
					></iframe>
				</div>

				<!-- Rating Section -->
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h3 class="mb-4 text-xl font-semibold text-gray-900">Rate this video</h3>

					<!-- Score Error -->
					{#if scoreError}
						<div class="mb-4 rounded-md bg-red-50 p-3">
							<p class="text-sm text-red-600">{scoreError}</p>
						</div>
					{/if}

					<!-- Rating Buttons -->
					<div class="mb-6">
						<div class="flex flex-wrap gap-2">
							{#each Array.from({ length: 10 }, (_, i) => i + 1) as score (score)}
								<button
									onclick={() => handleRatingClick(score)}
									disabled={isScoreLoading}
									class="flex h-12 w-12 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all disabled:opacity-50 {currentScore ===
									score
										? 'border-blue-500 bg-blue-500 text-white'
										: 'border-gray-300 bg-white text-gray-700 hover:border-blue-300 hover:bg-blue-50'}"
								>
									{score}
								</button>
							{/each}

							<!-- Special 11 Button -->
							<button
								onclick={() => handleRatingClick(11)}
								disabled={isScoreLoading ||
									(hasUsedEleven && currentScore !== 11) ||
									currentVideo.userId === userId}
								class="flex h-12 w-16 items-center justify-center rounded-lg border-2 text-sm font-semibold transition-all disabled:opacity-30 {currentScore ===
								11
									? 'border-yellow-500 bg-yellow-500 text-white'
									: 'border-yellow-400 bg-white text-yellow-600 hover:border-yellow-500 hover:bg-yellow-50'}"
								title={currentVideo.userId === userId
									? "Can't give 11 to your own video"
									: hasUsedEleven && currentScore !== 11
										? 'You have already used your 11 score'
										: 'Special 11 score (one per playlist)'}
							>
								11
							</button>
						</div>

						<div class="mt-2 text-sm text-gray-600">
							{#if currentVideo.userId === userId}
								<p class="text-orange-600">You submitted this video</p>
							{/if}
							{#if hasUsedEleven && currentScore !== 11}
								<p class="text-yellow-600">You've used your special 11 score</p>
							{/if}
						</div>
					</div>

					<!-- Comment Section -->
					<div>
						<label for="comment" class="mb-2 block text-sm font-medium text-gray-700">
							Comment (optional)
						</label>
						<textarea
							id="comment"
							bind:value={currentComment}
							onblur={(e) => {
								const videoId = currentVideo?.id;
								const score = currentScore;
								const target = e.target as HTMLTextAreaElement;
								const comment = target.value;
								if (videoId && score > 0) {
									submitComment(videoId, score, comment);
								}
							}}
							placeholder="Add a comment about this video..."
							rows="3"
							class="w-full rounded-md border border-gray-300 px-3 py-2 text-sm placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
						></textarea>
					</div>

					<!-- Current Score Display -->
					{#if currentScore > 0}
						<div class="mt-4 rounded-md bg-green-50 p-3">
							<p class="text-sm font-medium text-green-800">
								Your rating: <span class="text-lg">{currentScore}</span>
								{#if currentScore === 11}
									<span class="ml-1 text-yellow-600">⭐</span>
								{/if}
							</p>
						</div>
					{/if}
				</div>
			</div>

			<!-- Video List Sidebar -->
			<div class="lg:col-span-1">
				<div class="rounded-lg bg-white p-6 shadow-md">
					<h3 class="mb-4 text-lg font-semibold text-gray-900">
						Videos ({videos.length})
					</h3>

					<div class="max-h-96 space-y-2 overflow-y-auto">
						{#each videos as video, index (video.id)}
							<button
								onclick={() => selectVideo(video)}
								class="w-full rounded-lg border p-3 text-left transition-all hover:bg-gray-50 {currentVideo?.id ===
								video.id
									? 'border-blue-500 bg-blue-50'
									: 'border-gray-200'}"
							>
								<div class="flex items-center justify-between">
									<div class="min-w-0 flex-1">
										<p class="truncate text-sm font-medium text-gray-900">
											{index + 1}. {extractVideoTitle(video.link)}
										</p>
										{#if video.userId === userId}
											<p class="mt-1 text-xs text-orange-600">Your video</p>
										{/if}
									</div>

									<div class="ml-2 flex-shrink-0">
										{#if userScores[video.id]}
											{@const score = userScores[video.id]}
											<span
												class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {score.score ===
												11
													? 'bg-yellow-100 text-yellow-800'
													: 'bg-blue-100 text-blue-800'}"
											>
												{score.score}
												{#if score.score === 11}⭐{/if}
											</span>
										{:else}
											<span
												class="inline-flex items-center rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600"
											>
												—
											</span>
										{/if}
									</div>
								</div>
							</button>
						{/each}
					</div>
				</div>
			</div>
		</div>
	{/if}

	<!-- Contributor Management Modal -->
	{#if showContributorModal}
		<div
			class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
			onclick={(e) => {
				if (e.target === e.currentTarget) closeContributorModal();
			}}
			role="dialog"
			aria-modal="true"
			aria-labelledby="modal-title"
		>
			<div
				class="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-xl"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Modal Header -->
				<div class="border-b border-gray-200 px-6 py-4">
					<div class="flex items-center justify-between">
						<h2 id="modal-title" class="text-xl font-semibold text-gray-900">
							Manage Contributors
						</h2>
						<button
							onclick={closeContributorModal}
							class="text-gray-400 hover:text-gray-600 focus:outline-none"
						>
							<svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M6 18L18 6M6 6l12 12"
								></path>
							</svg>
						</button>
					</div>
				</div>

				<!-- Modal Body -->
				<div class="px-6 py-4">
					<!-- Error Message -->
					{#if contributorError}
						<div class="mb-4 rounded-md bg-red-50 p-3">
							<p class="text-sm text-red-600">{contributorError}</p>
						</div>
					{/if}

					<!-- Current Contributors -->
					<div class="mb-6">
						<h3 class="mb-3 text-sm font-medium text-gray-700">Current Contributors</h3>
						{#if contributors.length > 0}
							<div class="space-y-2">
								{#each contributors as contributor (contributor.user_id)}
									<div
										class="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-4 py-2"
									>
										<span class="text-sm text-gray-900">{contributor.username}</span>
										<button
											onclick={() => toggleContributor(contributor.user_id)}
											disabled={isContributorLoading}
											class="text-sm text-red-600 hover:text-red-700 disabled:opacity-50"
										>
											Remove
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<p class="text-sm text-gray-500">No contributors yet. Only you can add videos and rate.</p>
						{/if}
					</div>

					<!-- Search for Users -->
					<div>
						<label for="user-search" class="mb-2 block text-sm font-medium text-gray-700">
							Search Users to Add
						</label>
						<input
							id="user-search"
							type="text"
							value={searchQuery}
							oninput={handleSearchInput}
							placeholder="Type to search users..."
							class="mb-4 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
						/>

						<!-- User List -->
						<div class="max-h-64 space-y-2 overflow-y-auto">
							{#each searchUsers as user (user.id)}
								{@const isContributor = contributors.some((c) => c.user_id === user.id)}
								{@const isCurrentUser = user.id === userId}
								{#if !isCurrentUser}
									<div
										class="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 {isContributor
											? 'bg-green-50'
											: 'bg-white'}"
									>
										<span class="text-sm text-gray-900">{user.username}</span>
										<button
											onclick={() => toggleContributor(user.id)}
											disabled={isContributorLoading}
											class="rounded-md px-3 py-1 text-sm font-medium {isContributor
												? 'bg-red-100 text-red-700 hover:bg-red-200'
												: 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'} disabled:opacity-50"
										>
											{isContributor ? 'Remove' : 'Add'}
										</button>
									</div>
								{/if}
							{/each}
							{#if searchUsers.length === 0 && searchQuery.trim()}
								<p class="py-4 text-center text-sm text-gray-500">No users found</p>
							{/if}
						</div>
					</div>
				</div>

				<!-- Modal Footer -->
				<div class="border-t border-gray-200 px-6 py-4">
					<button
						onclick={closeContributorModal}
						class="w-full rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					>
						Close
					</button>
				</div>
			</div>
		</div>
	{/if}
</div>
