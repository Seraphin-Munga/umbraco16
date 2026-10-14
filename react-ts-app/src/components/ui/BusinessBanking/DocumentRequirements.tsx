import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Card, CardContent } from '../card';

export interface DocumentCategory {
  categoryName: string;
  documents: string[];
}

export interface DocumentRequirementsProps {
  heading: string;
  categories: DocumentCategory[];
  sizesFormatsHeading?: string;
  sizesFormatsText?: string;
  background?: string;
}

// Tabbed "Documents you will need..." block (documentRequirementsBlock,
// CMS-driven - see cms/renderPageSection.tsx) - a left column of category
// names (click to switch), the active category's own arrow-bulleted
// document list on the right, and a trailing sizes/formats note below.
// Categories with no documents of their own (e.g. a placeholder category
// an editor hasn't filled in yet) are still shown as a tab, just with an
// empty list when selected - same as the live page's own "Sole
// proprietor"/"General" tabs.
export function DocumentRequirements({
  heading,
  categories,
  sizesFormatsHeading,
  sizesFormatsText,
  background = '',
}: DocumentRequirementsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (categories.length === 0) return null;

  const active = categories[activeIndex];

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && <h2 className="mb-8 text-[24px] font-semibold text-brand-navy">{heading}</h2>}

        <Card className="rounded-[20px] bg-card shadow-[0_9px_18px_0_rgba(0,0,0,0.15)] ring-0 [--card-spacing:--spacing(8)] sm:[--card-spacing:--spacing(11)]">
          <CardContent>
            <div className="grid grid-cols-1 gap-10 sm:grid-cols-3">
              <div className="flex flex-col gap-4 sm:col-span-1">
                {categories.map((category, index) => (
                  <button
                    key={category.categoryName}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`border-b border-brand-line pb-4 text-left text-sm font-semibold ${
                      index === activeIndex ? 'text-brand-green' : 'text-brand-navy'
                    }`}
                  >
                    {category.categoryName}
                  </button>
                ))}
              </div>

              <div className="sm:col-span-2">
                {active.documents.length > 0 && (
                  <ul className="space-y-4">
                    {active.documents.map((doc) => (
                      <li key={doc} className="flex items-start gap-3 text-sm leading-[20px] text-brand-navy">
                        <ArrowRight className="mt-0.5 size-4 shrink-0 text-brand-green" />
                        <span>{doc}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            {(sizesFormatsHeading || sizesFormatsText) && (
              <div className="mt-10 border-t border-brand-line pt-8">
                {sizesFormatsHeading && (
                  <div className="mb-2 text-sm font-semibold text-brand-navy">{sizesFormatsHeading}</div>
                )}
                {sizesFormatsText && (
                  <div
                    className="space-y-2 text-sm text-brand-slate"
                    dangerouslySetInnerHTML={{ __html: sizesFormatsText }}
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
