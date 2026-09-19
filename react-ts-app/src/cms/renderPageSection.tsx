import type { ReactNode } from 'react';
import type { AnyPageSection } from '../api/contentApi';
import { HeroCarousel } from '../components/Home/HeroCarousel';
import { HeroSplit } from '../components/ui/Hero/HeroSplit';
import { HeroBanner } from '../components/ui/Hero/HeroBanner';
import { PromoSplit } from '../components/ui/PromoSplit/PromoSplit';
import { FeatureSplit } from '../components/ui/FeatureSplit/FeatureSplit';
import { FeatureChecklist } from '../components/ui/FeatureChecklist/FeatureChecklist';
import { DownloadsSection } from '../components/ui/DownloadsSection/DownloadsSection';
import { FaqSection } from '../components/ui/FaqSection/FaqSection';
import { CrossSell } from '../components/ui/CrossSell/CrossSell';
import { BankWithAudacity } from '../components/Home/BankWithAudacity';
import { LoanCalculator } from '../components/ui/LoanCalculator/LoanCalculator';
import { MyWorldAccount } from '../components/Home/MyWorldAccount';
import { DebitCardShowcase } from '../components/Home/DebitCardShowcase';
import { RewardsSection } from '../components/Home/RewardsSection';
import { Tap2GlassSection } from '../components/Home/Tap2GlassSection';
import { BusinessAudacitySection } from '../components/Home/BusinessAudacitySection';
import { AppDownloadSection } from '../components/Home/AppDownloadSection';
import { Testimonials } from '../components/Home/Testimonials';

// Single shared block registry, used by Home.tsx, PersonalLoanPage.tsx AND
// DynamicPage.tsx (the catch-all route for any new CMS page - see that
// file's own comment). Adding a page composed entirely of block types
// already listed here needs no new React code at all - just a new
// Document Type in Umbraco (its own "sections" Block List picking from
// existing or new block Element Types) and, for a genuinely new block
// type, one more `case` added here.
//
// Merges what used to be two separate, near-identical switch statements
// (Home.tsx's renderCmsSections, PersonalLoanPage.tsx's renderSection) -
// safe to combine since HomePageSection's and ProductLoanPageSection's
// `kind` values never overlap (contentApi.ts's mapAnySection relies on the
// same non-overlap).

// Renders a single-field CMS heading string in the same brand-span style
// every section's own hardcoded heading uses - `undefined` (not an empty
// span) when the field is blank, so the component keeps its own default
// heading instead of rendering nothing.
function brandHeading(text: string): ReactNode | undefined {
  return text ? <span className="span-major-title">{text}</span> : undefined;
}

// bankWithAudacityBlock has no separate highlightWord field the way
// myWorldAccountBlock does (see that case below) - just one plain heading
// string ("Bank with audacity"). Splits it into a bold lead ("Bank with")
// on its own line and a thin last word ("audacity"), matching the
// two-weight .major-title/.span-major-title look this heading always had
// when it was hardcoded JSX rather than CMS text.
function bankWithAudacityHeading(text: string): ReactNode | undefined {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  if (words.length === 1) return brandHeading(text);

  const lastWord = words[words.length - 1];
  const lead = words.slice(0, -1).join(' ');

  return (
    <>
      <span className="span-major-title">{lead}</span>
      <br />
      {lastWord}
    </>
  );
}

// tap2GlassBlock has no separate highlightWord field either - just one
// plain heading string ("Get The Tap2Glass App"). The bold word here isn't
// first or last, so bankWithAudacityHeading's rule doesn't apply - this
// finds "Tap2Glass" itself (the one word that's always the product name,
// regardless of the surrounding copy) and bolds just that, line-breaking
// before it, matching the original hardcoded JSX's
// `Get The <br/><span className="span-major-title">Tap2Glass</span> App`.
// Falls back to a single bold span if an editor ever removes the word
// "Tap2Glass" from the heading entirely.
function tap2GlassHeading(text: string): ReactNode | undefined {
  if (!text) return undefined;

  const match = text.match(/^(.*?)\b(Tap2Glass)\b(.*)$/i);
  if (!match) return brandHeading(text);

  const [, before, brand, after] = match;

  return (
    <>
      {before.trim()}
      <br />
      <span className="span-major-title">{brand}</span>
      {after}
    </>
  );
}

