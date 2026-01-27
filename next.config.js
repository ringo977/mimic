/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath: process.env.NODE_ENV === 'production' ? '/mimic' : '',
  assetPrefix: process.env.NODE_ENV === 'production' ? '/mimic/' : '',
}

module.exports = nextConfig
