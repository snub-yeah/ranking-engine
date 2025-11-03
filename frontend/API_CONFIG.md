# API Configuration System

This document explains the centralized API configuration system for the Svelte frontend application.

## Overview

The API configuration system centralizes all backend API calls to make deployment easier. Instead of hardcoded `localhost:3000` URLs scattered throughout the codebase, all API calls now use a centralized configuration that can be easily changed for different environments.

## Files Structure

```
src/lib/config.ts          # Main configuration module
.env                        # Development environment variables
.env.production            # Production environment variables  
.env.example               # Example/template file
```

## Environment Configuration

### Development Setup

1. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```

2. The default `.env` file contains:
   ```env
   PUBLIC_API_BASE_URL=http://localhost:3000
   ```

### Production Setup

1. Update `.env.production` with your deployed backend URL:
   ```env
   PUBLIC_API_BASE_URL=https://your-backend-url.com
   ```

2. Or set the environment variable directly on your hosting platform:
   ```env
   PUBLIC_API_BASE_URL=https://api.yourdomain.com
   ```

## Configuration Module (`src/lib/config.ts`)

### API_CONFIG Object

The main configuration object contains:

- `BASE_URL`: The base URL for all API calls
- `ENDPOINTS`: Predefined endpoint paths for consistency

```typescript
export const API_CONFIG = {
  BASE_URL: env.PUBLIC_API_BASE_URL || 'http://localhost:3000',
  ENDPOINTS: {
    LOGIN: '/api/users/login',
    PLAYLISTS: '/api/playlists',
    PLAYLISTS_ALL: '/api/playlists/all',
    VIDEOS: '/api/videos',
    MY_SUBMISSIONS: '/api/videos/my-submissions',
    SCORES: '/api/scores',
    SCORES_ALL: '/api/scores/all'
  }
}
```

### Helper Functions

#### `getApiUrl(endpoint: string)`

Builds a complete URL for API calls:

```typescript
const url = getApiUrl('/api/playlists'); 
// Returns: "http://localhost:3000/api/playlists"
```

#### `apiRequest(endpoint: string, options?: RequestInit)`

Makes authenticated API requests with automatic token handling:

```typescript
const response = await apiRequest('/api/playlists', {
  method: 'POST',
  body: JSON.stringify(data)
});
```

## Usage Examples

### Basic API Call

```typescript
import { getApiUrl, API_CONFIG } from '$lib/config';

const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PLAYLISTS_ALL), {
  method: 'GET',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  }
});
```

### Using the Helper Function

```typescript
import { apiRequest, API_CONFIG } from '$lib/config';

const response = await apiRequest(API_CONFIG.ENDPOINTS.PLAYLISTS, {
  method: 'POST',
  body: JSON.stringify({ name: 'My Playlist' })
});
```

### Dynamic Endpoints

```typescript
import { getApiUrl, API_CONFIG } from '$lib/config';

const playlistId = 123;
const url = getApiUrl(`${API_CONFIG.ENDPOINTS.PLAYLISTS}/${playlistId}`);
// Returns: "http://localhost:3000/api/playlists/123"
```

## Deployment Considerations

### Environment Variables

Make sure to set `PUBLIC_API_BASE_URL` in your deployment environment:

- **Vercel**: Add to Environment Variables in project settings
- **Netlify**: Add to Environment Variables in site settings  
- **Docker**: Pass as environment variable
- **Traditional hosting**: Set in your server environment

### Common Production URLs

```env
# Heroku
PUBLIC_API_BASE_URL=https://your-app-name.herokuapp.com

# Custom domain
PUBLIC_API_BASE_URL=https://api.yourdomain.com

# Subdirectory deployment
PUBLIC_API_BASE_URL=https://yourdomain.com/api

# Different port
PUBLIC_API_BASE_URL=https://yourdomain.com:8080
```

### CORS Considerations

Ensure your backend is configured to accept requests from your frontend domain in production.

## Migration from Hardcoded URLs

All hardcoded `http://localhost:3000` URLs have been replaced in:

- `src/routes/+layout.svelte`
- `src/routes/add-videos/+page.svelte`
- `src/routes/add-videos/[id]/+page.svelte`
- `src/routes/create-playlist/+page.svelte`
- `src/routes/rate/+page.svelte`
- `src/routes/rate/[id]/+page.svelte`
- `src/routes/scores/+page.svelte`
- `src/routes/scores/[id]/+page.svelte`

## Troubleshooting

### Environment Variable Not Loading

1. Restart your development server after changing `.env` files
2. Ensure the variable name starts with `PUBLIC_` for client-side access
3. Check that `.env` is in the frontend directory root

### API Calls Failing in Production

1. Verify `PUBLIC_API_BASE_URL` is set correctly
2. Check browser network tab for the actual URLs being called
3. Ensure CORS is configured on your backend
4. Verify your backend is accessible from the frontend domain

### TypeScript Errors

If you get TypeScript errors about environment variables, restart your TypeScript server or development server.

## Security Notes

- Environment variables prefixed with `PUBLIC_` are exposed to the client
- Never put sensitive information in `PUBLIC_` variables
- The API base URL is safe to expose as it's used for client-side requests