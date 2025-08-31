<script lang="ts">
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

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
			const response = await fetch('http://localhost:3000/api/playlists/all', {
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				}
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
		goto(`/rate/${playlistId}`);
	}
</script>

<svelte:head>
	<title>Rate Videos</title>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">Rate Videos</h1>
		<p class="text-lg text-gray-600">Select a playlist to rate its videos</p>
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
			onclick={() => {
				error = '';
				loadPlaylists();
			}}
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
							d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
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
					<div
						class="group relative cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-yellow-300 hover:bg-yellow-50 hover:shadow-md focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:outline-none"
						onclick={() => handlePlaylistClick(playlist.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handlePlaylistClick(playlist.id)}
					>
						<!-- Card Header -->
						<div class="mb-4 flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg bg-yellow-100 group-hover:bg-yellow-200"
							>
								<svg
									class="h-6 w-6 text-yellow-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									></path>
								</svg>
							</div>
							<svg
								class="h-5 w-5 text-gray-400 group-hover:text-yellow-500"
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
							<div class="flex items-center text-sm text-yellow-600">
								<span>Rate videos</span>
								<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
									></path>
								</svg>
							</div>
						</div>
					</div>
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
