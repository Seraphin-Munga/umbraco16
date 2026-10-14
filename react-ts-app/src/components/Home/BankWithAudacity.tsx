import type { ReactNode } from 'react';
import { Button } from '../ui/Button/Button';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from '../ui/card';


export interface AudacityCard {
  id: string;
  title: string;
  description: string;
  buttonLabel: string;
  buttonUrl: string;
}

interface BankWithAudacityProps {
  cards: AudacityCard[];
  heading?: ReactNode;
}

export function BankWithAudacity({ cards, heading }: BankWithAudacityProps) {
  return (
    <section className="my-[30px]" aria-labelledby="bank-with-audacity">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h1
          id="bank-with-audacity"
          className="mb-[30px] text-[20px] leading-none font-extralight text-brand-ink max-[768px]:text-left sm:text-[65px]"
          role="heading"
          aria-level={1}
        >
          {heading}
        </h1>

        <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 md:grid-cols-3" role="list">
          {cards.map((card) => (
            <Card
              className="h-[170px] justify-between rounded-[29px] border-[#f2f2f2] bg-card py-0 shadow-[0_2px_15px_rgba(50,50,105,0.1),0_1px_1px_rgba(0,0,0,0.05)] ring-0 [--card-spacing:--spacing(5)]"
              role="region"
              aria-labelledby={`card-${card.id}`}
              key={card.id}
            >
              <CardHeader className="gap-0 px-(--card-spacing) pt-(--card-spacing)">
                <CardTitle
                  id={`card-${card.id}`}
                  className="font-semibold text-brand-ink"
                >
                  {card.title}
                </CardTitle>
              </CardHeader>
              <CardContent aria-label="Description">
                <p className="text-sm text-brand-ink">{card.description}</p>
              </CardContent>
              <CardFooter className="border-t-0 bg-transparent pb-(--card-spacing)">
                <Button
                  href={card.buttonUrl}
                  variant="brand-link"
                  role="button"
                  aria-label={`Apply now for a ${card.title}`}
                >
                  {card.buttonLabel}
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
