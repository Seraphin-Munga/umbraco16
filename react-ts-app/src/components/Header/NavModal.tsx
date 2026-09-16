import { useEffect, useState } from 'react';

interface NavModalProps {
  open: boolean;
  onClose: () => void;
}

// Ported directly from the modal block in the real v8-derived
// Navigation.cshtml (lines 775-865: "<!-- modal Start here-->" to
// "<!-- modal End here-->") plus its jQuery (openNavModal/toggleTab,
// lines 868-893). This is 100% static markup in the Razor template -
// fixed tabs, fixed URLs, inline SVGs - there is no CMS property behind
// it (no "registerLogin" property exists on topNavigation in either the
// real Navigation.cshtml or the migration schema in Program.cs). An
// earlier version of this component fetched a "registerLoginMarkup"
// string from the Delivery API and rendered it via
// dangerouslySetInnerHTML, based on an unverified assumption that this
// content was CMS-authored - it was fetching a property that was never
// real, so the modal always rendered empty. Tab switching is now plain
// React state instead of jQuery class toggling on raw DOM nodes.
const CHEVRON_SVG = (
  <svg
    version="1.1"
    id="Layer_1"
    xmlns="http://www.w3.org/2000/svg"
    xmlnsXlink="http://www.w3.org/1999/xlink"
    x="0px"
    y="0px"
    viewBox="0 0 66.91 122.88"
    style={{ width: 12, height: 12, color: '#021A44' }}
    xmlSpace="preserve"
  >
    <g>
      <path d="M1.95,111.2c-2.65,2.72-2.59,7.08,0.14,9.73c2.72,2.65,7.08,2.59,9.73-0.14L64.94,66l-4.93-4.79l4.95,4.8 c2.65-2.74,2.59-7.11-0.15-9.76c-0.08-0.08-0.16-0.15-0.24-0.22L11.81,2.09c-2.65-2.73-7-2.79-9.73-0.14 C-0.64,4.6-0.7,8.95,1.95,11.68l48.46,49.55L1.95,111.2L1.95,111.2L1.95,111.2z" />
    </g>
  </svg>
);

interface TabPane {
  kind: 'personal' | 'business';
  label: string;
  accessOnlineBankingUrl: string;
  registerUrl: string;
}

const TABS: TabPane[] = [
  {
    kind: 'personal',
    label: 'Personal',
    accessOnlineBankingUrl: 'https://ib.africanbank.co.za/',
    registerUrl: 'https://ib.africanbank.co.za/Modules/Subscription/Controls/AB/Onboarding/ABOnboarding.aspx',
  },
  {
    kind: 'business',
    label: 'Business',
    accessOnlineBankingUrl: 'https://qa.del.africanbank.co.za/apps/OnlineBaking',
    registerUrl: 'https://qa.del.africanbank.co.za/apps/OnlineBaking',
  },
];

export function NavModal({ open, onClose }: NavModalProps) {
  const [activeTab, setActiveTab] = useState(0);

  // Matches openNavModal()/closeModalBtn's $("body").css("overflow", ...)
  // in the real Navigation.cshtml.
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const tab = TABS[activeTab];

  return (
    <>
      <div className="nav-modal-overlay" style={{ display: 'flex' }} />
      <div className="nav-modal" style={{ display: 'flex' }}>
        <div className="nav-modal-flex-container">
          <div className="close-button" onClick={onClose}>
            <div className="x-class">
              <div className="circle-background">×</div>
            </div>
          </div>
        </div>

        <div className="nav-modal-container">
          <div className="nav-modal-header">
            {TABS.map((t, index) => (
              <div
                key={t.kind}
                className={`nav-modal-tab${index === activeTab ? ' active' : ''}`}
                onClick={() => setActiveTab(index)}
              >
                {t.label}
              </div>
            ))}
          </div>

          <div className="nav-modal-tab-content active">
            <p className="long-Text lineUp">
              To access your <b>{tab.kind}</b> online banking please proceed below
            </p>

            <div className="grid-container-element lineUp">
              <div className="grid-child-element lineUp">
                <h5 className="redirect-Text lineUp">
                  <a href={tab.accessOnlineBankingUrl} target="_blank" rel="noreferrer" style={{ whiteSpace: 'nowrap' }}>
                    <span>Access Online Banking</span>
                  </a>
                </h5>
              </div>
              <div className="grid-child-element modal-Icon lineUp">
                <i>{CHEVRON_SVG}</i>
              </div>
            </div>

            <div className="lineUp grid-container-element">
              <div className="lineUp grid-child-element">
                <h5 className="lineUp redirect-Text">
                  <a href={tab.registerUrl} target="_blank" rel="noreferrer">
                    <span>Register</span>
                  </a>
                </h5>
              </div>
              <div className="lineUp grid-child-element modal-Icon">
                <i>{CHEVRON_SVG}</i>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
