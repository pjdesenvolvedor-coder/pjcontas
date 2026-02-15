import type { Metadata } from 'next';
import './globals.css';
import { Header } from '@/components/header';
import { Footer } from '@/components/footer';
import { Toaster } from '@/components/ui/toaster';
import { FirebaseClientProvider } from '@/firebase/client-provider';
import { TicketNotificationListener } from '@/components/ticket-notification-listener';

export const metadata: Metadata = {
  title: 'PJ Contas',
  description: 'As melhores contas, em um só lugar.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased bg-background text-foreground min-h-screen flex flex-col">
        <FirebaseClientProvider>
          <Header />
          <main className="flex-grow">{children}</main>
          <Footer />
          <Toaster />
          <TicketNotificationListener />
        </FirebaseClientProvider>
      </body>
    </html>
  );
}
