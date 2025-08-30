<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';

	let { children } = $props();

	// User state
	let user: { id: number; username: string } | null = $state(null);
	let showLoginForm = $state(false);
	let loginForm = $state({
		username: '',
		password: ''
	});
	let loginError = $state('');

	// Check for existing JWT token on mount and handle route protection
	$effect(() => {
		const token = localStorage.getItem('auth_token');
		let isAuthenticated = false;

		if (token) {
			try {
				const payload = JSON.parse(atob(token.split('.')[1]));
				if (payload.exp > Date.now() / 1000) {
					user = {
						id: payload.id,
						username: payload.username
					};
					isAuthenticated = true;
				} else {
					localStorage.removeItem('auth_token');
					user = null;
				}
			} catch (error) {
				localStorage.removeItem('auth_token');
				user = null;
			}
		}

		// Redirect to index if not authenticated and not on index page
		if (!isAuthenticated && page.url.pathname !== '/') {
			goto('/');
		}
	});

	async function handleLogin() {
		try {
			const response = await fetch('http://localhost:3000/api/users/login', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({
					username: loginForm.username,
					password: loginForm.password
				})
			});

			const data = await response.json();

			if (data.success) {
				localStorage.setItem('auth_token', data.token);
				const payload = JSON.parse(atob(data.token.split('.')[1]));
				user = {
					id: payload.id,
					username: payload.username
				};
				showLoginForm = false;
				loginForm = { username: '', password: '' };
				loginError = '';
			} else {
				loginError = data.error;
			}
		} catch (error) {
			loginError = 'Connection error. Please try again.';
		}
	}

	function handleLogout() {
		localStorage.removeItem('auth_token');
		user = null;
		// Redirect to index after logout if not already there
		if ($page.url.pathname !== '/') {
			goto('/');
		}
	}

	function toggleLoginForm() {
		showLoginForm = !showLoginForm;
		if (!showLoginForm) {
			loginForm = { username: '', password: '' };
			loginError = '';
		}
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="border-b bg-white shadow-sm">
		<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
			<div class="flex h-16 items-center justify-between">
				<!-- Logo/Title -->
				<a href="/" class="flex items-center">
					<div class="flex-shrink-0">
						<h1 class="text-xl font-bold text-gray-900">ranking engine</h1>
					</div>
				</a>

				<!-- User Section -->
				<div class="relative">
					{#if user}
						<div class="flex items-center space-x-4">
							<span class="text-gray-700">{user.username}</span>
							<button
								onclick={handleLogout}
								class="text-sm text-gray-500 transition-colors hover:text-gray-700"
							>
								Logout
							</button>
						</div>
					{:else}
						<button
							onclick={toggleLoginForm}
							class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
						>
							Login
						</button>
					{/if}

					<!-- Login Form Dropdown -->
					{#if showLoginForm && !user}
						<div
							class="ring-opacity-5 absolute right-0 z-50 mt-2 w-80 rounded-md bg-white shadow-lg ring-1 ring-black"
						>
							<div class="p-4">
								<h3 class="mb-4 text-lg font-medium text-gray-900">Login</h3>

								{#if loginError}
									<div class="mb-4 rounded-md border border-red-200 bg-red-50 p-3">
										<p class="text-sm text-red-600">{loginError}</p>
									</div>
								{/if}

								<form
									onsubmit={(e) => {
										e.preventDefault();
										handleLogin();
									}}
								>
									<div class="space-y-4">
										<div>
											<label for="username" class="block text-sm font-medium text-gray-700">
												Username
											</label>
											<input
												id="username"
												type="text"
												bind:value={loginForm.username}
												required
												class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
												placeholder="Enter your username"
											/>
										</div>
										<div>
											<label for="password" class="block text-sm font-medium text-gray-700">
												Password
											</label>
											<input
												id="password"
												type="password"
												bind:value={loginForm.password}
												required
												class="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 placeholder-gray-400 shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none"
												placeholder="Enter your password"
											/>
										</div>
									</div>
									<div class="mt-6 flex justify-end space-x-3">
										<button
											type="button"
											onclick={toggleLoginForm}
											class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
										>
											Cancel
										</button>
										<button
											type="submit"
											class="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:outline-none"
										>
											Login
										</button>
									</div>
								</form>
							</div>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<!-- Main Content -->
	<main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
		{@render children?.()}
	</main>
</div>
