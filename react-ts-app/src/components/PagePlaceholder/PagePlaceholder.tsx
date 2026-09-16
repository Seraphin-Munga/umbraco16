import './PagePlaceholder.css';

// Stub content for a page linked from the header's mega-menu but not yet
// ported (see src/routes/personalMenuPages.ts). Uses only classes already
// loaded globally via index.html's vendor stylesheets (.color-brand-1,
// .font-md, .mtb-120, .md-text-center) rather than Home.css, since this
// renders on routes Home.tsx never mounts on.
interface PagePlaceholderProps {
  title: string;
  description: string;
}

export function PagePlaceholder({ title, description }: PagePlaceholderProps) {
  return (
    <div id="page">
      <div id="content">
        <main>
          <section className="mtb-120">
            <div className="container">
              <div className="row md-text-center">
                <div className="col-md-12">
                  <h1 className="color-brand-1 page-placeholder-title">{title}</h1>
                  <p className="font-md color-brand-1">{description}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
