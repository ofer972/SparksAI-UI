# SparksAI UI Deployment Guide

## Docker Deployment

This Next.js application is configured for optimized Docker deployment using standalone output.

## Environment Variables

### Required for Production

**`NEXT_PUBLIC_API_BASE_URL`** (REQUIRED)
- The public URL of your API Gateway
- Must be set at BUILD time (Next.js embeds public env vars at build)
- Example: `https://your-gateway.railway.app/api`
- ⚠️ Must include the `/api` path

### Optional

**`NEXT_PUBLIC_API_VERSION`**
- API version (default: `v1`)

## Railway Deployment

### Step 1: Set Environment Variables

In your Railway project for SparksAI-UI, add:

```
NEXT_PUBLIC_API_BASE_URL=https://your-gateway-service.railway.app/api
```

Replace `your-gateway-service.railway.app` with your actual gateway domain.

### Step 2: Deploy

Railway will automatically:
1. Build using the Dockerfile
2. Embed the environment variables at build time
3. Deploy the optimized standalone build

## Why This Configuration?

Previously, the app was using Next.js rewrites to proxy API requests through the Next.js server. This caused:
- ❌ HTTP 431 errors (Request Header Fields Too Large)
- ❌ Extra latency from double-proxying
- ❌ Header accumulation issues

Now, the browser makes **direct API calls** to the gateway:
- ✅ No proxy overhead
- ✅ No header accumulation
- ✅ Better performance
- ✅ Simpler architecture

## Development

For local development, the Next.js rewrite proxy is still enabled:
- Leave `NEXT_PUBLIC_API_BASE_URL` empty or unset
- Set `INTERNAL_BACKEND_URL` to your local backend (default: `http://localhost:8080`)
- Requests to `http://localhost:3000/api/*` will proxy to `http://localhost:8080/api/*`

## Build Arguments

When building the Docker image manually:

```bash
docker build \
  --build-arg NEXT_PUBLIC_API_BASE_URL=https://your-gateway.railway.app/api \
  -t sparksai-ui:latest .
```

## Troubleshooting

### 431 Errors Still Occurring?

1. Verify `NEXT_PUBLIC_API_BASE_URL` is set in Railway
2. Check that it points directly to your gateway (not the UI)
3. Trigger a rebuild to embed the new environment variable
4. Clear browser cookies/cache

### API Calls Failing?

1. Check browser console for the actual URL being called
2. Verify CORS is configured on the gateway
3. Ensure the gateway URL is accessible from the browser
