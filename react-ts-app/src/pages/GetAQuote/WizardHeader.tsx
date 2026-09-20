// Ported from the "qqheader" tab strip in Platform/Web/Views/newQQ.cshtml.
// The source markup has three tabs (tab1 "Product selection", tab2
// "Personal details", tab3 "Your quick quote"), but tab1 always carries a
// static `hidden` class (`class="header_tab active hidden"` / `class=
// "header_tab hidden completed"` depending on which version of the markup
// you look at) - i.e. it's permanently display:none regardless of step,
// so only the two "Step N" tabs ever actually show. The completed-tab
// checkmark uses a plain "check" glyph rather than <i class="material-
// icons">check_circle</i> - the Material Icons webfont isn't loaded
// anywhere in this app.
export type WizardStep = 'product' | 'details' | 'offers';

const ORDER: WizardStep[] = ['product', 'details', 'offers'];

const VISIBLE_TABS: { id: WizardStep; subtitle: string; label: string }[] = [
  { id: 'details', subtitle: 'Step 1', label: 'Personal details' },
  { id: 'offers', subtitle: 'Step 2', label: 'Your quick quote' },
];

interface WizardHeaderProps {
  step: WizardStep;
}

export function WizardHeader({ step }: WizardHeaderProps) {
  const currentIndex = ORDER.indexOf(step);

  return (
    <div className="qqheader" style={{ display: 'flex', opacity: 1 }}>
      {VISIBLE_TABS.map((tab, index) => {
        const isActive = tab.id === step;
        const isCompleted = ORDER.indexOf(tab.id) < currentIndex;
        return (
          <span
            key={tab.id}
            id={`tab${index + 2}`}
            className={`header_tab${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
          >
            <span className="step-subtitle">{tab.subtitle}</span>
            <br />
            <span>{tab.label}</span>
            {isCompleted && <span className="completed-icon">✓</span>}
          </span>
        );
      })}
    </div>
  );
}
