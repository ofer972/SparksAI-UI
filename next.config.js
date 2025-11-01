/** @type {import('next').NextConfig} */
const nextConfig = {
  // App directory is now stable in Next.js 14, no need for experimental flag
  async rewrites() {
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
        destination: `${target}/:path*`,
      },
    ];
  },
}

module.exports = nextConfig
