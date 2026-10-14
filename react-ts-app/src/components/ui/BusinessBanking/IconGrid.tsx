import { Card } from '../card';
import type { HeroProductGridItem } from '../../Home/HeroCarousel';

export interface IconGridProps {
  heading?: string;
  items: HeroProductGridItem[];
  background?: string;
}

// A row of small icon+label items, no card, no description (iconGridBlock,
// CMS-driven - see cms/renderPageSection.tsx) - e.g. "Easy online access" /
// "Free EFT deposit" / "Low banking fees" / "Secure payments" on Business
// Transactional Account. Reuses heroGridItem's own shape (icon/label/link,
// already shared from create-home-schema) - each item is a plain label
// unless an editor also picks a link.
export function IconGrid({ heading, items, background = '' }: IconGridProps) {
  if (items.length === 0) return null;

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="mb-8 text-[20px] font-semibold text-brand-navy">{heading}</h2>}

        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {items.map((item) => {
            const content = (
              <Card className="h-full flex-col items-center justify-center gap-5 rounded-lg border border-brand-line bg-card px-4 py-10 text-center ring-0 shadow-none">
                {item.iconUrl && <img src={item.iconUrl} alt="" className="h-16 w-16" loading="lazy" />}
                <div className="text-[20px] leading-[1.2] font-semibold text-brand-navy">{item.label}</div>
              </Card>
            );

            return item.url !== '#' ? (
              <a key={item.label} href={item.url} className="block h-full">
                {content}
              </a>
            ) : (
              <div key={item.label} className="h-full">
                {content}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
