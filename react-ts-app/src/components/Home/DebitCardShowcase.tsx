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
    <section className="section-rounded-edge-2">
      <div className="bg-gradient-container">
        <div className="image-skew zoom-in visible">
          <img className="d-block" src={imageUrl} alt={alt} />
        </div>
      </div>
    </section>
  );
}
