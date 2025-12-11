import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { VisualEditsMessenger } from "orchids-visual-edits";
import { Footer } from "@/components/Footer";
import { absoluteUrl, buildJsonLd, seoConfig } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const openGraphImage = absoluteUrl(seoConfig.defaultSocialImage);
const jsonLd = JSON.stringify(buildJsonLd());
const googleVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(seoConfig.siteUrl),
  title: {
    default: `${seoConfig.siteName} | ${seoConfig.tagline}`,
    template: `%s | ${seoConfig.siteName}`,
  },
  description: seoConfig.description,
  keywords: seoConfig.keywords,
  applicationName: seoConfig.siteName,
  alternates: {
    canonical: seoConfig.siteUrl,
    languages: {
      "en-SG": seoConfig.siteUrl,
      en: seoConfig.siteUrl,
    },
  },
  authors: [{ name: seoConfig.publisher }],
  creator: seoConfig.publisher,
  publisher: seoConfig.publisher,
  category: "games",
  formatDetection: {
    telephone: false,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  referrer: "origin-when-cross-origin",
  openGraph: {
    type: "website",
    locale: seoConfig.locale.replace("-", "_"),
    url: seoConfig.siteUrl,
    title: `${seoConfig.siteName} · Singapore Word Game`,
    description: seoConfig.description,
    siteName: seoConfig.siteName,
    images: [
      {
        url: openGraphImage,
        width: 1200,
        height: 630,
        alt: `${seoConfig.siteName} social share image`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${seoConfig.siteName} · Guess SG words`,
    description: seoConfig.description,
    images: [openGraphImage],
  },
  icons: {
    icon: [{ url: "/lion-favicon.png", sizes: "72x72", type: "image/png" }],
    apple: [{ url: "/lion-favicon.png" }],
    shortcut: ["/lion-favicon.png"],
  },
  manifest: "/manifest.webmanifest",
  verification: googleVerification
    ? {
        google: googleVerification,
      }
    : undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <script
          type="application/ld+json"
          suppressHydrationWarning
          dangerouslySetInnerHTML={{ __html: jsonLd }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased min-h-full flex flex-col`}
      >
        <main className="flex-1">{children}</main>
        <Footer />
        <VisualEditsMessenger />
      </body>
    </html>
  );
}
