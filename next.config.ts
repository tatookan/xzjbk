import type { NextConfig } from 'next';

const productionSecurityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "base-uri 'self'",
      "connect-src 'self'",
      "font-src 'self' data:",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "img-src 'self' data: blob:",
      "media-src 'self' blob:",
      "object-src 'none'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      'upgrade-insecure-requests'
    ].join('; ')
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=31536000; includeSubDomains'
  }
];

const commonSecurityHeaders = [
  { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), geolocation=(), microphone=()' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' }
];

const nextConfig: NextConfig = {
  output: process.env.BUILD_STANDALONE === 'true' ? 'standalone' : undefined,
  poweredByHeader: false,
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? { exclude: ['error', 'warn'] } : false
  },
  async redirects() {
    return [{ source: '/bp', destination: '/bp/index.html', permanent: true }];
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          ...commonSecurityHeaders,
          ...(process.env.NODE_ENV === 'production' ? productionSecurityHeaders : [])
        ]
      }
    ];
  }
};

export default nextConfig;
