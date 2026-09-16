import { useEffect, useState } from 'react';
import { fetchTopNavigation, type MenuInfoItem } from '../../api/contentApi';
import { Logo } from './Logo';
import { NavModal } from './NavModal';
import './Header.css';

// Mirrors Configuration["online_upload"] in Navigation.cshtml, used for the
// fallback "Upload documents" link when a menu item's link has neither a
// real URL nor a Target set.
const ONLINE_UPLOAD_URL = import.meta.env.VITE_ONLINE_UPLOAD_URL || '#';

export function Header() {
  const [menu, setMenu] = useState<MenuInfoItem[]>([]);
  const [registerLoginMarkup, setRegisterLoginMarkup] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  // No Bootstrap JS is loaded in this app (index.html only pulls in its
  // CSS) - data-toggle="dropdown" alone does nothing, same reason navOpen/
  // searchOpen above are plain React state instead of Bootstrap's own JS.
  const [openMegaMenuKey, setOpenMegaMenuKey] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    fetchTopNavigation(controller.signal)
      .then(({ menu, registerLoginMarkup }) => {
        setMenu(menu);
        setRegisterLoginMarkup(registerLoginMarkup);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Failed to load navigation.');
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  return (
    <div className="header-container">
      <nav className="navbar navbar-default dropdown-container new-navbar-ab">
        <div className="container-fluid">
          <div className="navbar-header">
            <button
              type="button"
              className={`navbar-toggle padding-left-20 padding-right-15${navOpen ? '' : ' collapsed'}`}
              aria-expanded={navOpen}
              onClick={() => setNavOpen((open) => !open)}
            >
              <span className="sr-only">Toggle navigation</span>
              <span className="icon-bar" />
              <span className="icon-bar" />
              <span className="icon-bar" />
            </button>

            <a className="navbar-brand" href="/en/home/">
              <Logo />
            </a>
          </div>

          <div className={`collapse navbar-collapse${navOpen ? ' show' : ''}`}>
            <ul className="nav navbar-nav dropdown-container left-nav">
              <li>
                <a
                  href="https://ib.africanbank.co.za/modules/Registration/Public/Register.aspx"
                  target="_blank"
                  rel="noreferrer"
                  className="register-btn visible-xs"
                >
                  <span>Register</span>
                </a>
              </li>
              <li>
                <a
                  href="https://ib.africanbank.co.za/"
                  target="_blank"
                  rel="noreferrer"
                  className="register-btn visible-xs"
                >
                  <span>Login</span>
                </a>
              </li>
              <li>
                <a href="/en/home/" className="no-left-padding">
                  <span className="visible-xs">Home</span>
                </a>
              </li>

              {loading && <li className="nav-status">Loading menu…</li>}
              {error && <li className="nav-status nav-status--error">{error}</li>}

              {!loading &&
                !error &&
                menu.map((menuItem, menuIndex) =>
                  menuItem.menuName.map((link, linkIndex) => {
                    const key = `${menuIndex}-${linkIndex}`;

                    // Real destination -> plain link.
                    if (link.url !== '#') {
                      return (
                        <li key={key}>
                          <a href={link.url}>{link.title}</a>
                        </li>
                      );
                    }

                    // No URL but Target isn't the empty string (matches the
                    // Razor view's `relatedLink.Target != ""` - true for
                    // both a real target and no target at all, i.e. null).
                    if (link.target !== '') {
                      const isOpen = openMegaMenuKey === key;

                      return (
                        <li
                          key={key}
                          className={`header-mega-menu dropdown${isOpen ? ' show' : ''}`}
                        >
                          <a
                            href="/en/home/"
                            className="dropdown-toggle"
                            role="button"
                            aria-haspopup="true"
                            aria-expanded={isOpen}
                            onClick={(event) => {
                              event.preventDefault();
                              setOpenMegaMenuKey((current) => (current === key ? null : key));
                            }}
                          >
                            {link.title}
                          </a>
                          {menuItem.menus.length > 0 && (
                            <div className={`dropdown-menu${isOpen ? ' show' : ''}`}>
                              <div className="container">
                                <div className="row mega-menu-row">
                                  {menuItem.menus.map((category, categoryIndex) => (
                                    <div className="mega-menu-column" key={categoryIndex}>
                                      <div className="mega-menu-product">
                                        <div className="product-category">
                                          {category.categoryName}
                                        </div>
                                        {category.link.map((linkGroup, linkGroupIndex) =>
                                          linkGroup.menuList.map((productLink, productLinkIndex) => (
                                            <div
                                              className="product"
                                              key={`${linkGroupIndex}-${productLinkIndex}`}
                                            >
                                              <a
                                                className="title"
                                                href={
                                                  linkGroup.pageSection
                                                    ? `${productLink.url}${linkGroup.pageSection}`
                                                    : productLink.url
                                                }
                                              >
                                                {productLink.title}
                                              </a>
                                              <p className="descr">{linkGroup.menuDescription}</p>
                                            </div>
                                          )),
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </li>
                      );
                    }

                    // No URL, Target is the empty string -> fallback
                    // "Upload documents" link.
                    return (
                      <li key={key}>
                        <a href={ONLINE_UPLOAD_URL} target="_blank" rel="noreferrer">
                          Upload documents
                        </a>
                      </li>
                    );
                  }),
                )}
            </ul>

            <ul className="horizontal-list">
              <li>
                <a>Blog</a>
              </li>
              <li>
                <a>Contact Us</a>
              </li>
            </ul>

            <ul className="nav navbar-nav navbar-right">
              <li>
                <a
                  href="#"
                  className="search-icon globalSearch"
                  onClick={(event) => {
                    event.preventDefault();
                    setSearchOpen((open) => !open);
                  }}
                >
                  <span className="hidden-md hidden-lg hidden-sm search-text">Search</span>
                  <span className="fa fa-search fa-2x" />
                </a>
              </li>
              <li>
                <a
                  className="login-btn hidden-xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setModalOpen(true)}
                >
                  Register/Login
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="global-search-bar" style={{ display: searchOpen ? 'block' : 'none' }}>
          <div className="area_search">
            <div
              className="global-search-new-close-btn"
              onClick={() => setSearchOpen(false)}
            />
            <form
              id="site_search"
              className="search-placeholder-text"
              onSubmit={(event) => event.preventDefault()}
            >
              <input
                type="text"
                autoComplete="off"
                className="form-control global-search-text"
                id="search_box"
                placeholder="PlaceholderSearch"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </form>
            <div className="global-search-results">
              <div className="container-fluid">
                <div className="row">
                  <div className="col-xs-12">
                    <h5>Top Results</h5>
                  </div>
                  <div className="col-xs-12">
                    <ul id="search_results" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      <NavModal
        open={modalOpen}
        markup={registerLoginMarkup}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}
