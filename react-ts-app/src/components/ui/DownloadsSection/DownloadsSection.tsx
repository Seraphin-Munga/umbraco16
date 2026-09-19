export interface DownloadItem {
  description: string;
  fileUrl: string;
}

export interface DownloadsSectionProps {
  heading: string;
  items: DownloadItem[];
}

// "More to read" style downloads list (downloadsSectionBlock, CMS-driven,
// any page - see cms/renderPageSection.tsx).
export function DownloadsSection({ heading, items }: DownloadsSectionProps) {
  return (
    <section className="section pb-40 pt-40 bg-grey-60">
      <div className="container">
        <div className="row d-flex align-items-center row-change md-text-center">
          <div className="col-xl-6 col-lg-6 col-md-6">
            <h1 className="color-brand-1 mt-15 mb-20">{heading}</h1>
          </div>
          <div className="col-xl-6 col-lg-6 col-md-6" />
        </div>

        <div className="campaign-list">
          <ul>
            {items.map((item, itemIndex) => (
              <li key={item.description}>
                <div className={`row no-gutter download-item${itemIndex === 0 ? ' first' : ''}`}>
                  <div className="col-sm-9">
                    <div className="download-descr">{item.description}</div>
                  </div>
                  <div className="col-sm-3">
                    <a href={item.fileUrl} target="_blank" rel="noreferrer" className="download-btn">
                      Download
                    </a>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
