import { notFound } from 'next/navigation';
import { approvedPolicies, policySlugs, policyTitles } from '@/lib/policies';

type Props = { params: Promise<{ policy: string }> };

async function getPolicy(params: Props['params']) {
  const { policy } = await params;
  const slug = policySlugs.find(value => value === policy);
  if (!slug) notFound();
  const approved = approvedPolicies[slug];
  if (!approved) notFound();
  return { title: policyTitles[slug], ...approved };
}

export function generateStaticParams() {
  return policySlugs.filter(slug => approvedPolicies[slug]).map(policy => ({ policy }));
}

export async function generateMetadata({ params }: Props) {
  const { title } = await getPolicy(params);
  return { title: `${title} | SureWay Compliance` };
}

export default async function PolicyPage({ params }: Props) {
  const policy = await getPolicy(params);
  return <article>
    <h1>{policy.title}</h1>
    <p>Effective {policy.effectiveDate}</p>
    {policy.sections.map((section, index) => <section key={index}>
      <h2>{section.heading}</h2>
      {section.paragraphs.map((paragraph, paragraphIndex) => <p key={paragraphIndex}>{paragraph}</p>)}
    </section>)}
  </article>;
}
