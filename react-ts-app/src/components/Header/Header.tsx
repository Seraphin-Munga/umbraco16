import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, Menu, Search, X } from 'lucide-react';
import { Logo } from '../icons/Logo';
import { NavModal } from './NavModal';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchHeaderNavigation } from '../../store/slices/headerSlice';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from '../ui/navigation-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Button } from '../ui/shadcn-button';
import { Input } from '../ui/shadcn-input';

// Mirrors Configuration["online_upload"] in Navigation.cshtml, used for the
// fallback "Upload documents" link when a menu item's link has neither a
// real URL nor a Target set.
const ONLINE_UPLOAD_URL = import.meta.env.VITE_ONLINE_UPLOAD_URL || '#';

const navLinkClass =
  'text-white uppercase text-xs font-medium tracking-wide whitespace-nowrap px-2 py-1.5 hover:bg-white/10 hover:text-white focus:bg-white/10 focus:text-white data-active:bg-white/10';

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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalOpen, setModalOpen] = useState(false);

  useEffect(() => {
    const promise = dispatch(fetchHeaderNavigation());
    return () => promise.abort();
  }, [dispatch]);

  const closeMobile = () => setMobileOpen(false);
  const openRegisterLogin = () => setModalOpen(true);

  return (
    <header className="sticky top-0 z-50 bg-brand-navy font-sans text-white shadow-md">
      <div className="flex h-20 items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link to="/en/home/" className="shrink-0" onClick={closeMobile}>
          <Logo />
        </Link>

        <NavigationMenu viewport={false} className="hidden lg:flex lg:min-w-0 lg:flex-1">
          <NavigationMenuList className="flex-nowrap gap-0.5">
            {loading && <li className="px-2.5 py-1.5 text-sm text-white/60">Loading menu…</li>}
            {error && <li className="px-2.5 py-1.5 text-sm text-red-300">{error}</li>}

            {!loading &&
              !error &&
              menu.map((menuItem, menuIndex) =>
                menuItem.menuName.map((link, linkIndex) => {
                  const key = `${menuIndex}-${linkIndex}`;

                  // Real destination -> plain link.
                  if (link.url !== '#') {
                    return (
                      <NavigationMenuItem key={key}>
                        <NavigationMenuLink asChild className={navLinkClass}>
                          {isInternalPath(link.url) ? (
                            <Link to={link.url}>{link.title}</Link>
                          ) : (
                            <a href={link.url}>{link.title}</a>
                          )}
                        </NavigationMenuLink>
                      </NavigationMenuItem>
                    );
                  }

                  // No URL but Target isn't the empty string (matches the
                  // Razor view's `relatedLink.Target != ""` - true for
                  // both a real target and no target at all, i.e. null).
                  if (link.target !== '') {
                    const hasMegaMenu = menuItem.menus.length > 0;

                    if (!hasMegaMenu) {
                      return (
                        <NavigationMenuItem key={key}>
                          <NavigationMenuLink asChild className={navLinkClass}>
                            <a href="/en/home/">{link.title}</a>
                          </NavigationMenuLink>
                        </NavigationMenuItem>
                      );
                    }

                    return (
                      <NavigationMenuItem key={key}>
                        <NavigationMenuTrigger className={`bg-transparent ${navLinkClass}`}>
                          {link.title}
                        </NavigationMenuTrigger>
                        <NavigationMenuContent className="text-foreground">
                          <div className="grid w-[min(90vw,64rem)] grid-cols-2 gap-x-8 gap-y-6 p-6 sm:grid-cols-4">
                            {menuItem.menus.map((category, categoryIndex) => (
                              <div key={categoryIndex}>
                                <div className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                                  {category.categoryName}
                                </div>
                                <ul>
                                  {category.link.map((linkGroup, linkGroupIndex) =>
                                    linkGroup.menuList.map((productLink, productLinkIndex) => {
                                      const productUrl = linkGroup.pageSection
                                        ? `${productLink.url}${linkGroup.pageSection}`
                                        : productLink.url;
                                      const productKey = `${linkGroupIndex}-${productLinkIndex}`;
                                      const content = (
                                        <>
                                          <span className="font-medium text-foreground">{productLink.title}</span>
                                          {linkGroup.menuDescription && (
                                            <span className="text-xs text-muted-foreground">
                                              {linkGroup.menuDescription}
                                            </span>
                                          )}
                                        </>
                                      );
                                      return (
                                        <li key={productKey}>
                                          <NavigationMenuLink asChild className="flex-col items-start gap-0.5">
                                            {isInternalPath(productUrl) ? (
                                              <Link to={productUrl}>{content}</Link>
                                            ) : (
                                              <a href={productUrl}>{content}</a>
                                            )}
                                          </NavigationMenuLink>
                                        </li>
                                      );
                                    }),
                                  )}
                                </ul>
                              </div>
                            ))}
                          </div>
                        </NavigationMenuContent>
                      </NavigationMenuItem>
                    );
                  }

                  // No URL, Target is the empty string -> fallback
                  // "Upload documents" link.
                  return (
                    <NavigationMenuItem key={key}>
                      <NavigationMenuLink asChild className={navLinkClass}>
                        <a href={ONLINE_UPLOAD_URL} target="_blank" rel="noreferrer">
                          Upload documents
                        </a>
                      </NavigationMenuLink>
                    </NavigationMenuItem>
                  );
                }),
              )}
          </NavigationMenuList>
        </NavigationMenu>

        <div className="ml-auto hidden items-center gap-5 lg:flex">
          <button
            type="button"
            aria-label={searchOpen ? 'Close search' : 'Open search'}
            aria-expanded={searchOpen}
            onClick={() => setSearchOpen((open) => !open)}
            className="rounded-full p-2 text-white/80 transition-colors hover:bg-white/10 hover:text-white"
          >
            {searchOpen ? <X className="size-5" /> : <Search className="size-5" />}
          </button>
          <div className="flex items-center overflow-hidden rounded-full bg-brand-green text-sm font-semibold text-white">
            <button
              type="button"
              onClick={openRegisterLogin}
              className="px-5 py-2 uppercase tracking-wide transition-colors hover:bg-black/10"
            >
              Register
            </button>
            <span className="h-4 w-px bg-white/40" aria-hidden="true" />
            <button
              type="button"
              onClick={openRegisterLogin}
              className="px-5 py-2 uppercase tracking-wide transition-colors hover:bg-black/10"
            >
              Login
            </button>
          </div>
        </div>

        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="ml-auto text-white hover:bg-white/10 hover:text-white lg:hidden"
            >
              <Menu className="size-5" />
              <span className="sr-only">Toggle navigation</span>
            </Button>
          </SheetTrigger>
          <SheetContent
            side="left"
            className="flex w-full max-w-xs flex-col gap-0 border-none bg-brand-navy text-white sm:max-w-xs [&_[data-slot=sheet-close]]:text-white [&_[data-slot=sheet-close]]:hover:bg-white/10"
          >
            <SheetHeader className="border-b border-white/10">
              <SheetTitle asChild>
                <Link to="/en/home/" onClick={closeMobile}>
                  <Logo />
                </Link>
              </SheetTitle>
            </SheetHeader>

            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-4">
              <a
                href="https://ib.africanbank.co.za/modules/Registration/Public/Register.aspx"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Register
              </a>
              <a
                href="https://ib.africanbank.co.za/"
                target="_blank"
                rel="noreferrer"
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Login
              </a>
              <Link
                to="/en/home/"
                onClick={closeMobile}
                className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
              >
                Home
              </Link>

              {loading && <span className="px-3 py-2 text-sm text-white/60">Loading menu…</span>}
              {error && <span className="px-3 py-2 text-sm text-red-300">{error}</span>}

              {!loading &&
                !error &&
                menu.map((menuItem, menuIndex) =>
                  menuItem.menuName.map((link, linkIndex) => {
                    const key = `${menuIndex}-${linkIndex}`;

                    if (link.url !== '#') {
                      return isInternalPath(link.url) ? (
                        <Link
                          key={key}
                          to={link.url}
                          onClick={closeMobile}
                          className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
                        >
                          {link.title}
                        </Link>
                      ) : (
                        <a
                          key={key}
                          href={link.url}
                          className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
                        >
                          {link.title}
                        </a>
                      );
                    }

                    if (link.target !== '') {
                      const hasMegaMenu = menuItem.menus.length > 0;

                      if (!hasMegaMenu) {
                        return (
                          <a
                            key={key}
                            href="/en/home/"
                            className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
                          >
                            {link.title}
                          </a>
                        );
                      }

                      return (
                        <details key={key} className="group rounded-lg px-3 py-2">
                          <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium">
                            {link.title}
                            <ChevronDown className="size-4 shrink-0 transition-transform group-open:rotate-180" />
                          </summary>
                          <div className="mt-2 space-y-4 border-l border-white/10 pl-3">
                            {menuItem.menus.map((category, categoryIndex) => (
                              <div key={categoryIndex}>
                                <div className="mb-1 text-xs font-semibold tracking-wide text-white/50 uppercase">
                                  {category.categoryName}
                                </div>
                                <div>
                                  {category.link.map((linkGroup, linkGroupIndex) =>
                                    linkGroup.menuList.map((productLink, productLinkIndex) => {
                                      const productUrl = linkGroup.pageSection
                                        ? `${productLink.url}${linkGroup.pageSection}`
                                        : productLink.url;
                                      const productKey = `${linkGroupIndex}-${productLinkIndex}`;
                                      return isInternalPath(productUrl) ? (
                                        <Link
                                          key={productKey}
                                          to={productUrl}
                                          onClick={closeMobile}
                                          className="block py-1 text-sm text-white/80 hover:text-white"
                                        >
                                          {productLink.title}
                                        </Link>
                                      ) : (
                                        <a
                                          key={productKey}
                                          href={productUrl}
                                          className="block py-1 text-sm text-white/80 hover:text-white"
                                        >
                                          {productLink.title}
                                        </a>
                                      );
                                    }),
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </details>
                      );
                    }

                    return (
                      <a
                        key={key}
                        href={ONLINE_UPLOAD_URL}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg px-3 py-2 text-sm font-medium hover:bg-white/10"
                      >
                        Upload documents
                      </a>
                    );
                  }),
                )}
            </nav>

            <div className="border-t border-white/10 p-4">
              <Button
                onClick={() => {
                  closeMobile();
                  openRegisterLogin();
                }}
                className="w-full rounded-full bg-brand-green text-white hover:bg-brand-green/90"
              >
                Register/Login
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {searchOpen && (
        <div className="hidden border-t border-white/10 bg-[#00224d] lg:block">
          <form
            onSubmit={(event) => event.preventDefault()}
            className="flex items-center gap-3 px-4 py-3 sm:px-6 lg:px-8"
          >
            <Search className="size-4 shrink-0 text-white/60" />
            <Input
              autoFocus
              autoComplete="off"
              placeholder="Search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="border-none bg-transparent text-white placeholder:text-white/50 focus-visible:ring-0"
            />
          </form>
        </div>
      )}

      <NavModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </header>
  );
}
