// Ported from the gradient-background debit card showcase section of the
// current live home page markup - a single skewed product image. Static
// content passed as props with defaults so it stays reusable.
interface DebitCardShowcaseProps {
  imageUrl?: string;
  alt?: string;
}

export function DebitCardShowcase({
  imageUrl = 'https://www.africanbank.co.za/media/feyntwey/mw_pm_debit.png',
  alt = '/media/feyntwey/mw_pm_debit.png',
}: DebitCardShowcaseProps) {
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
