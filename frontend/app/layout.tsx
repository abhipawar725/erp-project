import type { Metadata } from 'next';
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
});
import "./globals.css";
import "@/styles/theme.css";
import "@/styles/primereact-overrides.css";
import "primeicons/primeicons.css";

import { ReduxProvider } from '../providers/ReduxProvider';
import { QueryProvider } from '../providers/QueryProvider';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { PrimeReactProvider } from 'primereact/api';
import { ThemeProvider } from "next-themes";

export const metadata: Metadata = {
  title: 'NexHR ERP — Enterprise Human Resource Management System',
  description: 'Enterprise-grade HRMS for managing employees, attendance, payroll, recruitment and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={inter.className}>
      <body className='p-0 m-0'>
        <ReduxProvider>
          <QueryProvider>
            <PrimeReactProvider>
                {children}
            </PrimeReactProvider>
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}