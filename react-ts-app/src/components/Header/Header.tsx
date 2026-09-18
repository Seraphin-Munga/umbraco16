import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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

// CMS-sourced link.url values are either a relative in-app path or a fully
// qualified off-site URL (see mapLinks' comment in contentApi.ts) - only
// the former is safe to hand to react-router's Link (it treats its `to`
// as an app-internal path regardless of shape, so pointing it at an
// absolute "https://..." URL would mangle navigation instead of leaving
// the page). "//" is excluded too since that's still protocol-relative to
// another host.
function isInternalPath(url: string): boolean {
  return url.startsWith('/') && !url.startsWith('//');
}

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
    <header>
      {/* Matches MasterNew.cshtml's <header><nav class="navbar navbar-expand-lg
          navbar-dark custom-nav new-navbar-ab">@Html.Partial(Navigation.cshtml)</nav></header> -
          Navigation.cshtml's own root (header-container + its own inner navbar-default
          nav) nests inside this, matching the real @Html.Partial composition. */}
      <nav className="navbar navbar-expand-lg navbar-dark custom-nav new-navbar-ab">
        <div className="header-container">
          <nav className="navbar navbar-default dropdown-container new-navbar-ab">
            <div className="container">
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

                <Link className="navbar-brand" to="/en/home/">
                  <Logo />
                </Link>
              </div>

              <div className={`collapse navbar-collapse${navOpen ? ' in' : ''}`}>
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
                    <Link to="/en/home/" className="no-left-padding">
                      <span className="visible-xs">Home</span>
                    </Link>
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
                              {isInternalPath(link.url) ? (
                                <Link to={link.url}>{link.title}</Link>
                              ) : (
                                <a href={link.url}>{link.title}</a>
                              )}
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
                                                    <Link
                                                      className="title"
                                                      to={page.path}
                                                      onClick={() => setOpenMegaMenuKey(null)}
                                                    >
                                                      {page.title}
                                                    </Link>
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
                                                      {(() => {
                                                        const productUrl = linkGroup.pageSection
                                                          ? `${productLink.url}${linkGroup.pageSection}`
                                                          : productLink.url;
                                                        return isInternalPath(productUrl) ? (
                                                          <Link
                                                            className="title"
                                                            to={productUrl}
                                                            onClick={() => setOpenMegaMenuKey(null)}
                                                          >
                                                            {productLink.title}
                                                          </Link>
                                                        ) : (
                                                          <a className="title" href={productUrl}>
                                                            {productLink.title}
                                                          </a>
                                                        );
                                                      })()}
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

                <ul className="nav navbar-nav navbar-right" style={{ marginTop: '-20px' }}>
                  <li>
                    <a
                      href="#"
                      className="search-icon globalSearch"
                      data-toggle="tooltip"
                      data-placement="bottom"
                      data-original-title=""
                      title=""
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

          <NavModal open={modalOpen} onClose={() => setModalOpen(false)} />
        </div>
      </nav>
    </header>
  );
}
