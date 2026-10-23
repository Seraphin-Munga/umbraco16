export interface RatesMatrixRow {
  tierLabel: string;
  rates: string[];
}

export interface RatesMatrixProps {
  heading?: string;
  // Label above the first (row heading) column - "Tier" on the investment
  // pages, "Balance" on Stokvel's sideways table.
  tierHeading?: string;
  columnHeadings: string[];
  rows: RatesMatrixRow[];
  disclaimers: string[];
  background?: string;
}

// "All Rates" table - balance tiers down the side, one column per term or
// notice period (ratesMatrixBlock, CMS-driven - see
// cms/renderPageSection.tsx). Ported from the legacy investment pages'
// `.investment table`: navy header row and tier column, green rate cells,
// rounded outer border, scrolls sideways on narrow screens instead of
// squashing the columns.
export function RatesMatrix({
  heading,
  tierHeading = 'Tier',
  columnHeadings,
  rows,
  disclaimers,
  background = '',
}: RatesMatrixProps) {
  if (rows.length === 0) return null;

  return (
    <section className={`py-12 md:py-20 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {heading && (
          <h3 className="mb-6 text-center text-[26px] font-bold text-brand-ink md:text-[36px]">{heading}</h3>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px] table-fixed border-separate border-spacing-0 overflow-hidden rounded-[15px] border border-[#ccc] bg-white">
            <thead>
              <tr>
                <th
                  scope="col"
                  className="bg-[#002552] px-5 py-6 text-left text-sm font-bold tracking-[0.1em] text-white"
                >
                  {tierHeading}
                </th>
                {columnHeadings.map((column) => (
                  <th
                    key={column}
                    scope="col"
                    className="bg-[#011f44] px-5 py-6 text-center text-sm font-bold tracking-[0.1em] text-white"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => {
                const border = rowIndex === rows.length - 1 ? '' : 'border-b border-[#ccc]';

                return (
                  <tr key={row.tierLabel}>
                    <th
                      scope="row"
                      className={`bg-[#002552] px-5 py-6 text-left text-sm font-semibold text-white ${border}`}
                    >
                      {row.tierLabel}
                    </th>
                    {columnHeadings.map((column, columnIndex) => (
                      <td
                        key={column}
                        className={`px-5 py-6 text-center text-sm font-semibold text-brand-green ${border}`}
                      >
                        {row.rates[columnIndex] ?? ''}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {disclaimers.length > 0 && (
          <ul className="mx-auto mt-16 max-w-6xl border-t border-brand-line">
            {disclaimers.map((disclaimer) => (
              <li key={disclaimer} className="border-b border-brand-line px-4 py-4 text-base leading-relaxed text-brand-muted">
                {disclaimer}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
