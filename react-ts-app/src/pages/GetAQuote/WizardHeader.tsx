// Ported from the "qqheader" tab strip in Platform/Web/Views/newQQ.cshtml
// (tab1/tab2/tab3 - "Product selection" / "Personal details" / "Your quick
// quote"). The completed-tab checkmark uses a plain "check" glyph rather
// than <i class="material-icons">check_circle</i> - the Material Icons
// webfont isn't loaded anywhere in this app.
export type WizardStep = 'product' | 'details' | 'offers';

interface WizardHeaderProps {
  step: WizardStep;
}

const STEPS: { id: WizardStep; subtitle: string; label: string }[] = [
  { id: 'product', subtitle: '', label: 'Product selection' },
  { id: 'details', subtitle: 'Step 1', label: 'Personal details' },
  { id: 'offers', subtitle: 'Step 2', label: 'Your quick quote' },
];

const ORDER: WizardStep[] = ['product', 'details', 'offers'];

export function WizardHeader({ step }: WizardHeaderProps) {
  const currentIndex = ORDER.indexOf(step);

  return (
    <div className="qqheader" style={{ display: 'flex', opacity: 1 }}>
      {STEPS.map((tab, index) => {
        const isActive = tab.id === step;
        const isCompleted = index < currentIndex;
        return (
          <span
            key={tab.id}
            id={`tab${index + 1}`}
            className={`header_tab${isActive ? ' active' : ''}${isCompleted ? ' completed' : ''}`}
          >
            {tab.subtitle && (
              <>
                <span className="step-subtitle">{tab.subtitle}</span>
                <br />
              </>
            )}
            <span>{tab.label}</span>
            {isCompleted && <span className="completed-icon">✓</span>}
          </span>
        );
      })}
    </div>
  );
}
