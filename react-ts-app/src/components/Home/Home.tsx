import { useEffect, useState } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { fetchHome } from '../../store/slices/homeSlice';
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
// Every section component below still ships its own DEFAULT_* hardcoded
// content (see each component's own comment) - that's now the fallback
// used only when the CMS-managed `homePage` node (contentApi.ts's
// fetchHomePageSections, backed by Program.cs's create-home-schema) has no
// sections yet, e.g. straight after running create-home-schema but before
// anyone has authored a Home Page in the backoffice. Once that node has
// sections, they render in the exact order/kind an editor set in Umbraco -
// reordering the page is then a backoffice edit, not a deploy.
//
// Still dispatches the (separate, older) home slice's fetch
// (src/store/slices/homeSlice.ts, backed by src/services/homeService.ts)
// on mount - that reads a different, not-currently-rendered content shape
// (heroHeaderHome/heroShoulderHome/...), kept fetching only so its data
// stays available in the store for whichever section switches over to it.
export function Home() {
  const dispatch = useAppDispatch();
  const [sections, setSections] = useState<HomePageSection[] | null>(null);

  useEffect(() => {
    const promise = dispatch(fetchHome());
    return () => promise.abort();
  }, [dispatch]);

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
        <main>{sections && sections.length > 0 ? renderCmsSections(sections) : renderDefaultSections()}</main>
      </div>
    </div>
  );
}

function renderDefaultSections() {
  return (
    <>
      <HeroCarousel />
      <BankWithAudacity />
      <LoanCalculator />
      <MyWorldAccount />
      <DebitCardShowcase />
      <RewardsSection />
      <Tap2GlassSection />
      <BusinessAudacitySection />
      <AppDownloadSection />
      <Testimonials />
    </>
  );
}

function renderCmsSections(sections: HomePageSection[]) {
  return sections.map((section, index) => {
    switch (section.kind) {
      case 'heroCarouselBlock':
        return (
          <HeroCarousel key={index} slides={section.slides} gridItems={section.gridItems} />
        );

      case 'bankWithAudacityBlock':
        return <BankWithAudacity key={index} cards={section.cards} />;

      case 'loanCalculatorBlock':
        return <LoanCalculator key={index} {...section.props} />;

      case 'myWorldAccountBlock':
        return (
          <MyWorldAccount
            key={index}
            features={section.features}
            ctaLabel={section.ctaLabel ?? undefined}
            ctaUrl={section.ctaUrl ?? undefined}
          />
        );

      case 'debitCardShowcaseBlock':
        return <DebitCardShowcase key={index} imageUrl={section.imageUrl} alt={section.alt} />;

      case 'rewardsSectionBlock':
        return <RewardsSection key={index} cards={section.cards} />;

      case 'tap2GlassBlock':
        return (
          <Tap2GlassSection
            key={index}
            downloadUrl={section.downloadUrl ?? undefined}
            downloadLabel={section.downloadLabel ?? undefined}
            imageUrl={section.imageUrl}
            imageAlt={section.imageAlt}
            description={section.description}
          />
        );

      case 'businessAudacityBlock':
        return (
          <BusinessAudacitySection
            key={index}
            slides={section.slides}
            videoThumbnailUrl={section.videoThumbnailUrl}
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
          />
        );

      case 'testimonialsBlock':
        return <Testimonials key={index} videos={section.videos} />;

      default:
        return null;
    }
  });
}
