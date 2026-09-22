import type { ReactNode } from 'react';
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

// Accordion (no Bootstrap JS bundled in this app, so open/close state is
// driven by React here rather than Bootstrap's own collapse plugin).
//
// Was previously Bootstrap-5-shaped (.accordion/.accordion-item/.accordion-
// button/.accordion-collapse), styled entirely by public/vendor/
// projectmagic.css's base .accordion-item rules plus its .accordionStyle2
// variant - a stylesheet that isn't actually loaded anywhere (see
// PromoSplit.tsx's own comment on that gap), so this rendered completely
// unstyled in production despite the styling comment that used to sit
// here. Only 'style2' is ever actually used (FaqSection.tsx's only
// caller), so that variant gets the fuller, confirmed treatment
// (projectmagic.css's rounded/shadowed white card, 50px border-radius,
// 20px item spacing); 'default' gets a plain bordered-list treatment
// reproducing that variant's own base rules. The source's chevron was a
// CSS `content: '❯'` pseudo-element that rotated on toggle - replaced
// here with a real ChevronDown icon (rotates 180° open) rather than
// reproducing that pseudo-element trick.
export interface AccordionItemData {
  title: string;
  content: ReactNode;
}

export interface AccordionProps {
  items: AccordionItemData[];
  variant?: 'default' | 'style2';
  id?: string;
  // Index open by default; null (the default) starts fully collapsed.
  defaultOpenIndex?: number | null;
}

export function Accordion({ items, variant = 'default', id, defaultOpenIndex = null }: AccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(defaultOpenIndex);
  const isStyle2 = variant === 'style2';

  return (
    <div id={id} className="flex flex-col">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div
            key={item.title}
            className={
              isStyle2
                ? 'mb-[20px] overflow-hidden rounded-[50px] bg-white shadow-[9px_11px_23px_rgba(6,61,79,0.12)] last:mb-0'
                : 'border-b border-[#e5e5e5] first:border-t'
            }
          >
            <h5>
              <button
                type="button"
                className={
                  isStyle2
                    ? 'flex w-full items-center justify-between bg-white px-5 py-5 text-left text-base font-bold text-brand-ink'
                    : `flex w-full items-center justify-between rounded-t-[8px] px-[30px] pt-[25px] pb-[20px] text-left text-base font-bold text-brand-ink transition-colors ${isOpen ? 'bg-[#ECF1F2]' : 'bg-transparent'}`
                }
                aria-expanded={isOpen}
                onClick={() => setOpenIndex((current) => (current === index ? null : index))}
              >
                {item.title}
                <ChevronDown
                  className={`ml-4 size-5 shrink-0 text-brand-ink transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                />
              </button>
            </h5>
            {isOpen && (
              <div className={isStyle2 ? 'bg-white px-5 pb-5' : 'rounded-b-[8px] bg-[#ECF1F2] px-[30px] pt-0 pb-[30px]'}>
                <div className="text-brand-ink">{item.content}</div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
