import { LazyImage } from '../Image/LazyImage';

export interface TechCategory {
  iconUrl: string;
  label: string;
}

export interface TechHeroProps {
  heading: string;
  highlightHeading: string;
  subheading: string;
  categories: TechCategory[];
  background?: string;
}

// Tech Deals' own top banner (techHeroBlock, CMS-driven, Tech Deals page
// only - see cms/renderPageSection.tsx) - "Welcome to Tech Deals" beside a
// row of category tiles (Handset/Tablets/Laptops/...), each its own small
// icon-over-label card, the icon itself a real Media Picker upload (see
// techCategoryItem's own iconImage field) rather than a built-in icon set.
// No equivalent elsewhere in the app; closest existing shape is
// HeroSplit.tsx's two-column layout, but that's a single photo on the
// second column, not a repeating tile list.
export function TechHero({ heading, highlightHeading, subheading, categories, background = '' }: TechHeroProps) {
  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col items-start gap-10 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-[28px] leading-tight font-extralight text-brand-ink sm:text-[42px]">
              <span className="font-bold">{heading}</span>
              <br />
              {highlightHeading}
            </h1>
            {subheading && <p className="mt-[10px] text-base text-brand-blue">{subheading}</p>}
          </div>

          {categories.length > 0 && (
            <div className="flex flex-wrap gap-4">
              {categories.map((category, index) => (
                <div
                  key={`${category.label}-${index}`}
                  className="mt-[30px] mb-[10px] flex h-[200px] w-[150px] flex-col items-center p-[8px] text-center"
                >
                  <span className="text-[12px] font-bold text-[#002963] [font-family:'Montserrat',sans-serif]">
                    {category.label}
                  </span>
                  <div className="mt-[10px] flex size-28 items-center justify-center rounded-[25px] bg-[#f7f7f7] p-[16px]">
                    {category.iconUrl && (
                      <LazyImage className="size-20 object-contain" src={category.iconUrl} alt="" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
