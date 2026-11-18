import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

const SITE_URL = 'https://env-guardd.vercel.app';

export const metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'EnvGuard: Encrypted .env & Secrets Management for Teams',
    template: '%s · EnvGuard',
  },
  description:
    'Stop pasting .env files into Slack. EnvGuard encrypts environment variables client-side and manages access by company, project, and environment, with audit logs, one-time share links, and a full CLI.',
  keywords: [
    'environment variables',
    'secrets management',
    'env file sharing',
    '.env security',
    'team secrets manager',
    'encrypted secrets',
    'developer tools',
  ],
  authors: [{ name: 'EnvGuard' }],
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
  },
  openGraph: {
    title: 'EnvGuard: Encrypted .env & Secrets Management for Teams',
    description:
      'Encrypted, role-based secrets management for teams, with audit logs, one-time share links, and a CLI.',
    url: SITE_URL,
    siteName: 'EnvGuard',
    type: 'website',
    locale: 'en_US',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'EnvGuard: Encrypted .env & Secrets Management for Teams',
    description: 'Encrypted, role-based secrets management for teams, with a CLI.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body className="font-sans antialiased">
        <Script
          id="json-ld"
          type="application/ld+json"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'SoftwareApplication',
              name: 'EnvGuard',
              url: SITE_URL,
              applicationCategory: 'DeveloperApplication',
              operatingSystem: 'Web',
              description:
                'Encrypted, role-based environment variable management for teams, with audit logs and a CLI.',
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />
        {children}
      </body>
    </html>
  );
}