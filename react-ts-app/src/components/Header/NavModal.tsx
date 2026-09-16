import { ArrowIcon } from './ArrowIcon';

export type NavModalTab = 0 | 1;

interface NavModalProps {
  open: boolean;
  activeTab: NavModalTab;
  onTabChange: (tab: NavModalTab) => void;
  onClose: () => void;
}

// Ported from the register/login modal + toggleTab()/openNavModal()/
// closeModalBtn jQuery handlers at the bottom of Navigation.cshtml. The
// Business tab reuses the same URL for "Access Online Banking" and
// "Register" in the source markup - kept as-is rather than silently
// diverging from the page it was copied from.
export function NavModal({ open, activeTab, onTabChange, onClose }: NavModalProps) {
  if (!open) return null;

  return (
    <div className="nav-modal-overlay" id="nav-modal-overlay" style={{ display: 'flex' }}>
      <div className="nav-modal" id="nav-modal" style={{ display: 'flex' }}>
        <div className="nav-modal-flex-container">
          <div className="close-button" id="closeModalBtn" onClick={onClose}>
            <div className="x-class">
              <div className="circle-background">×</div>
            </div>
          </div>
        </div>

        <div className="nav-modal-container">
          <div className="nav-modal-header">
            <div
              className={`nav-modal-tab${activeTab === 0 ? ' active' : ''}`}
              onClick={() => onTabChange(0)}
            >
              Personal
            </div>
            <div
              className={`nav-modal-tab${activeTab === 1 ? ' active' : ''}`}
              onClick={() => onTabChange(1)}
            >
              Business
            </div>
          </div>

          <div className={`nav-modal-tab-content${activeTab === 0 ? ' active' : ''}`}>
            <p className="long-Text lineUp">
              To access your <b>personal</b> online banking please proceed below
            </p>

            <div className="grid-container-element lineUp">
              <div className="grid-child-element lineUp">
                <h5 className="redirect-Text lineUp">
                  <a href="https://ib.africanbank.co.za/" target="_blank" rel="noreferrer" style={{ whiteSpace: 'nowrap' }}>
                    <span>Access Online Banking</span>
                  </a>
                </h5>
              </div>
              <div className="grid-child-element modal-Icon lineUp">
                <ArrowIcon />
              </div>
            </div>

            <div className="lineUp grid-container-element">
              <div className="lineUp grid-child-element">
                <h5 className="lineUp redirect-Text">
                  <a
                    href="https://ib.africanbank.co.za/Modules/Subscription/Controls/AB/Onboarding/ABOnboarding.aspx"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>Register</span>
                  </a>
                </h5>
              </div>
              <div className="lineUp grid-child-element modal-Icon">
                <ArrowIcon />
              </div>
            </div>
          </div>

          <div className={`nav-modal-tab-content${activeTab === 1 ? ' active' : ''}`}>
            <p className="long-Text lineUp">
              To access your <b>business</b> online banking please proceed below
            </p>

            <div className="grid-container-element lineUp">
              <div className="grid-child-element lineUp">
                <h5 className="redirect-Text lineUp">
                  <a
                    href="https://qa.del.africanbank.co.za/apps/OnlineBaking"
                    target="_blank"
                    rel="noreferrer"
                    style={{ whiteSpace: 'nowrap' }}
                  >
                    <span>Access Online Banking</span>
                  </a>
                </h5>
              </div>
              <div className="grid-child-element modal-Icon lineUp">
                <ArrowIcon />
              </div>
            </div>

            <div className="lineUp grid-container-element">
              <div className="lineUp grid-child-element">
                <h5 className="lineUp redirect-Text">
                  <a href="https://qa.del.africanbank.co.za/apps/OnlineBaking" target="_blank" rel="noreferrer">
                    <span>Register</span>
                  </a>
                </h5>
              </div>
              <div className="lineUp grid-child-element modal-Icon">
                <ArrowIcon />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
