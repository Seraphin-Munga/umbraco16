export interface TextIntroProps {
  heading: string;
  bodyHtml: string;
  background?: string;
}

// A lone heading plus a rich-text body, no image, no card (textIntroBlock,
// CMS-driven - see cms/renderPageSection.tsx) - e.g. Tap2Glass's own "Why
// choose Tap2Glass?" intro. Intentionally the minimal shape rather than
// reusing a heading+body+image+cta block with several fields left unused.
export function TextIntro({ heading, bodyHtml, background = '' }: TextIntroProps) {
  if (!heading && !bodyHtml) return null;

  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && <h1 className="mb-6 text-[24px] font-semibold text-brand-navy sm:text-[30px]">{heading}</h1>}
        {bodyHtml && (
          <div
            className="max-w-3xl space-y-4 text-base leading-[22px] text-brand-navy [&_strong]:font-bold"
            dangerouslySetInnerHTML={{ __html: bodyHtml }}
          />
        )}
      </div>
    </section>
  );
}
