// Client for Umbraco's Content Delivery API (Umbraco.CMS.Global.DeliveryApi in
// appsettings.json). Shapes below are confirmed against a live response from
// this backend's topNavigation content item, NOT just inferred from
// Navigation.cshtml's untyped IPublishedContent walk - notably, the real
// `menuInfo` items (contentType "nCMenuCategory") only carry menuDescription
// + menuName; there's no nested "menus" categories/products block despite
// the Razor view having a branch that reads one.

export interface DeliveryLink {
  url: string;
  title: string;
  target: string | null;
}

export interface MenuInfoItem {
  menuDescription: string | null;
  menuName: DeliveryLink[];
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

function mapMenuInfoItem(props: Record<string, unknown>): MenuInfoItem {
  return {
    menuDescription: typeof props.menuDescription === 'string' ? props.menuDescription : null,
    menuName: mapLinks(props.menuName),
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
    return { menu: [], registerLoginMarkup: '' };
  }

  return {
    menu: mapBlocks(topNavigation.properties.menuInfo, mapMenuInfoItem),
    registerLoginMarkup: mapRichText(topNavigation.properties.registerLogin),
  };
}
