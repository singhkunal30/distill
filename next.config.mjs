/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: '20mb',
    },
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'covers.openlibrary.org' },
      { protocol: 'https', hostname: 'archive.org' },
    ],
  },
  webpack: (config) => {
    config.externals = config.externals || [];
    // Server-only deps that should never be bundled for the browser.
    config.externals.push({
      'epub2': 'commonjs epub2',
    });
    return config;
  },
};

export default nextConfig;
