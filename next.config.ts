import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  output: 'standalone',
  // Set at build time for sub-path deployments (e.g. "/gogoffcc-pmm").
  // Undefined locally → root-path behavior unchanged.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || undefined,
  // Dev-only: allow LAN devices (phone camera testing over HTTPS) to load
  // dev-server internals (/_next assets, HMR websocket) without 403s.
  allowedDevOrigins: ['192.168.2.175', '192.168.2.*'],
}

export default withNextIntl(nextConfig)
