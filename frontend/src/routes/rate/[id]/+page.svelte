<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

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
	});

	async function loadVideos() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(`http://localhost:3000/api/videos/${playlistId}`, {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
			});

			const data = await response.json();

			if (data.videos && data.videos.length > 0) {
				videos = data.videos;
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

	async function loadAllScores() {
		const token = localStorage.getItem('auth_token');
		const scorePromises = videos.map(async (video) => {
			try {
				const response = await fetch(`http://localhost:3000/api/scores/${video.id}`, {
					method: 'GET',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
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
			const response = await fetch(`http://localhost:3000/api/scores/${currentVideo.id}`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
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

	async function submitComment() {
		if (!currentVideo || currentScore === 0) return;
		await submitScore(currentScore);
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
			<button
				onclick={() => goto('/rate')}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				← Back to Playlists
			</button>
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
							onblur={submitComment}
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
</div>
