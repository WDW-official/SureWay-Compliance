import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {
  title: 'SureWay Compliance | Your documents. Handled.',
  description: 'Vehicle document renewals, permits and new registrations in Lagos. Clear pricing, soft copies first, and hard copies delivered to your door.'
};
export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return <html lang="en"><body>{children}</body></html>;
}
