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
export function FaqSection({ id, heading, items }: FaqSectionProps) {
  return (
    <section className="section pt-45 pb-45">
      <div className="container">
        <div className="row align-items-center d-flex row-change md-text-center">
          <div className="col-xl-12 col-lg-12 col-md-12">
            <h1 className="color-brand-1 mt-15 mb-20 text-center faqHeader">{heading}</h1>
            <Accordion
              id={id}
              variant="style2"
              items={items.map((item) => ({
                title: item.question,
                content: <div dangerouslySetInnerHTML={{ __html: item.answerHtml }} />,
              }))}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
