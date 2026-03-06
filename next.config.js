/** @type {import('next').NextConfig} */
const packageJson = require('./package.json');

const pad = (num) => num.toString().padStart(2, '0');
const now = new Date();
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}.${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Ensure we can handle images from external sources if needed
  images: {
    unoptimized: true,
  },
  async rewrites() {
    return [
      {
        source: '/api/Login',
        destination: 'https://dev.wmsapi.propixtech.in/Login',
      },
      {
        source: '/api/:path*',
        destination: 'https://dev.wmsapi.propixtech.in/api/:path*',
      },
    ];
  },
  env: {
    NEXT_PUBLIC_BUILD_VERSION: `v${packageJson.version || '1.0.0'}-build.${timestamp}`,
  },
};

module.exports = nextConfig;