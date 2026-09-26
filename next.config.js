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
  // Apache: /lab/ needs lab/index.html (see static export layout).
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  basePath,
  assetPrefix: basePath ? `${basePath}/` : '',
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
    // FORCE_NOINDEX=1 marks a build as a non-canonical mirror (e.g. GitLab
    // Pages, which builds with empty basePath): app/layout.tsx adds
    // <meta name="robots" content="noindex, nofollow"> to every page.
    NEXT_PUBLIC_FORCE_NOINDEX: process.env.FORCE_NOINDEX || '',
  },
}

module.exports = nextConfig
