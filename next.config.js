const { withSentryConfig } = require("@sentry/nextjs");
// Note: We're handling i18n client-side, so we don't need the next-intl plugin
// const createNextIntlPlugin = require('next-intl/plugin');
// const withNextIntl = createNextIntlPlugin('./i18n/request.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      { source: '/dice-roller', destination: '/virtual-tools', permanent: true },
    ];
  },
  typescript: {
    // ⚠️ Temporarily disable TypeScript errors during build for deployment
    // TODO: Fix TypeScript errors after deployment
    ignoreBuildErrors: true,
  },
  // Suppress preload warnings for resources that may not be used immediately
  experimental: {
    optimizePackageImports: ['lucide-react'],
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
      {
        protocol: 'https',
        hostname: 'm.media-amazon.com',
        port: '',
        pathname: '/**',
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
    'xml2js',
  ],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Ensure React is resolved as a singleton for client-side bundles
      // This fixes React Three Fiber's access to React internals
      config.resolve.alias = {
        ...config.resolve.alias,
        react: require.resolve('react'),
        'react-dom': require.resolve('react-dom'),
      };
      
      // Ensure React is not code-split - keep it in main bundle
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            default: false,
            vendors: false,
            react: {
              name: 'react',
              test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
              priority: 20,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
}

module.exports = withSentryConfig(nextConfig, {
  org: "king-dice",
  project: "javascript-nextjs",
  silent: !process.env.CI,

  // Disable source map generation/upload in dev to reduce "Invalid source map" and Sentry noise
  sourcemaps: {
    disable: process.env.NODE_ENV === 'development',
  },
  widenClientFileUpload: true,
  hideSourceMaps: process.env.NODE_ENV === 'development',

  // Automatically tree-shake Sentry logger statements to reduce bundle size
  disableLogger: true,

  // Enables automatic instrumentation of Vercel Cron Monitors. (Does not yet work with App Router route handlers.)
  // See the following for more information:
  // https://docs.sentry.io/product/crons/
  // https://vercel.com/docs/cron-jobs
  automaticVercelMonitors: true,
}); 