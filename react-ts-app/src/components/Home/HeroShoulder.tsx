import type { ShoulderTab } from './types';

// Ported from the "HERO SHOULDER" block in PageHome.cshtml (lines 97-165):
// four tabs (Bank/Borrow/Invest/Insure), each a background-color class
// keyed off tabName, and "Borrow" specifically getting a wider icon (55 vs
// 40) - both quirks kept exactly as the Razor view has them rather than
// generalized, since that's what the CMS content actually relies on.
function tabBackgroundClass(tabName: string): string {
  switch (tabName) {
    case 'Bank':
      return 'ab-bank-service';
    case 'Borrow':
      return 'ab-borrow-service';
    case 'Invest':
      return 'ab-invest-service';
    default:
      return 'ab-insure-service';
  }
}

interface HeroShoulderProps {
  tabs: ShoulderTab[];
}

export function HeroShoulder({ tabs }: HeroShoulderProps) {
  return (
    <div className="ab-services">
      <div className="row">
        {tabs.map((tab, tabIndex) =>
          tab.cards.map((card, cardIndex) => (
            <div className="col-md-3 col-6" key={`${tabIndex}-${cardIndex}`}>
              <div className={`container ${tabBackgroundClass(tab.tabName)}`}>
                <img
                  src={card.iconUrl}
                  alt={card.iconAlt}
                  width={tab.tabName === 'Borrow' ? 55 : 40}
                  height={50}
                />
                <p>
                  {card.title}
                  <br />
                  {card.description}
                </p>
                <div className="secondary-btn-dark">
                  <a href={card.linkUrl ?? '#'}>
                    <button>{tab.tabName}</button>
                  </a>
                </div>
              </div>
            </div>
          )),
        )}
      </div>
    </div>
  );
}