export function renderPageSection(section: AnyPageSection, index: number): ReactNode {
  switch (section.kind) {
    case 'heroCarouselBlock':
      return (
        <HeroCarousel
          key={index}
          slides={section.slides}
          gridItems={section.gridItems}
          autoAdvanceMs={
            section.autoAdvanceSeconds ? section.autoAdvanceSeconds * 1000 : undefined
          }
        />
      );

    case 'bankWithAudacityBlock':
      return (
        <BankWithAudacity
          key={index}
          cards={section.cards}
          heading={bankWithAudacityHeading(section.heading)}
        />
      );

    case 'loanCalculatorBlock':
      return <LoanCalculator key={index} {...section.props} />;

    case 'myWorldAccountBlock':
      return (
        <MyWorldAccount
          key={index}
          features={section.features}
          ctaLabel={section.ctaLabel ?? undefined}
          ctaUrl={section.ctaUrl ?? undefined}
          heading={
            section.highlightWord || section.heading ? (
              <>
                <span className="span-major-title">{section.highlightWord}</span> <br />
                {section.heading}
              </>
            ) : undefined
          }
          subheading={section.subheading || undefined}
        />
      );

    case 'debitCardShowcaseBlock':
      return <DebitCardShowcase key={index} imageUrl={section.imageUrl} alt={section.alt} />;

    case 'rewardsSectionBlock':
      return (
        <RewardsSection
          key={index}
          cards={section.cards}
          heading={brandHeading(section.heading)}
          subheading={section.subheading || undefined}
          intro={section.intro || undefined}
        />
      );

    case 'tap2GlassBlock':
      return (
        <Tap2GlassSection
          key={index}
          downloadUrl={section.downloadUrl ?? undefined}
          downloadLabel={section.downloadLabel ?? undefined}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          description={section.description}
          heading={tap2GlassHeading(section.heading)}
        />
      );

    case 'businessAudacityBlock':
      return (
        <BusinessAudacitySection
          key={index}
          slides={section.slides}
          videoThumbnailUrl={section.videoThumbnailUrl}
          heading={brandHeading(section.heading)}
          contactCards={section.contactCards}
        />
      );

    case 'appDownloadBlock':
      return (
        <AppDownloadSection
          key={index}
          subheading={section.subheading}
          description={section.description}
          downloadUrl={section.downloadUrl ?? undefined}
          downloadLabel={section.downloadLabel ?? undefined}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          heading={brandHeading(section.heading)}
        />
      );

    case 'testimonialsBlock':
      return <Testimonials key={index} videos={section.videos} heading={section.heading || undefined} />;

    case 'heroBannerBlock':
      // Two-column hero (HeroSplit) - e.g. Consolidation Loan's "Combine up
      // to 5 loans in 1". See heroImageBannerBlock below for the other,
      // full-bleed hero style (e.g. Personal Loan's "We give credit").
      return (
        <HeroSplit
          key={index}
          heading={section.heading}
          description={section.description}
          primaryCta={section.primaryCta}
          secondaryCta={section.secondaryCta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
        />
      );

    case 'heroImageBannerBlock':
      // Full-bleed background-photo hero (HeroBanner) - e.g. Personal
      // Loan's "We give credit / where progress is due".
      return (
        <HeroBanner
          key={index}
          headingLead={section.headingLead}
          headingHighlight={section.headingHighlight}
          description={section.description}
          primaryCta={section.primaryCta}
          secondaryCta={section.secondaryCta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
        />
      );

    case 'promoSplitBlock':
      // Two-column promo, two pill CTAs (PromoSplit) - e.g. the MyWORLD
      // "Bank Account" promo.
      return (
        <PromoSplit
          key={index}
          heading={section.heading}
          description={section.description}
          primaryCta={section.primaryCta}
          secondaryCta={section.secondaryCta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          imageOnRight={section.imageOnRight}
        />
      );

    case 'featureSplitBlock':
      // Two-column bold-lead feature list (FeatureSplit) - e.g.
      // "Why Choose MyWORLD?".
      return (
        <FeatureSplit
          key={index}
          heading={section.heading}
          features={section.features}
          cta={section.cta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          imageOnRight={section.imageOnRight}
        />
      );

    case 'featureChecklistBlock':
      // Two-column checkmarked feature list (FeatureChecklist) - e.g.
      // "What is a Pocket Account".
      return (
        <FeatureChecklist
          key={index}
          heading={section.heading}
          subheading={section.subheading}
          features={section.features}
          cta={section.cta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          imageOnRight={section.imageOnRight}
        />
      );

    case 'creditLifeInsuranceBlock':
      return (
        <section className="section-800 bg-grey-60" key={index}>
          <div className="container">
            <div className="row d-flex align-items-center row-change reverse-row md-text-center">
              <div className="col-xl-7 col-lg-7 col-md-7">
                <h1 className="color-brand-1 mt-15 mb-20">{section.heading}</h1>
                {section.paragraphOne && (
                  <p className="font-md color-brand-1">{section.paragraphOne}</p>
                )}
                {section.paragraphTwo && (
                  <p className="font-md color-brand-1 mt-20">{section.paragraphTwo}</p>
                )}
                <div className="row">
                  <div className="col-xl-6 col-lg-6 col-md-6">
                    <div className="mt-30 mb-30 inline-checklist">
                      <ul className="list-ticks list-ticks-2">
                        {section.checklistOne.map((item) => (
                          <li key={item}>
                            <strong>{item}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="col-xl-6 col-lg-6 col-md-6">
                    <div className="mt-30 mb-30 inline-checklist">
                      <ul className="list-ticks list-ticks-2">
                        {section.checklistTwo.map((item) => (
                          <li key={item}>
                            <strong>{item}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              {section.imageUrl && (
                <div className="col-xl-5 col-lg-5 col-md-5">
                  <img className="d-block" src={section.imageUrl} alt={section.heading} />
                </div>
              )}
            </div>
          </div>
        </section>
      );

    case 'faqSectionBlock':
      return (
        <FaqSection
          key={index}
          id={`accordionFAQ-${index}`}
          heading={section.heading}
          items={section.items}
        />
      );

    case 'downloadsSectionBlock':
      return <DownloadsSection key={index} heading={section.heading} items={section.items} />;

    case 'crossSellBlock':
      return (
        <CrossSell key={index} heading={section.heading} cards={section.cards} imageUrl={section.imageUrl} />
      );

    default:
      return null;
  }
}
