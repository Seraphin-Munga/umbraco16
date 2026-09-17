import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { fetchHomePageSections } from '../../api/contentApi';
import type { HomePageSection } from '../../api/contentApi';
import { HeroCarousel } from './HeroCarousel';
import { BankWithAudacity } from './BankWithAudacity';
import { LoanCalculator } from '../ui/LoanCalculator/LoanCalculator';
import { MyWorldAccount } from './MyWorldAccount';
import { DebitCardShowcase } from './DebitCardShowcase';
import { RewardsSection } from './RewardsSection';
import { Tap2GlassSection } from './Tap2GlassSection';
import { BusinessAudacitySection } from './BusinessAudacitySection';
import { AppDownloadSection } from './AppDownloadSection';
import { Testimonials } from './Testimonials';
import './Home.css';

// Ported from Platform/Web/Views/home.cshtml (the live site's actual
// template - see contentApi.ts's own HOME PAGE section comment for why
// this isn't Platform.Umbraco16/PageHome.cshtml). This is the @RenderBody()
// content Master.cshtml's layout wraps with Header/Footer - see App.tsx.
//
// Every section renders only from the CMS-managed `homePage` node
// (contentApi.ts's fetchHomePageSections, backed by Program.cs's
// create-home-schema) - no hardcoded fallback content anywhere, so the page
// is blank until an editor authors a Home Page with sections in the
// backoffice. Sections render in the exact order/kind an editor set in
// Umbraco - reordering the page is then a backoffice edit, not a deploy.
export function Home() {
  const [sections, setSections] = useState<HomePageSection[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchHomePageSections(controller.signal)
      .then(setSections)
      .catch(() => setSections([]));

    return () => controller.abort();
  }, []);

  return (
    <div id="page">
      <div id="content">
        <main>{sections ? renderCmsSections(sections) : null}</main>
      </div>
    </div>
  );
}

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

function renderCmsSections(sections: HomePageSection[]) {
  return sections.map((section, index) => {
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
            heading={brandHeading(section.heading)}
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

      default:
        return null;
    }
  });
}
