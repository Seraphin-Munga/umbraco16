import { Button } from '../Button/Button';

export interface StepCard {
  title: string;
  bodyHtml: string;
  cta: { label: string; url: string } | null;
}

export interface StepCardsProps {
  heading?: string;
  introHtml?: string;
  introCta?: { label: string; url: string } | null;
  cards: StepCard[];
  background?: string;
}

// Row of white step cards - a centred uppercase title, a few bold-lead lines
// and a button (stepCardsBlock, CMS-driven - see cms/renderPageSection.tsx)
// - ported from the legacy Audacious Rewards page's JOIN / EARN / SPEND row,
// with its optional "WELCOME TO AUDACIOUS REWARDS" intro and button above.
export function StepCards({ heading, introHtml, introCta, cards, background = '' }: StepCardsProps) {
  if (cards.length === 0 && !introHtml) return null;

  return (
    <section className={`py-12 md:py-16 ${background}`}>
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="mb-8 text-center text-[26px] font-bold text-brand-ink md:text-[36px]">{heading}</h2>}
        {introHtml && (
          <div
            className="text-base text-brand-navy [&_h2]:mb-5 [&_h2]:text-[24px] [&_h2]:font-normal [&_h2]:uppercase md:[&_h2]:text-[30px] [&_p]:mb-3 [&_strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: introHtml }}
          />
        )}
        {introCta && (
          <div className="mt-6">
            <Button href={introCta.url}>{introCta.label}</Button>
          </div>
        )}

        {cards.length > 0 && (
          <div className="mt-14 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-12">
            {cards.map((card) => (
              <div key={card.title} className="flex flex-col rounded-[50px] bg-white px-8 py-7">
                <h3 className="text-center text-[25px] font-bold text-brand-navy uppercase">{card.title}</h3>
                <div
                  className="mt-5 mb-4 flex-1 text-base leading-relaxed text-brand-navy [&_p]:mb-4 [&_strong]:font-bold"
                  dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                />
                {card.cta && (
                  <div className="text-center">
                    <Button href={card.cta.url}>{card.cta.label}</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
