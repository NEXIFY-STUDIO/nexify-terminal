/** @type {import('next').NextConfig} */

const defaultAllowedDevOrigins = [
  '127.0.0.1',
  '100.103.0.38',
  'macbook-air-uvatea-erik.tail8c034f.ts.net',
  '*.tail8c034f.ts.net',
  '*.ts.net',
];

const extraAllowedDevOrigins = (process.env.NEXIFY_ALLOWED_DEV_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  // Allow Tailscale Serve / phone PWA to load /_next/* in dev (Next.js 16+)
  allowedDevOrigins: [...defaultAllowedDevOrigins, ...extraAllowedDevOrigins],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  // Security headers configuration
  headers: async () => {
    return [
      {
        source: '/:path*',
        headers: [
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          // XSS Protection (legacy, CSP is primary)
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          // Control referrer information
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Permissions Policy
          {
            key: 'Permissions-Policy',
            value:
              'accelerometer=(), camera=(), geolocation=(), gyroscope=(), magnetometer=(), microphone=(self), payment=(), usb=()',
          },
        ],
      },
      // HTTPS security for production
      {
        source: '/:path*',
        has: [
          {
            type: 'header',
            key: 'x-forwarded-proto',
            value: 'https',
          },
        ],
        headers: [
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=31536000; includeSubDomains; preload',
          },
        ],
      },
    ];
  },
  // Disable powered-by header to prevent information leakage
  poweredByHeader: false,
};

export default nextConfig;
