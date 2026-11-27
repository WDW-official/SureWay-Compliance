import Platform from '@/components/platform';
import ServiceDocumentLinks from '@/components/service-document-links';
export default function Home() {
  return <Platform serviceDocumentLinks={<ServiceDocumentLinks />} />;
}
