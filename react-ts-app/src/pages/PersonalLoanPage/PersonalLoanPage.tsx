import './PersonalLoanPage.css';
import { LoanCalculator } from '../../components/ui/LoanCalculator/LoanCalculator';
import { Accordion } from '../../components/ui/Accordion/Accordion';

// Static page - does not fetch from the content API (see git history for
// the previous CMS-driven version backed by personalLoanSlice/
// personalLoanService.ts, which pulled its intro/FAQ/credit-life sections
// from Views/personalLoanCampaign.cshtml's Umbraco content tree).
const FAQ_ITEMS = [
  {
    title: 'HOW AND WHEN DO I GET MY LOAN?',
    content: (
      <div className="mt-20 mb-30 inline-checklist">
        <ul className="list-ticks list-ticks-2">
          <li>
            The first step is to apply for a Loan. You have the choice of applying online, over the phone or by
            visiting your nearest branch.
          </li>
          <li>
            Once you have applied for a Loan, your information will be reviewed and if the Loan is awarded to
            you, the Loan amount will be paid directly into your bank account.
          </li>
        </ul>
      </div>
    ),
  },
  {
    title: 'HOW AND WHEN DO I MAKE LOAN REPAYMENTS?',
    content: (
      <div className="mt-20 mb-30 inline-checklist">
        <ul className="list-ticks list-ticks-2">
          <li>Your repayment dates are set out on the front page of your agreement.</li>
          <li>We can arrange to deduct the money from your bank account monthly on the day you are paid.</li>
          <li>
            <a href="https://www.africanbank.co.za/en/home/manage-account-easy-ways-to-pay">See easy ways to pay</a>
          </li>
        </ul>
      </div>
    ),
  },
];

