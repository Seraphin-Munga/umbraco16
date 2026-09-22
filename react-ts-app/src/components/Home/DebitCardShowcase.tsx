// Ported from the gradient-background debit card showcase section of the
// current live home page markup - a single skewed product image. Content
// comes from the CMS-managed homePage node (see contentApi.ts's
// fetchHomePageSections) - no hardcoded fallback image.
interface DebitCardShowcaseProps {
  imageUrl?: string;
  alt?: string;
}

export function DebitCardShowcase({ imageUrl, alt }: DebitCardShowcaseProps) {
  if (!imageUrl) return null;

  return (
    <section className="flex w-full items-center pb-10 min-[769px]:min-h-[350px]">
      <div className="m-[15px] flex h-[115px] w-full items-center justify-center rounded-[30px] bg-[linear-gradient(152deg,rgba(0,43,96,1)_22%,rgba(4,24,49,1)_50%)] min-[769px]:h-[370px]">
        <div className="flex h-[113px] w-full -rotate-[23deg] items-center justify-center min-[769px]:h-[350px] min-[769px]:w-[600px] min-[769px]:justify-normal">
          <img className="block max-[768px]:max-w-[50%]" src={imageUrl} alt={alt} />
        </div>
      </div>
    </section>
  );
}
