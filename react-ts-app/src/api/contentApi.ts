// Client for Umbraco's Content Delivery API (Umbraco.CMS.Global.DeliveryApi in
// appsettings.json). Shapes below are confirmed against the actual DTOs in
// the installed Umbraco.Cms.Api.Delivery/Umbraco.Core packages (ApiBlockListModel,
// ApiElement, ApiLink), NOT just inferred from Navigation.cshtml's untyped
// IPublishedContent walk.
//
// menuInfo nests four levels deep, confirmed against the real v8 source
// schema (sqlcmd against cmsContentType/cmsPropertyType) and the migration
// fixes that make it convert correctly (Program.cs STEP 3B + the
// string-encoded-nesting + internal-link-UDI-remap fixes):
//   topNavigation.menuInfo      (nCMenuCategory: menuDescription, menuName, menus)
//     -> menus                 (nCMenuContent: categoryName, link)
//       -> link                (nCMenuList: menuList, pageSection, menuDescription)
// An earlier version of this file only mapped menuDescription + menuName
// because "menus" genuinely didn't exist on the migrated schema yet at the
// time - that's fixed now, so this maps the full tree.

import type {
  BlogPost,
  HelpLink,
  HelpTab,
  HeroSlide,
  HomePageData,
  ShoulderCard,
  ShoulderTab,
  TestimonialItem,
  WhatsNew,
} from '../components/Home/types';
import type { HeroCarouselSlide, HeroProductGridItem } from '../components/Home/HeroCarousel';
import type { AudacityCard } from '../components/Home/BankWithAudacity';
import type { RewardsCard } from '../components/Home/RewardsSection';
import type { BusinessAudacitySlide } from '../components/Home/BusinessAudacitySection';
import type { VideoTestimonial } from '../components/Home/Testimonials';
import type { LoanCalculatorProps } from '../components/ui/LoanCalculator/LoanCalculator';

export interface DeliveryLink {
  url: string;
  title: string;
  target: string | null;
}

export interface MenuListItem {
  menuDescription: string | null;
  pageSection: string | null;
  menuList: DeliveryLink[];
}

export interface MenuCategoryItem {
  categoryName: string | null;
  link: MenuListItem[];
}

export interface MenuInfoItem {
  menuDescription: string | null;
  menuName: DeliveryLink[];
  menus: MenuCategoryItem[];
}

interface RawBlockItem {
  content?: {
    contentType?: string;
    properties?: Record<string, unknown>;
  };
}

// Block List properties (menuInfo) come back wrapped as { "items": [...] },
// not a bare array - confirmed against a live v2 response.
interface RawBlockListValue {
  items?: RawBlockItem[];
}

// Rich Text properties (registerLogin) come back as { "markup": "<...>", "blocks": [] }.
interface RawRichTextValue {
  markup?: string;
}

interface RawContentItem {
  id: string;
  contentType: string;
  // The editor-assigned content name (e.g. "HeroBodyNew" vs "HeroBody") -
  // distinct from contentType, which is the doctype alias shared by both.
  name?: string;
  properties: Record<string, unknown>;
  // Present on content items (not media); used for blog post links, which
  // read the post's own page URL rather than a Link-picker property.
  route?: { path?: string };
}

interface RawContentResponse {
  total: number;
  items: RawContentItem[];
}

export interface TopNavigation {
  menu: MenuInfoItem[];
}

const API_BASE = (import.meta.env.VITE_UMBRACO_API_BASE_URL ?? '').replace(/\/+$/, '');
// v1 404s on this backend - the live instance only serves v2.
const DELIVERY_API_CONTENT_PATH = '/umbraco/delivery/api/v2/content';

async function fetchContent(
  query: string,
  signal?: AbortSignal,
): Promise<RawContentItem[]> {
  const response = await fetch(`${API_BASE}${DELIVERY_API_CONTENT_PATH}${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Umbraco Content Delivery API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: RawContentResponse = await response.json();
  return data.items ?? [];
}

async function fetchOne(query: string, signal?: AbortSignal): Promise<RawContentItem | undefined> {
  const [item] = await fetchContent(query, signal);
  return item;
}

async function fetchChildren(
  parentId: string,
  signal?: AbortSignal,
  expand = 'properties[$all]',
): Promise<RawContentItem[]> {
  return fetchContent(`?fetch=children:${parentId}&expand=${expand}&take=100`, signal);
}

function findByContentType(items: RawContentItem[], contentType: string): RawContentItem | undefined {
  return items.find((item) => item.contentType.toLowerCase() === contentType.toLowerCase());
}

// Umbraco Delivery API's documented "get by route" endpoint - unlike every
// other fetch in this file, this hits a single-item endpoint (the response
// is one RawContentItem, not a { total, items } envelope). Needed because
// many product pages (product-personal-loan, product-consolidation-loan,
// product-12-loan, ...) all share the same `pageLoans` content type, so
// `filter=contentType:pageLoans` (the pattern every other fetch* below
// uses) can't tell them apart - only the route can. NOT verified against a
// live response (v1 vs v2 path shape, trailing slash handling) the way the
// rest of this file's endpoints are - wrapped by callers in a try/catch so
// a wrong guess here degrades to an empty page instead of a crash.
async function fetchContentByRoute(
  path: string,
  signal?: AbortSignal,
  expand?: string,
): Promise<RawContentItem | undefined> {
  const query = expand ? `?expand=${expand}` : '';

  const response = await fetch(`${API_BASE}/umbraco/delivery/api/v2/content/item${path}${query}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) return undefined;
  return (await response.json()) as RawContentItem;
}

// Same endpoint as fetchContentByRoute but addressed by content GUID
// instead of route - Umbraco's Delivery API "item" endpoint accepts either
// (see that function's own comment re: not verified live). Needed for
// re-fetching one already-known child (a tabBody node) with a deeper
// `expand` than the one-level `expand=properties[$all]` fetchChildren uses.
async function fetchContentById(
  id: string,
  expand: string,
  signal?: AbortSignal,
): Promise<RawContentItem | undefined> {
  const response = await fetch(`${API_BASE}/umbraco/delivery/api/v2/content/item/${id}?expand=${expand}`, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) return undefined;
  return (await response.json()) as RawContentItem;
}

function mapBlocks<T>(
  value: unknown,
  map: (props: Record<string, unknown>) => T,
): T[] {
  const items = (value as RawBlockListValue | null | undefined)?.items;

  if (!Array.isArray(items)) return [];

  return items
    .map((item) => item?.content?.properties)
    .filter((props): props is Record<string, unknown> => !!props)
    .map(map);
}

function mapLinks(value: unknown): DeliveryLink[] {
  if (!Array.isArray(value)) return [];

  // Confirmed against a live response: ApiLink.url already comes back as
  // "#" for a menu trigger with no real destination (not "" with the "#"
  // only in queryString, which an earlier version of this function
  // wrongly assumed and then concatenated - producing "##" and breaking
  // the `!== '#'` check in Header.tsx worse than before). queryString
  // isn't needed for that comparison at all.
  return value.map((raw: Record<string, unknown>) => ({
    url: typeof raw?.url === 'string' ? raw.url : '#',
    title: typeof raw?.title === 'string' ? raw.title : String(raw?.name ?? ''),
    target: typeof raw?.target === 'string' ? raw.target : null,
  }));
}

function mapRichText(value: unknown): string {
  const markup = (value as RawRichTextValue | null | undefined)?.markup;
  return typeof markup === 'string' ? markup : '';
}

function mapMenuListItem(props: Record<string, unknown>): MenuListItem {
  return {
    menuDescription: typeof props.menuDescription === 'string' ? props.menuDescription : null,
    pageSection: typeof props.pageSection === 'string' ? props.pageSection : null,
    menuList: mapLinks(props.menuList),
  };
}

function mapMenuCategoryItem(props: Record<string, unknown>): MenuCategoryItem {
  return {
    categoryName: typeof props.categoryName === 'string' ? props.categoryName : null,
    link: mapBlocks(props.link, mapMenuListItem),
  };
}

function mapMenuInfoItem(props: Record<string, unknown>): MenuInfoItem {
  return {
    menuDescription: typeof props.menuDescription === 'string' ? props.menuDescription : null,
    menuName: mapLinks(props.menuName),
    menus: mapBlocks(props.menus, mapMenuCategoryItem),
  };
}

