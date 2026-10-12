export interface ContactInfoCard {
  heading: string;
  bodyHtml: string;
}

export interface ContactInfoProps {
  heading: string;
  cards: ContactInfoCard[];
}

// Talk To Us page's own "Contact information" block (contactInfoBlock,
// CMS-driven, Talk To Us page only - see cms/renderPageSection.tsx) - a
// green banner heading above a table-like grid of contact cards. Each
// card's content (multiple phone numbers, WhatsApp-only cards, nested
// "Personal Banking"/"Business and Commercial Banking" sub-sections,
// operating hours) is too varied to model as strict fields, so a card is
// just a heading plus one rich-text body - same "free text over strict
// fields" choice as techRequirementsBlock's own bodyHtml/disclaimerHtml.
export function ContactInfo({ heading, cards }: ContactInfoProps) {
  return (
    <section className="pb-10">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="bg-brand-green px-6 py-12 sm:px-10 sm:py-16">
          <h1 className="text-[32px] font-extrabold text-white sm:text-[42px]">{heading}</h1>
        </div>
      </div>

      {cards.length > 0 && (
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mt-10 grid grid-cols-1 gap-px border border-brand-mist bg-brand-mist sm:grid-cols-3">
            {cards.map((card, index) => (
              <div key={`${card.heading}-${index}`} className="bg-white p-8">
                <h2 className="mb-2 text-base font-bold text-brand-ink">{card.heading}</h2>
                {card.bodyHtml && (
                  <div
                    className="text-sm text-brand-slate [&_a]:text-brand-blue [&_a]:underline [&_p:last-child]:mb-0 [&_p]:mb-2"
                    dangerouslySetInnerHTML={{ __html: card.bodyHtml }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
