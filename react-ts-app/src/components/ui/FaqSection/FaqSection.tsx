import { Accordion } from '../Accordion/Accordion';

export interface FaqItem {
  question: string;
  answerHtml: string;
}

export interface FaqSectionProps {
  id: string;
  heading: string;
  items: FaqItem[];
}

// FAQ accordion section (faqSectionBlock, CMS-driven, any page - see
// cms/renderPageSection.tsx). `id` must be unique per rendered instance -
// callers pass something derived from the section's own index/key.
//
// Was previously `.container`/`.row`/`.col-xl-12`/etc - see
// PromoSplit.tsx's own comment for why that stylesheet (public/vendor/
// projectmagic.css) isn't actually loaded, so this rendered unstyled.
export function FaqSection({ id, heading, items }: FaqSectionProps) {
  return (
    <section className="py-[45px]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mt-[15px] mb-[20px] text-center text-brand-ink">{heading}</h1>
        <Accordion
          id={id}
          variant="style2"
          items={items.map((item) => ({
            title: item.question,
            content: <div dangerouslySetInnerHTML={{ __html: item.answerHtml }} />,
          }))}
        />
      </div>
    </section>
  );
}
