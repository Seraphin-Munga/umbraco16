export interface DownloadItem {
  description: string;
  fileUrl: string;
  buttonText: string;
}

export interface DownloadsSectionProps {
  heading: string;
  items: DownloadItem[];
  background?: string;
}


export function DownloadsSection({ heading, items, background = 'bg-brand-mist' }: DownloadsSectionProps) {
  return (
    <section className={`py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1 className="mt-[15px] mb-[20px] text-brand-ink font-bold! text-[42px]! leading-[1.2]! [font-family:'Montserrat',sans-serif]!">
          {heading}
        </h1>

        <ul>
          {items.map((item) => (
            <li key={item.description} className="border-b border-brand-line py-6 first:border-t">
              <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-base leading-[1.2] text-brand-slate sm:w-3/4">{item.description}</div>
                <div className="sm:w-1/4 sm:text-right">
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block rounded-full bg-brand-lime px-6 py-2 text-sm font-semibold text-white no-underline transition-colors hover:bg-brand-navy"
                  >
                    {item.buttonText}
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
