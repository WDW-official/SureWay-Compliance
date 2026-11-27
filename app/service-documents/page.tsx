import Link from 'next/link';
import { approvedPolicies, policySlugs, policyTitles } from '@/lib/policies';

export const metadata = { title: 'Service Documents | SureWay Compliance' };

export default function ServiceDocuments() {
  return <>
    <h1>Service Documents</h1>
    <ul>
      {policySlugs.map(slug => <li key={slug}>
        {approvedPolicies[slug]
          ? <Link href={`/service-documents/${slug}`}>{policyTitles[slug]}</Link>
          : <>{policyTitles[slug]} <small>Awaiting publication</small></>}
      </li>)}
    </ul>
  </>;
}
