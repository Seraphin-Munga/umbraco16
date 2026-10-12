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
import { BlobImage } from '../components/ui/Image/BlobImage';
import { BankWithAudacity } from '../components/Home/BankWithAudacity';
import { LoanCalculator } from '../components/ui/LoanCalculator/LoanCalculator';
import { MyWorldAccount } from '../components/Home/MyWorldAccount';
import { DebitCardShowcase } from '../components/Home/DebitCardShowcase';
import { RewardsSection } from '../components/Home/RewardsSection';
import { Tap2GlassSection } from '../components/Home/Tap2GlassSection';
import { BusinessAudacitySection } from '../components/Home/BusinessAudacitySection';
import { AppDownloadSection } from '../components/Home/AppDownloadSection';
import { Testimonials } from '../components/Home/Testimonials';
import { TechHero } from '../components/ui/TechDeals/TechHero';
import { PlugAndGo } from '../components/ui/TechDeals/PlugAndGo';
import { TechRequirements } from '../components/ui/TechDeals/TechRequirements';
import { TechCallToAction } from '../components/ui/TechDeals/TechCallToAction';
import { ContactInfo } from '../components/ui/ContactInfo/ContactInfo';

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
// heading instead of rendering nothing. `font-bold` alone (no explicit
// size) is intentional - every caller nests this inside an h1 already
// sized `text-[20px] sm:text-[65px]` (was `.major-title`/`.span-major-
// title`'s own always-65px-until-the-768px-breakpoint pair), so the span
// just needs to override the h1's own font-extralight weight, not repeat
// its responsive size.
function brandHeading(text: string): ReactNode | undefined {
  return text ? <span className="font-bold">{text}</span> : undefined;
}

// Single-column tick list used by both halves of creditLifeInsuranceBlock's
// checklist - was previously nested inside a `flex flex-wrap` with its own
// `w-1/2` items while already sitting inside an `sm:grid-cols-2` half-width
// column, which wrapped each column's items into a second, narrower pair of
// sub-columns instead of the plain vertical list the source design uses.
function creditLifeChecklist(items: string[]): ReactNode {
  return (
    <ul>
      {items.map((item) => (
        <li key={item} className="mb-[8px] flex items-center gap-[10px] text-[14px] leading-[18px] text-[#3D565F]">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            fill="currentColor"
            className="shrink-0 text-brand-green"
            viewBox="0 0 16 16"
          >
            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" />
          </svg>
          <strong>{item}</strong>
        </li>
      ))}
    </ul>
  );
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
      <span className="font-bold">{lead}</span>
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
// `Get The <br/><span className="font-bold">Tap2Glass</span> App`.
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
      <span className="font-bold">{brand}</span>
      {after}
    </>
  );
}

// appDownloadBlock has no separate highlightWord field either - just one
// plain heading string ("Download the African Bank App"). Unlike the other
// per-block splitters above, the bold portion here is the generic lead-in
// (the first two words) rather than the brand/product words - "African
// Bank App" stays the h1's own thin default weight and wraps onto its own
// line(s) through ordinary text flow.
function appDownloadHeading(text: string): ReactNode | undefined {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return undefined;
  if (words.length <= 2) return brandHeading(text);

  const lead = words.slice(0, 2).join(' ');
  const rest = words.slice(2).join(' ');

  return (
    <>
      <span className="font-bold">{lead}</span>
      <br />
      {rest}
    </>
  );
}

