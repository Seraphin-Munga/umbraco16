import { useEffect, useMemo, useState } from 'react';
import './PersonalLoanPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPersonalLoan } from '../../store/slices/personalLoanSlice';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Input/Select';
import { estimateMonthlyInstallment, formatRand } from '../../utils/loanCalculator';

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
const MIN_AMOUNT = 2000;
const MAX_AMOUNT = 250000;
const TERM_OPTIONS = [7, 9, 12, 18, 24, 30, 36, 42, 48, 60, 72];

export function PersonalLoanPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.personalLoan);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPersonalLoan());
  }, [status, dispatch]);

  const introCard = data?.introCard;
  const faqItems = data?.faqItems ?? [];
  const creditLifeItems = data?.creditLifeItems ?? [];

  const [amount, setAmount] = useState(MIN_AMOUNT);
  const [term, setTerm] = useState(7);
  const monthlyRepayment = useMemo(() => formatRand(estimateMonthlyInstallment(amount, term)), [amount, term]);

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
          <section className="section-800 pt-50 pb-40 home-loan-calculator">
            <div className="container">
              <div className="row d-flex align-items-center row-change md-text-center">
                <div className="col-xl-6 col-lg-6 col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">Apply for a Personal Loan in Minutes</h1>
                  <p className="font-md color-brand-1">
                    Experience the convenience of banking, sharing, and saving all in one place with African
                    Bank&apos;s MyWORLD account!
                  </p>
                  <h4 className="color-brand-1 my-3">Disclaimer:</h4>
                  <p className="font-md color-brand-1 mt-20">
                    This Loans Calculator provides indicative values only. African Bank provides no guarantees or
                    warranties on the values displayed. Only a full Loan application, on African Bank's website, the
                    Banking App or on Online Banking, or in other channels like our Branches and Call Centre, can
                    provide accurate details pertaining to Loans from African Bank.
                  </p>
                </div>
                <div className="col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">Loan Calculator</h1>
                  <div className="calculator-form">
                    <p className="loan-disclaimer" style={{ padding: '5px 0px' }}>
                      Please enter Loan amount between {formatRand(MIN_AMOUNT)} to {formatRand(MAX_AMOUNT)}
                    </p>
                    <label>Amount</label>
                    <Input
                      id="input-Amount1"
                      className="loan-inpt"
                      type="text"
                      value={amount}
                      onChange={(event) => {
                        const digitsOnly = event.target.value.replace(/\D/g, '');
                        if (digitsOnly === '') return;
                        setAmount(Math.min(MAX_AMOUNT, Math.max(MIN_AMOUNT, Number(digitsOnly))));
                      }}
                    />
                    <div className="range-wrap">
                      <div className="range-value" id="rangeV1" />
                      <Input
                        id="slide-range1"
                        type="range"
                        className="loan-range"
                        min={MIN_AMOUNT}
                        max={MAX_AMOUNT}
                        step={500}
                        value={amount}
                        onChange={(event) => setAmount(Number(event.target.value))}
                      />
                    </div>
                    <div className="loans" style={{ marginBottom: 0 }}>
                      <div className="col-1" style={{ textAlign: 'left', fontSize: '14px' }}>
                        {formatRand(MIN_AMOUNT)}
                      </div>
                      <div />
                      <div className="col-2" style={{ textAlign: 'right', fontSize: '14px' }}>
                        {formatRand(MAX_AMOUNT)}
                      </div>
                    </div>

                    <label>Repayment Term</label>
                    <Select
                      className="loan-select-term"
                      id="term1"
                      value={term}
                      onChange={(event) => setTerm(Number(event.target.value))}
                    >
                      {TERM_OPTIONS.map((months) => (
                        <option value={months} key={months}>
                          {months} Months
                        </option>
                      ))}
                    </Select>
                    <div className="range-wrap">
                      <div className="range-value" id="rangeV2" />
                      <Input
                        id="input-month1"
                        type="range"
                        className="loan-range"
                        min={7}
                        max={72}
                        value={term}
                        onChange={(event) => setTerm(Number(event.target.value))}
                      />
                    </div>
                    <div className="Months" style={{ marginBottom: '-7px' }}>
                      <div className="col-1" style={{ textAlign: 'left', fontSize: '14px' }}>
                        7 Months
                      </div>
                      <div />
                      <div className="col-2" style={{ textAlign: 'right', fontSize: '14px' }}>
                        72 Months
                      </div>
                    </div>

                    <label>Monthly Repayment will be</label>
                    <Input
                      id="installment_calc1"
                      className="loan-inpt-return"
                      type="text"
                      value={monthlyRepayment}
                      readOnly
                    />

                    <div className="combo-btn">
                      <div className="mt-50 text-start column1">
                        <p className="combo-btn-text primary">
                          <a
                            href="https://www.africanbank.co.za/en/home/get-a-quote?utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead"
                            className="btn btn-brand-1 hover-up"
                          >
                            Apply Now
                          </a>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

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
