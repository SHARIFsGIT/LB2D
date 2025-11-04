import type { Metadata } from 'next';
import { Barlow_Condensed, Lora } from 'next/font/google';
import '@/styles/globals.css';
import { Providers } from '@/components/providers';
import Navbar from '@/components/layout/Navbar';

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

export const metadata: Metadata = {
  title: {
    default: 'Learn Bangla to Deutsch - German Language Learning Platform',
    template: '%s | LB2D',
  },
  description: 'Master German language with our comprehensive e-learning platform designed specifically for Bengali speakers. Expert instructors, interactive courses, and certification programs.',
  keywords: [
    'German language learning',
    'Learn German online',
    'German courses for Bengali speakers',
    'Deutsch lernen',
    'Online German language platform',
    'German certification',
    'A1 A2 German courses',
    'Bengali to German',
    'LB2D platform',
  ],
  authors: [{ name: 'LB2D Team' }],
  creator: 'LB2D Platform',
  publisher: 'LB2D',
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Learn Bangla to Deutsch',
    title: 'Learn Bangla to Deutsch - German Language Learning Platform',
    description: 'Master German language with our comprehensive e-learning platform designed specifically for Bengali speakers. Expert instructors, interactive courses, and certification programs.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Learn Bangla to Deutsch Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Learn Bangla to Deutsch - German Language Learning',
    description: 'Master German language online with expert Bengali instructors',
    images: ['/og-image.jpg'],
    creator: '@LB2D',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION,
    yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFICATION,
  },
  category: 'education',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#10b981" />
        <meta name="application-name" content="LB2D" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="LB2D" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
      </head>
      <body className={`${barlowCondensed.variable} ${lora.variable} font-sans`} suppressHydrationWarning>
        <Providers>
          <Navbar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
