<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { getApiUrl, API_CONFIG } from '$lib/config';

	type VideoData = {
		video: {
			id: number;
			link: string;
			username: string;
		};
		scores: {
			id: number;
			score: number;
			comment: string | null;
			username: string;
		}[];
		average: number;
	};

	// Route parameter
	const playlistId = page.params.id;

	// State
	let videosData: VideoData[] = $state([]);
	let isLoading = $state(true);
	let error = $state('');
	let userId: number | null = $state(null);

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

		await loadScoresData();
	});

	async function loadScoresData() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(getApiUrl(`${API_CONFIG.ENDPOINTS.SCORES_ALL}/${playlistId}`), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include'
			});

			const data = await response.json();

			if (response.ok) {
				videosData = data;
				sortVideoDataByAverage(videosData);
			} else {
				error = data.error || 'Failed to load scores data';
			}
		} catch {
			error = 'Failed to load scores data. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function sortVideoDataByAverage(videoData: VideoData[]) {
		return videoData.sort((a, b) => a.average - b.average);
	}

	function extractVideoId(embedUrl: string): string {
		try {
			return embedUrl.split('/embed/')[1]?.split('?')[0] || 'Unknown';
		} catch {
			return 'Unknown';
		}
	}

	function formatAverage(average: number): string {
		return average > 0 ? average.toFixed(2) : 'No ratings';
	}

	function getScoreColor(score: number): string {
		if (score === 11) return 'bg-yellow-100 text-yellow-800';
		if (score >= 8) return 'bg-green-100 text-green-800';
		if (score >= 6) return 'bg-blue-100 text-blue-800';
		if (score >= 4) return 'bg-orange-100 text-orange-800';
		return 'bg-red-100 text-red-800';
	}

	function getAverageColor(average: number): string {
		if (average === 0) return 'bg-gray-100 text-gray-800';
		if (average >= 8) return 'bg-green-100 text-green-800';
		if (average >= 6) return 'bg-blue-100 text-blue-800';
		if (average >= 4) return 'bg-orange-100 text-orange-800';
		return 'bg-red-100 text-red-800';
	}
</script>

<svelte:head>
	<title>Playlist Scores - Playlist {playlistId}</title>
</svelte:head>

<div class="mx-auto max-w-7xl">
	<!-- Header -->
	<div class="mb-8">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="mb-2 text-3xl font-bold text-gray-900">Playlist Scores</h1>
				<p class="text-lg text-gray-600">Playlist {playlistId}</p>
			</div>
			<button
				onclick={() => goto('/')}
				class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
			>
				← Back to Dashboard
			</button>
		</div>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<span class="ml-2 text-gray-600">Loading scores...</span>
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
	{#if !isLoading && !error}
		{#if videosData.length === 0}
			<div class="py-12 text-center">
				<h3 class="mb-2 text-lg font-medium text-gray-900">No videos found</h3>
				<p class="text-gray-600">This playlist doesn't have any videos yet.</p>
			</div>
		{:else}
			<div class="space-y-8">
				{#each videosData as videoData, index (videoData.video.id)}
					<div class="overflow-hidden rounded-lg bg-white shadow-md">
						<div class="p-6">
							<!-- Video Header -->
							<div class="mb-4 flex items-center justify-between">
								<div>
									<h3 class="text-xl font-semibold text-gray-900">
										Video {index + 1}
									</h3>
									<p class="mt-1 text-sm text-gray-600">
										Submitted by: <span class="font-medium">{videoData.video.username}</span>
									</p>
									<p class="mt-1 text-xs text-gray-500">
										Video ID: {extractVideoId(videoData.video.link)}
									</p>
								</div>
								<div class="text-right">
									<div class="flex items-center space-x-2">
										<span class="text-sm text-gray-600">Average:</span>
										<span
											class="inline-flex items-center rounded-full px-3 py-1 text-sm font-medium {getAverageColor(
												videoData.average
											)}"
										>
											{formatAverage(videoData.average)}
										</span>
									</div>
								</div>
							</div>

							<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
								<!-- Video Embed -->
								<div class="aspect-video w-full overflow-hidden rounded-lg bg-gray-100">
									<iframe
										src={videoData.video.link}
										title="YouTube video player"
										frameborder="0"
										allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
										allowfullscreen
										class="h-full w-full"
									></iframe>
								</div>

								<!-- Scores Section -->
								<div class="space-y-4">
									<h4 class="text-lg font-medium text-gray-900">
										Ratings & Comments ({videoData.scores.length})
									</h4>

									{#if videoData.scores.length === 0}
										<div class="rounded-lg bg-gray-50 py-6 text-center">
											<p class="text-sm text-gray-600">No ratings yet</p>
										</div>
									{:else}
										<div class="max-h-64 space-y-3 overflow-y-auto">
											{#each videoData.scores as score (score.id)}
												<div class="rounded-lg border border-gray-200 p-4">
													<div class="mb-2 flex items-center justify-between">
														<div class="flex items-center space-x-2">
															<span class="font-medium text-gray-900">{score.username}</span>
															<span
																class="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium {getScoreColor(
																	score.score
																)}"
															>
																{score.score}
																{#if score.score === 11}⭐{/if}
															</span>
														</div>
													</div>
													{#if score.comment}
														<p class="mt-2 rounded bg-gray-50 p-2 text-sm text-gray-700">
															"{score.comment}"
														</p>
													{:else}
														<p class="text-xs text-gray-500 italic">No comment</p>
													{/if}
												</div>
											{/each}
										</div>

										<!-- Score Statistics -->
										<div class="mt-4 border-t pt-4">
											<div class="grid grid-cols-3 gap-4 text-center">
												<div>
													<p class="text-xs text-gray-500">Total Ratings</p>
													<p class="text-lg font-semibold text-gray-900">
														{videoData.scores.length}
													</p>
												</div>
												<div>
													<p class="text-xs text-gray-500">Highest Score</p>
													<p class="text-lg font-semibold text-gray-900">
														{Math.max(...videoData.scores.map((s) => s.score))}
													</p>
												</div>
												<div>
													<p class="text-xs text-gray-500">Lowest Score</p>
													<p class="text-lg font-semibold text-gray-900">
														{Math.min(...videoData.scores.map((s) => s.score))}
													</p>
												</div>
											</div>
										</div>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Overall Statistics -->
			<div class="mt-8 rounded-lg bg-white p-6 shadow-md">
				<h3 class="mb-4 text-xl font-semibold text-gray-900">Playlist Overview</h3>
				<div class="grid grid-cols-2 gap-4 md:grid-cols-4">
					<div class="text-center">
						<p class="text-sm text-gray-500">Total Videos</p>
						<p class="text-2xl font-bold text-gray-900">{videosData.length}</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-500">Total Ratings</p>
						<p class="text-2xl font-bold text-gray-900">
							{videosData.reduce((sum, video) => sum + video.scores.length, 0)}
						</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-500">Videos with Ratings</p>
						<p class="text-2xl font-bold text-gray-900">
							{videosData.filter((video) => video.scores.length > 0).length}
						</p>
					</div>
					<div class="text-center">
						<p class="text-sm text-gray-500">Overall Average</p>
						<p class="text-2xl font-bold text-gray-900">
							{videosData.length > 0
								? (
										videosData
											.filter((v) => v.average > 0)
											.reduce((sum, video) => sum + video.average, 0) /
											videosData.filter((v) => v.average > 0).length || 0
									).toFixed(1)
								: '0.0'}
						</p>
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>
