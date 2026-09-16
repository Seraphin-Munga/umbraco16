import type { ContentSectionData } from './types';

// Ported from PageHome.cshtml's "Section 1/2/3" blocks (lines 169-296):
// three fixed promo blocks reading heroBodySections[0]/[1]/[2] - "Get
// loans", "MyWORLD banking" (reversed layout, dark background), "Support"
// (no button, three plain-text links instead). Each has genuinely
// different markup in the source (not just swapped content), so they're
// kept as three explicit blocks here too rather than one "variant" prop
// pretending they're the same shape.

// MyWorld's sectionHeroBodyDescription comes back as rich text wrapped in
// its own <p>, and PageHome.cshtml explicitly strips that wrapper (via
// HtmlStringUtilities.StripHtml) before nesting it inside this section's
// own <p class="ab-body-desc-myworld">, to avoid a <p> inside a <p>.
function stripOuterParagraph(html: string): string {
  return html.replace(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/i, '$1');
}

interface ContentSectionsProps {
  sections: ContentSectionData[];
}

export function ContentSections({ sections }: ContentSectionsProps) {
  const [getLoans, myWorld, support] = sections;

  return (
    <>
      {getLoans && (
        <div className="ab-below-fold-section special-margin">
          <div className="container row section-a h-100">
            <div className="col-md-6 section-artwork">
              <img src={getLoans.imageUrl} width="90%" height="100%" alt={getLoans.imageAlt} />
            </div>
            <div className="col-md-6 section-content my-auto">
              <h2 className="ab-section-title">{getLoans.title}</h2>
              <h3
                className="ab-section-discription"
                dangerouslySetInnerHTML={{ __html: getLoans.subtitle }}
              />
              <p dangerouslySetInnerHTML={{ __html: getLoans.description }} />
              {getLoans.linkUrl && getLoans.linkLabel && (
                <div className="primary-btn instant-loan">
                  <a href={getLoans.linkUrl}>
                    <button>{getLoans.linkLabel}</button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {myWorld && (
        <div
          className="flex-column-reverse"
          style={{ background: '0% 0% no-repeat padding-box padding-box rgb(0, 29, 66)' }}
        >
          <div className="container row section-a h-100 flex-row-reverse">
            <div className="col-md-6 section-artwork my-auto">
              <img src={myWorld.imageUrl} width="60%" alt={myWorld.imageAlt} />
            </div>
            <div className="col-md-6 section-content">
              <h2 className="ab-section-title-myworld">{myWorld.title}</h2>
              <h3
                className="ab-section-discription-myworld"
                dangerouslySetInnerHTML={{ __html: myWorld.subtitle }}
              />
              <p
                className="ab-body-desc-myworld"
                dangerouslySetInnerHTML={{ __html: stripOuterParagraph(myWorld.description) }}
              />
              {myWorld.linkUrl && myWorld.linkLabel && (
                <div className="primary-btn myworld-button-padding">
                  <a href={myWorld.linkUrl}>
                    <button>{myWorld.linkLabel}</button>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {support && (
        <div className="ab-below-fold-section">
          <div className="container row section-a custom-margin h-100">
            <div className="col-md-6 section-artwork my-auto">
              <img src={support.imageUrl} width="90%" height="100%" alt={support.title} />
            </div>
            <div className="col-md-6 section-content my-auto">
              <h2 className="ab-section-title">{support.title}</h2>
              <h3
                className="ab-section-discription"
                dangerouslySetInnerHTML={{ __html: support.subtitle }}
              />
              <p dangerouslySetInnerHTML={{ __html: support.description }} />
              <p>
                <a href="#">LIVE CHAT</a> | <a href="#">CALL ME BACK</a> |{' '}
                <a href="#">ONLINE INSTANT APPLICATION</a>
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
