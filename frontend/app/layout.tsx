import type { Metadata } from 'next';
import "./globals.css"
import { ReduxProvider } from '../providers/ReduxProvider';
import { QueryProvider } from '../providers/QueryProvider';

export const metadata: Metadata = {
  title: 'NexHR ERP — Enterprise Human Resource Management System',
  description: 'Enterprise-grade HRMS for managing employees, attendance, payroll, recruitment and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ReduxProvider>
          <QueryProvider>
            {children}
          </QueryProvider>
        </ReduxProvider>
      </body>
    </html>
  );
}