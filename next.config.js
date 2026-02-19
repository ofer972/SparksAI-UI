/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14, no need for experimental flag
  experimental: {
    // Required for SPA-style history (pushState/popstate) to work with back/forward buttons
    // Without this, Next.js triggers a full reload when navigating back to our entries
    windowHistorySupport: true,
  },

  // Output standalone for better Docker performance
  output: 'standalone',
  
  async rewrites() {
    // Use INTERNAL_BACKEND_URL if set (runtime override)
    // Otherwise default to Kubernetes service DNS (works in both K8s and local with proper setup)
    // For pure local dev without K8s, set INTERNAL_BACKEND_URL=http://localhost:8080 before build
    const target = process.env.INTERNAL_BACKEND_URL || 'http://sparksai-gateway:8080';
    
    console.log('🔧 Next.js rewrites target:', target);
    
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
