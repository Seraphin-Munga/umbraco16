import type { ReactNode } from 'react';
import { useState } from 'react';

// Bootstrap-5-shaped accordion (.accordion/.accordion-item/.accordion-button/
// .accordion-collapse) - styling comes entirely from public/vendor/
// projectmagic.css (base .accordion rules plus the .accordionStyle2
// variant), same as Button.tsx's approach to the vendor "btn" classes. No
// Bootstrap JS is bundled in this app, so open/close state (the
// .collapsed button class and .show collapse class Bootstrap's JS would
// otherwise toggle) is driven by React state here instead.
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
  const accordionClass = variant === 'style2' ? 'accordion accordionStyle2' : 'accordion';

  return (
    <div className={accordionClass} id={id}>
      <div className="row">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          return (
            <div className="col-lg-12" key={item.title}>
              <div className="accordion-item">
                <h5 className="accordion-header">
                  <button
                    type="button"
                    className={`accordion-button text-heading-5${isOpen ? '' : ' collapsed'}`}
                    aria-expanded={isOpen}
                    onClick={() => setOpenIndex((current) => (current === index ? null : index))}
                  >
                    {item.title}
                  </button>
                </h5>
                <div className={`accordion-collapse collapse${isOpen ? ' show' : ''}`}>
                  <div className="accordion-body">{item.content}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
