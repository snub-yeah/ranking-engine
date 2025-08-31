<script lang="ts">
	import { goto } from '$app/navigation';
	import { getApiUrl, API_CONFIG } from '$lib/config';

	// Form state
	let formData = $state({
		name: '',
		videoLimit: 5,
		doesOwnerVoteCount: true
	});

	let isSubmitting = $state(false);
	let error = $state('');
	let success = $state('');

	async function handleSubmit() {
		if (isSubmitting) return;

		// Reset messages
		error = '';
		success = '';

		// Basic validation
		if (!formData.name.trim()) {
			error = 'Playlist name is required';
			return;
		}

		if (formData.videoLimit < 1) {
			error = 'Video limit must be at least 1';
			return;
		}

		isSubmitting = true;

		try {
			// Get JWT token from localStorage
			const token = localStorage.getItem('auth_token');
			if (!token) {
				error = 'You must be logged in to create a playlist';
				isSubmitting = false;
				return;
			}
			const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PLAYLISTS), {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${token}`
				},
				body: JSON.stringify({
					name: formData.name.trim(),
					videoLimit: formData.videoLimit,
					doesOwnerVoteCount: formData.doesOwnerVoteCount ? 1 : 0
				})
			});

			const data = await response.json();

			if (data.success) {
				success = 'Playlist created successfully!';
				// Reset form
				formData = {
					name: '',
					videoLimit: 10,
					doesOwnerVoteCount: true
				};
				// Optionally redirect after a short delay
				setTimeout(() => {
					goto('/');
				}, 2000);
			} else {
				error = data.error || 'Failed to create playlist';
			}
		} catch (err) {
			error = 'Connection error. Please try again.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Create Playlist</title>
</svelte:head>

<div class="mx-auto max-w-2xl">
	<div class="rounded-lg bg-white shadow">
		<div class="border-b border-gray-200 px-6 py-4">
			<h1 class="text-xl font-semibold text-gray-900">Create New Playlist</h1>
			<p class="mt-1 text-sm text-gray-600">
				Create a new playlist to organize and rank your videos.
			</p>
		</div>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-6 px-6 py-4"
		>
			<!-- Success Message -->
			{#if success}
				<div class="rounded-md bg-green-50 p-4">
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
				<div class="rounded-md bg-red-50 p-4">
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

			<!-- Playlist Name -->
			<div>
				<label for="playlist-name" class="mb-2 block text-sm font-medium text-gray-700">
					Playlist Name *
				</label>
				<input
					id="playlist-name"
					type="text"
					bind:value={formData.name}
					required
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					placeholder="Enter playlist name"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">Choose a descriptive name for your playlist.</p>
			</div>

			<!-- Video Limit -->
			<div>
				<label for="video-limit" class="mb-2 block text-sm font-medium text-gray-700">
					Video Limit *
				</label>
				<input
					id="video-limit"
					type="number"
					bind:value={formData.videoLimit}
					min="1"
					max="1000"
					required
					class="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
					disabled={isSubmitting}
				/>
				<p class="mt-1 text-xs text-gray-500">Maximum number of videos allowed in this playlist.</p>
			</div>

			<!-- Owner Vote Count -->
			<div class="relative flex items-start">
				<div class="flex h-5 items-center">
					<input
						id="owner-vote-count"
						type="checkbox"
						bind:checked={formData.doesOwnerVoteCount}
						class="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
						disabled={isSubmitting}
					/>
				</div>
				<div class="ml-3 text-sm">
					<label for="owner-vote-count" class="font-medium text-gray-700">
						Owner vote counts
					</label>
					<p class="text-gray-500">
						When enabled, the playlist owner's vote will be included in the ranking calculations.
					</p>
				</div>
			</div>

			<!-- Submit Button -->
			<div class="flex justify-end space-x-3 border-t border-gray-200 pt-6">
				<button
					type="button"
					onclick={() => goto('/')}
					class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none"
					disabled={isSubmitting}
				>
					Cancel
				</button>
				<button
					type="submit"
					class="rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					disabled={isSubmitting}
				>
					{isSubmitting ? 'Creating...' : 'Create'}
				</button>
			</div>
		</form>
	</div>
</div>
