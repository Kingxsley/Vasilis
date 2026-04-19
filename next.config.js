/** @type {import('next').NextConfig} */

const securityHeaders = [
  {
    key: 'X-Frame-Options',
    value: 'DENY',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Resource-Policy',
    value: 'same-origin',
  },
  {
    key: 'Cross-Origin-Embedder-Policy',
    value: 'require-corp',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'Content-Security-Policy',
    value:
      "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
  },
];

const blockedPaths = [
  '/.env',
  '/.env.local',
  '/.env.production',
  '/.env.development',
  '/.git/config',
  '/.git/HEAD',
  '/package.json',
  '/package-lock.json',
  '/next.config.js',
  '/next.config.mjs',
  '/next.config.ts',
  '/.gitignore',
  '/vercel.json',
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  async redirects() {
    const staticRedirects = blockedPaths.map((path) => ({
      source: path,
      destination: '/404',
      permanent: false,
    }));

    return [
      ...staticRedirects,
      {
        source: '/.git/:path*',
        destination: '/404',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