// `expand=properties[$all]` only expands one level of Block List content -
// confirmed against a live response: menuInfo's own items (nCMenuCategory)
// came back with menuDescription/menuName fully populated, but their own
// "menus" property (itself a Block List, one level deeper) came back as a
// bare `null` rather than even an empty `{ items: [] }` - not a converted-
// but-empty value, an unexpanded one.
//
// The `expand` parameter is NOT dot-notation (an earlier version of this
// constant wrongly assumed it was) - it's a bracket tree, decompiled
// straight from the installed Umbraco.Cms.Api.Common package
// (ElementOnlyOutputExpansionStrategy.Node.Parse + GetNextProperties):
// `key[child,child]` nests, commas separate siblings. At each level,
// GetNextProperties checks for a direct "$all" child first, then falls
// back to a "properties" child and looks inside *that* for "$all" or the
// specific property alias - and since it's a FirstOrDefault over a
// mixed "$all"/alias predicate, a specific alias must be listed BEFORE
// "$all" in the same bracket to actually be picked over the wildcard.
// Verified by simulating this exact algorithm in Python against the
// string below before using it - not just derived from the decompile
// and hoped to be right.
const TOP_NAVIGATION_EXPAND =
  'properties[menuInfo[properties[menus[properties[link[properties[$all]],$all]],$all]],$all]';

/**
 * Fetches the site's `topNavigation` content item: its `menuInfo` block list,
 * normalized into a clean array. The register/login modal itself is static
 * markup ported directly into NavModal.tsx (see its own comment) - there is
 * no CMS property behind it. Requires Umbraco:CMS:DeliveryApi:Enabled +
 * PublicAccess (already true in appsettings.json) so no API key is needed.
 */
export async function fetchTopNavigation(signal?: AbortSignal): Promise<TopNavigation> {
  // Fetched by its exact route rather than `filter=contentType:topNavigation`
  // - there's more than one topNavigation-typed node in the tree, so a bare
  // type filter with take=1 isn't guaranteed to land on this specific one.
  const topNavigation = await fetchContentByRoute(
    '/en/home/homepagelements/top-navigation/',
    signal,
    TOP_NAVIGATION_EXPAND,
  );

  if (!topNavigation) {
    return { menu: [] };
  }

  return {
    menu: mapBlocks(topNavigation.properties.menuInfo, mapMenuInfoItem),
  };
}

// ============================================================
// FOOTER (bottomNavigation content type)
// ============================================================
//
// Ported from Views/MasterNew.cshtml (the layout PageHome.cshtml actually
// uses) + its Views/Partials/_pageBottomNavigation.cshtml. bottomNavigation's
// LinkItems block list mixes two kinds of category elements, discriminated
// here by which of their two mutually-exclusive properties is present
// (mirroring the Razor view's own `if (menuData.Value(..., "linkItems") !=
// null)` / `if (menuData.Value(..., "listOfRichTextItems") != null)` checks):
// a list of links, or a block of raw rich-text items (used for the
// "Contact Us" column's icons/address).

export interface FooterLink {
  url: string;
  title: string;
  target?: '_blank';
}

export interface FooterLinkCategory {
  kind: 'links';
  categoryName: string | null;
  links: FooterLink[];
}

export interface FooterRichTextCategory {
  kind: 'richText';
  categoryName: string | null;
  html: string;
}

export type FooterCategory = FooterLinkCategory | FooterRichTextCategory;

export interface Footer {
  categories: FooterCategory[];
  disclaimerMarkup: string;
}

// The Delivery API returns media urls as a path relative to the Umbraco
// backend (e.g. "/media/xxxxx/image.jpg"), not an absolute url - resolving
// that against this SPA's own origin instead of the backend's is exactly
// how a real CMS-authored image silently 404s. Prefixed with the same
// API_BASE used for the content fetch itself so it resolves the same way
// in both dev (empty - see vite.config.ts's matching /media proxy) and a
// deployed environment (VITE_UMBRACO_API_BASE_URL).
function mapMediaUrl(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  const url = (first as { url?: unknown } | null | undefined)?.url;
  if (typeof url !== 'string' || !url) return '';
  return url.startsWith('/') ? `${API_BASE}${url}` : url;
}

// One "relatedLink" item from a link category's nested linkItems block list.
// Its nCurlLink is itself a list (usually one entry) - Razor loops it, so
// this can return more than one FooterLink per relatedLink item.
function mapFooterLinkItem(props: Record<string, unknown>): FooterLink[] {
  const pageSection = typeof props.nCpageSection === 'string' ? props.nCpageSection : '';
  const links = mapLinks(props.nCurlLink);

  return links.map((link) => {
    if (link.url !== '#') {
      return {
        url: pageSection ? `${link.url}${pageSection}` : link.url,
        title: link.title,
      };
    }

    // No real URL -> fall back to an attached document's file URL, same
    // as the Razor view's relatedLink.Value("nCdocument") branch - that
    // branch's own <a> has target="_blank" in the source, unlike a plain
    // link above.
    return {
      url: mapMediaUrl(props.nCdocument),
      title: typeof props.nCtext === 'string' ? props.nCtext : '',
      target: '_blank' as const,
    };
  });
}

function mapFooterCategory(props: Record<string, unknown>): FooterCategory | null {
  const categoryName = typeof props.categoryName === 'string' ? props.categoryName : null;

  if (props.linkItems) {
    return {
      kind: 'links',
      categoryName,
      links: mapBlocks(props.linkItems, mapFooterLinkItem).flat(),
    };
  }

  if (props.listOfRichTextItems) {
    return {
      kind: 'richText',
      categoryName,
      html: mapBlocks(props.listOfRichTextItems, (itemProps) =>
        mapRichText(itemProps.nCtextEditor),
      ).join(''),
    };
  }

  return null;
}

/**
 * Fetches the copyright/disclaimer rich-text block shown under the footer
 * logo. Ported from the non-`/banking`-path branch of MasterNew.cshtml's
 * disclaimerValue lookup only - the `/banking`-specific variant depends on
 * the current page's route, which this SPA doesn't have yet. Best-effort:
 * swallows its own errors so a schema mismatch here doesn't break the rest
 * of the footer.
 */
async function fetchFooterDisclaimer(signal?: AbortSignal): Promise<string> {
  try {
    const [container] = await fetchContent(
      '?filter=contentType:ebankITListSectionText&take=1',
      signal,
    );
    if (!container) return '';

    const [disclaimer] = await fetchContent(
      `?fetch=children:${container.id}&expand=properties[$all]&take=1`,
      signal,
    );

    return mapRichText(disclaimer?.properties.ebankITContent);
  } catch {
    return '';
  }
}

export async function fetchFooter(signal?: AbortSignal): Promise<Footer> {
  const [bottomNavigation] = await fetchContent(
    '?filter=contentType:bottomNavigation&expand=properties[$all]&take=1',
    signal,
  );

  const categories = bottomNavigation
    ? mapBlocks(bottomNavigation.properties.linkItems, mapFooterCategory).filter(
        (category): category is FooterCategory => category !== null,
      )
    : [];

  const disclaimerMarkup = await fetchFooterDisclaimer(signal);

  return { categories, disclaimerMarkup };
}


// ============================================================
// HOME PAGE (heroHeaderHome / heroShoulderHome / heroFeetHome / testimonials)
// ============================================================
//
// Ported from Platform/Web/Views/home.cshtml, NOT Platform.Umbraco16/
// PageHome.cshtml - that one is a redesign that isn't live yet (see
// src/components/Home/*.tsx's own comments for the section-by-section
// differences: real tabs instead of a flat grid, a single blended blog/
// "what's new" carousel instead of three separate promo sections, a
// simpler headingless testimonials carousel, and an extra help/FAQ tabs
// section this file didn't have before).
//
// Property aliases below come from legacy/Models/*.generated.cs
// (Umbraco.ModelsBuilder v8.1.0 output - the same source PageHome.cshtml's
// port already leaned on) for heroHeaderHome/heroShoulderHome/testimonials,
// which is solid ground. `ebankItitem2` (whatsNew) and `heroFeetHome`/
// `FeetItem`/`LinkItem` (help tabs) are NOT in that research - home.cshtml
// only gives late-bound `.Value("...")` calls for those, so their content-
// type aliases and property names below are best-effort guesses, not
// confirmed against any generated model or live response. Both are wrapped
// in try/catch (whatsNew) or degrade to an empty section (help tabs) so a
// wrong guess there doesn't break the rest of the homepage.

const HERO_HEADER_EXPAND = 'properties[items[properties[$all]],$all]';
const HERO_SHOULDER_EXPAND = 'properties[items[properties[items[properties[$all]],$all]],$all]';
const TESTIMONIALS_EXPAND = 'properties[testimonialItems[properties[$all]],$all]';
const HERO_FEET_HOME_EXPAND = 'properties[links[properties[items[properties[$all]],$all]],$all]';

