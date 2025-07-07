import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./context/AuthContext";
import Header from "./components/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "GraderSmith",
  description: "Modern Online Judge Platform",
};

// This component injects the necessary CSS variables for styling
const StyleInjector = () => {
    const style = `
      :root {
        --bg-primary: #f8fafc; --bg-secondary: #ffffff; --bg-tertiary: #f1f5f9; --card-bg: #ffffff; --header-bg: #f8fafc; --input-bg: #f1f5f9; --border-color: #e2e8f0; --border-hover: #cbd5e1; --text-primary: #1e293b; --text-secondary: #64748b; --text-muted: #94a3b8; --accent-color: #3b82f6; --accent-hover: #2563eb; --success-color: #22c55e; --success-hover: #16a34a; --error-color: #ef4444; --warning-color: #f59e0b; --info-color: #3b82f6; --card-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06); --card-shadow-hover: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); --transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }
      body.dark-mode {
        --bg-primary: #0f172a; --bg-secondary: #1e293b; --bg-tertiary: #334155; --card-bg: #1e293b; --header-bg: #0f172a; --input-bg: #334155; --border-color: #475569; --border-hover: #64748b; --text-primary: #f1f5f9; --text-secondary: #cbd5e1; --text-muted: #64748b; --card-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2); --card-shadow-hover: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3);
      }
    `;
    return <style>{style}</style>;
}


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <StyleInjector />
      </head>
      <body className={`${inter.className} dark-mode bg-bg-primary`}>
        <AuthProvider>
          <Header />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
