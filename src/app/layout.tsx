import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/header/Header';
import Footer from '@/components/footer/Footer';
import { Toaster } from '@/components/ui/sonner';
export const metadata: Metadata = {
  title: 'Genius Yield | CIP113',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' className='dark'>
      <body
        className={`bg-background bg-gradient-primary min-h-screen bg-cover antialiased`}
      >
        <Header />
        <main className='container m-auto p-4'>{children}</main>
        <Footer />

        <Toaster
          position='bottom-center'
          richColors
          closeButton
          toastOptions={{
            duration: 5000,
          }}
        />
      </body>
    </html>
  );
}
