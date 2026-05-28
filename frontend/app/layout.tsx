import type { Metadata } from 'next';
import "./globals.css"
import { ReduxProvider } from '../providers/ReduxProvider';
import { QueryProvider } from '../providers/QueryProvider';
import 'primereact/resources/themes/lara-light-blue/theme.css';
import 'primereact/resources/primereact.min.css';
import 'primeicons/primeicons.css';
import { PrimeReactProvider } from 'primereact/api';

export const metadata: Metadata = {
  title: 'NexHR ERP — Enterprise Human Resource Management System',
  description: 'Enterprise-grade HRMS for managing employees, attendance, payroll, recruitment and more.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className='bg-red-400 p-5'>
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