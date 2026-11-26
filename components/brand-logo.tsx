import Image from 'next/image';
import primaryLogo from '@/assets/sureway-logo-primary.png';
import footerLogo from '@/assets/sureway-logo-footer.png';

export default function BrandLogo({ href = '#', footer = false }: { href?: string; footer?: boolean }) {
  return (
    <a href={href} className="brand" aria-label="SureWay Compliance home">
      <Image
        src={footer ? footerLogo : primaryLogo}
        alt=""
        sizes={footer ? '180px' : '(max-width: 640px) 158px, 192px'}
        loading={footer ? 'lazy' : 'eager'}
      />
    </a>
  );
}
