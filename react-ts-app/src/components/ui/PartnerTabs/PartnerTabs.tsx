import { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { Button } from '../Button/Button';
import { LazyImage } from '../Image/LazyImage';

interface Link {
  label: string;
  url: string;
}

export interface PartnerTabCard {
  title: string;
  bodyHtml: string;
  link: Link | null;
}

export interface PartnerTab {
  label: string;
  heading: string;
  subheading: string;
  description: string;
  imageUrl: string;
  cards: PartnerTabCard[];
  footnoteHtml: string;
  closingText: string;
  cta: Link | null;
}

export interface PartnerTabsProps {
  heading?: string;
  introHtml?: string;
  tabs: PartnerTab[];
  background?: string;
}

// "How to Earn" partner tabs (partnerTabsBlock, CMS-driven - see
// cms/renderPageSection.tsx) - ported from the legacy Audacious Rewards
// page: a row of pill tabs (Car Hire, Dining, ...), each opening a partner
// panel with a banner, Debit/Credit Card earn-rate cards, a boosted-rate
// footnote and a partner button.
export function PartnerTabs({ heading, introHtml, tabs, background = '' }: PartnerTabsProps) {
  const [active, setActive] = useState(0);
  if (tabs.length === 0) return null;
  const tab = tabs[Math.min(active, tabs.length - 1)];

  return (
    <section id="how-to-earn" className={`scroll-mt-24 py-12 md:py-16 ${background}`}>
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="text-center text-[30px] font-bold text-brand-ink">{heading}</h2>}
        {introHtml && (
          <div
            className="mt-3 text-center text-lg text-brand-ink [&_a]:underline"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        )}

        <div
          role="tablist"
          className="my-6 flex gap-2 overflow-x-auto rounded-full border border-[#d9d9d9] p-2 [scrollbar-width:none]"
        >
          {tabs.map((item, index) => (
            <button
              key={item.label}
              type="button"
              role="tab"
              aria-selected={index === active}
              onClick={() => setActive(index)}
              className={`shrink-0 rounded-full px-7 py-2.5 text-sm font-semibold shadow-brand-sm transition-colors ${
                index === active ? 'bg-brand-navy text-white' : 'bg-brand-mist text-brand-navy hover:bg-white'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div role="tabpanel">
          <h3 className="text-[32px] font-bold text-brand-navy">{tab.heading}</h3>
          {tab.subheading && <p className="mt-2 text-xl font-bold text-brand-navy">{tab.subheading}</p>}
          {tab.description && <p className="mt-2 mb-6 text-base text-brand-navy">{tab.description}</p>}
          {tab.imageUrl && <LazyImage className="block w-full rounded-[15px]" src={tab.imageUrl} alt={tab.heading} />}

          {tab.cards.length > 0 && (
            // Cards ride up over the bottom of the banner, as on the legacy
            // page - only when there is a banner to overlap.
            <div
              className={`relative mx-auto grid max-w-3xl grid-cols-1 gap-6 ${tab.cards.length > 1 ? 'md:grid-cols-2' : ''} ${
                tab.imageUrl ? 'mt-6 md:-mt-24' : 'mt-8'
              }`}
            >
              {tab.cards.map((card) => (
                <div key={card.title} className="overflow-hidden rounded-[15px] bg-white shadow-[0_10px_15px_#0000001a]">
                  <div className="bg-[#764b9a] px-6 py-5 text-lg font-bold text-white">{card.title}</div>
                  <div
                    className="px-6 pt-5 text-sm leading-7 text-brand-navy [&_p]:mb-4 [&_strong]:font-bold"
                    dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                  />
                  {card.link && (
                    <div className="mx-6 border-t-2 border-[#ececec] py-4 text-center">
                      <a href={card.link.url} className="text-lg font-bold text-[#89bc44]">
                        {card.link.label}
                      </a>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {tab.footnoteHtml && (
            <div
              className="mt-8 text-center text-base text-brand-navy [&_a]:font-bold [&_a]:text-brand-lime [&_p]:mb-3"
              dangerouslySetInnerHTML={{ __html: tab.footnoteHtml }}
            />
          )}
          {tab.closingText && <p className="mt-4 text-center text-base text-brand-navy">{tab.closingText}</p>}
          {tab.cta && (
            <div className="mt-6 text-center">
              <Button href={tab.cta.url} target="_blank" rel="noopener">
                {tab.cta.label} <ChevronRight className="ml-6 size-5" />
              </Button>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
