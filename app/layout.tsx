import type { Metadata } from "next";
import { Manrope, Frank_Ruhl_Libre } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import GridBackground from "@/components/GridBackground";

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
  title: "MiMic Lab | Politecnico di Milano",
  description: "Advanced microfluidic systems and MiMic research at the Department of Electronics, Information and Bioengineering (DEIB), Politecnico di Milano.",
  keywords: ["MiMic", "microfluidics", "bioengineering", "Politecnico di Milano", "DEIB", "research"],
  authors: [{ name: "MiMic Lab, PoliMi" }],
  openGraph: {
    title: "MiMic Lab | Politecnico di Milano",
    description: "Advanced microfluidic systems and MiMic research",
    type: "website",
    locale: "en_US",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${manrope.variable} ${frankRuhl.variable}`}>
      <body className="antialiased">
        <GridBackground />
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
