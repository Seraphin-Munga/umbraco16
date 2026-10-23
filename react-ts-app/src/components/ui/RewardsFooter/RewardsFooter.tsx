import { Button } from '../Button/Button';

interface Link {
  label: string;
  url: string;
}

export interface RewardsFooterProps {
  bandCta?: Link | null;
  headingHtml?: string;
  cta?: Link | null;
  links: Link[];
}

// Closing strip of the legacy Audacious Rewards page (rewardsFooterBlock,
// CMS-driven - see cms/renderPageSection.tsx): a navy band with one centred
// button ("VISIT STORE"), then "ACCESS YOUR REWARDS ANYTIME, ANYWHERE!" with
// its own button and square outline document links (T&Cs, FAQs).
export function RewardsFooter({ bandCta, headingHtml, cta, links }: RewardsFooterProps) {
  return (
    <>
      {bandCta && (
        <section className="bg-brand-navy py-6 text-center">
          <Button href={bandCta.url} target="_blank" rel="noopener" className="min-w-[280px] uppercase">
            {bandCta.label}
          </Button>
        </section>
      )}
      {(headingHtml || cta || links.length > 0) && (
        <section className="bg-white py-12">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            {headingHtml && (
              <div
                className="text-[26px] text-brand-muted uppercase md:text-[34px] [&_strong]:font-bold [&_strong]:text-brand-navy"
                dangerouslySetInnerHTML={{ __html: headingHtml }}
              />
            )}
            {cta && (
              <div className="mt-4">
                <Button href={cta.url}>{cta.label}</Button>
              </div>
            )}
            {links.length > 0 && (
              <div className="mt-10 flex flex-wrap gap-8 pl-4">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noopener"
                    className="border border-brand-navy px-6 py-6 text-sm font-bold text-brand-navy uppercase hover:bg-brand-navy hover:text-white"
                  >
                    {link.label}
                  </a>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </>
  );
}
