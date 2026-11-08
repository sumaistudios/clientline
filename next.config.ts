import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // A client's link is its password; never send it to other sites as a referrer.
  async headers() {
    return [{ source: '/:path*', headers: [{ key: 'Referrer-Policy', value: 'no-referrer' }, { key: 'X-Robots-Tag', value: 'noindex' }] }]
  },
}

export default nextConfig
