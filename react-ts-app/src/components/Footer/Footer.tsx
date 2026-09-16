import { useEffect, useState } from 'react';
import { fetchFooter, type FooterCategory } from '../../api/contentApi';

// Ported from Views/MasterNew.cshtml's <footer> (the layout PageHome.cshtml
// actually uses) + Views/Partials/_pageBottomNavigation.cshtml. Styling comes
// entirely from the vendored style.css/media-query.css (footer, footer-category,
// footer-social, footer-copyright, ...) - see index.html.
export function Footer() {
  const [categories, setCategories] = useState<FooterCategory[]>([]);
  const [disclaimerMarkup, setDisclaimerMarkup] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    fetchFooter(controller.signal)
      .then(({ categories, disclaimerMarkup }) => {
        setCategories(categories);
        setDisclaimerMarkup(disclaimerMarkup);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
      });

    return () => controller.abort();
  }, []);

  const linkCategories = categories.filter(
    (category): category is Extract<FooterCategory, { kind: 'links' }> =>
      category.kind === 'links',
  );
  const richTextCategories = categories.filter(
    (category): category is Extract<FooterCategory, { kind: 'richText' }> =>
      category.kind === 'richText',
  );

  return (
    <footer>
      <div className="container">
        <div className="row">
          {linkCategories.map((category, index) => (
            <div className="col-sm-3 footer-category" key={index}>
              <div className="heading">{category.categoryName}</div>
              <ul>
                {category.links.map((link, linkIndex) => (
                  <li key={linkIndex}>
                    <a href={link.url}>{link.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {richTextCategories.length > 0 && (
            <div className="col-sm-3 footer-category">
              {richTextCategories.map((category, index) => (
                <div key={index}>
                  <div className="heading">{category.categoryName}</div>
                  {/* Razor puts an empty <li></li> before the raw RTE markup
                      inside the same <ul> - kept as-is rather than adding a
                      wrapper element the source markup doesn't have. */}
                  <ul dangerouslySetInnerHTML={{ __html: `<li></li>${category.html}` }} />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="footer-copyright">
          <div className="row">
            <div className="col-sm-7">
              <img src="/images/africanbank-logo-white.svg" width="170" alt="African Bank" />
              <div
                className="copyright-text"
                dangerouslySetInnerHTML={{ __html: disclaimerMarkup }}
              />
            </div>

            <div className="col-sm-5">
              <img className="pattern hidden-xs" src="/images/footer-pattern.svg" alt="footer-pattern" />
              <div className="pull-right">
                <a href="#" target="_blank" rel="noreferrer">
                  <i className="footer-social fa" aria-hidden="true">
                    <span style={{ fontFamily: 'Montserrat' }}>B</span>
                  </i>
                </a>
                <a href="https://www.facebook.com/africanbank/" target="_blank" rel="noreferrer">
                  <i className="footer-social fa fa-facebook" aria-hidden="true" />
                </a>
                <a href="https://twitter.com/AfricanBank" target="_blank" rel="noreferrer">
                  <i className="footer-social fa fa-twitter" aria-hidden="true" />
                </a>
                <a href="https://www.instagram.com/african_bank/" target="_blank" rel="noreferrer">
                  <i className="footer-social fa fa-instagram" aria-hidden="true" />
                </a>
                <a href="https://za.linkedin.com/company/african-bank" target="_blank" rel="noreferrer">
                  <i className="footer-social fa fa-linkedin" aria-hidden="true" />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