// Zebra-striped band color for the "plain" product-loan-style blocks below
// (heroBannerBlock/appDownloadBlock/featureChecklistBlock/faqSectionBlock/
// downloadsSectionBlock/crossSellBlock/creditLifeInsuranceBlock) - first
// such block on a page is #F2F2F2 (brand-mist), the next is white, and so
// on by render position. Deliberately not applied to every case (e.g.
// heroCarouselBlock/bankWithAudacityBlock/rewardsSectionBlock/etc keep
// their own fixed brand colors - this alternation is only for the flat,
// color-agnostic bands these loan-page blocks were previously hardcoding
// inconsistently).
function sectionBackground(index: number): string {
  return index % 2 === 0 ? 'bg-brand-mist' : 'bg-white';
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
                <span className="font-bold">{section.highlightWord}</span> <br />
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
          heading={appDownloadHeading(section.heading)}
          background={sectionBackground(index)}
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
          background={sectionBackground(index)}
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
          background={section.backgroundColor}
          imagePlain={section.imagePlain}
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
          background={sectionBackground(index)}
        />
      );

    case 'creditLifeInsuranceBlock':
      // Was previously `.section-800`/`.container`/`.row`/`.col-xl-7`/
      // `.list-ticks`/etc, styled entirely by public/vendor/projectmagic.css
      // - a stylesheet that isn't actually loaded anywhere (see
      // PromoSplit.tsx's own top comment for why), so this rendered
      // unstyled in production. Tailwind classes below reproduce its
      // confirmed values (`.section-800`'s min-height:800px, `.list-ticks
      // li`'s width:50%/margin-bottom:8px, `.mt-15`/`.mb-20`/etc's literal
      // pixel values - not Tailwind's own same-named rem scale). The
      // 7/5 column split (col-xl-7/col-xl-5) is reproduced via a 12-col
      // grid with matching spans rather than this app's usual 50/50
      // grid-cols-2, since the source wasn't an even split.
      return (
        <section className={`flex min-h-[800px] w-full items-center py-10 ${sectionBackground(index)}`} key={index}>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className={`grid grid-cols-1 items-center gap-10 ${section.imageUrl ? 'md:grid-cols-12 md:gap-16' : ''}`}>
              <div className={section.imageUrl ? 'md:col-span-7' : undefined}>
                <h1 className="mt-[15px] mb-[20px] text-brand-ink font-bold! text-[42px]! leading-[1.2]! [font-family:'Montserrat',sans-serif]!">
                  {section.heading}
                </h1>
                {section.paragraphOne && (
                  <p className="text-base leading-[1.3] text-[#335580]">{section.paragraphOne}</p>
                )}
                {section.paragraphTwo && (
                  <p className="mt-[20px] text-base leading-[1.3] text-[#335580]">{section.paragraphTwo}</p>
                )}
                <div className="mt-[30px] mb-[30px] grid grid-cols-1 gap-x-10 sm:grid-cols-2">
                  {creditLifeChecklist(section.checklistOne)}
                  {creditLifeChecklist(section.checklistTwo)}
                </div>
              </div>
              {section.imageUrl && (
                <div className="md:col-span-5">
                  <BlobImage src={section.imageUrl} alt={section.heading} />
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
          background={sectionBackground(index)}
        />
      );

    case 'downloadsSectionBlock':
      return (
        <DownloadsSection
          key={index}
          heading={section.heading}
          items={section.items}
          background={sectionBackground(index)}
        />
      );

    case 'crossSellBlock':
      return (
        <CrossSell
          key={index}
          heading={section.heading}
          cards={section.cards}
          imageUrl={section.imageUrl}
          background={sectionBackground(index)}
        />
      );

    case 'techHeroBlock':
      // Tech Deals' own top banner (TechHero) - "Welcome to Tech Deals"
      // beside a row of category icon tiles. `sectionBackground(index + 1)`
      // (not `sectionBackground(index)`, which the product-loan blocks
      // above use) - Tech Deals' own band sequence starts white, one
      // position earlier than that convention's own gray-first default, so
      // shifting by one reuses the same helper instead of a duplicate one.
      return (
        <TechHero
          key={index}
          heading={section.heading}
          highlightHeading={section.highlightHeading}
          subheading={section.subheading}
          categories={section.categories}
          background={sectionBackground(index + 1)}
        />
      );

    case 'plugAndGoBlock':
      return (
        <PlugAndGo
          key={index}
          heading={section.heading}
          productName={section.productName}
          description={section.description}
          bundleLabel={section.bundleLabel}
          priceAmount={section.priceAmount}
          priceSuffix={section.priceSuffix}
          cta={section.cta}
          imageUrl={section.imageUrl}
          imageAlt={section.imageAlt}
          background={sectionBackground(index + 1)}
        />
      );

    case 'techRequirementsBlock':
      return (
        <TechRequirements
          key={index}
          heading={section.heading}
          bodyHtml={section.bodyHtml}
          itemsHeading={section.itemsHeading}
          itemsIntro={section.itemsIntro}
          items={section.items}
          perksHeading={section.perksHeading}
          perks={section.perks}
          background={sectionBackground(index + 1)}
        />
      );

    case 'techCallToActionBlock':
      return (
        <TechCallToAction
          key={index}
          heading={section.heading}
          phoneNumber={section.phoneNumber}
          phoneUrl={section.phoneUrl}
          termsLabel={section.termsLabel}
          termsUrl={section.termsUrl}
          disclaimerHtml={section.disclaimerHtml}
          background={sectionBackground(index + 1)}
        />
      );

    case 'contactInfoBlock':
      return <ContactInfo key={index} heading={section.heading} cards={section.cards} />;

    default:
      return null;
  }
}
