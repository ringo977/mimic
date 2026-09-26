import type { Metadata } from "next";
import { Manrope, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GridBackground from "@/components/GridBackground";
import ScrollToTop from "@/components/ScrollToTop";
import CookieConsent from "@/components/CookieConsent";
import SiteAnalytics from "@/components/SiteAnalytics";
import { siteBasePath } from "@/lib/site-base-path";
import { CONTACT_EMAIL, LINKEDIN_URL, SITE_URL } from "@/lib/site-contacts";

const manrope = Manrope({ 
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['200', '300', '400', '500', '600', '700', '800'],
  display: 'swap',
});

const frankRuhl = Frank_Ruhl_Libre({ 
  subsets: ['latin'],
  variable: '--font-frank',
  weight: ['300', '400', '500', '600', '700', '800', '900'],
  display: 'swap',
});

export const metadata: Metadata = {
  // Canonical host: www.mimic.polimi.it. Every page gets a canonical tag
  // pointing there ('./': resolved per-route against metadataBase), so the
  // apex copy and the GitHub/GitLab Pages mirrors are de-duplicated by
  // search engines. The GitHub mirror (BASE_PATH=/mimic) is also noindex.
  metadataBase: new URL("https://www.mimic.polimi.it"),
  alternates: { canonical: "./" },
  // Mirrors (GitHub Pages basePath /mimic, GitLab Pages via FORCE_NOINDEX=1)
  // must not be indexed; only www.mimic.polimi.it is.
  ...(siteBasePath || process.env.NEXT_PUBLIC_FORCE_NOINDEX
    ? { robots: { index: false, follow: false } }
    : {}),
  title: "MiMic Lab | Politecnico di Milano",
  description: "Organ-on-chip and microphysiological systems research at the Department of Electronics, Information and Bioengineering (DEIB), Politecnico di Milano.",
  keywords: ["MiMic", "organ-on-chip", "microphysiological systems", "microfluidics", "bioengineering", "Politecnico di Milano", "DEIB", "research"],
  authors: [{ name: "MiMic Lab, PoliMi" }],
  icons: {
    icon: `${siteBasePath}/icon.svg`,
    apple: `${siteBasePath}/icon.svg`,
  },
  verification: {
    google: "kIiXrjP9psjFQ0PZ77po6fsbmmEVqPb14sq-XCRTOvk",
  },
  openGraph: {
    siteName: "MiMic Lab",
    title: "MiMic Lab | Politecnico di Milano",
    description: "Organ-on-chip and microphysiological systems research at DEIB, Politecnico di Milano.",
    type: "website",
    locale: "en_US",
    url: "./",
    // Default social preview (1200x630, generated from the lab logo).
    // Resolved against metadataBase → always the canonical www host.
    images: [{ url: "/images/og-default.png", width: 1200, height: 630, alt: "MiMic Lab — Organ-on-Chip Laboratory, Politecnico di Milano" }],
  },
  twitter: { card: "summary_large_image" },
};

// Structured data (schema.org) for the organisation and the site.
// Rendered once in the root layout; /team adds Person entries for the PIs.
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "ResearchOrganization",
      "@id": `${SITE_URL}/#organization`,
      name: "MiMic Lab",
      alternateName: "MiMic Lab — Organ-on-Chip Laboratory, Politecnico di Milano",
      url: `${SITE_URL}/`,
      logo: `${SITE_URL}/images/og-default.png`,
      email: CONTACT_EMAIL,
      sameAs: [LINKEDIN_URL],
      parentOrganization: {
        "@type": "CollegeOrUniversity",
        name: "Politecnico di Milano",
        url: "https://www.polimi.it/",
      },
      department: {
        "@type": "Organization",
        name: "Department of Electronics, Information and Bioengineering (DEIB)",
        url: "https://www.deib.polimi.it/",
      },
      address: {
        "@type": "PostalAddress",
        streetAddress: "Via Camillo Golgi 39, Building 21",
        postalCode: "20133",
        addressLocality: "Milano",
        addressCountry: "IT",
      },
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: "MiMic Lab",
      url: `${SITE_URL}/`,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${frankRuhl.variable}`}>
      <body className="antialiased">
        {/* Keyboard users: jump past the navigation. Visible only on focus. */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[10000] focus:bg-white focus:text-polimi-blue-heritage focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-polimi-bright-blue font-manrope text-sm font-semibold"
        >
          Skip to main content
        </a>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <GridBackground />
        <Navbar />
        <main id="main-content" tabIndex={-1} className="min-h-screen pt-32 lg:pt-20 outline-none">
          {children}
        </main>
        <Footer />
        <ScrollToTop />
        <CookieConsent />
        <SiteAnalytics />
      </body>
    </html>
  );
}
