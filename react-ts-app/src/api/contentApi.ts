// Client for Umbraco's Content Delivery API (Umbraco.CMS.Global.DeliveryApi in
// appsettings.json). Shapes below mirror the property aliases read directly in
// Navigation.cshtml (topNavigation.MenuInfo -> menuName / menus -> categoryName,
// link -> pageSection / menuList / menuDescription), so this is the React
// equivalent of that Razor view's untyped IPublishedContent walk.

export interface DeliveryLink {
  url: string;
  title: string;
  target: string | null;
}

export interface MenuLinkItem {
  pageSection: string | null;
  menuList: DeliveryLink[];
  menuDescription: string | null;
}

export interface MenuCategoryItem {
  categoryName: string | null;
  link: MenuLinkItem[];
}

export interface MenuInfoItem {
  menuName: DeliveryLink[];
  menus: MenuCategoryItem[];
}

interface RawBlockItem {
  content?: {
    contentType?: string;
    properties?: Record<string, unknown>;
  };
}

interface RawContentItem {
  contentType: string;
  properties: Record<string, unknown>;
}

interface RawContentResponse {
  total: number;
  items: RawContentItem[];
}

const API_BASE = (import.meta.env.VITE_UMBRACO_API_BASE_URL ?? '').replace(/\/+$/, '');
const DELIVERY_API_CONTENT_PATH = '/umbraco/delivery/api/v1/content';

function mapBlocks<T>(
  value: unknown,
  map: (props: Record<string, unknown>) => T,
): T[] {
  if (!Array.isArray(value)) return [];

  return (value as RawBlockItem[])
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

function mapMenuLinkItem(props: Record<string, unknown>): MenuLinkItem {
  return {
    pageSection: typeof props.pageSection === 'string' ? props.pageSection : null,
    menuList: mapLinks(props.menuList),
    menuDescription: typeof props.menuDescription === 'string' ? props.menuDescription : null,
  };
}

function mapMenuCategoryItem(props: Record<string, unknown>): MenuCategoryItem {
  return {
    categoryName: typeof props.categoryName === 'string' ? props.categoryName : null,
    link: mapBlocks(props.link, mapMenuLinkItem),
  };
}

function mapMenuInfoItem(props: Record<string, unknown>): MenuInfoItem {
  return {
    menuName: mapLinks(props.menuName),
    menus: mapBlocks(props.menus, mapMenuCategoryItem),
  };
}

/**
 * Fetches the site's `topNavigation` content item and returns its `MenuInfo`
 * block list, normalized into a clean tree. Requires
 * Umbraco:CMS:DeliveryApi:Enabled + PublicAccess (already true in
 * appsettings.json) so no API key is needed.
 */
export async function fetchTopNavigation(signal?: AbortSignal): Promise<MenuInfoItem[]> {
  const url =
    `${API_BASE}${DELIVERY_API_CONTENT_PATH}` +
    `?filter=contentType:topNavigation&expand=properties[$all]&take=1`;

  const response = await fetch(url, {
    headers: { Accept: 'application/json' },
    signal,
  });

  if (!response.ok) {
    throw new Error(
      `Umbraco Content Delivery API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const data: RawContentResponse = await response.json();
  const topNavigation = data.items?.[0];

  if (!topNavigation) {
    return [];
  }

  return mapBlocks(topNavigation.properties.MenuInfo, mapMenuInfoItem);
}
