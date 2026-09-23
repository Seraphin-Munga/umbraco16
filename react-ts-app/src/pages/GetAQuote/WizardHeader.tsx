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

// The legacy markup sized these tabs with `width: 22%` against a Bootstrap
// `.container` that gave the header a wide, predictable box; in isolation
// (no surrounding Bootstrap grid) that percentage resolves against a
// shrink-to-fit flex row and squeezes the text into an overlapping sliver.
// Sized to content instead, which is what the fixed max-width/centered
// container was already visually approximating.
const tabBase =
  'flex shrink-0 flex-col items-center justify-center whitespace-nowrap border-b-[3px] border-transparent px-5 py-2.5 text-center text-base leading-[0.8] font-bold transition-all duration-300 max-md:w-1/2 max-md:px-2.5';

interface WizardHeaderProps {
  step: WizardStep;
}

export function WizardHeader({ step }: WizardHeaderProps) {
  const currentIndex = ORDER.indexOf(step);

  return (
    <div className="mx-auto mb-2.5 mt-[30px] flex max-w-[800px] justify-center gap-2.5 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] max-md:justify-start [&::-webkit-scrollbar]:hidden">
      {VISIBLE_TABS.map((tab, index) => {
        const isActive = tab.id === step;
        const isCompleted = ORDER.indexOf(tab.id) < currentIndex;
        return (
          <span
            key={tab.id}
            id={`tab${index + 2}`}
            className={
              isActive
                ? `${tabBase} cursor-default text-brand-navy`
                : `${tabBase} cursor-pointer text-[#99AABF]`
            }
          >
            <span className="text-[10px]">{tab.subtitle}</span>
            <br />
            <span>{tab.label}</span>
            {isCompleted && (
              <span className="ml-[5px] text-[#5DC300]">✓</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
