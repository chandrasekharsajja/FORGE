import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'FORGE Unified IDE',
    template: '%s | FORGE Unified IDE',
  },
  description:
    'Public mission cockpit for the FORGE AI engineering workspace, with release signals, editor context, and verification lanes.',
  openGraph: {
    title: 'FORGE Unified IDE',
    description:
      'A polished public shell for planning, editing, validating, and presenting autonomous software work.',
    url: 'https://github.com/chandrasekharsajja/FORGE',
    siteName: 'FORGE',
    images: [
      {
        url: 'https://raw.githubusercontent.com/chandrasekharsajja/FORGE/main/apps/unified-ide/src/app/icon.svg',
      },
    ],
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'FORGE Unified IDE',
    description:
      'A public-facing mission cockpit for the FORGE repository.',
    images: [
      'https://raw.githubusercontent.com/chandrasekharsajja/FORGE/main/apps/unified-ide/src/app/icon.svg',
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
