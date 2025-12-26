/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14, no need for experimental flag
  
  // Output standalone for better Docker performance
  output: 'standalone',
  
  async rewrites() {
    // Auto-detect environment and use appropriate default
    // KUBERNETES_SERVICE_HOST is automatically set in all Kubernetes pods
    const isKubernetes = !!process.env.KUBERNETES_SERVICE_HOST;
    const defaultTarget = isKubernetes 
      ? 'http://sparksai-gateway:8080'  // Kubernetes: use service DNS
      : 'http://localhost:8080';         // Local dev: use localhost
    
    const target = process.env.INTERNAL_BACKEND_URL || defaultTarget;
    
    console.log('🔧 Next.js rewrites config:', {
      isKubernetes,
      target,
      source: process.env.INTERNAL_BACKEND_URL ? 'env var' : 'default'
    });
    
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
