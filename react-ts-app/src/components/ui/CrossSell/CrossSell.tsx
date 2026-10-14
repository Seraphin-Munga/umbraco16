import { ChevronRight } from 'lucide-react';
import type { AudacityCard } from '../../Home/BankWithAudacity';
import { LazyImage } from '../Image/LazyImage';
import { Card, CardContent } from '../card';

export interface CrossSellProps {
  heading: string;
  cards: AudacityCard[];
  imageUrl?: string;
  background?: string;
}


export function CrossSell({ heading, cards, imageUrl, background = '' }: CrossSellProps) {
  return (
    <section className={`flex min-h-[800px] w-full items-center py-10 ${background}`}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className={`grid grid-cols-1 items-center gap-10 ${imageUrl ? 'md:grid-cols-2 md:gap-16' : ''}`}>
          <div>
            <h1 className="mt-[15px] mb-[20px] text-brand-ink">{heading}</h1>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {cards.map((card) => (
                <Card
                  className="rounded-[30px] border border-brand-mist ring-0 transition-shadow hover:shadow-brand-hover [--card-spacing:--spacing(5)]"
                  key={card.id}
                >
                  <CardContent>
                    <h4 className="text-brand-lime">{card.title}</h4>
                    <p className="mb-[15px] text-base leading-[1.2] text-brand-slate">{card.description}</p>
                    <a
                      href={card.buttonUrl}
                      className="flex size-10 items-center justify-center rounded-full bg-white text-brand-ink shadow-brand-icon transition-colors hover:bg-brand-lime hover:text-white"
                      aria-label={card.buttonLabel || card.title}
                    >
                      <ChevronRight className="size-5" />
                    </a>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          {imageUrl && (
            <div>
              <LazyImage className="block w-full" src={imageUrl} alt="" />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
