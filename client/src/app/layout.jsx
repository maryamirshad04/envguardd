import { Inter, JetBrains_Mono } from 'next/font/google';
import Script from 'next/script';
import './globals.css';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans' });
const jetbrains = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono' });

export const metadata = {
  metadataBase: new URL('https://env-guardd.vercel.app'),
  title: {
    default: 'envguard — stop pasting .env files into Slack',
    template: '%s · envguard',
  },
  description:
    'Encrypted, role-based environment variable management for teams. Organize secrets by company, project, and environment — with audit logs, one-time share links, and a full CLI.',
  openGraph: {
    title: 'envguard — stop pasting .env files into Slack',
    description: 'Encrypted, role-based secrets management for teams, with a CLI.',
    url: 'https://env-guardd.vercel.app',
    siteName: 'envguard',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'envguard — stop pasting .env files into Slack',
    description: 'Encrypted, role-based secrets management for teams, with a CLI.',
  },
  icons: { icon: '/favicon.ico' },
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
              name: 'envguard',
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