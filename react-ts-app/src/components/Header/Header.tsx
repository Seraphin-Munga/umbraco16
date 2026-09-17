import { useEffect, useState } from 'react';
import { Logo } from '../icons/Logo';
import { NavModal } from './NavModal';
import {
  PERSONAL_MENU_CATEGORY_ORDER,
  PERSONAL_MENU_EXTERNAL_LINKS,
  PERSONAL_MENU_PAGES,
} from '../../routes/personalMenuPages';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchHeaderNavigation } from '../../store/slices/headerSlice';
import './Header.css';

// Mirrors Configuration["online_upload"] in Navigation.cshtml, used for the
// fallback "Upload documents" link when a menu item's link has neither a
// real URL nor a Target set.
const ONLINE_UPLOAD_URL = import.meta.env.VITE_ONLINE_UPLOAD_URL || '#';

// The "PERSONAL" top-level item's dropdown is rendered from our own ported
// route list instead of the CMS fetch below - it always shows and links to
// real routes in this app regardless of the Umbraco backend being reachable.
// Every other top-level item (Business, etc.) still comes from the header
// slice's fetchHeaderNavigation thunk (src/store/slices/headerSlice.ts) as
// before.
const PERSONAL_MENU_GROUPS = PERSONAL_MENU_CATEGORY_ORDER.map((category) => ({
  category,
  pages: PERSONAL_MENU_PAGES.filter((page) => page.category === category),
  externalLinks: PERSONAL_MENU_EXTERNAL_LINKS.filter((link) => link.category === category),
}));

export function Header() {
  const dispatch = useAppDispatch();
  const { data, status, error } = useAppSelector((state) => state.header);
  const menu = data?.menu ?? [];
  const loading = status === 'idle' || status === 'loading';

  const [navOpen, setNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  // No Bootstrap JS is loaded in this app (index.html only pulls in its
  // CSS) - data-toggle="dropdown" alone does nothing, same reason navOpen/
  // searchOpen above are plain React state instead of Bootstrap's own JS.
  const [openMegaMenuKey, setOpenMegaMenuKey] = useState<string | null>(null);

  useEffect(() => {
    const promise = dispatch(fetchHeaderNavigation());
    return () => promise.abort();
  }, [dispatch]);

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

          <div className={`collapse navbar-collapse${navOpen ? ' in' : ''}`}>
            <ul className="nav navbar-nav dropdown-container left-nav">
              <li>
                <a
                  className="register-btn visible-xs"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setModalOpen(true)}
                >
                  <span>Register/Login</span>
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
                      const isPersonalMenu = link.title.trim().toUpperCase() === 'PERSONAL';
                      const hasMegaMenu = isPersonalMenu || menuItem.menus.length > 0;

                      return (
                        <li
                          key={key}
                          className={`header-mega-menu dropdown${isOpen ? ' open' : ''}`}
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
                            {hasMegaMenu && <i className="fa fa-angle-down" />}
                          </a>
                          {hasMegaMenu && (
                            <div className="dropdown-menu">
                              <div className="container">
                                <div className="row eq-height">
                                  {isPersonalMenu
                                    ? PERSONAL_MENU_GROUPS.map((group) => (
                                        <div className="col-sm-3" key={group.category}>
                                          <div className="mega-menu-product">
                                            <div className="product-category">{group.category}</div>
                                            {group.pages.map((page) => (
                                              <div className="product" key={page.path}>
                                                <a className="title" href={page.path}>
                                                  {page.title}
                                                </a>
                                                <p className="descr">{page.description}</p>
                                              </div>
                                            ))}
                                            {group.externalLinks.map((externalLink) => (
                                              <div className="product" key={externalLink.url}>
                                                <a className="title" href={externalLink.url}>
                                                  {externalLink.title}
                                                </a>
                                                <p className="descr">{externalLink.description}</p>
                                              </div>
                                            ))}
                                          </div>
                                        </div>
                                      ))
                                    : menuItem.menus.map((category, categoryIndex) => (
                                        <div className="col-sm-3" key={categoryIndex}>
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
                  Register <span style={{ fontWeight: 100 }}>|</span> Login
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

      <NavModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
