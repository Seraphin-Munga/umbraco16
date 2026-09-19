import type { AudacityCard } from '../../Home/BankWithAudacity';

export interface CrossSellProps {
  heading: string;
  cards: AudacityCard[];
  imageUrl?: string;
}

// "Find your ideal loan solution" style cross-sell card grid beside a
// photo (crossSellBlock, CMS-driven, any page - see
// cms/renderPageSection.tsx).
export function CrossSell({ heading, cards, imageUrl }: CrossSellProps) {
  return (
    <section className="section-800">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          <div className="col-md-6">
            <h1 className="color-brand-1 mt-15 mb-20">{heading}</h1>
            <div className="row mt-5">
              {cards.map((card) => (
                <div className="col-md-6" key={card.id}>
                  <div className="card-offer hover-up">
                    <div className="card-info">
                      <h4 className="color-brand-2">{card.title}</h4>
                      <p className="font-sm color-grey-500 mb-15">{card.description}</p>
                      <div className="box-button-offer">
                        <a
                          href={card.buttonUrl}
                          className="btn btn-default font-sm-bold pl-0 color-brand-1 arrow-right"
                          aria-label={card.buttonLabel || card.title}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          {imageUrl && (
            <div className="col-md-6">
              <img className="d-block" src={imageUrl} alt="" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
