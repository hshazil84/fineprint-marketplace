/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
  poweredByHeader: false,
  env: {
    NEXT_PUBLIC_SITE_URL: 'https://shop.fineprintmv.com',
  },
}
module.exports = nextConfig