function mapHeroSlide(props: Record<string, unknown>): HeroSlide {
  const link = mapLinks(props.heroRedirectAction)[0];

  return {
    imageUrl: mapMediaUrl(props.heroImage),
    title: typeof props.heroTitle === 'string' ? props.heroTitle : '',
    productDescription:
      typeof props.heroProductDescription === 'string' ? props.heroProductDescription : '',
    titleDescription: typeof props.heroTitleDescription === 'string' ? props.heroTitleDescription : '',
    buttonLabel: typeof props.heroButtonLabel === 'string' ? props.heroButtonLabel : null,
    buttonUrl: link && link.url !== '#' ? link.url : null,
    buttonStyle: typeof props.buttonStyler === 'string' ? props.buttonStyler : null,
  };
}

// `link` on structureBeCardDescription is a single content/media picker
// (IPublishedContent), not a Link picker like every other link-shaped
// field on this page. Content-item references in the Delivery API are
// documented to expose their page route as `route.path`; this also falls
// back to a plain `.url` in case it comes back closer to a media
// reference instead. Unverified against a live response either way.
function mapContentPickerUrl(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== 'object') return null;

  const ref = first as { url?: unknown; route?: { path?: unknown } };
  if (typeof ref.route?.path === 'string') return ref.route.path;
  if (typeof ref.url === 'string') return ref.url;
  return null;
}

function mapShoulderCard(props: Record<string, unknown>): ShoulderCard {
  return {
    iconUrl: mapMediaUrl(props.benefitCardIcon),
    title: typeof props.benefitCardTitle === 'string' ? props.benefitCardTitle : '',
    description: typeof props.benefitCardDescription === 'string' ? props.benefitCardDescription : '',
    linkUrl: mapContentPickerUrl(props.link),
  };
}

function mapShoulderTab(props: Record<string, unknown>): ShoulderTab {
  const tabName = typeof props.tabName === 'string' ? props.tabName : '';

  return {
    tabId: typeof props.tabId === 'string' ? props.tabId.replace(/\s/g, '') : '',
    tabName,
    tabHeading: typeof props.tabHeading === 'string' ? props.tabHeading : '',
    tabIconUrl: mapMediaUrl(props.tabIcon),
    tabIconAlt: tabName,
    cards: mapBlocks(props.items, mapShoulderCard),
  };
}

function mapWhatsNew(item: RawContentItem): WhatsNew {
  const link = mapLinks(item.properties.sectionLink)[0];

  return {
    title: typeof item.properties.ebankITTitle === 'string' ? item.properties.ebankITTitle : '',
    contentMarkup: mapRichText(item.properties.ebankITContent),
    linkUrl: link?.url ?? '#',
    linkLabel: link?.title ?? '',
  };
}

function mapTestimonialItem(props: Record<string, unknown>): TestimonialItem {
  return {
    avatarUrl: mapMediaUrl(props.testimonialAvatar),
    story: typeof props.testimonialStory === 'string' ? props.testimonialStory : '',
    name: typeof props.testimonialName === 'string' ? props.testimonialName : '',
  };
}

function mapHelpLink(props: Record<string, unknown>): HelpLink {
  const link = mapLinks(props.internalLink)[0];
  const anchor = typeof props.anchorLink === 'string' ? props.anchorLink : '';

  return {
    text: typeof props.text === 'string' ? props.text : '',
    buttonText: typeof props.buttonText === 'string' ? props.buttonText : '',
    url: link ? `${link.url}${anchor ? `#${anchor}` : ''}` : '#',
  };
}

function mapHelpTab(props: Record<string, unknown>): HelpTab {
  const tabName = typeof props.tabName === 'string' ? props.tabName : '';

  return {
    tabId: typeof props.tabId === 'string' ? props.tabId.replace(/\s/g, '') : '',
    tabName,
    tabIconUrl: mapMediaUrl(props.tabIcon),
    tabIconAlt: tabName,
    links: mapBlocks(props.items, mapHelpLink),
  };
}

// Ensures every tab has a non-empty, unique id even if the CMS field came
// back empty - React keys and the tab/pane anchor link both depend on it.
function withFallbackIds<T extends { tabId: string }>(tabs: T[], prefix: string): T[] {
  return tabs.map((tab, index) => (tab.tabId ? tab : { ...tab, tabId: `${prefix}-${index}` }));
}

export async function fetchHomePage(signal?: AbortSignal): Promise<HomePageData> {
  const [heroHeaderNode, heroShoulderNode, testimonialsNode, heroFeetHomeNode] = await Promise.all([
    fetchOne(`?filter=contentType:heroHeaderHome&expand=${HERO_HEADER_EXPAND}&take=1`, signal),
    fetchOne(`?filter=contentType:heroShoulderHome&expand=${HERO_SHOULDER_EXPAND}&take=1`, signal),
    fetchOne(`?filter=contentType:testimonials&expand=${TESTIMONIALS_EXPAND}&take=1`, signal),
    fetchOne(`?filter=contentType:heroFeetHome&expand=${HERO_FEET_HOME_EXPAND}&take=1`, signal),
  ]);

  return {
    hero: heroHeaderNode ? mapBlocks(heroHeaderNode.properties.items, mapHeroSlide) : [],
    shoulderTabs: heroShoulderNode
      ? withFallbackIds(mapBlocks(heroShoulderNode.properties.items, mapShoulderTab), 'shoulder')
      : [],
    helpHeading:
      typeof heroFeetHomeNode?.properties.heading === 'string' ? heroFeetHomeNode.properties.heading : '',
    helpTabs: heroFeetHomeNode
      ? withFallbackIds(mapBlocks(heroFeetHomeNode.properties.links, mapHelpTab), 'help')
      : [],
    testimonials: testimonialsNode
      ? mapBlocks(testimonialsNode.properties.testimonialItems, mapTestimonialItem)
      : [],
  };
}

/**
 * Fetches the "what's new" content item (contentType guessed as
 * `ebankItitem2` - home.cshtml only compares it case-insensitively via
 * `.ToLower() == "ebankititem2"`, never spells the real alias). Best-effort:
 * swallows its own errors so a wrong guess here doesn't break the rest of
 * the homepage - the bank-story carousel just falls back to plain blog
 * slides with no featured split slide.
 */
export async function fetchWhatsNew(signal?: AbortSignal): Promise<WhatsNew | null> {
  try {
    const node = await fetchOne(
      '?filter=contentType:ebankItitem2&expand=properties[$all]&take=1',
      signal,
    );
    return node ? mapWhatsNew(node) : null;
  } catch {
    return null;
  }
}

// ============================================================
// HOME PAGE SECTIONS (homePage doctype - Block List page builder)
// ============================================================
//
// Reads the CMS-managed `homePage` content node created by Program.cs's
// `create-home-schema` command - a single "sections" Block List whose
// allowed block types (heroCarouselBlock, bankWithAudacityBlock, ...)
// mirror the ten static <section>s Home.tsx currently renders one-to-one.
// Sections come back in editor-defined order, so Home.tsx just maps over
// them - reordering/adding/removing a section is then a backoffice edit,
// no deploy required. This is entirely separate from fetchHomePage above,
// which reads the OLD heroHeaderHome/heroShoulderHome/testimonials/
// heroFeetHome content types (a different, not-currently-rendered page
// shape) - the two are unrelated doctypes.
//
// Every nested Block List property name used by any of the ten block
// types must be listed once in the expand tree below, regardless of which
// block type it belongs to (Umbraco's expand syntax matches by property
// name, not by content type) - see TOP_NAVIGATION_EXPAND's own comment
// for the bracket-tree/ordering rules this follows.
const HOME_PAGE_SECTIONS_EXPAND =
  'properties[sections[properties[' +
  'slides[properties[$all]],' +
  'gridItems[properties[$all]],' +
  'cards[properties[$all]],' +
  'features[properties[$all]],' +
  'contactCards[properties[$all]],' +
  'videos[properties[$all]],' +
  '$all]],$all]';

