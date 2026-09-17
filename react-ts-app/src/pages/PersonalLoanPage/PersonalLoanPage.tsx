import { useEffect, useState } from 'react';
import './PersonalLoanPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchPersonalLoan } from '../../store/slices/personalLoanSlice';
import type { ProductKneeTab } from '../../api/contentApi';

// Ported from Views/productPersonalLoan.cshtml + its Partials
// (_pageHeaderImage, _pageShoulder, _howToApplySection, _heroKneeTabs,
// _testimonials, _callMeBackForm) - see src/services/personalLoanService.ts
// and src/api/contentApi.ts's "PRODUCT LOAN PAGES" section for the content
// fetch/mapping this dispatches. Bootstrap's own JS (tabs, carousel) isn't
// loaded in this app (only its CSS is, via index.html's <link> tags), so
// tab/carousel/panel-open state below is plain React state toggling the
// same "active" classes the vendor CSS already styles - same convention as
// HeroCarousel.tsx.
export function PersonalLoanPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.personalLoan);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchPersonalLoan());
  }, [status, dispatch]);

  const title = 'Personal Loan';
  const description = 'Get fixed repayments on flexible terms';

  const hero = data?.hero;
  const shoulder = data?.shoulder;
  const howToApply = data?.howToApply;
  const kneeTabs = data?.kneeTabs ?? [];
  const testimonials = data?.testimonials ?? [];
  const callMeBack = data?.callMeBack;

  const [activeKneeTabId, setActiveKneeTabId] = useState<string | null>(null);
  const activeTabId = activeKneeTabId ?? kneeTabs[0]?.id ?? null;

  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const [isCallMeBackOpen, setIsCallMeBackOpen] = useState(false);

  return (
    <div id="page">
      <div id="content">
        <main>
          {/* HERO BANNER */}
          <div className="hero-static-container">
            <div className="container-fluid">
              <div className="row no-gutter">
                <div className="col-sm-12">
                  <div
                    className="hero-static-banner"
                    id="heroHeader"
                    style={hero?.imageUrl ? { backgroundImage: `url('${hero.imageUrl}')` } : undefined}
                  >
                    <ol className="breadcrumb">
                      {(hero?.breadcrumb ?? [title]).map((item, index, all) => (
                        <li key={item} className={index === all.length - 1 ? 'active' : ''}>
                          {item}
                        </li>
                      ))}
                    </ol>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* HERO CONTINUED (shoulder) */}
          <div className="container">
            <div className="hero-static-caption">
              <div className="text_header">
                <h1 className="hero-static-title">{shoulder?.title ?? title}</h1>
              </div>
              <div className="row">
                <div className="col-sm-12 col-md-9">
                  <div className="hero-static-description">
                    <p style={{ width: '100%' }}>{shoulder?.description ?? description}</p>
                  </div>
                </div>
                {shoulder?.buttonText && (
                  <div className="col-sm-12 col-md-3">
                    <a href={shoulder.buttonUrl ?? '#'} target="_blank" rel="noreferrer" className="button primary button-styler">
                      {shoulder.buttonText}
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* HOW TO APPLY */}
          {howToApply && (
            <div className="container no-padding">
              <div className="campaign-apply">
                <h2>{howToApply.title}</h2>
                <div className="row margin-top-20">
                  <div className="col-sm-6">
                    <p className="body-content">{howToApply.description}</p>
                    {howToApply.buttonText && (
                      <div className="margin-top-40">
                        <a href={howToApply.buttonUrl ?? '#'} className="button primary hidden-xs">
                          {howToApply.buttonText}
                        </a>
                      </div>
                    )}
                  </div>
                  {howToApply.documentCards.length > 0 && (
                    <div className="col-sm-6 text-center">
                      <div className="row">
                        {howToApply.documentCards.map((card) => (
                          <div className="col-sm-6" key={card.text}>
                            <img src={card.iconUrl} alt={card.iconAlt} height={80} />
                            <p className="body-content margin-top-20">{card.text}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CAMPAIGN MORE INFO (knee tabs) */}
          {kneeTabs.length > 0 && (
            <div className="campaign-more-container">
              <div className="hover-block" />
              <div className="container">
                <div className="mega-tabs">
                  <ul className="nav nav-tabs eq-height" role="tablist">
                    {kneeTabs.map((tab) => (
                      <li
                        key={tab.id}
                        role="presentation"
                        className={
                          (kneeTabs.length > 1 ? 'campaign-more' : 'width-100') +
                          (tab.id === activeTabId ? ' active' : '')
                        }
                      >
                        <a role="tab" onClick={() => setActiveKneeTabId(tab.id)}>
                          {tab.title}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="tab-content">
                  {kneeTabs.map((tab) => (
                    <KneeTabPanel key={tab.id} tab={tab} active={tab.id === activeTabId} />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TESTIMONIALS */}
          {testimonials.length > 0 && (
            <div className="testimonials-container white-bg">
              <div className="container">
                <h3 className="text-center margin-top-60">What our customers are saying</h3>
                <div className="testimonials-carousel">
                  <div id="testimonials" className="carousel slide">
                    <ol className="carousel-indicators">
                      {testimonials.map((_, index) => (
                        <li
                          key={index}
                          className={index === activeTestimonial ? 'active' : ''}
                          onClick={() => setActiveTestimonial(index)}
                        />
                      ))}
                    </ol>
                    <div className="carousel-inner">
                      {testimonials.map((item, index) => (
                        <div className={`item${index === activeTestimonial ? ' active' : ''}`} key={index}>
                          <div className="testimonial">
                            <div className="avatar">
                              <img src={item.avatarUrl} alt={item.name} />
                            </div>
                            <div className="descr">{item.story}</div>
                            <div className="name">{item.name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <a
                      className="left carousel-control"
                      onClick={() =>
                        setActiveTestimonial((current) => (current - 1 + testimonials.length) % testimonials.length)
                      }
                    >
                      <span className="icon-arrow-left" />
                    </a>
                    <a
                      className="right carousel-control"
                      onClick={() => setActiveTestimonial((current) => (current + 1) % testimonials.length)}
                    >
                      <span className="icon-arrow-right" />
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* CALL BACK FORM */}
          {/* The panel's read-only content (title/button labels/visibility)
              comes from contentApi; actual submission isn't wired up here -
              the source form POSTs to a legacy MVC SurfaceController action
              (legacy/Controllers/CustomController.cs), not the Delivery API,
              so there's no confirmed endpoint for this SPA to call yet. */}
          {callMeBack && (
            <div className="st-actionContainer right-bottom">
              {isCallMeBackOpen && (
                <div className="st-panel">
                  <div className="st-panel__entry">
                    <div className="st-panel-intro row-call">
                      <div className="column">
                        <span className="pop-title">{callMeBack.title}</span>
                      </div>
                    </div>
                    <div className="st-panel-tip">
                      <p className="bodyDescription">
                        Click call me back to speak to our consultants
                        <br /> or apply to create an application online.
                      </p>
                    </div>
                    <div className="st-panel-contents">
                      <div className="row button-row">
                        {callMeBack.callMeBackVisible && (
                          <div className="col-xs-12">
                            <button type="button" className="st-panel-submit call-me btn-hover-blue">
                              {callMeBack.callMeBackButtonText ?? 'Call me back'}
                            </button>
                          </div>
                        )}
                        {callMeBack.quickLoanVisible && (
                          <div className="col-xs-12">
                            <a
                              href={callMeBack.quickLoanUrl ?? '#'}
                              className="st-panel-submit btn-hover-green"
                              style={{ width: '100%', marginBottom: 12, display: 'block', textAlign: 'center' }}
                            >
                              {callMeBack.quickLoanButtonText ?? 'Get a quote'}
                            </a>
                          </div>
                        )}
                        {callMeBack.trackLoanVisible && (
                          <div className="col-xs-12">
                            <button type="button" className="st-panel-submit call-me loan-tracker-btn-hover-blue">
                              Track my loan application
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              <div className="st-btn-container right-bottom">
                <div className="st-button-main campaing-call">
                  <img
                    src={callMeBack.successIconUrl || '/images/call-me-back.svg'}
                    className="icon-open"
                    alt="call-me-back"
                    onClick={() => setIsCallMeBackOpen(true)}
                  />
                  <img
                    src="/images/call-me-back-close.svg"
                    className="icon-close"
                    alt="call-me-back-close"
                    onClick={() => setIsCallMeBackOpen(false)}
                  />
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

function KneeTabPanel({ tab, active }: { tab: ProductKneeTab; active: boolean }) {
  const cssClass = `tab-pane${active ? ' active' : ''}`;

  if (tab.kind === 'creditLifeInsurance') {
    return (
      <div role="tabpanel" className={cssClass} id={tab.id}>
        <div className="row">
          <div className="container">
            <div className="row eq-height margin-top-30 campaign-image-block">
              {tab.cards.map((card) => (
                <div className="col-sm-4" key={card.title}>
                  <div className="text-center margin-bottom-30">
                    <h4>{card.title}</h4>
                    <img src={card.iconUrl} alt={card.iconAlt} style={{ height: 90 }} />
                    <p>{card.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="margin-top-80 hidden-xs" />
        <div className="row eq-height">
          {tab.highlights.map((text, index) => (
            <div className="col-sm-4" key={index}>
              <div className="campaign-more-highlights">{text}</div>
            </div>
          ))}
        </div>
        {tab.disclaimer && <div className="margin-top-30 campaign-terms">{tab.disclaimer}</div>}
      </div>
    );
  }

  if (tab.kind === 'creditLifeInsuranceCredit') {
    return (
      <div role="tabpanel" className={cssClass} id={tab.id}>
        <div className="row">
          <div className="col-sm-10 col-sm-offset-1">
            <p className="text-center">{tab.description}</p>
            <div className="row eq-height margin-top-30">
              <div className="col-sm-6">
                <div className="campaign-list text-only">
                  <ul>
                    {tab.listItems.map((item, index) => (
                      <li className="download-item" key={index}>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <div className="col-sm-6">
                <div
                  className="campaign-more-info-img"
                  style={{ backgroundImage: `url('${tab.imageUrl}')` }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="margin-top-80 hidden-xs" />
        <div className="row eq-height">
          {tab.highlights.map((text, index) => (
            <div className="col-sm-4" key={index}>
              <div className="campaign-more-highlights">{text}</div>
            </div>
          ))}
        </div>
        {tab.disclaimer && <div className="margin-top-30 campaign-terms">{tab.disclaimer}</div>}
      </div>
    );
  }

  return (
    <div role="tabpanel" className={cssClass} id={tab.id}>
      <div className="col-sm-10 col-sm-offset-1">
        <p className="text-center">{tab.description}</p>
      </div>
      <div className="row">
        <div className="col-sm-10 col-sm-offset-1">
          <div className="campaign-list">
            <ul>
              {tab.downloadItems.map((item, index) => (
                <li key={index}>
                  <div className="row no-gutter download-item first">
                    <div className="col-sm-9">
                      <div className="download-descr">{item.description}</div>
                    </div>
                    <div className="col-sm-3">
                      <a href={item.buttonUrl} target="_blank" rel="noreferrer" className="download-btn">
                        {item.buttonText}
                      </a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      {tab.highlights.length > 0 && (
        <div className="row eq-height">
          {tab.highlights.map((text, index) => (
            <div className="col-sm-4" key={index}>
              <div className="campaign-more-highlights">{text}</div>
            </div>
          ))}
        </div>
      )}
      {tab.disclaimer && (
        <div className="margin-top-30 campaign-terms">
          <p className="bold">Updated terms and conditions</p>
          {tab.disclaimer}
        </div>
      )}
    </div>
  );
}
