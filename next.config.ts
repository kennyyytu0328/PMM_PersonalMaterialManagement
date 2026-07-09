import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Set at build time for sub-path deployments (e.g. "/gogoffcc-pmm").
  // Undefined locally → root-path behavior unchanged.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
}

export default withNextIntl(nextConfig)
