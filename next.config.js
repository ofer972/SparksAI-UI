/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Docker optimization
  output: 'standalone',
  
  // App directory is now stable in Next.js 14, no need for experimental flag
  async rewrites() {
    // Only use rewrites in development
    // In production, set NEXT_PUBLIC_API_BASE_URL to point directly to the gateway
    if (process.env.NODE_ENV === 'production') {
      return [];
    }

    const target = process.env.INTERNAL_BACKEND_URL || 'http://localhost:8080';
    // Ensure destination is valid for Next.js (must start with /, http:// or https://)
    if (!/^https?:\/\//.test(target)) {
      throw new Error(
        `Invalid INTERNAL_BACKEND_URL: "${target}". It must start with http:// or https://`
      );
    }

    return [
      {
        source: '/api/:path*',
        destination: `${target}/api/:path*`, // Preserve /api prefix for gateway
      },
    ];
  },
}

module.exports = nextConfig
