import Link from 'next/link';
import { CookieSettingsButton } from './cookie-preferences';
import { approvedPolicies, policyTitles } from '@/lib/policies';

export default function ServiceDocumentLinks() {
  return <>
    <Link href="/service-documents">Service Documents</Link>
    {approvedPolicies['privacy-policy'] && <Link href="/service-documents/privacy-policy">{policyTitles['privacy-policy']}</Link>}
    {approvedPolicies['terms-of-service'] && <Link href="/service-documents/terms-of-service">{policyTitles['terms-of-service']}</Link>}
    <CookieSettingsButton />
  </>;
}
