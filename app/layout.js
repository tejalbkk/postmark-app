import './globals.css';

const FONTS =
  'https://fonts.googleapis.com/css2?family=Amatic+SC:wght@700&family=Allura&family=Archivo+Black&family=Big+Shoulders+Display:wght@600;800&family=Homemade+Apple&family=Instrument+Sans:wght@400;500;600&family=Josefin+Sans:ital,wght@0,400;0,600;1,400&family=Pinyon+Script&family=Reenie+Beanie&family=Schibsted+Grotesk:wght@400;500;600&family=Special+Elite&family=Yellowtail&display=swap';

function siteUrl() {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return 'http://localhost:3000';
}

export const metadata = {
  metadataBase: new URL(siteUrl()),
  title: 'Postmark',
  description: 'Turn a photo into a postcard and send it to a friend on any app.',
  appleWebApp: { capable: true, title: 'Postmark', statusBarStyle: 'black-translucent' },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#1b1620',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="stylesheet" href={FONTS} />
      </head>
      <body>{children}</body>
    </html>
  );
}
