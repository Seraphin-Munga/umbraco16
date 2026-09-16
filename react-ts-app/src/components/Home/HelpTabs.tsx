import { useState } from 'react';
import type { HelpTab } from './types';

// Ported from the "help-container" block in home.cshtml (lines 725-782) -
// a section not present anywhere in Platform.Umbraco16/PageHome.cshtml's
// not-yet-live redesign. Same plain-React-state tab pattern as HeroShoulder
// (no Bootstrap JS loaded here).
interface HelpTabsProps {
  heading: string;
  tabs: HelpTab[];
}

export function HelpTabs({ heading, tabs }: HelpTabsProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (tabs.length === 0) return null;

  return (
    <div className="help-container" id="find-us">
      <div className="container">
        <h2 className="text-center">{heading}</h2>
        <div className="mega-tabs margin-top-40">
          <ul className="nav nav-tabs" role="tablist">
            {tabs.map((tab, index) => (
              <li
                key={tab.tabId}
                role="presentation"
                className={`${index === activeIndex ? 'active' : ''} branch-tab`}
                style={{ width: '100%' }}
              >
                <a
                  href={`#${tab.tabId}`}
                  role="tab"
                  onClick={(event) => {
                    event.preventDefault();
                    setActiveIndex(index);
                  }}
                >
                  <img loading="lazy" src={tab.tabIconUrl} alt={tab.tabIconAlt} width="30" />
                  {tab.tabName}
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
              <div className="row">
                <div className="col-sm-10 col-sm-offset-1">
                  <div className="campaign-list">
                    <ul>
                      {tab.links.map((link, linkIndex) => (
                        <li key={linkIndex}>
                          <div className="row no-gutter download-item">
                            <div className="col-sm-9">
                              <div className="download-descr">{link.text}</div>
                            </div>
                            <div className="col-sm-3">
                              <a href={link.url} className="download-btn">
                                {link.buttonText}
                              </a>
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
