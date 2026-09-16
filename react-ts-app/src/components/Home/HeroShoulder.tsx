import { useState } from 'react';
import type { ShoulderTab } from './types';

// Ported from the "loan-summary-container" block in home.cshtml (lines
// 446-552): a real Bootstrap tab widget (Bank/Borrow/Invest/Insure), not
// Platform.Umbraco16/PageHome.cshtml's flat always-visible grid - that
// redesign isn't live. No Bootstrap JS is loaded here (see Header.tsx's
// own comment), so tab switching is plain React state.
//
// When a tab has exactly 2 cards, the source inserts a spacer
// `<div class="col-md-3"></div>` before them (line 488-491) so a 2-card row
// centers under the 4-column grid instead of hugging the left edge -
// kept as-is even though it looks like a workaround for a layout that
// should just center the row instead.
interface HeroShoulderProps {
  tabs: ShoulderTab[];
}

export function HeroShoulder({ tabs }: HeroShoulderProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div className="loan-summary-container">
      <div className="container">
        <div className="mega-tabs">
          <ul id="go_to_tab_content" className="nav nav-tabs eq-height" role="tablist">
            {tabs.map((tab, index) => (
              <li
                key={tab.tabId}
                role="presentation"
                className={`${index === activeIndex ? 'active' : ''} loan-summary`}
              >
                <a
                  href={`#${tab.tabId}`}
                  role="tab"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveIndex(index);
                  }}
                >
                  <img loading="lazy" src={tab.tabIconUrl} width="36" alt={tab.tabIconAlt} />{' '}
                  <span className="hidden-xs">{tab.tabName}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div className="tab-content">
          {tabs.map((tab, index) => (
            <div
              key={tab.tabId}
              role="tabpanel"
              className={`tab-pane ${index === activeIndex ? 'active' : ''}`}
              id={tab.tabId}
            >
              <div className="tab-category">{tab.tabName}</div>
              <h2 className="text-center">{tab.tabHeading}</h2>
              <div className="row">
                {tab.cards.length === 2 && <div className="col-md-3" />}
                {tab.cards.map((card, cardIndex) => (
                  <div className="col-sm-6 col-md-3" key={cardIndex}>
                    <div className="loan-summary">
                      <div className="image">
                        <a href={card.linkUrl ?? '#'}>
                          <div className="img-bg" style={{ backgroundImage: `url(${card.iconUrl})` }} />
                        </a>
                      </div>
                      <div className="title">
                        <a href={card.linkUrl ?? '#'}>{card.title}</a>
                      </div>
                      <div className="loan-desc">{card.description}</div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="margin-top-80 hidden-xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
