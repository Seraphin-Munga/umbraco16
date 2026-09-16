// Ported from the "MyWORLD bank account" promo section of the current live
// home page markup. Static content (matches the source exactly) passed as
// props with defaults so it stays reusable.
const DEFAULT_FEATURES = [
  'Link up to 5 free pockets to your account',
  'Enjoy the lowest banking fees and incredible value',
  'Competitive rates on any positive balance',
  'Convenient Overdraft access of up to R100 000',
  'Easy-to-earn Audacious Rewards points',
];

interface MyWorldAccountProps {
  features?: string[];
  ctaLabel?: string;
  ctaUrl?: string;
}

export function MyWorldAccount({
  features = DEFAULT_FEATURES,
  ctaLabel = 'FIND OUT MORE',
  ctaUrl = 'https://africanbank.co.za/en/home/banking/#MyWorld',
}: MyWorldAccountProps) {
  return (
    <section className="section-title mtb-120">
      <div className="container">
        <div className="row align-items-end md-text-center">
          <div className="col-md-7">
            <h1 className="color-brand-1 major-title">
              <span className="span-major-title">MyWORLD</span> <br />
              bank account
            </h1>
            <div className="mt-50 text-start">
              <div className="mb-50">
                <div className="combo-btn mt-50 text-start column1">
                  <p className="combo-btn-text primary">
                    <a href={ctaUrl} className="btn btn-brand-1 hover-up">
                      {ctaLabel}
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-5">
            <h4 className="color-brand-1 mb-20">Why choose MyWORLD</h4>
            <div className="mt-30 mb-30 inline-checklist">
              <ul className="list-ticks list-ticks-2">
                {features.map((feature) => (
                  <li key={feature}>{feature}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
