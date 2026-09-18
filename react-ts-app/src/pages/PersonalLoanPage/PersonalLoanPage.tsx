import { useEffect, useState } from 'react';
import './PersonalLoanPage.css';
import { LoanCalculator } from '../../components/ui/LoanCalculator/LoanCalculator';
import { Accordion } from '../../components/ui/Accordion/Accordion';
import { fetchProductLoanPageSections } from '../../api/contentApi';
import type { ProductLoanPageSection } from '../../api/contentApi';

// Ported from the fully-static JSX this page used to render directly (see
// git history) into the CMS-managed `productLoanPage` node (Program.cs's
// create-product-loan-schema, fetched via contentApi.ts's
// fetchProductLoanPageSections). Sections render in editor-defined order;
// nothing renders until that node has sections - same "CMS is the only
// source of content" convention Home.tsx already follows.
export function PersonalLoanPage() {
  const [sections, setSections] = useState<ProductLoanPageSection[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchProductLoanPageSections(controller.signal)
      .then(setSections)
      .catch(() => setSections([]));

    return () => controller.abort();
  }, []);

  return (
    <div id="page">
      <div id="content">
        <main>{sections?.map(renderSection)}</main>
      </div>
    </div>
  );
}

function renderSection(section: ProductLoanPageSection, index: number) {
  switch (section.kind) {
    case 'heroBannerBlock':
      return (
        <section className="section-banner" key={index}>
          <div className="contact-banner">
            <div className="contact-overlay">
              <div className="contact-content">
                <h1 className="text-white major-title mb-10">{section.heading}</h1>
                <p className="text-white major-title mb-10">{section.description}</p>
                <div className="combo-btn">
                  {section.primaryCta && (
                    <div className="text-start column1">
                      <p className="combo-btn-text primary">
                        <a href={section.primaryCta.url} className="btn btn-brand-secondary hover-up">
                          {section.primaryCta.label}
                        </a>
                      </p>
                    </div>
                  )}
                  {section.secondaryCta && (
                    <div className="text-start column2">
                      <p className="combo-btn-text secondary">
                        <a href={section.secondaryCta.url} className="btn btn-brand-1 hover-up">
                          {section.secondaryCta.label}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      );

    case 'loanCalculatorBlock':
      return <LoanCalculator key={index} {...section.props} />;

    case 'creditLifeInsuranceBlock':
      return (
        <section className="section-800 bg-grey-60" key={index}>
          <div className="container">
            <div className="row d-flex align-items-center row-change reverse-row md-text-center">
              <div className="col-xl-7 col-lg-7 col-md-7">
                <h1 className="color-brand-1 mt-15 mb-20">{section.heading}</h1>
                {section.paragraphOne && (
                  <p className="font-md color-brand-1">{section.paragraphOne}</p>
                )}
                {section.paragraphTwo && (
                  <p className="font-md color-brand-1 mt-20">{section.paragraphTwo}</p>
                )}
                <div className="row">
                  <div className="col-xl-6 col-lg-6 col-md-6">
                    <div className="mt-30 mb-30 inline-checklist">
                      <ul className="list-ticks list-ticks-2">
                        {section.checklistOne.map((item) => (
                          <li key={item}>
                            <strong>{item}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="col-xl-6 col-lg-6 col-md-6">
                    <div className="mt-30 mb-30 inline-checklist">
                      <ul className="list-ticks list-ticks-2">
                        {section.checklistTwo.map((item) => (
                          <li key={item}>
                            <strong>{item}</strong>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
              {section.imageUrl && (
                <div className="col-xl-5 col-lg-5 col-md-5">
                  <img className="d-block" src={section.imageUrl} alt={section.heading} />
                </div>
              )}
            </div>
          </div>
        </section>
      );

    case 'faqSectionBlock':
      return (
        <section className="section pt-45 pb-45" key={index}>
          <div className="container">
            <div className="row align-items-center d-flex row-change md-text-center">
              <div className="col-xl-12 col-lg-12 col-md-12">
                <h1 className="color-brand-1 mt-15 mb-20 text-center faqHeader">{section.heading}</h1>
                <Accordion
                  id="accordionFAQ"
                  variant="style2"
                  items={section.items.map((item) => ({
                    title: item.question,
                    content: <div dangerouslySetInnerHTML={{ __html: item.answerHtml }} />,
                  }))}
                />
              </div>
            </div>
          </div>
        </section>
      );

    case 'downloadsSectionBlock':
      return (
        <section className="section pb-40 pt-40 bg-grey-60" key={index}>
          <div className="container">
            <div className="row d-flex align-items-center row-change md-text-center">
              <div className="col-xl-6 col-lg-6 col-md-6">
                <h1 className="color-brand-1 mt-15 mb-20">{section.heading}</h1>
              </div>
              <div className="col-xl-6 col-lg-6 col-md-6" />
            </div>

            <div className="campaign-list">
              <ul>
                {section.items.map((item, itemIndex) => (
                  <li key={item.label}>
                    <div className={`row no-gutter download-item${itemIndex === 0 ? ' first' : ''}`}>
                      <div className="col-sm-9">
                        <div className="download-descr">{item.label}</div>
                      </div>
                      <div className="col-sm-3">
                        <a href={item.fileUrl} target="_blank" rel="noreferrer" className="download-btn">
                          Download
                        </a>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      );

    case 'crossSellBlock':
      return (
        <section className="section-800" key={index}>
          <div className="container">
            <div className="row d-flex align-items-center row-change md-text-center">
              <div className="col-md-6">
                <h1 className="color-brand-1 mt-15 mb-20">{section.heading}</h1>
                <div className="row mt-5">
                  {section.cards.map((card) => (
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
              {section.imageUrl && (
                <div className="col-md-6">
                  <img className="d-block" src={section.imageUrl} alt="" />
                </div>
              )}
            </div>
          </div>
        </section>
      );

    default:
      return null;
  }
}
