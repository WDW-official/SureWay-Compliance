import BrandLogo from '@/components/brand-logo';
import ServiceDocumentLinks from '@/components/service-document-links';

export default function ServiceDocumentsLayout({ children }: { children: React.ReactNode }) {
  return <div className="container policy-layout">
    <header><BrandLogo href="/" /></header>
    <main>{children}</main>
    <footer><nav aria-label="Site policies"><ServiceDocumentLinks /></nav></footer>
  </div>;
}
