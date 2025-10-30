import type { Metadata } from 'next';
import { Barlow_Condensed, Lora } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/layout/Providers';
import Navbar from '@/components/layout/Navbar';
import { generateMetadata as genMeta, generateOrganizationJsonLd } from '@/lib/seo/metadata';
import { appConfig } from '@/config/app.config';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { StructuredData } from '@/components/seo/StructuredData';
import { WebVitalsMonitor } from '@/components/analytics/WebVitalsMonitor';

const barlowCondensed = Barlow_Condensed({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-barlow-condensed',
  display: 'swap',
});

const lora = Lora({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-lora',
  display: 'swap',
});

export const metadata: Metadata = genMeta({
  title: appConfig.seo.defaultTitle,
  description: appConfig.seo.defaultDescription,
  keywords: [...appConfig.seo.defaultKeywords],
});

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Generate organization structured data
  const organizationData = generateOrganizationJsonLd();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Favicons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#3b82f6" />

        {/* DNS Prefetch for performance */}
        <link rel="dns-prefetch" href={process.env.NEXT_PUBLIC_API_URL || ''} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/* Organization Structured Data */}
        <StructuredData data={organizationData} type="organization" />
      </head>
      <body className={`${barlowCondensed.variable} ${lora.variable} font-sans`}>
        {/* Google Analytics */}
        <GoogleAnalytics />

        {/* Web Vitals Monitoring */}
        <WebVitalsMonitor />

        {/* Application Content */}
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
