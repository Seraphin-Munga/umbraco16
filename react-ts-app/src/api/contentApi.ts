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
  BlogSectionHeading,
  ContentSectionData,
  HeroSlide,
  HomePageData,
  ShoulderCard,
  ShoulderTab,
  TestimonialItem,
} from '../components/Home/types';

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
  const [topNavigation] = await fetchContent(
    `?filter=contentType:topNavigation&expand=${TOP_NAVIGATION_EXPAND}&take=1`,
    signal,
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

function mapMediaUrl(value: unknown): string {
  const first = Array.isArray(value) ? value[0] : value;
  const url = (first as { url?: unknown } | null | undefined)?.url;
  return typeof url === 'string' ? url : '';
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
    // as the Razor view's relatedLink.Value("nCdocument") branch.
    return {
      url: mapMediaUrl(props.nCdocument),
      title: typeof props.nCtext === 'string' ? props.nCtext : '',
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
// HOME PAGE (heroHeaderHome / heroShoulderHome / heroBody / testimonials)
// ============================================================
//
// Ported from PageHome.cshtml. Unlike topNavigation/bottomNavigation (single
// content nodes whose Block List properties hold everything), the homepage
// spreads its content across several separate content nodes under
// homePageElements, each fetched here by its own contentType filter -
// heroHeaderHome, heroShoulderHome, heroBody (whose four
// structureBodyTextWithImageAndLink children are fetched separately, same
// `fetch=children:<id>` pattern as fetchFooterDisclaimer above), and
// testimonials.
//
// Property aliases below come from legacy/Models/*.generated.cs
// (Umbraco.ModelsBuilder v8.1.0 output - the actual source of truth for
// property aliases, same as PageHome.cshtml itself compiles against) rather
// than a live Delivery API response, since no backend is reachable in this
// environment. Two things follow from that:
// - Media/content-picker fields (heroImage, tabIcon, benefitCardIcon,
//   ebankItimage, testimonialAvatar) are mapped with the same mapMediaUrl
//   shape already confirmed for topNavigation/bottomNavigation's own media
//   fields - that part is on solid ground.
// - `structureBeCardDescription.link` is the one field on this page that's
//   a plain content/media picker (IPublishedContent) rather than a Link
//   picker (DeliveryLink) - see mapContentPickerUrl's own comment.
// If the real API disagrees with either of the above, expect the shoulder
// tiles' "read more" links to be the first thing that's wrong.

const HERO_HEADER_EXPAND = 'properties[items[properties[$all]],$all]';
const HERO_SHOULDER_EXPAND = 'properties[items[properties[items[properties[$all]],$all]],$all]';
const TESTIMONIALS_EXPAND = 'properties[testimonialItems[properties[$all]],$all]';

function mapHeroSlide(props: Record<string, unknown>): HeroSlide {
  const link = mapLinks(props.heroRedirectAction)[0];

  return {
    imageUrl: mapMediaUrl(props.heroImage),
    title: typeof props.heroTitle === 'string' ? props.heroTitle : '',
    description: typeof props.heroProductDescription === 'string' ? props.heroProductDescription : '',
    buttonLabel: typeof props.heroButtonLabel === 'string' ? props.heroButtonLabel : null,
    buttonUrl: link && link.url !== '#' ? link.url : null,
  };
}

// `link` on structureBeCardDescription is a single content/media picker
// (IPublishedContent per HomeShoulderItem.generated.cs), not a Link picker
// like every other link-shaped field on this page - so it doesn't have the
// guaranteed {url,title,target} shape DeliveryLink does. Content-item
// references in the Delivery API are documented to expose their page route
// as `route.path`; this also falls back to a plain `.url` in case it comes
// back closer to a media reference instead. Unverified against a live
// response either way.
function mapContentPickerUrl(value: unknown): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (!first || typeof first !== 'object') return null;

  const ref = first as { url?: unknown; route?: { path?: unknown } };
  if (typeof ref.route?.path === 'string') return ref.route.path;
  if (typeof ref.url === 'string') return ref.url;
  return null;
}

function mapShoulderCard(props: Record<string, unknown>): ShoulderCard {
  const title = typeof props.benefitCardTitle === 'string' ? props.benefitCardTitle : '';

  return {
    iconUrl: mapMediaUrl(props.benefitCardIcon),
    // The icon media item's own "altTag" property would need a second
    // level of `expand` to reach reliably (unverified whether media items
    // even need that the same way content items do) - the card's own
    // title is a reasonable, always-available stand-in.
    iconAlt: title,
    title,
    description: typeof props.benefitCardDescription === 'string' ? props.benefitCardDescription : '',
    linkUrl: mapContentPickerUrl(props.link),
  };
}

function mapShoulderTab(props: Record<string, unknown>): ShoulderTab {
  return {
    tabName: typeof props.tabName === 'string' ? props.tabName : '',
    cards: mapBlocks(props.items, mapShoulderCard),
  };
}

function mapContentSection(props: Record<string, unknown>): ContentSectionData {
  const links = mapLinks(props.sectionLink);
  const link = links.find((candidate) => candidate.url !== '#') ?? links[0];
  const title = typeof props.ebankITTitle === 'string' ? props.ebankITTitle : '';

  return {
    title,
    subtitle: mapRichText(props.ebankITContent),
    description: mapRichText(props.sectionHeroBodyDescription),
    imageUrl: mapMediaUrl(props.ebankItimage),
    imageAlt: title,
    linkLabel: link && link.url !== '#' ? link.title : null,
    linkUrl: link && link.url !== '#' ? link.url : null,
  };
}

function mapTestimonialItem(props: Record<string, unknown>): TestimonialItem {
  return {
    avatarUrl: mapMediaUrl(props.testimonialAvatar),
    story: typeof props.testimonialStory === 'string' ? props.testimonialStory : '',
    name: typeof props.testimonialName === 'string' ? props.testimonialName : '',
  };
}

export async function fetchHomePage(signal?: AbortSignal): Promise<HomePageData> {
  const [heroHeaderNode, heroShoulderNode, heroBodyNode, testimonialsNode] = await Promise.all([
    fetchOne(`?filter=contentType:heroHeaderHome&expand=${HERO_HEADER_EXPAND}&take=1`, signal),
    fetchOne(`?filter=contentType:heroShoulderHome&expand=${HERO_SHOULDER_EXPAND}&take=1`, signal),
    fetchOne('?filter=contentType:heroBody&take=1', signal),
    fetchOne(`?filter=contentType:testimonials&expand=${TESTIMONIALS_EXPAND}&take=1`, signal),
  ]);

  // heroBody's own properties aren't used by PageHome.cshtml - only its 4
  // structureBodyTextWithImageAndLink children are (order 0-3: get loans,
  // MyWORLD banking, support, blog heading).
  const bodySections = heroBodyNode
    ? await fetchContent(`?fetch=children:${heroBodyNode.id}&expand=properties[$all]&take=4`, signal)
    : [];
  const bodySectionProps = bodySections.map((item) => item.properties);

  const blogHeadingProps = bodySectionProps[3];
  const blogHeading: BlogSectionHeading | null = blogHeadingProps
    ? {
        title: typeof blogHeadingProps.ebankITTitle === 'string' ? blogHeadingProps.ebankITTitle : '',
        description: mapRichText(blogHeadingProps.ebankITContent),
        viewMoreUrl: mapLinks(blogHeadingProps.sectionLink)[0]?.url ?? null,
      }
    : null;

  return {
    hero: heroHeaderNode ? mapBlocks(heroHeaderNode.properties.items, mapHeroSlide) : [],
    shoulder: heroShoulderNode ? mapBlocks(heroShoulderNode.properties.items, mapShoulderTab) : [],
    sections: bodySectionProps.slice(0, 3).map(mapContentSection),
    blogHeading,
    testimonialsHeading:
      typeof testimonialsNode?.properties.testimonialHeading === 'string'
        ? testimonialsNode.properties.testimonialHeading
        : '',
    testimonials: testimonialsNode
      ? mapBlocks(testimonialsNode.properties.testimonialItems, mapTestimonialItem)
      : [],
  };
}

// ============================================================
// BLOG (blogLanding / blog / blogDetailsElements)
// ============================================================

const BLOG_DESCRIPTION_MAX_LENGTH = 85;

// Mirrors HtmlStringUtilities.Truncate(text, 85, addElipsis: true,
// treatTagsAsContent: false) in PageHome.cshtml (line 358): cut at the
// last word boundary before the limit, append an ellipsis.
function truncateBlogDescription(text: string): string {
  if (text.length <= BLOG_DESCRIPTION_MAX_LENGTH) return text;

  const cut = text.slice(0, BLOG_DESCRIPTION_MAX_LENGTH);
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > 0 ? lastSpace : BLOG_DESCRIPTION_MAX_LENGTH)}…`;
}

/**
 * Fetches the 3 latest posts shown in the homepage's blog teaser section.
 * Ported from PageHome.cshtml lines 318-373, which reads a hardcoded
 * content id (`Umbraco.Content(2855)`) instead of a contentType filter -
 * home.cshtml's own commented-out predecessor of that same line
 * (`//Umbraco.TypedContentSingleAtXPath("//blogLanding")`) confirms 2855 is
 * the blogLanding node, so this looks it up by contentType instead: content
 * ids aren't stable across environments/database restores the way
 * contentType aliases are, and the Delivery API can't take an internal int
 * id as a filter anyway.
 *
 * Walks blogLanding -> blog (latest 3) -> blogDetailsElements (blog's own
 * single child, inferred - not confirmed against a live tree) ->
 * heroHeaderBlogDetail (image) + heroBodyBlogDetail (title/
 * introductionDescription/blogDate), per master.cshtml's own
 * IsDocumentType walk and a repo-wide check for which generated model
 * actually has `introductionDescription` (only HeroBodyBlogDetail does).
 * Not verified against a live response. Best-effort: swallows its own
 * errors so a schema mismatch here doesn't break the rest of the homepage.
 */
export async function fetchLatestBlogPosts(signal?: AbortSignal): Promise<BlogPost[]> {
  try {
    const blogLanding = await fetchOne('?filter=contentType:blogLanding&take=1', signal);
    if (!blogLanding) return [];

    const blogs = await fetchContent(`?fetch=children:${blogLanding.id}&take=3`, signal);

    const posts = await Promise.all(
      blogs.map(async (blog): Promise<BlogPost | null> => {
        const detailElementsNode = await fetchOne(`?fetch=children:${blog.id}&take=1`, signal);
        if (!detailElementsNode) return null;

        const elements = await fetchContent(
          `?fetch=children:${detailElementsNode.id}&expand=properties[$all]&take=10`,
          signal,
        );
        const heroHeader = elements.find((el) => el.contentType === 'heroHeaderBlogDetail');
        const heroBody = elements.find((el) => el.contentType === 'heroBodyBlogDetail');
        if (!heroBody || typeof heroBody.properties.title !== 'string') return null;

        return {
          title: heroBody.properties.title,
          description:
            typeof heroBody.properties.introductionDescription === 'string'
              ? truncateBlogDescription(heroBody.properties.introductionDescription)
              : '',
          imageUrl: heroHeader ? mapMediaUrl(heroHeader.properties.image) : '',
          url: blog.route?.path ?? '#',
          publishedDate:
            typeof heroBody.properties.blogDate === 'string' ? heroBody.properties.blogDate : '',
        };
      }),
    );

    return posts.filter((post): post is BlogPost => post !== null);
  } catch {
    return [];
  }
}
