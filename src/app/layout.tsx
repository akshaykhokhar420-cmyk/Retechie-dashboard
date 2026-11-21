import PageLoader from '@/components/PageLoader';
import './tailwind.css';
import type { Metadata } from 'next';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/lib/toast';
export const metadata: Metadata = { title: 'Retechie Dashboard', robots: { index: false, follow: false } };
export default function Root({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><PageLoader /><ToastProvider><AuthProvider>{children}</AuthProvider></ToastProvider></body></html>;
}
