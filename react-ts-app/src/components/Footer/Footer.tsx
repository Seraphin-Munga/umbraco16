import { useEffect } from 'react';
import type { FooterCategory } from '../../api/contentApi';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFooterData } from '../../store/slices/footerSlice';
import { FooterLogo } from '../icons/FooterLogo';
import { FooterPattern } from '../icons/FooterPattern';

// Ported from Views/MasterNew.cshtml's <footer> (the layout PageHome.cshtml
// actually uses) + Views/Partials/_pageBottomNavigation.cshtml. Styling comes
// entirely from the vendored style.css/media-query.css (footer, footer-category,
// footer-social, footer-copyright, ...) - see index.html.
export function Footer() {
  const dispatch = useAppDispatch();
  const { data } = useAppSelector((state) => state.footer);
  const categories = data?.categories ?? [];
  const disclaimerMarkup = data?.disclaimerMarkup ?? '';

  useEffect(() => {
    const promise = dispatch(fetchFooterData());
    return () => promise.abort();
  }, [dispatch]);

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
                    <a href={link.url} target={link.target}>
                      {link.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* Razor always reserves this 4th column, even with no rich-text
              category to fill it - kept unconditional to match its grid. */}
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
        </div>

        <div className="footer-copyright">
          <div className="row">
            <div className="col-sm-7 col-sm-pull-5">
              <FooterLogo />
              <div
                className="copyright-text"
                dangerouslySetInnerHTML={{ __html: disclaimerMarkup }}
              />
            </div>

            <div className="col-sm-5 col-sm-push-7">
              <FooterPattern className="pattern hidden-xs" />
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
                  <i className="footer-social bi bi-twitter-x" aria-hidden="true" />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="16"
                    height="16"
                    fill="currentColor"
                    className="bi bi-twitter-x"
                    viewBox="0 0 16 16"
                  >
                    <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865l8.875 11.633Z" />
                  </svg>
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
