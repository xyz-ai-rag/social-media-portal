import { Inter } from 'next/font/google';
import { AuthProvider } from '@/context/AuthContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import LayoutClientWrapper from './LayoutClientWrapper';
import { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Social Media Portal',
  description: 'Analytics and management for social media',
  icons: {
    icon: '/favicon.png',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LayoutClientWrapper>
            {children}
          </LayoutClientWrapper>
          <ToastContainer position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
