import Script from 'next/script';

export const metadata = { title: 'Inkling fixture' };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
        {/* For the client-mode <inkling-diagram> in Markdown. The React wrapper does not need it. */}
        <Script src="/inkling.iife.js" strategy="afterInteractive" />
      </body>
    </html>
  );
}
