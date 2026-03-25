/** @type {import('next').NextConfig} */
// GitHub Pages: npm run build (default basePath /mimic in production)
// Polimi root:   BASE_PATH= npm run build   or   npm run build:polimi
const basePath =
  process.env.BASE_PATH !== undefined
    ? process.env.BASE_PATH
    : process.env.NODE_ENV === 'production'
      ? '/mimic'
      : ''

const nextConfig = {
  output: 'export',
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
}

module.exports = nextConfig