function str(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function num(value: unknown, fallback: number | null = null): number | null {
  return typeof value === 'number' ? value : fallback;
}

// Strips tags from a Rich Text property's markup for components whose
// description/body props render plain text today - loses inline
// formatting (e.g. RewardsSection's "mobile App" bold) rather than risking
// dangerouslySetInnerHTML changes across every consuming component in the
// same pass as wiring up the fetch itself.
function stripHtml(markup: string): string {
  return markup.replace(/<[^>]+>/g, '').trim();
}

// A MultiUrlPicker property (cta/link/applyLink/downloadLink/...) - `null`
// when the editor hasn't picked a link yet, same "no real destination"
// convention as mapLinks' own '#' handling elsewhere in this file.
function mapButton(value: unknown): { label: string; url: string } | null {
  const link = mapLinks(value)[0];
  if (!link || link.url === '#') return null;
  return { label: link.title, url: link.url };
}

function mapHomeHeroSlide(props: Record<string, unknown>): HeroCarouselSlide {
  const button = mapButton(props.cta);
  return {
    imageUrl: mapMediaUrl(props.image),
    titleMain: str(props.titleMain),
    titleHighlight: str(props.titleHighlight),
    description: str(props.description),
    buttonLabel: button?.label ?? '',
    buttonUrl: button?.url ?? '#',
  };
}

function mapHomeGridItem(props: Record<string, unknown>): HeroProductGridItem {
  const link = mapButton(props.link);
  return {
    iconUrl: mapMediaUrl(props.icon),
    label: str(props.label),
    url: link?.url ?? '#',
  };
}

function mapHomeContentCard(props: Record<string, unknown>, index?: number): AudacityCard {
  const button = mapButton(props.cta);
  return {
    id: `content-card-${index ?? 0}`,
    title: str(props.title),
    description: str(props.description),
    buttonLabel: button?.label ?? '',
    buttonUrl: button?.url ?? '#',
  };
}

function mapHomeRewardsCard(props: Record<string, unknown>, index?: number): RewardsCard {
  const button = mapButton(props.cta);
  return {
    id: `rewards-card-${index ?? 0}`,
    imageUrl: mapMediaUrl(props.image),
    imageAlt: '',
    description: stripHtml(mapRichText(props.description)),
    buttonLabel: button?.label ?? '',
    buttonUrl: button?.url ?? '#',
  };
}

function mapHomeBusinessSlide(props: Record<string, unknown>): BusinessAudacitySlide {
  return {
    title: str(props.title),
    paragraphs: [stripHtml(mapRichText(props.body))].filter(Boolean),
  };
}

function mapHomeContactCard(props: Record<string, unknown>): { title: string; subtitle: string } {
  return { title: str(props.title), subtitle: str(props.subtitle) };
}

function mapHomeTestimonialVideo(props: Record<string, unknown>, index?: number): VideoTestimonial {
  return {
    id: `testimonial-${index ?? 0}`,
    videoId: str(props.videoId),
    thumbnailUrl: mapMediaUrl(props.thumbnail),
  };
}

export type HomePageSection =
  | {
      kind: 'heroCarouselBlock';
      slides: HeroCarouselSlide[];
      gridItems: HeroProductGridItem[];
      autoAdvanceSeconds: number | null;
    }
  | { kind: 'bankWithAudacityBlock'; heading: string; cards: AudacityCard[] }
  | { kind: 'loanCalculatorBlock'; props: Partial<LoanCalculatorProps> }
  | {
      kind: 'myWorldAccountBlock';
      heading: string;
      highlightWord: string;
      subheading: string;
      features: string[];
      ctaLabel: string | null;
      ctaUrl: string | null;
    }
  | { kind: 'debitCardShowcaseBlock'; imageUrl: string; alt: string }
  | {
      kind: 'rewardsSectionBlock';
      heading: string;
      subheading: string;
      intro: string;
      cards: RewardsCard[];
    }
  | {
      kind: 'tap2GlassBlock';
      heading: string;
      downloadUrl: string | null;
      downloadLabel: string | null;
      imageUrl: string;
      imageAlt: string;
      description: string;
    }
  | {
      kind: 'businessAudacityBlock';
      heading: string;
      slides: BusinessAudacitySlide[];
      videoThumbnailUrl: string;
      contactCards: { title: string; subtitle: string }[];
    }
  | {
      kind: 'appDownloadBlock';
      heading: string;
      subheading: string;
      description: string;
      downloadUrl: string | null;
      downloadLabel: string | null;
      imageUrl: string;
      imageAlt: string;
    }
  | { kind: 'testimonialsBlock'; heading: string; videos: VideoTestimonial[] };

export function mapHomePageSection(
  contentType: string,
  props: Record<string, unknown>,
): HomePageSection | null {
  switch (contentType) {
    case 'heroCarouselBlock':
      return {
        kind: 'heroCarouselBlock',
        slides: mapBlocks(props.slides, mapHomeHeroSlide),
        gridItems: mapBlocks(props.gridItems, mapHomeGridItem),
        autoAdvanceSeconds: num(props.autoAdvanceSeconds),
      };

    case 'bankWithAudacityBlock':
      return {
        kind: 'bankWithAudacityBlock',
        heading: str(props.heading),
        cards: mapBlocks(props.cards, mapHomeContentCard),
      };

    case 'loanCalculatorBlock': {
      const applyLink = mapButton(props.applyLink);
      const loanProps: Partial<LoanCalculatorProps> = {};
      const minAmount = num(props.minAmount);
      const maxAmount = num(props.maxAmount);
      const defaultAmount = num(props.defaultAmount);
      const minTerm = num(props.minTerm);
      const maxTerm = num(props.maxTerm);
      if (minAmount !== null) loanProps.minAmount = minAmount;
      if (maxAmount !== null) loanProps.maxAmount = maxAmount;
      if (defaultAmount !== null) loanProps.defaultAmount = defaultAmount;
      if (minTerm !== null) loanProps.minTerm = minTerm;
      if (maxTerm !== null) loanProps.maxTerm = maxTerm;
      if (applyLink) loanProps.applyUrl = applyLink.url;
      const imageUrl = mapMediaUrl(props.image);
      if (imageUrl) loanProps.imageUrl = imageUrl;
      const imageAlt = str(props.imageAlt);
      if (imageAlt) loanProps.imageAlt = imageAlt;
      loanProps.imagePosition = props.imageOnRight === true ? 'right' : 'left';
      return { kind: 'loanCalculatorBlock', props: loanProps };
    }

    case 'myWorldAccountBlock': {
      const cta = mapButton(props.cta);
      return {
        kind: 'myWorldAccountBlock',
        heading: str(props.heading),
        highlightWord: str(props.highlightWord),
        subheading: str(props.subheading),
        features: mapBlocks(props.features, (p) => str(p.text)).filter(Boolean),
        ctaLabel: cta?.label ?? null,
        ctaUrl: cta?.url ?? null,
      };
    }

    case 'debitCardShowcaseBlock':
      return {
        kind: 'debitCardShowcaseBlock',
        imageUrl: mapMediaUrl(props.image),
        alt: str(props.alt),
      };

    case 'rewardsSectionBlock':
      return {
        kind: 'rewardsSectionBlock',
        heading: str(props.heading),
        subheading: str(props.subheading),
        intro: stripHtml(mapRichText(props.intro)),
        cards: mapBlocks(props.cards, mapHomeRewardsCard),
      };

    case 'tap2GlassBlock': {
      const download = mapButton(props.downloadLink);
      return {
        kind: 'tap2GlassBlock',
        heading: str(props.heading),
        downloadUrl: download?.url ?? null,
        downloadLabel: download?.label ?? null,
        imageUrl: mapMediaUrl(props.image),
        imageAlt: str(props.imageAlt),
        description: str(props.description),
      };
    }

    case 'businessAudacityBlock':
      return {
        kind: 'businessAudacityBlock',
        heading: str(props.heading),
        slides: mapBlocks(props.slides, mapHomeBusinessSlide),
        videoThumbnailUrl: mapMediaUrl(props.videoThumbnail),
        contactCards: mapBlocks(props.contactCards, mapHomeContactCard),
      };

    case 'appDownloadBlock': {
      const download = mapButton(props.downloadLink);
      return {
        kind: 'appDownloadBlock',
        heading: str(props.heading),
        subheading: str(props.subheading),
        description: str(props.description),
        downloadUrl: download?.url ?? null,
        downloadLabel: download?.label ?? null,
        imageUrl: mapMediaUrl(props.image),
        imageAlt: str(props.imageAlt),
      };
    }

    case 'testimonialsBlock':
      return {
        kind: 'testimonialsBlock',
        heading: str(props.heading),
        videos: mapBlocks(props.videos, mapHomeTestimonialVideo),
      };

    default:
      return null;
  }
}

function mapTypedBlocks<T>(
  value: unknown,
  map: (contentType: string, props: Record<string, unknown>) => T | null,
): T[] {
  const items = (value as RawBlockListValue | null | undefined)?.items;
  if (!Array.isArray(items)) return [];

  return items
    .map((item) => {
      const contentType = item?.content?.contentType;
      const props = item?.content?.properties;
      if (!contentType || !props) return null;
      return map(contentType, props);
    })
    .filter((section): section is T => section !== null);
}

/**
 * Fetches the CMS-managed `homePage` node's `sections` Block List, mapped
 * into Home.tsx's per-component prop shapes and returned in editor-defined
 * order. Returns [] if the node doesn't exist yet (e.g. `create-home-schema`
 * was run but no content was ever created/published in the backoffice) -
 * Home.tsx falls back to its own fully-static section list in that case.
 */
export async function fetchHomePageSections(signal?: AbortSignal): Promise<HomePageSection[]> {
  const homePage = await fetchOne(
    `?filter=contentType:homePage&expand=${HOME_PAGE_SECTIONS_EXPAND}&take=1`,
    signal,
  );
  if (!homePage) return [];

  return mapTypedBlocks(homePage.properties.sections, mapHomePageSection);
}

// ============================================================
// PRODUCT LOAN PAGE SECTIONS (productLoanPage doctype - Block List page
// builder, same shape as the homePage one above)
// ============================================================
//
// Reads the CMS-managed `productLoanPage` content node created by
// Program.cs's `create-product-loan-schema` command - ported from
// PersonalLoanPage.tsx, the component actually rendered at
// /en/home/product-personal-loan/ today (a fully static page - see that
// file's own comment for why it's not fetchProductLoanPage or
// fetchPersonalLoanCampaign above, which describe two separate retired
// Razor templates wired to no component). faqSectionBlock/faqItem are
// general-purpose Element Types (see create-product-loan-schema's own
// comment) - nothing here assumes they're exclusive to this page.
const PRODUCT_LOAN_PAGE_SECTIONS_EXPAND =
  'properties[sections[properties[' +
  'checklistOne[properties[$all]],' +
  'checklistTwo[properties[$all]],' +
  'items[properties[$all]],' +
  'cards[properties[$all]],' +
  '$all]],$all]';

export interface ProductFaqItem {
  question: string;
  answerHtml: string;
}

export interface ProductDownloadLink {
  label: string;
  fileUrl: string;
}

function mapProductFaqItem(props: Record<string, unknown>): ProductFaqItem {
  return {
    question: str(props.question),
    answerHtml: mapRichText(props.answer),
  };
}

function mapProductLoanDownloadItem(props: Record<string, unknown>): ProductDownloadLink {
  return {
    label: str(props.label),
    fileUrl: mapMediaUrl(props.file),
  };
}

export type ProductLoanPageSection =
  | {
      kind: 'heroBannerBlock';
      heading: string;
      description: string;
      primaryCta: { label: string; url: string } | null;
      secondaryCta: { label: string; url: string } | null;
    }
  | { kind: 'loanCalculatorBlock'; props: Partial<LoanCalculatorProps> }
  | {
      kind: 'creditLifeInsuranceBlock';
      heading: string;
      paragraphOne: string;
      paragraphTwo: string;
      checklistOne: string[];
      checklistTwo: string[];
      imageUrl: string;
    }
  | { kind: 'faqSectionBlock'; heading: string; items: ProductFaqItem[] }
  | { kind: 'downloadsSectionBlock'; heading: string; items: ProductDownloadLink[] }
  | { kind: 'crossSellBlock'; heading: string; cards: AudacityCard[]; imageUrl: string };

export function mapProductLoanPageSection(
  contentType: string,
  props: Record<string, unknown>,
): ProductLoanPageSection | null {
  switch (contentType) {
    case 'heroBannerBlock':
      return {
        kind: 'heroBannerBlock',
        heading: str(props.heading),
        description: str(props.description),
        primaryCta: mapButton(props.primaryCta),
        secondaryCta: mapButton(props.secondaryCta),
      };

    case 'loanCalculatorBlock': {
      const applyLink = mapButton(props.applyLink);
      const loanProps: Partial<LoanCalculatorProps> = {};
      const minAmount = num(props.minAmount);
      const maxAmount = num(props.maxAmount);
      const defaultAmount = num(props.defaultAmount);
      const minTerm = num(props.minTerm);
      const maxTerm = num(props.maxTerm);
      if (minAmount !== null) loanProps.minAmount = minAmount;
      if (maxAmount !== null) loanProps.maxAmount = maxAmount;
      if (defaultAmount !== null) loanProps.defaultAmount = defaultAmount;
      if (minTerm !== null) loanProps.minTerm = minTerm;
      if (maxTerm !== null) loanProps.maxTerm = maxTerm;
      if (applyLink) loanProps.applyUrl = applyLink.url;
      const imageUrl = mapMediaUrl(props.image);
      if (imageUrl) loanProps.imageUrl = imageUrl;
      const imageAlt = str(props.imageAlt);
      if (imageAlt) loanProps.imageAlt = imageAlt;
      loanProps.imagePosition = props.imageOnRight === true ? 'right' : 'left';
      return { kind: 'loanCalculatorBlock', props: loanProps };
    }

    case 'creditLifeInsuranceBlock':
      return {
        kind: 'creditLifeInsuranceBlock',
        heading: str(props.heading),
        paragraphOne: str(props.paragraphOne),
        paragraphTwo: str(props.paragraphTwo),
        checklistOne: mapBlocks(props.checklistOne, (p) => str(p.text)).filter(Boolean),
        checklistTwo: mapBlocks(props.checklistTwo, (p) => str(p.text)).filter(Boolean),
        imageUrl: mapMediaUrl(props.image),
      };

    case 'faqSectionBlock':
      return {
        kind: 'faqSectionBlock',
        heading: str(props.heading),
        items: mapBlocks(props.items, mapProductFaqItem),
      };

    case 'downloadsSectionBlock':
      return {
        kind: 'downloadsSectionBlock',
        heading: str(props.heading),
        items: mapBlocks(props.items, mapProductLoanDownloadItem),
      };

    case 'crossSellBlock':
      return {
        kind: 'crossSellBlock',
        heading: str(props.heading),
        cards: mapBlocks(props.cards, mapHomeContentCard),
        imageUrl: mapMediaUrl(props.image),
      };

    default:
      return null;
  }
}

/**
 * Fetches the CMS-managed `productLoanPage` node's `sections` Block List,
 * mapped and returned in editor-defined order - same pattern as
 * fetchHomePageSections above. Returns [] if the node doesn't exist yet
 * (e.g. `create-product-loan-schema` was run but no content was ever
 * created/published in the backoffice).
 */
export async function fetchProductLoanPageSections(
  signal?: AbortSignal,
): Promise<ProductLoanPageSection[]> {
  const productLoanPage = await fetchOne(
    `?filter=contentType:productLoanPage&expand=${PRODUCT_LOAN_PAGE_SECTIONS_EXPAND}&take=1`,
    signal,
  );
  if (!productLoanPage) return [];

  return mapTypedBlocks(productLoanPage.properties.sections, mapProductLoanPageSection);
}

// ============================================================
// DYNAMIC PAGES (any document type with a "sections" Block List)
// ============================================================
//
// Generalizes fetchHomePageSections/fetchProductLoanPageSections above so a
// brand-new page doesn't need its own dedicated fetch/component/route -
// any Umbraco document type built the same way create-home-schema/
// create-product-loan-schema build one (a single "sections" Block List
// property, using block Element Types this app already knows how to
// render) gets picked up automatically by DynamicPage.tsx via React
// Router's catch-all route. Both mappers above are tried in turn - safe,
// since neither throws on an unrecognised content type (each has its own
// `default: return null`) and their block aliases never overlap.
const ANY_PAGE_SECTIONS_EXPAND =
  'properties[sections[properties[' +
  'slides[properties[$all]],' +
  'gridItems[properties[$all]],' +
  'cards[properties[$all]],' +
  'features[properties[$all]],' +
  'contactCards[properties[$all]],' +
  'videos[properties[$all]],' +
  'checklistOne[properties[$all]],' +
  'checklistTwo[properties[$all]],' +
  'items[properties[$all]],' +
  '$all]],$all]';

export type AnyPageSection = HomePageSection | ProductLoanPageSection;

export function mapAnySection(
  contentType: string,
  props: Record<string, unknown>,
): AnyPageSection | null {
  return mapHomePageSection(contentType, props) ?? mapProductLoanPageSection(contentType, props);
}

export interface DynamicPageResult {
  contentType: string;
  sections: AnyPageSection[];
}

/**
 * Fetches whatever Umbraco content exists at `path` (any document type),
 * reads its "sections" Block List with the merged expand tree above, and
 * maps it through both known section mappers. Returns null if nothing
 * exists at that route - DynamicPage.tsx treats that as a 404.
 */
export async function fetchPageSectionsByRoute(
  path: string,
  signal?: AbortSignal,
): Promise<DynamicPageResult | null> {
  const page = await fetchContentByRoute(path, signal, ANY_PAGE_SECTIONS_EXPAND);
  if (!page) return null;

  return {
    contentType: page.contentType,
    sections: mapTypedBlocks(page.properties.sections, mapAnySection),
  };
}

// ============================================================
// BLOG (blogLanding / blog / blogDetailsElements)
// ============================================================

/**
 * Fetches the posts shown in the homepage's "African Bank Stories"
 * carousel, newest first - home.cshtml reads every child of the
 * blogLanding node (no .Take()), ordered by
 * `blog.Children.First().Children.Where(heroBodyBlogDetail).First().blogdate`
 * descending (lines 561-568). `take=20` below is a practical cap this port
 * adds (unbounded fetch-then-sort doesn't make sense client-side), not
 * something in the source.
 *
 * Reads a hardcoded content id (`Umbraco.Content(2855)`) in the source;
 * this looks it up by contentType instead (`blogLanding`, confirmed via
 * this same file's commented-out predecessor,
 * `//Umbraco.TypedContentSingleAtXPath("//blogLanding")`) since content ids
 * aren't stable across environments/database restores and the Delivery API
 * can't filter on an internal int id anyway.
 *
 * Walks blogLanding -> blog (all) -> blog's first child -> that child's own
 * children, taking the one with contentType heroBodyBlogDetail for title/
 * introductionDescription/blogDate (matches the source's own
 * `blog.Children.FirstOrDefault().Children` walk exactly - no image is
 * read here, unlike Platform.Umbraco16/PageHome.cshtml's not-yet-live
 * version, which does use heroHeaderBlogDetail's image). Not verified
 * against a live response. Best-effort: swallows its own errors so a
 * schema mismatch here doesn't break the rest of the homepage.
 */
export async function fetchLatestBlogPosts(signal?: AbortSignal): Promise<BlogPost[]> {
  try {
    const blogLanding = await fetchOne('?filter=contentType:blogLanding&take=1', signal);
    if (!blogLanding) return [];

    const blogs = await fetchContent(`?fetch=children:${blogLanding.id}&take=20`, signal);

    const posts = await Promise.all(
      blogs.map(async (blog): Promise<BlogPost | null> => {
        const firstChild = await fetchOne(`?fetch=children:${blog.id}&take=1`, signal);
        if (!firstChild) return null;

        const elements = await fetchContent(
          `?fetch=children:${firstChild.id}&expand=properties[$all]&take=10`,
          signal,
        );
        const heroBody = elements.find((el) => el.contentType === 'heroBodyBlogDetail');
        if (!heroBody || typeof heroBody.properties.title !== 'string') return null;

        return {
          title: heroBody.properties.title,
          description:
            typeof heroBody.properties.introductionDescription === 'string'
              ? heroBody.properties.introductionDescription
              : '',
          url: blog.route?.path ?? '#',
          publishedDate:
            typeof heroBody.properties.blogDate === 'string' ? heroBody.properties.blogDate : '',
        };
      }),
    );

    return posts
      .filter((post): post is BlogPost => post !== null)
      .sort((a, b) => new Date(b.publishedDate).getTime() - new Date(a.publishedDate).getTime());
  } catch {
    return [];
  }
}

// ============================================================
// PRODUCT LOAN PAGES (pageLoans doctype)
// ============================================================
//
// Ported from Views/productPersonalLoan.cshtml + its Partials
// (_pageHeaderImage, _pageShoulder, _benefitsSection, _howToApplySection,
// _heroKneeTabs, _testimonials, _campaignTabHeaders, _downloadList).
// `pageLoans` is shared by every /product-*/ page (consolidation loan, 12%
// loan, overdraft, ...) - each is one node under a fixed route
// (src/routes/personalMenuPages.ts has them all), discriminated by that
// route rather than by content type. fetchProductLoanPage takes that route
// and walks the same child-lookup chain the Razor view does:
//   pageLoans (by route)
//     -> heroHeader / heroShoulder / heroChest / heroBody / heroKnees /
//        testimonials / callMeBack   (real child content nodes)
//       -> heroChest/heroBody's own "card" children
//       -> heroKnees's findOutMore/creditLifeInsurance/creditLifeInsuranceCredit
//          tab children, each with their own "card" children
//
// Every content-type alias and property name below is confirmed against
// the installed Umbraco.ModelsBuilder-generated models
// (legacy/Models/*.generated.cs) - solid ground, same as the rest of this
// file's non-"best effort" sections. What's NOT confirmed is the shape the
// Delivery API actually serializes deeply-nested children into (this
// wasn't checked against a live response - the local Umbraco backend
// wasn't running while this was written), so every section below is
// wrapped so one wrong guess only empties that section, not the page.

export interface ProductHero {
  breadcrumb: string[];
  imageUrl: string;
  imageMediumUrl: string;
  imageSmallUrl: string;
}

export interface ProductShoulder {
  title: string;
  description: string;
  buttonText: string | null;
  buttonUrl: string | null;
}

// _benefitsSection.cshtml's card-grid markup (title/icon/description per
// card) is commented out in the source - the only thing that actually
// renders live is BenefitCards1's raw mediumDescription HTML, and even
// that only when BenefitCards1 is populated. productPersonalLoan.cshtml
// only ever sets BenefitCards (from heroChest's own "card" children, a
// property this component's Benefits object never fills), so on this page
// BenefitCards1 is always null and the section renders nothing. Kept as an
// empty-array type (not removed) since other pageLoans pages may set it
// differently - fetchProductLoanPage still surfaces it so a page that does
// populate it isn't silently dropped.
export interface ProductBenefit {
  mediumDescriptionHtml: string;
}

export interface ProductDocumentCard {
  iconUrl: string;
  iconAlt: string;
  text: string;
}

export interface ProductHowToApply {
  title: string;
  description: string;
  buttonText: string | null;
  buttonUrl: string | null;
  documentCards: ProductDocumentCard[];
}

export interface ProductKneeCard {
  title: string;
  description: string;
  iconUrl: string;
  iconAlt: string;
}

export interface ProductKneeTabBase {
  id: string;
  title: string;
}

export interface CreditLifeInsuranceTab extends ProductKneeTabBase {
  kind: 'creditLifeInsurance';
  cards: ProductKneeCard[];
  highlights: string[];
  disclaimer: string;
}

export interface CreditLifeInsuranceCreditTab extends ProductKneeTabBase {
  kind: 'creditLifeInsuranceCredit';
  description: string;
  listItems: string[];
  imageUrl: string;
  highlights: string[];
  disclaimer: string;
}

export interface ProductDownloadItem {
  description: string;
  buttonText: string;
  buttonUrl: string;
}

export interface FindOutMoreTab extends ProductKneeTabBase {
  kind: 'findOutMore';
  description: string;
  downloadItems: ProductDownloadItem[];
  highlights: string[];
  disclaimer: string;
}

export type ProductKneeTab = CreditLifeInsuranceTab | CreditLifeInsuranceCreditTab | FindOutMoreTab;

// The floating "call me back" panel's read-only content (title, button
// labels/visibility, success icon). The form itself POSTs to a legacy MVC
// SurfaceController action (legacy/Controllers/CustomController.cs) rather
// than the Delivery API - that's a write, not content, so it's out of
// scope here; ProductCallMeBack only covers what the panel displays.
export interface ProductCallMeBack {
  title: string;
  successIconUrl: string;
  disclaimerHtml: string;
  callMeBackButtonText: string | null;
  callMeBackVisible: boolean;
  quickLoanButtonText: string | null;
  quickLoanUrl: string | null;
  quickLoanVisible: boolean;
  trackLoanVisible: boolean;
}

export interface ProductPageData {
  hero: ProductHero | null;
  shoulder: ProductShoulder | null;
  benefits: ProductBenefit[];
  howToApply: ProductHowToApply | null;
  kneeTabs: ProductKneeTab[];
  testimonials: TestimonialItem[];
  callMeBack: ProductCallMeBack | null;
}

const EMPTY_PRODUCT_PAGE: ProductPageData = {
  hero: null,
  shoulder: null,
  benefits: [],
  howToApply: null,
  kneeTabs: [],
  testimonials: [],
  callMeBack: null,
};

function mapProductHero(item: RawContentItem): ProductHero {
  const breadcrumb = typeof item.properties.breadcrumb === 'string' ? item.properties.breadcrumb : '';

  return {
    breadcrumb: breadcrumb
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    imageUrl: mapMediaUrl(item.properties.image),
    imageMediumUrl: mapMediaUrl(item.properties.imageMedium),
    imageSmallUrl: mapMediaUrl(item.properties.imageSmall),
  };
}

async function mapProductShoulder(
  item: RawContentItem,
  signal?: AbortSignal,
): Promise<ProductShoulder> {
  const children = await fetchChildren(item.id, signal);
  const button = findByContentType(children, 'ebankITAbstractButton');
  // ebankITButtonInternalLink is a single content-picker (IPublishedContent),
  // not a Link-picker array - same shape as ShoulderCard's `link` property,
  // so it uses mapContentPickerUrl, not mapLinks (that one's for
  // Umbraco.Web.Models.Link arrays like heroRedirectAction/menuList).
  const buttonInternalUrl = button ? mapContentPickerUrl(button.properties.ebankITButtonInternalLink) : null;

  return {
    title: typeof item.properties.shoulderTitle === 'string' ? item.properties.shoulderTitle : '',
    description: typeof item.properties.shouderDescription === 'string' ? item.properties.shouderDescription : '',
    buttonText:
      button && typeof button.properties.ebankITButtonText === 'string'
        ? button.properties.ebankITButtonText
        : null,
    buttonUrl:
      buttonInternalUrl ??
      (button && typeof button.properties.ebankITButtonExternalLink === 'string'
        ? button.properties.ebankITButtonExternalLink
        : null),
  };
}

// See ProductBenefit's own comment: only populated for a pageLoans page
// whose Benefits.BenefitCards1 is actually set (productPersonalLoan.cshtml
// never sets it, so this resolves to [] there).
async function mapProductBenefits(item: RawContentItem, signal?: AbortSignal): Promise<ProductBenefit[]> {
  const cards = await fetchChildren(item.id, signal);
  return cards
    .filter((card) => card.contentType.toLowerCase() === 'nccard')
    .map((card) => ({ mediumDescriptionHtml: mapRichText(card.properties.mediumDescription) }));
}

function mapProductCard(card: RawContentItem): { title: string; description: string; iconUrl: string; iconAlt: string } {
  return {
    title: typeof card.properties.cardTitle === 'string' ? card.properties.cardTitle : '',
    description: typeof card.properties.cardDescription === 'string' ? card.properties.cardDescription : '',
    iconUrl: mapMediaUrl(card.properties.cardIcon),
    iconAlt: typeof card.properties.cardTitle === 'string' ? card.properties.cardTitle : '',
  };
}

async function mapProductHowToApply(item: RawContentItem, signal?: AbortSignal): Promise<ProductHowToApply> {
  const children = await fetchChildren(item.id, signal);
  const button = findByContentType(children, 'ebankITAbstractButton');
  const cards = children.filter((child) => child.contentType.toLowerCase() === 'card');

  return {
    title: typeof item.properties.bodyTitle === 'string' ? item.properties.bodyTitle : '',
    description: typeof item.properties.bodyDescription === 'string' ? item.properties.bodyDescription : '',
    buttonText:
      button && typeof button.properties.ebankITButtonText === 'string'
        ? button.properties.ebankITButtonText
        : null,
    buttonUrl:
      button && typeof button.properties.ebankITButtonExternalLink === 'string'
        ? button.properties.ebankITButtonExternalLink
        : null,
    documentCards: cards.map((card) => {
      const mapped = mapProductCard(card);
      return { iconUrl: mapped.iconUrl, iconAlt: mapped.iconAlt, text: mapped.description || mapped.title };
    }),
  };
}

function mapKneeHighlights(value: unknown): string[] {
  return mapBlocks(value, (props) =>
    typeof props.nCcardDescription === 'string' ? props.nCcardDescription : '',
  ).filter(Boolean);
}

async function mapCreditLifeInsuranceTab(tab: RawContentItem, signal?: AbortSignal): Promise<CreditLifeInsuranceTab> {
  const children = await fetchChildren(tab.id, signal);
  const cards = children.filter((child) => child.contentType.toLowerCase() === 'card');

  return {
    kind: 'creditLifeInsurance',
    id: typeof tab.properties.title === 'string' ? tab.properties.title.replace(/[^0-9a-zA-Z]+/g, '') : tab.id,
    title: typeof tab.properties.title === 'string' ? tab.properties.title : '',
    cards: cards.map(mapProductCard),
    highlights: mapKneeHighlights(tab.properties.footerCards),
    disclaimer: typeof tab.properties.disclaimer === 'string' ? tab.properties.disclaimer : '',
  };
}

function mapCreditLifeInsuranceCreditTab(tab: RawContentItem): CreditLifeInsuranceCreditTab {
  const listItems = Array.isArray(tab.properties.tabListItems)
    ? (tab.properties.tabListItems as unknown[]).filter((s): s is string => typeof s === 'string')
    : [];

  return {
    kind: 'creditLifeInsuranceCredit',
    id: typeof tab.properties.title === 'string' ? tab.properties.title.replace(/[^0-9a-zA-Z]+/g, '') : tab.id,
    title: typeof tab.properties.title === 'string' ? tab.properties.title : '',
    description: typeof tab.properties.description === 'string' ? tab.properties.description : '',
    listItems,
    imageUrl: mapMediaUrl(tab.properties.tabImage),
    highlights: mapKneeHighlights(tab.properties.footerCards),
    disclaimer: typeof tab.properties.disclaimer === 'string' ? tab.properties.disclaimer : '',
  };
}

function mapProductDownloadItem(props: Record<string, unknown>): ProductDownloadItem {
  return {
    description: typeof props.downloadTextDescription === 'string' ? props.downloadTextDescription : '',
    buttonText: typeof props.downloadButtonText === 'string' ? props.downloadButtonText : 'Download',
    buttonUrl:
      mapContentPickerUrl(props.downloadButtonRedirectLink2) ??
      (mapMediaUrl(props.downloadButtonRedirectLink2) || '#'),
  };
}

function mapFindOutMoreTab(tab: RawContentItem): FindOutMoreTab {
  return {
    kind: 'findOutMore',
    id: typeof tab.properties.title === 'string' ? tab.properties.title.replace(/[^0-9a-zA-Z]+/g, '') : tab.id,
    title: typeof tab.properties.title === 'string' ? tab.properties.title : '',
    description: typeof tab.properties.description === 'string' ? tab.properties.description : '',
    downloadItems: mapBlocks(tab.properties.downloadItems, mapProductDownloadItem),
    highlights: mapKneeHighlights(tab.properties.footerCards),
    disclaimer: typeof tab.properties.disclaimer === 'string' ? tab.properties.disclaimer : '',
  };
}

async function mapProductKneeTabs(item: RawContentItem, signal?: AbortSignal): Promise<ProductKneeTab[]> {
  const tabs = await fetchChildren(item.id, signal);

  return Promise.all(
    tabs.map((tab): Promise<ProductKneeTab> | ProductKneeTab => {
      const type = tab.contentType.toLowerCase();
      if (type === 'creditlifeinsurance') return mapCreditLifeInsuranceTab(tab, signal);
      if (type === 'creditlifeinsurancecredit') return mapCreditLifeInsuranceCreditTab(tab);
      return mapFindOutMoreTab(tab);
    }),
  );
}

function mapProductCallMeBack(item: RawContentItem): ProductCallMeBack {
  const settings = mapBlocks(item.properties.floatingFormSetting, (props) => props)[0];
  const buttonSettings = settings ? mapBlocks(settings.buttonSettings, (props) => props) : [];

  const findButton = (description: string) =>
    buttonSettings.find(
      (props) => typeof props.buttonDescription === 'string' && props.buttonDescription.toLowerCase() === description,
    );

  const callMeBackButton = findButton('call_me_back');
  const quickLoanButton = findButton('quick_loan');
  const trackLoanButton = findButton('track_my_loan');
  const quickLoanLink = quickLoanButton ? mapLinks(quickLoanButton.internalLink)[0] : undefined;

  // panelWarnings' disclaimer lives under an unrelated, sitewide
  // homepage-elements node (Model.Root()...HomePageElements...HeroBody...
  // TabBody), several ancestors away from this callMeBack node itself -
  // not fetched here since it isn't reachable from this page's own
  // route/children chain the way everything else in this file is. Callers
  // render without it; disclaimerHtml is kept as an explicit empty string
  // rather than guessed at.
  return {
    title: typeof settings?.title === 'string' ? (settings.title as string) : '',
    successIconUrl: mapMediaUrl(item.properties.successIcon),
    disclaimerHtml: '',
    callMeBackButtonText:
      callMeBackButton && typeof callMeBackButton.internalLink === 'object'
        ? mapLinks(callMeBackButton.internalLink)[0]?.title ?? null
        : null,
    callMeBackVisible: callMeBackButton?.isButtonVisible === true,
    quickLoanButtonText: quickLoanLink?.title ?? null,
    quickLoanUrl: quickLoanLink && quickLoanLink.url !== '#' ? quickLoanLink.url : null,
    quickLoanVisible: quickLoanButton?.isButtonVisible === true,
    trackLoanVisible: trackLoanButton?.isButtonVisible === true,
  };
}

/**
 * Fetches one pageLoans product page (personal loan, consolidation loan,
 * the 12% loan, ...) by its site route - see src/routes/personalMenuPages.ts
 * for the full list of routes this can be called with. Every section is
 * independently best-effort: a missing/misshapen child degrades that one
 * section to empty rather than failing the whole page (see this section's
 * top comment for why - no live Delivery API response was available to
 * confirm the nested-children shape against).
 */
export async function fetchProductLoanPage(path: string, signal?: AbortSignal): Promise<ProductPageData> {
  try {
    const page = await fetchContentByRoute(path, signal);
    if (!page) return EMPTY_PRODUCT_PAGE;

    const children = await fetchChildren(page.id, signal);
    const heroHeader = findByContentType(children, 'heroHeader');
    const heroShoulder = findByContentType(children, 'heroShoulder');
    const heroChest = findByContentType(children, 'heroChest');
    const heroBody = findByContentType(children, 'heroBody');
    const heroKnees = findByContentType(children, 'heroKnees');
    const testimonialsNode = findByContentType(children, 'testimonials');
    const callMeBackNode = findByContentType(children, 'callMeBack');

    const [shoulder, benefits, howToApply, kneeTabs] = await Promise.all([
      heroShoulder ? mapProductShoulder(heroShoulder, signal).catch(() => null) : Promise.resolve(null),
      heroChest ? mapProductBenefits(heroChest, signal).catch(() => []) : Promise.resolve([]),
      heroBody ? mapProductHowToApply(heroBody, signal).catch(() => null) : Promise.resolve(null),
      heroKnees ? mapProductKneeTabs(heroKnees, signal).catch(() => []) : Promise.resolve([]),
    ]);

    let callMeBack: ProductCallMeBack | null = null;
    try {
      if (callMeBackNode) callMeBack = mapProductCallMeBack(callMeBackNode);
    } catch {
      callMeBack = null;
    }

    return {
      hero: heroHeader ? mapProductHero(heroHeader) : null,
      shoulder,
      benefits,
      howToApply,
      kneeTabs,
      testimonials: testimonialsNode ? mapBlocks(testimonialsNode.properties.testimonialItems, mapTestimonialItem) : [],
      callMeBack,
    };
  } catch {
    return EMPTY_PRODUCT_PAGE;
  }
}

// ============================================================
// PERSONAL LOAN CAMPAIGN (Views/personalLoanCampaign.cshtml)
// ============================================================
//
// This is the template actually live at /en/home/product-personal-loan/ -
// it supersedes the plain pageLoans sections ported above
// (fetchProductLoanPage), which is Views/productPersonalLoan.cshtml, a
// different, apparently-retired template for the same "pageLoans" content
// type. The campaign page pulls from a *second* heroBody child under the
// page (source: `heroBodynew = children.Where(heroBody).Last()`, not
// `.FirstOrDefault()` like every other heroBody usage in this file) and two
// tabBody children under THAT heroBody - one for the FAQ accordion, one for
// the credit-life-insurance cards. Every alias/property name is confirmed
// against legacy/Models/*.generated.cs; the nested tabBody ->
// tabBodyContent -> sectionContent expand depth is not confirmed against a
// live response (see fetchContentById's own comment).

export interface CampaignIntroCard {
  title: string;
  descriptionHtml: string;
  imageUrl: string;
}

export interface CampaignAccordionItem {
  title: string;
  bodyHtml: string;
}

export interface CampaignCreditLifeItem {
  title: string;
  mediumDescriptionHtml: string;
  longDescriptionHtml: string;
  iconUrl: string;
}

export interface PersonalLoanCampaignData {
  introCard: CampaignIntroCard | null;
  faqItems: CampaignAccordionItem[];
  creditLifeItems: CampaignCreditLifeItem[];
}

const EMPTY_CAMPAIGN: PersonalLoanCampaignData = { introCard: null, faqItems: [], creditLifeItems: [] };

// tabBodyContent (IEnumerable<NCtabGenericContent>) and, one level inside
// each of those, sectionContent (IEnumerable<IPublishedElement>) are both
// nested-content properties, not child nodes - same "one extra expand
// bracket per level" shape as TOP_NAVIGATION_EXPAND at the top of this file.
const CAMPAIGN_TAB_EXPAND = 'properties[tabBodyContent[properties[sectionContent[properties[$all]],$all]],$all]';

interface CampaignSectionCard {
  title: string;
  mediumDescriptionHtml: string;
  longDescriptionHtml: string;
  iconUrl: string;
}

function mapCampaignSectionCard(props: Record<string, unknown>): CampaignSectionCard {
  return {
    title: typeof props.nCcardTitle === 'string' ? props.nCcardTitle : '',
    mediumDescriptionHtml: mapRichText(props.mediumDescription),
    longDescriptionHtml: mapRichText(props.nClongDescription),
    iconUrl: mapMediaUrl(props.nCcardIcon),
  };
}

// tabBodyContent only ever has one entry in practice (every source usage
// reads `.FirstOrDefault()` off it) - that entry's own sectionContent is
// the list of nCCard-shaped items this returns.
async function fetchTabBodySectionCards(tabBodyId: string, signal?: AbortSignal): Promise<CampaignSectionCard[]> {
  const tabBody = await fetchContentById(tabBodyId, CAMPAIGN_TAB_EXPAND, signal);
  if (!tabBody) return [];

  const genericContent = mapBlocks(tabBody.properties.tabBodyContent, (props) => props)[0];
  if (!genericContent) return [];

  return mapBlocks(genericContent.sectionContent, mapCampaignSectionCard);
}

/**
 * Fetches the personal loan campaign page's content by route. See this
 * section's top comment for why every section here is independently
 * try/caught - the nested tabBody expand depth wasn't checked against a
 * live response.
 */
export async function fetchPersonalLoanCampaign(path: string, signal?: AbortSignal): Promise<PersonalLoanCampaignData> {
  try {
    const page = await fetchContentByRoute(path, signal);
    if (!page) return EMPTY_CAMPAIGN;

    const children = await fetchChildren(page.id, signal);
    const heroBodyNodes = children.filter((child) => child.contentType.toLowerCase() === 'herobody');
    // The source picks this by `.Last()` (fragile - depends on tree sort
    // order), but the node the editor actually created for this campaign
    // page is named "HeroBodyNew" in the Umbraco content tree, distinct
    // from the older "HeroBody" node the retired productPersonalLoan.cshtml
    // template used - matching on that name directly is more robust than
    // trusting array order. Falls back to `.Last()` (the source's own
    // approach) if no node is named that, in case naming differs by
    // environment or a future edit renames it.
    const heroBodyNew =
      heroBodyNodes.find((node) => node.name?.toLowerCase() === 'herobodynew') ??
      heroBodyNodes[heroBodyNodes.length - 1];
    if (!heroBodyNew) return EMPTY_CAMPAIGN;

    const heroBodyChildren = await fetchChildren(heroBodyNew.id, signal);
    const cardChildren = heroBodyChildren.filter((child) => child.contentType.toLowerCase() === 'card');
    const tabBodyChildren = heroBodyChildren.filter((child) => child.contentType.toLowerCase() === 'tabbody');

    const introCardNode = cardChildren[0];
    const faqTabBody = tabBodyChildren[0];
    const creditLifeTabBody = tabBodyChildren[tabBodyChildren.length - 1];

    const [faqCards, creditLifeCards] = await Promise.all([
      faqTabBody ? fetchTabBodySectionCards(faqTabBody.id, signal).catch(() => []) : Promise.resolve([]),
      creditLifeTabBody && creditLifeTabBody.id !== faqTabBody?.id
        ? fetchTabBodySectionCards(creditLifeTabBody.id, signal).catch(() => [])
        : Promise.resolve([]),
    ]);

    return {
      introCard: introCardNode
        ? {
            title: typeof introCardNode.properties.cardTitle === 'string' ? introCardNode.properties.cardTitle : '',
            descriptionHtml: mapRichText(introCardNode.properties.cardDescriptionLongText),
            imageUrl: mapMediaUrl(introCardNode.properties.cardIcon),
          }
        : null,
      faqItems: faqCards.map((card) => ({ title: card.title, bodyHtml: card.mediumDescriptionHtml })),
      creditLifeItems: creditLifeCards,
    };
  } catch {
    return EMPTY_CAMPAIGN;
  }
}
