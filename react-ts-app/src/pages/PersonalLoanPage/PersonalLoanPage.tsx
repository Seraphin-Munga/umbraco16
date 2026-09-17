import { useEffect, useState } from 'react';
import './PersonalLoanPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPersonalLoan } from '../../store/slices/personalLoanSlice';
import { LoanCalculator } from '../../components/ui/LoanCalculator/LoanCalculator';

// Ported from Views/personalLoanCampaign.cshtml - the template actually
// live at /en/home/product-personal-loan/ (see
// src/services/personalLoanService.ts and src/api/contentApi.ts's
// "PERSONAL LOAN CAMPAIGN" section for the content fetch this dispatches).
//
// One deliberate deviation from the source: it renders the FAQ list twice
// back to back (two different accordion markups, both reading the same
// faqItems) - a simple jQuery-driven accordion that actually has a click
// handler wired up, and a second Bootstrap-style accordion whose own
// collapse-toggle script is commented out in the source, so it never
// actually expands on the live site either. That reads as leftover/
// abandoned markup rather than an intentional double section, so only the
// working accordion is rendered here.
export function PersonalLoanPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.personalLoan);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPersonalLoan());
  }, [status, dispatch]);

  const introCard = data?.introCard;
  const faqItems = data?.faqItems ?? [];
  const creditLifeItems = data?.creditLifeItems ?? [];

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  return (
    <div id="page">
      <div id="content">
        <main>
          {/* Intro (heroBodynew's first "card" child) */}
          <section className="section-800 bg-grey-60">
            <div className="container">
              <div className="row d-flex align-items-center row-change md-text-center">
                <div className="col-xl-6 col-lg-6 col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">{introCard?.title ?? 'Personal Loan'}</h1>
                  <div
                    dangerouslySetInnerHTML={{
                      __html:
                        introCard?.descriptionHtml ??
                        '<p>Get fixed repayments on flexible terms.</p>',
                    }}
                  />
                </div>
                {introCard?.imageUrl && (
                  <div className="col-xl-6 col-lg-6 col-md-6">
                    <img className="d-block" src={introCard.imageUrl} alt={introCard.title} />
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* Loan calculator */}
          <LoanCalculator
            minAmount={2000}
            maxAmount={250000}
            applyUrl="https://www.africanbank.co.za/en/home/get-a-quote?utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead"
          />

          {/* Credit life insurance cards (heroBodynew's last tabBody) */}
          {creditLifeItems.map((item, index) => (
            <section className="section-800 bg-grey-60" key={item.title || index}>
              <div className="container">
                <div className="row d-flex align-items-center row-change reverse-row md-text-center">
                  <div className="col-xl-7 col-lg-7 col-md-7">
                    <h1 className="color-brand-1 mt-15 mb-20">{item.title}</h1>
                    <div dangerouslySetInnerHTML={{ __html: item.mediumDescriptionHtml }} />
                    <div className="mt-50 text-start">
                      <div dangerouslySetInnerHTML={{ __html: item.longDescriptionHtml }} />
                    </div>
                  </div>
                  {item.iconUrl && (
                    <div className="col-xl-5 col-lg-5 col-md-5">
                      <img className="d-block" src={item.iconUrl} alt={item.title} />
                    </div>
                  )}
                </div>
              </div>
            </section>
          ))}

          {/* FAQ accordion (heroBodynew's first tabBody) */}
          {faqItems.length > 0 && (
            <section className="section-800">
              <div className="container">
                <div className="row align-items-center d-flex row-change md-text-center">
                  <div className="col-xl-12 col-lg-12 col-md-12">
                    <h1 className="color-brand-1 mt-15 mb-20 text-center faqHeader">African Bank Loans FAQs</h1>
                    {faqItems.map((item, index) => (
                      <div key={item.title || index}>
                        <p
                          className={`accordion${openFaqIndex === index ? ' active' : ''}`}
                          onClick={() => setOpenFaqIndex((current) => (current === index ? null : index))}
                        >
                          {item.title}
                        </p>
                        <div className="panel" style={{ display: openFaqIndex === index ? 'block' : 'none' }}>
                          <p dangerouslySetInnerHTML={{ __html: item.bodyHtml }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* Cross-sell (static in the source - no CMS binding) */}
          <section className="section-800 bg-grey-60">
            <div className="container">
              <div className="row d-flex align-items-center row-change md-text-center">
                <div className="col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">Find your ideal loan solution with African Bank.</h1>
                  <h4>African Bank offers a variety of loan products to fit your unique financial needs.</h4>
                  <div className="row mt-5">
                    <div className="col-md-6">
                      <div className="card-offer hover-up">
                        <div className="card-info">
                          <h4 className="color-brand-2">Consolidation Loan:</h4>
                          <p className="font-sm color-grey-500 mb-15">
                            For those seeking to streamline their finances into one manageable instalment.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card-offer hover-up">
                        <div className="card-info">
                          <h4 className="color-brand-2">12% Loan:</h4>
                          <p className="font-sm color-grey-500 mb-15">
                            Benefit from our competitive 12% Loan, featuring a low interest rate for loans up to
                            R50 000.
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <div className="card-offer hover-up">
                        <div className="card-info">
                          <h4 className="color-brand-2">Tech Deals:</h4>
                          <p style={{ paddingBottom: 19 }} className="font-sm color-grey-500 mb-15">
                            Explore our deals and add a cellphone, tablet or laptop to any loan.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <img className="d-block" src="/media/xxadpnw4/find-loan-sol_lp.png" alt="" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
