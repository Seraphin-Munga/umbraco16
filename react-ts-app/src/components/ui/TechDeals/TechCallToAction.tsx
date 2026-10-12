export interface TechCallToActionProps {
  heading: string;
  phoneNumber?: string;
  phoneUrl?: string;
  termsLabel?: string;
  termsUrl?: string;
  disclaimerHtml?: string;
  background?: string;
}

// Tech Deals' own footer strip (techCallToActionBlock, CMS-driven, Tech
// Deals page only - see cms/renderPageSection.tsx) - phone number, terms
// link and fine-print disclaimer. Page-specific rather than part of the
// shared Footer.tsx, since no other page in this app carries this content.
export function TechCallToAction({
  heading,
  phoneNumber,
  phoneUrl,
  termsLabel,
  termsUrl,
  disclaimerHtml,
  background = '',
}: TechCallToActionProps) {
  return (
    <section className={`py-10 text-center ${background}`}>
      <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
        {heading && <p className="text-base text-brand-slate">{heading}</p>}
        {phoneNumber && (
          <p className="mt-2 text-2xl font-bold text-brand-ink">
            {phoneUrl ? <a href={phoneUrl}>{phoneNumber}</a> : phoneNumber}
          </p>
        )}
        {termsLabel && termsUrl && (
          <p className="mt-4 text-sm">
            <a href={termsUrl} className="text-brand-ink underline">
              {termsLabel}
            </a>
          </p>
        )}
        {disclaimerHtml && (
          <div
            className="mt-4 text-xs text-brand-slate [&_p]:leading-[1.4]"
            dangerouslySetInnerHTML={{ __html: disclaimerHtml }}
          />
        )}
      </div>
    </section>
  );
}
