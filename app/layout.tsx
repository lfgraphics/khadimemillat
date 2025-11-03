import { ThemeProvider } from "@/components/theme-provider"
import type { Metadata } from "next";
import { Toaster } from "sonner"
import "./globals.css";
import "./loading";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar";
import { ClerkProvider } from '@clerk/nextjs';
import { Footer } from "@/components/footer";
import WebPushManager from "@/components/WebPushManager";
import { NotificationProvider } from "@/contexts/NotificationContext";
import ClearRedirectCookie from "@/components/ClearRedirectCookie";
import Script from "next/script";
import TopNav from "@/components/TopNav";

import ChatBotWrapper from "@/components/ChatBotWrapper";

export const metadata: Metadata = {
  title: "Khadim-e-Millat Welfare Foundation",
  description: "Sponsor a family or individual in need with Khadim-e-Millat Welfare Foundation—connecting generous donors with verified families since 2021.",
  keywords: ["welfare", "donation", "scrap collection", "community service", "Gorakhpur", "charity", "marketplace"],
  authors: [{ name: "Cod Vista", url: "https://www.codvista.com" }],
  creator: "Cod Vista",
  publisher: "Cod Vista",
  metadataBase: new URL('https://www.khadimemillat.org'),
  openGraph: {
    title: "Khadim-e-Millat Welfare Foundation",
    description: "Sponsor a family or individual in need with Khadim-e-Millat Welfare Foundation—connecting generous donors with verified families since 2021.",
    url: "/",
    siteName: "Khadim-e-Millat Welfare Foundation",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "Khadim-e-Millat Welfare Foundation Logo",
      },
      {
        url: "/android-chrome-192x192.png",
        width: 192,
        height: 192,
        alt: "Khadim-e-Millat Welfare Foundation Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Khadim-e-Millat Welfare Foundation",
    description: "Sponsor a family or individual in need with Khadim-e-Millat Welfare Foundation—connecting generous donors with verified families since 2021.",
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [
      {
        rel: "android-chrome-192x192",
        url: "/android-chrome-192x192.png",
      },
      {
        rel: "android-chrome-512x512",
        url: "/android-chrome-512x512.png",
      },
    ],
  },
  manifest: "/manifest.ts",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <head>

          <Script
            type="text/javascript"
            src="https://d3mkw6s8thqya7.cloudfront.net/integration-plugin.js"
            id="aisensy-wa-widget"
            widget-id="aaao9p"
          /
          >

        </head>
        <body>
          <ChatBotWrapper />
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <NotificationProvider>
              <SidebarProvider>
                {/* <AppSidebar /> */}
                <SidebarInset>
                  <TopNav />
                  <main className="min-h-screen">
                    <WebPushManager />
                    <ClearRedirectCookie />
                    {children}
                    <Toaster richColors closeButton />
                  </main>
                  <Footer />
                </SidebarInset>
              </SidebarProvider>
            </NotificationProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}