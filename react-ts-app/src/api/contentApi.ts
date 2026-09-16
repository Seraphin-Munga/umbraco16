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
}

interface RawContentResponse {
  total: number;
  items: RawContentItem[];
}

export interface TopNavigation {
  menu: MenuInfoItem[];
  registerLoginMarkup: string;
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

/**
 * Fetches the site's `topNavigation` content item: its `menuInfo` block list
 * (normalized into a clean array) and the CMS-authored `registerLogin`
 * rich-text markup for the register/login modal. Requires
 * Umbraco:CMS:DeliveryApi:Enabled + PublicAccess (already true in
 * appsettings.json) so no API key is needed.
 */
export async function fetchTopNavigation(signal?: AbortSignal): Promise<TopNavigation> {
  const [topNavigation] = await fetchContent(
    '?filter=contentType:topNavigation&expand=properties[$all]&take=1',
    signal,
  );

  if (!topNavigation) {
    return { menu: [], registerLoginMarkup: '' };
  }

  return {
    menu: mapBlocks(topNavigation.properties.menuInfo, mapMenuInfoItem),
    registerLoginMarkup: mapRichText(topNavigation.properties.registerLogin),
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
