import type { NextConfig } from 'next';
import { loadEnvConfig } from '@next/env';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(__dirname, '../..');

// Monorepo: .env lives at repository root, not under apps/web
loadEnvConfig(repoRoot);

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname, '../..'),
  serverExternalPackages: ['@prisma/client', 'better-sqlite3'],
  transpilePackages: [
    '@acs/core',
    '@acs/db',
    '@acs/content-center',
    '@acs/ai-runtime',
    '@acs/account-profile',
    '@acs/doubao-image-provider',
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
