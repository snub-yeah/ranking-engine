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
	let deleteConfirmId: number | null = $state(null);
	let isDeleting = $state(false);

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
		goto(`/scores/${playlistId}`);
	}

	function showDeleteConfirm(playlistId: number, event: Event) {
		event.stopPropagation(); // Prevent card click
		deleteConfirmId = playlistId;
	}

	function cancelDelete() {
		deleteConfirmId = null;
	}

	async function confirmDelete() {
		if (!deleteConfirmId) return;

		isDeleting = true;
		try {
			const token = localStorage.getItem('auth_token');
			const response = await fetch(
				getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${deleteConfirmId}`),
				{
					method: 'DELETE',
					headers: {
						'Content-Type': 'application/json',
						Authorization: `Bearer ${token}`
					}
				}
			);

			const data = await response.json();

			if (response.ok && data.success) {
				// Remove the deleted playlist from the list
				playlists = playlists.filter((p) => p.id !== deleteConfirmId);
				deleteConfirmId = null;
			} else {
				error = data.error || 'Failed to delete playlist';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isDeleting = false;
		}
	}
</script>

<svelte:head>
	<title>View Scores</title>
</svelte:head>

<div class="mx-auto max-w-6xl">
	<div class="mb-8">
		<h1 class="mb-2 text-3xl font-bold text-gray-900">View Scores</h1>
		<p class="text-lg text-gray-600">Select a playlist to view its scores</p>
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
							d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4"
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
						class="group relative cursor-pointer rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:border-blue-300 hover:bg-blue-50 hover:shadow-md focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
						onclick={() => handlePlaylistClick(playlist.id)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && handlePlaylistClick(playlist.id)}
					>
						<!-- Card Header -->
						<div class="mb-4 flex items-start justify-between">
							<div
								class="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200"
							>
								<svg
									class="h-6 w-6 text-blue-600"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4"
									></path>
								</svg>
							</div>
							<div class="flex space-x-2">
								<!-- Delete Button -->
								<button
									onclick={(e) => showDeleteConfirm(playlist.id, e)}
									class="rounded-md p-1.5 text-gray-400 hover:bg-red-100 hover:text-red-600 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none"
									title="Delete playlist"
								>
									<svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
										></path>
									</svg>
								</button>
								<svg
									class="h-5 w-5 text-gray-400 group-hover:text-blue-500"
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
							<div class="flex items-center text-sm text-blue-600">
								<span>View scores</span>
								<svg class="ml-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4"
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

<!-- Delete Confirmation Modal -->
{#if deleteConfirmId !== null}
	<div class="fixed inset-0 z-50 overflow-y-auto">
		<div
			class="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0"
		>
			<!-- Background overlay -->
			<div
				class="bg-opacity-75 fixed inset-0 bg-gray-500 transition-opacity"
				onclick={cancelDelete}
			></div>

			<!-- Modal panel -->
			<div
				class="relative z-10 inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle"
			>
				<div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
					<div class="sm:flex sm:items-start">
						<div
							class="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-red-100 sm:mx-0 sm:h-10 sm:w-10"
						>
							<svg
								class="h-6 w-6 text-red-600"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
								></path>
							</svg>
						</div>
						<div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
							<h3 class="text-lg leading-6 font-medium text-gray-900">Delete Playlist</h3>
							<div class="mt-2">
								<p class="text-sm text-gray-500">
									Are you sure you want to delete this playlist? This action cannot be undone and
									will permanently remove the playlist and all associated data.
								</p>
							</div>
						</div>
					</div>
				</div>
				<div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
					<button
						onclick={confirmDelete}
						disabled={isDeleting}
						class="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:ml-3 sm:w-auto sm:text-sm"
					>
						{#if isDeleting}
							<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							Deleting...
						{:else}
							Delete
						{/if}
					</button>
					<button
						onclick={cancelDelete}
						disabled={isDeleting}
						class="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
					>
						Cancel
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}
