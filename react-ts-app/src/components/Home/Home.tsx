import { HeroCarousel } from './HeroCarousel';
import { BankWithAudacity } from './BankWithAudacity';
import { LoanCalculator } from './LoanCalculator';
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
// Every section here is now a static component ported directly from the
// current live home page markup (no CMS/API data - see each component's own
// comment for its source section) - the CMS-driven hero carousel,
// testimonials carousel, bank story carousel, "help" tabs, and loan-summary
// shoulder tabs that used to live here have all been replaced or removed.
export function Home() {
  return (
    <div id="page">
      <div id="content">
        <main>
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
        </main>
      </div>
    </div>
  );
}
