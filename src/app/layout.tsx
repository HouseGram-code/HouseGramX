import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-store";
import { AuthGate } from "@/components/AuthGate";
import { MaintenanceProvider } from "@/lib/maintenance-store";
import { MaintenanceGate } from "@/components/MaintenanceGate";
import { SettingsProvider } from "@/lib/settings-store";
import { StickersProvider } from "@/lib/stickers-store";
import { ChatProvider } from "@/lib/chat-store";
import { FoldersProvider } from "@/lib/folders-store";
import { ProfileProvider } from "@/lib/profile-store";
import { ContactsProvider } from "@/lib/contacts-store";
import { CallsProvider } from "@/lib/calls-store";
import { PeerCallProvider } from "@/lib/peer-call";
import { GroupCallProvider } from "@/lib/group-call";
import { PresenceProvider } from "@/lib/presence-store";
import { ConnectionProvider } from "@/lib/connection-store";
import { ToastProvider } from "@/components/Toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "cyrillic"],
});

export const metadata: Metadata = {
  title: "HouseGramX",
  description: "HouseGramX — современный мессенджер на Next.js 16 + React 19",
  manifest: "/manifest.webmanifest",
  applicationName: "HouseGramX",
  appleWebApp: {
    capable: true,
    title: "HouseGramX",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/icon-192.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#000000" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

// Применяем сохранённую тему до первой отрисовки, чтобы не было «мигания».
const themeInit = `(function(){try{var s=localStorage.getItem('messenger.settings.v1');if(s){var t=JSON.parse(s).theme;if(t&&t!=='system'){document.documentElement.setAttribute('data-theme',t);}}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru" className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="min-h-full bg-background">
        <AuthProvider>
          <AuthGate>
            <MaintenanceProvider>
              <MaintenanceGate>
                <SettingsProvider>
                  <StickersProvider>
                    <ChatProvider>
                      <FoldersProvider>
                      <ProfileProvider>
                        <ContactsProvider>
                          <CallsProvider>
                            <PeerCallProvider>
                              <GroupCallProvider>
                              <PresenceProvider>
                                <ConnectionProvider>
                                  <ToastProvider>
                                    {/* Фуллскрин на всех устройствах */}
                                    <div className="flex min-h-dvh w-full flex-col bg-background">
                                      {children}
                                    </div>
                                  </ToastProvider>
                                </ConnectionProvider>
                              </PresenceProvider>
                              </GroupCallProvider>
                            </PeerCallProvider>
                          </CallsProvider>
                        </ContactsProvider>
                      </ProfileProvider>
                      </FoldersProvider>
                    </ChatProvider>
                  </StickersProvider>
                </SettingsProvider>
              </MaintenanceGate>
            </MaintenanceProvider>
          </AuthGate>
        </AuthProvider>
      </body>
    </html>
  );
}