export function PersonalLoanPage() {
  return (
    <div id="page">
      <div id="content">
        <main>
          {/* Hero banner */}
          <section className="section-banner">
            <div className="contact-banner">
              <div className="contact-overlay">
                <div className="contact-content">
                  <h1 className="text-white major-title mb-10">
                    We give credit <br />
                    <strong>
                      <span className="span-major-title">where progress is due</span>
                    </strong>
                  </h1>
                  <p className="text-white major-title mb-10">
                    At African Bank, we back the things that matter most - your education, your business, your
                    home, your future - because we give credit where progress is due and for you.
                  </p>
                  <div className="combo-btn">
                    <div className="text-start column1">
                      <p className="combo-btn-text primary">
                        <a href="/en/home/get-a-quote" className="btn btn-brand-secondary hover-up">
                          Do I qualify?
                        </a>
                      </p>
                    </div>
                    <div className="text-start column2">
                      <p className="combo-btn-text secondary">
                        <a
                          href="https://www.africanbank.co.za/en/home/get-a-quote?utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead"
                          className="btn btn-brand-1 hover-up"
                        >
                          Apply now
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Intro */}
          <section className="section-800 bg-grey-60">
            <div className="container">
              <div className="row d-flex align-items-center row-change md-text-center">
                <div className="col-xl-6 col-lg-6 col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">Personal Loan</h1>
                  <p>Get fixed repayments on flexible terms.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Loan calculator */}
          <LoanCalculator
            minAmount={2000}
            maxAmount={250000}
            applyUrl="https://www.africanbank.co.za/en/home/get-a-quote?utm_source=Website&utm_medium=Productpage&utm_campaign=WebLead"
          />

          {/* Credit life insurance */}
          <section className="section-800 bg-grey-60">
            <div className="container">
              <div className="row d-flex align-items-center row-change reverse-row md-text-center">
                <div className="col-xl-7 col-lg-7 col-md-7">
                  <h1 className="color-brand-1 mt-15 mb-20">Credit Life Insurance</h1>
                  <p className="font-md color-brand-1">
                    With African Bank's Credit Life Insurance, you can rest assured that your credit is insured
                    should anything happen to you that would prevent you from making repayments. You are covered
                    for*.
                  </p>
                  <p className="font-md color-brand-1 mt-20">
                    With MyWORLD, you can open up to 5 accounts with no monthly fees, allowing you to share
                    finances seamlessly with friends and family.
                  </p>
                  <div className="row">
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="mt-30 mb-30 inline-checklist">
                        <ul className="list-ticks list-ticks-2">
                          <li>
                            <strong>Retrenchment</strong>
                          </li>
                          <li>
                            <strong>Death</strong>
                          </li>
                          <li>
                            <strong>Compulsory Unpaid Leave</strong>
                          </li>
                          <li>
                            <strong>Lay Offs</strong>
                          </li>
                          <li>
                            <strong>Short Time</strong>
                          </li>
                        </ul>
                      </div>
                    </div>
                    <div className="col-xl-6 col-lg-6 col-md-6">
                      <div className="mt-30 mb-30 inline-checklist">
                        <ul className="list-ticks list-ticks-2">
                          <li>
                            <strong>Loss of Income</strong>
                          </li>
                          <li>
                            <strong>Retrenchment Balance Claim</strong>
                          </li>
                          <li>
                            <strong>Temporary Disability</strong>
                          </li>
                          <li>
                            <strong>Permanent Disability</strong>
                          </li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-xl-5 col-lg-5 col-md-5">
                  <img className="d-block" src="/media/ateoqckk/credit-life.png" alt="Credit Life Insurance" />
                </div>
              </div>
            </div>
          </section>

          {/* FAQ accordion */}
          <section className="section pt-45 pb-45">
            <div className="container">
              <div className="row align-items-center d-flex row-change md-text-center">
                <div className="col-xl-12 col-lg-12 col-md-12">
                  <h1 className="color-brand-1 mt-15 mb-20 text-center faqHeader">African Bank Loans FAQs</h1>
                  <Accordion id="accordionFAQ" variant="style2" items={FAQ_ITEMS} />
                </div>
              </div>
            </div>
          </section>

          {/* More to read (downloads) */}
          <section className="section pb-40 pt-40 bg-grey-60">
            <div className="container">
              <div className="row d-flex align-items-center row-change md-text-center">
                <div className="col-xl-6 col-lg-6 col-md-6">
                  <h1 className="color-brand-1 mt-15 mb-20">More to read</h1>
                </div>
                <div className="col-xl-6 col-lg-6 col-md-6" />
              </div>

              <div className="campaign-list">
                <ul>
                  <li>
                    <div className="row no-gutter download-item first">
                      <div className="col-sm-9">
                        <div className="download-descr">Loan Terms and Conditions</div>
                      </div>
                      <div className="col-sm-3">
                        <a
                          id="consolidation-loan-download-button"
                          href="/media/fnodlkfu/loan-standard-terms-and-conditions.pdf"
                          target="_blank"
                          rel="noreferrer"
                          className="download-btn"
                        >
                          Download
                        </a>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* Cross-sell */}
          <section className="section-800">
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
                          <div className="box-button-offer">
                            <a
                              href="/en/home/product-consolidation-loan/"
                              className="btn btn-default font-sm-bold pl-0 color-brand-1 arrow-right"
                              aria-label="View Consolidation Loan"
                            />
                          </div>
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
                          <div className="box-button-offer">
                            <a
                              href="/en/home/product-12-loan/"
                              className="btn btn-default font-sm-bold pl-0 color-brand-1 arrow-right"
                              aria-label="View the 12% Loan"
                            />
                          </div>
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
                          <div className="box-button-offer">
                            <a
                              href="/en/home/tech-deals/"
                              className="btn btn-default font-sm-bold pl-0 color-brand-1 arrow-right"
                              aria-label="View Tech Deals"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-6">
                  <img className="d-block" src="/media/us2lbjyh/find-loan-sol_lp.png" alt="" />
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
