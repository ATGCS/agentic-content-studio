import type { NextConfig } from 'next';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  transpilePackages: [
    '@acs/core',
    '@acs/db',
    '@acs/content-center',
    '@acs/ai-runtime',
    '@acs/account-profile',
    '@acs/ima-provider',
    '@acs/review-center',
  ],
  // Force rebuild to detect new API routes
  webpack: (config) => {
    config.watchOptions = {
      ...config.watchOptions,
      ignored: ['**/node_modules', '**/.next'],
    };
    return config;
  },
};

export default nextConfig;
