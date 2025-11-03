<script lang="ts">
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

	let playlists: Playlist[] = $state([]);
	let isLoading = $state(true);
	let error = $state('');

	onMount(async () => {
		await loadPlaylists();
	});

	async function loadPlaylists() {
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PLAYLISTS_ALL), {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				credentials: 'include'
			});
			const data = await response.json();

			if (data.playlists) {
				playlists = data.playlists;
			} else {
				error = 'Failed to load playlists';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	function handlePlaylistClick(playlistId: number) {
		goto(`/add-videos/${playlistId}`);
	}
</script>

<svelte:head>
	<title>Add Videos to Playlist</title>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Add Videos to Playlist</h1>
		<p class="text-lg text-gray-600">Select a playlist to add videos to</p>
	</div>

	<!-- Loading State -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="h-8 w-8 animate-spin rounded-full border-b-2 border-gray-900"></div>
			<span class="ml-2 text-gray-600">Loading playlists...</span>
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
		<button
			onclick={loadPlaylists}
			class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
		>
			Try Again
		</button>
	{/if}

	<!-- Playlists Grid -->
	{#if !isLoading && !error}
		{#if playlists.length === 0}
			<div class="py-12 text-center">
				<div
					class="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-gray-100"
				>
					<svg class="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
						></path>
					</svg>
				</div>
				<h3 class="mb-2 text-lg font-medium text-gray-900">No playlists found</h3>
				<p class="mb-4 text-gray-600">Create your first playlist to get started.</p>
				<button
					onclick={() => goto('/create-playlist')}
					class="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
				>
					Create Playlist
				</button>
			</div>
		{:else}
			<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
				{#each playlists as playlist (playlist.id)}
					<button
						onclick={() => handlePlaylistClick(playlist.id)}
						class="group relative cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-green-300 hover:bg-green-50 hover:shadow-md focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:outline-none"
					>
						<!-- Card Header -->
						<div class="mb-4 flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200"
							>
								<svg
									class="h-6 w-6 text-green-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
									></path>
								</svg>
							</div>
							<svg
								class="h-5 w-5 text-gray-400 group-hover:text-green-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M9 5l7 7-7 7"
								></path>
							</svg>
						</div>

						<!-- Playlist Info -->
						<div>
							<h3 class="mb-2 text-lg font-semibold text-gray-900 group-hover:text-gray-800">
								{playlist.name}
							</h3>
							<div class="space-y-1">
								<p class="text-sm text-gray-600">
									<span class="font-medium">Video Limit:</span>
									{playlist.videoLimit}
								</p>
								<p class="text-sm text-gray-600">
									<span class="font-medium">Owner Votes:</span>
									{playlist.doesOwnerVoteCount ? 'Yes' : 'No'}
								</p>
							</div>
						</div>

						<!-- Click indicator -->
						<div
							class="absolute right-4 bottom-4 opacity-0 transition-opacity group-hover:opacity-100"
						>
							<div class="flex items-center text-sm text-green-600">
								<span>Add videos</span>
								<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 6v6m0 0v6m0-6h6m-6 0H6"
									></path>
								</svg>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	{/if}

	<!-- Back to Home Button -->
	<div class="mt-8 flex justify-center">
		<button
			onclick={() => goto('/')}
			class="rounded-md border border-gray-300 bg-white px-6 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
		>
			← Back to Home
		</button>
	</div>
</div>
