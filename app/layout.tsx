import { Inter } from "next/font/google";
import { AuthProvider } from "@/context/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./globals.css";
import LayoutClientWrapper from "./LayoutClientWrapper";
import { ReactNode } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Hyprdata.ai Web Portal",
  description: "Analytics and management for social media",
  icons: {
    icon: "/favicon.png",
  }
};
export const viewport = {
  width: 'device-width',
  initialScale: 1.0,
  minimumScale: 0.5, // Allow zooming out to 50%
  maximumScale: 3.0, // Allow zooming in to 300%
  userScalable: true, // Allow users to zoom
  viewportFit: 'cover'
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AuthProvider>
          <LayoutClientWrapper>{children}</LayoutClientWrapper>
          <ToastContainer position="bottom-right" />
        </AuthProvider>
      </body>
    </html>
  );
}
