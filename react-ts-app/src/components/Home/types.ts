// Shapes for the homepage content, ported from PageHome.cshtml's five
// homePageElements children: HeroHeaderHome (hero carousel),
// HeroShoulderHome (Bank/Borrow/Invest/Insure tiles), HeroBody's four
// StructureBodyTextWithImageAndLink children (the "Section 1-4" blocks -
// only the first three render a body block; the fourth is the blog
// section's own heading), and Testimonials.

export interface HeroSlide {
  imageUrl: string;
  title: string;
  description: string;
  buttonLabel: string | null;
  buttonUrl: string | null;
}

export interface ShoulderCard {
  iconUrl: string;
  iconAlt: string;
  title: string;
  description: string;
  linkUrl: string | null;
}

export interface ShoulderTab {
  tabName: string;
  cards: ShoulderCard[];
}

export interface ContentSectionData {
  title: string;
  subtitle: string;
  description: string;
  imageUrl: string;
  imageAlt: string;
  linkLabel: string | null;
  linkUrl: string | null;
}

export interface BlogSectionHeading {
  title: string;
  description: string;
  viewMoreUrl: string | null;
}

export interface TestimonialItem {
  avatarUrl: string;
  // testimonialStory is a plain string property (not rich text) per the
  // generated Umbraco model, so it renders as escaped text - unlike the
  // *Content/*Description fields elsewhere on this page.
  story: string;
  name: string;
}

export interface HomePageData {
  hero: HeroSlide[];
  shoulder: ShoulderTab[];
  // heroBodySections[0], [1], [2] in PageHome.cshtml - "Get loans",
  // "MyWORLD banking", "Support" respectively. Always exactly these three
  // in this order on the live site; indexed access in Home.tsx mirrors the
  // Razor view's own getLoanCount/myWorldCount/supportCount == 0/1/2 checks.
  sections: ContentSectionData[];
  blogHeading: BlogSectionHeading | null;
  testimonialsHeading: string;
  testimonials: TestimonialItem[];
}

export interface BlogPost {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
  publishedDate: string;
}
