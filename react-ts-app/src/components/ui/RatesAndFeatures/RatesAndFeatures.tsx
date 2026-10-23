import { LazyImage } from '../Image/LazyImage';

export interface RateTier {
  tierLabel: string;
  rateValue: string;
}

export interface FeatureRow {
  label: string;
  column1Checked: boolean;
  column1Value: string;
  column2Checked: boolean;
  column2Value: string;
  column3Checked: boolean;
  column3Value: string;
}

export interface RatesAndFeaturesProps {
  ratesHeading: string;
  rateTiers: RateTier[];
  ratesDisclaimerOne: string;
  ratesDisclaimerTwo: string;
  featuresHeading: string;
  column1Icon: string;
  column1Name: string;
  column2Icon: string;
  column2Name: string;
  column3Icon: string;
  column3Name: string;
  featureRows: FeatureRow[];
}

// Checkmark reused verbatim from FeatureChecklist.tsx/renderPageSection.tsx's
// own creditLifeChecklist helper - the house tick icon for this app.
function Checkmark() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="20"
      height="20"
      fill="currentColor"
      className="inline-block shrink-0 text-brand-lime"
      viewBox="0 0 16 16"
    >
      <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z" />
    </svg>
  );
}

// One column's cell in a featureRow - a checkmark, a short text value (e.g.
// "R0.00"/"1 User"/"Up to 10 Members"), or blank (neither set). Mirrors
// ratesAndFeaturesBlock's own featureRowItem shape 1:1 (see Program.cs's
// "create-product-loan-schema" command) - each column gets an independent
// toggle + optional value rather than one shared "cell content" field, so
// the backoffice editor can't accidentally combine a checkmark and a value
// in the same cell.
function FeatureCell({ checked, value }: { checked: boolean; value: string }) {
  if (checked) return <Checkmark />;
  if (value) return <span className="text-sm text-brand-ink">{value}</span>;
  return null;
}

// One pair of aligned rows (tier labels + their rate values) in the "All
// Rates" table - flexbox, not a CSS grid, since the number of tiers is
// editor-controlled (ratesAndFeaturesBlock.rateTiers is a Block List, not a
// fixed set of properties) and flex-1 items naturally keep both rows'
// columns aligned without a dynamic grid-template-columns.
function RatesRow({ label, values, valueClassName }: { label: string; values: string[]; valueClassName: string }) {
  return (
    <div className="flex flex-wrap items-baseline gap-y-2 border-b border-brand-line py-3 first:pt-0 last:border-b-0">
      <div className="w-full shrink-0 font-bold text-brand-ink sm:w-[180px]">{label}</div>
      <div className="flex flex-1 flex-wrap gap-y-2">
        {values.map((value, index) => (
          <div key={index} className={`min-w-[110px] flex-1 px-2 text-center font-bold sm:text-left ${valueClassName}`}>
            {value}
          </div>
        ))}
      </div>
    </div>
  );
}

// Ported from the legacy (pre-React) myworldPv5.cshtml/banking.cshtml/
// stok.cshtml/productNoticeDepositev2.cshtml Razor views' own "All Rates" +
// "MyWORLD Banking Features" section (ratesAndFeaturesBlock, CMS-driven,
// Product Loan pages - see cms/renderPageSection.tsx). Never migrated to
// React before this - there's no legacy CSS to reproduce pixel-for-pixel
// here the way most other ui/ components have, so this is styled fresh
// against the theme tokens, matching the overall look of this section's
// source screenshot: a grey-banded rates table above a white feature-
// comparison grid, always in that order and always together (one combined
// block, not two separate ones - see this block's own schema comment).
export function RatesAndFeatures({
  ratesHeading,
  rateTiers,
  ratesDisclaimerOne,
  ratesDisclaimerTwo,
  featuresHeading,
  column1Icon,
  column1Name,
  column2Icon,
  column2Name,
  column3Icon,
  column3Name,
  featureRows,
}: RatesAndFeaturesProps) {
  const columns = [
    { icon: column1Icon, name: column1Name },
    { icon: column2Icon, name: column2Name },
    { icon: column3Icon, name: column3Name },
  ];

  return (
    <>
      {rateTiers.length > 0 && (
        <section className="bg-brand-mist py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {ratesHeading && (
              <h1 className="mb-[30px] text-center text-[28px] font-bold text-brand-ink sm:text-[42px]">
                {ratesHeading}
              </h1>
            )}

            <div className="border-t border-brand-line">
              <RatesRow label="Balance" values={rateTiers.map((t) => t.tierLabel)} valueClassName="text-brand-lime" />
              <RatesRow label="Interest Rate" values={rateTiers.map((t) => t.rateValue)} valueClassName="text-brand-lime" />
            </div>

            {ratesDisclaimerOne && (
              <div
                className="mt-6 border-t border-brand-line pt-6 text-sm leading-[1.3] text-brand-slate"
                dangerouslySetInnerHTML={{ __html: ratesDisclaimerOne }}
              />
            )}

            {ratesDisclaimerTwo && (
              <div
                className="mt-6 border-t border-brand-line pt-6 text-sm leading-[1.3] text-brand-slate"
                dangerouslySetInnerHTML={{ __html: ratesDisclaimerTwo }}
              />
            )}
          </div>
        </section>
      )}

      {featureRows.length > 0 && (
        <section className="bg-white py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {featuresHeading && <h2 className="mb-[30px] text-[22px] font-bold text-brand-ink sm:text-[28px]">{featuresHeading}</h2>}

            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr] items-end gap-x-2 border-b-2 border-brand-ink pb-3">
                  <div />
                  {columns.map((column, index) => (
                    <div key={index} className="flex flex-col items-center gap-2 text-center">
                      {column.icon && <LazyImage className="size-8 object-contain text-brand-ink" src={column.icon} alt="" />}
                      {column.name && <span className="text-sm font-bold text-brand-ink sm:text-base">{column.name}</span>}
                    </div>
                  ))}
                </div>

                {featureRows.map((row, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-[2fr_1fr_1fr_1fr] items-center gap-x-2 border-b border-brand-line py-4"
                  >
                    <div className="text-sm text-brand-ink sm:text-base">{row.label}</div>
                    <div className="text-center">
                      <FeatureCell checked={row.column1Checked} value={row.column1Value} />
                    </div>
                    <div className="text-center">
                      <FeatureCell checked={row.column2Checked} value={row.column2Value} />
                    </div>
                    <div className="text-center">
                      <FeatureCell checked={row.column3Checked} value={row.column3Value} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}
    </>
  );
}
