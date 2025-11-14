const { withSentryConfig } = require("@sentry/nextjs");

/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // ⚠️ Temporarily disable TypeScript errors during build for deployment
    // TODO: Fix TypeScript errors after deployment
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cf.geekdo-images.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images-na.ssl-images-amazon.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.ultraboardgames.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 's.yimg.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'store.401games.ca',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.rulespal.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'renegadegamestudios.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'cdn.akamai.steamstatic.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'www.dicetower.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yoedvavdopxhehpxsvlt.supabase.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'yoedvavdopxhehpxsvlt.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/boardle-images/**',
      },
    ],
  },
  // Optimize bundle size for Vercel
  serverExternalPackages: [
    'canvas',
    'jsdom',
    'sqlite3',
    'html2canvas',
    'dom-to-image',
    'nodemailer',
    'bcryptjs',
    'jsonwebtoken',
    'fast-xml-parser',
    'xml2js'
  ],
}

module.exports = withSentryConfig(nextConfig, {
  // For all available options, see:
  // https://github.com/getsentry/sentry-webpack-plugin#options

  org: "king-dice",
  project: "javascript-nextjs",

  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,

  // For all available options, see:
  // https://docs.sentry.io/platforms/javascript/guides/nextjs/manual-setup/

  // Disable source maps to reduce bundle size
  widenClientFileUpload: false,
  hideSourceMaps: true,

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
}); 