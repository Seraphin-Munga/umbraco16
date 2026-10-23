import type { ChangeEvent, ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { Button } from '../Button/Button';
import { Input } from '../Input/Input';
import { Select } from '../Input/Select';
import { BlobImage } from '../Image/BlobImage';
import { formatRand } from '../../../utils/loanCalculator';

// Same public calculator service (and request headers) the legacy Razor
// investment pages call from the browser - see wwwroot/scripts/
// GoogleCharts/api.js + index.js. It answers CORS with
// `Access-Control-Allow-Origin: *`, so no proxy is needed.
const CALCULATOR_API = 'https://mobilev5.africanbank.co.za/public/calculator';
const CALCULATOR_HEADERS = {
  'ITSAPP-DEVICE': 'CMS',
  'ITSAPP-LANG': 'en-GB',
  'ITSAPP-DEVICEID': '',
  'Content-Type': 'application/json',
};

export type InvestmentProduct = 'Fixed' | 'Notice' | 'Access' | 'TxFree';

interface TermOption {
  productCode: string;
  label: string;
}

interface FrequencyOption {
  key: string;
  label: string;
}

interface ProductOptions {
  terms: TermOption[];
  frequencies: FrequencyOption[];
}

const PRODUCT_LABELS: Record<InvestmentProduct, string> = {
  Fixed: 'Fixed Deposit',
  Notice: 'Notice Deposit',
  Access: 'Access Accumulator',
  TxFree: 'Tax Free',
};

// The legacy page's own server-rendered option lists - used until (or
// instead of, if it fails) the service's own /terms response arrives.
const FALLBACK_OPTIONS: Record<InvestmentProduct, ProductOptions> = {
  Fixed: {
    terms: [3, 6, 12, 24, 36, 60].map((months) => ({
      productCode: `IFD${String(months).padStart(2, '0')}`,
      label: `${months} MONTHS`,
    })),
    frequencies: [
      { key: 'M0131', label: 'Monthly' },
      { key: 'M0631', label: 'Semi-annually' },
      { key: 'M1231', label: 'Annually' },
      { key: 'M9999', label: 'Expiry' },
    ],
  },
  Notice: {
    terms: [7, 32, 90].map((days) => ({ productCode: `IND${String(days).padStart(2, '0')}`, label: `${days} DAYS` })),
    frequencies: [
      { key: 'M0131', label: 'Monthly' },
      { key: 'M9999', label: 'Expiry' },
    ],
  },
  Access: {
    terms: [{ productCode: 'IAA24', label: '24 MONTHS' }],
    frequencies: [{ key: 'M9999', label: 'Expiry' }],
  },
  TxFree: {
    terms: [{ productCode: 'ITN01', label: '1 DAYS' }],
    frequencies: [{ key: 'M9999', label: 'Expiry' }],
  },
};

interface ApiResponse<T> {
  Result: T | null;
}

interface TermsResult {
  Terms?: { ProductCode: string; TermValue: string | number; Timeframe: string }[];
  PayoutFrequencies?: { Key: string; Value?: string }[];
}

async function postCalculator<T>(type: string, body: unknown): Promise<T> {
  const response = await fetch(`${CALCULATOR_API}/${type}`, {
    method: 'POST',
    headers: CALCULATOR_HEADERS,
    body: JSON.stringify(body),
  });
  const json = (await response.json()) as ApiResponse<T>;
  if (!response.ok || !json.Result) throw new Error(`Calculator ${type} failed`);
  return json.Result;
}

const PILL_CLASS =
  'h-[50px] w-full rounded-full border-0 bg-white px-5 text-base text-black outline-none placeholder:text-brand-muted focus:ring-2 focus:ring-brand-focus';

const LABEL_CLASS = 'mb-2 block text-left text-lg font-bold text-white';

function parseRand(value: string): number {
  return Number(value.replace(/[^\d.]/g, '')) || 0;
}

export interface InvestmentCalculatorProps {
  heading?: string;
  defaultProduct?: InvestmentProduct;
  imageUrl?: string;
  imageAlt?: string;
  disclaimer?: string;
  openAccountUrl?: string;
}

// Investment calculator (investmentCalculatorBlock, CMS-driven - see
// cms/renderPageSection.tsx) - ported from the legacy investment pages'
// "Fixed/Notice Deposit Calculator": amount, investment type, then the
// selected product's own term/notice period, payout frequency and (Notice/
// Tax Free) monthly top-up, posted to the same calculator service.
export function InvestmentCalculator({
  heading = 'Investment Calculator',
  defaultProduct = 'Fixed',
  imageUrl,
  imageAlt = '',
  disclaimer,
  openAccountUrl = 'https://ib.africanbank.co.za/',
}: InvestmentCalculatorProps) {
  const [options, setOptions] = useState(FALLBACK_OPTIONS);
  const [product, setProduct] = useState<InvestmentProduct>(defaultProduct);
  const [amountText, setAmountText] = useState('R 500.00');
  const [monthlyText, setMonthlyText] = useState('');
  const [productCode, setProductCode] = useState(FALLBACK_OPTIONS[defaultProduct].terms[0].productCode);
  const [frequency, setFrequency] = useState(FALLBACK_OPTIONS[defaultProduct].frequencies[0].key);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [finalAmount, setFinalAmount] = useState<number | null>(null);

  // Swap in the service's own live term/frequency lists where it answers -
  // a failure for any product just keeps that product's fallback list.
  useEffect(() => {
    let cancelled = false;

    (Object.keys(FALLBACK_OPTIONS) as InvestmentProduct[]).forEach((key) => {
      postCalculator<TermsResult>('terms', { product: key })
        .then((result) => {
          if (cancelled || !result.Terms?.length) return;
          setOptions((current) => ({
            ...current,
            [key]: {
              terms: result.Terms!.map((term) => ({
                productCode: term.ProductCode,
                label: `${term.TermValue}${term.Timeframe === 'M' ? ' MONTHS' : ' DAYS'}`,
              })),
              frequencies: (result.PayoutFrequencies ?? [])
                .filter((item) => item.Value !== undefined)
                .map((item) => ({ key: item.Key, label: item.Value! })),
            },
          }));
        })
        .catch(() => undefined);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  function selectProduct(next: InvestmentProduct) {
    setProduct(next);
    setProductCode(options[next].terms[0]?.productCode ?? '');
    setFrequency(options[next].frequencies[0]?.key ?? '');
    setMonthlyText('');
    setStatus('idle');
  }

  async function calculate() {
    setStatus('loading');

    try {
      const result = await postCalculator<{ FinalAmount: number }>('calculate', {
        product,
        productCode,
        frequency,
        amount: Math.max(500, parseRand(amountText)),
        noticePeriod: product === 'Notice' ? productCode : null,
        monthlyAmountThereafter: product === 'Notice' || product === 'TxFree' ? parseRand(monthlyText) || null : null,
      });
      setFinalAmount(result.FinalAmount);
      setStatus('done');
    } catch {
      setStatus('error');
    }
  }

  const termLabel = product === 'Notice' ? 'Notice Period *' : 'For How Long Do You Want To Invest?';
  const selectedTerm = options[product].terms.find((term) => term.productCode === productCode)?.label ?? '';

  const select = (id: string, value: string, onChange: (value: string) => void, items: { value: string; label: string }[]) => (
    <div className="relative mb-6">
      <Select
        id={id}
        className={`${PILL_CLASS} appearance-none pr-12 text-left`}
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) => onChange(event.target.value)}
      >
        {items.map((item) => (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        ))}
      </Select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-black" />
    </div>
  );

  const form: ReactNode = (
    <div>
      <label htmlFor="investment-amount" className={LABEL_CLASS}>
        How Much Do You Want To Invest?
      </label>
      <Input
        id="investment-amount"
        className={`${PILL_CLASS} mb-6 bg-white/40 text-2xl font-black`}
        type="text"
        inputMode="decimal"
        value={amountText}
        onChange={(event) => setAmountText(event.target.value)}
        onBlur={() => setAmountText(formatRand(Math.max(500, parseRand(amountText))))}
      />

      <label htmlFor="investment-type" className={LABEL_CLASS}>
        Which Investment Type Do You Want?
      </label>
      {select('investment-type', product, (value) => selectProduct(value as InvestmentProduct),
        (Object.keys(PRODUCT_LABELS) as InvestmentProduct[]).map((key) => ({ value: key, label: PRODUCT_LABELS[key] })))}

      {(product === 'Notice' || product === 'TxFree') && (
        <>
          <label htmlFor="investment-monthly" className={LABEL_CLASS}>
            {product === 'Notice' ? 'Monthly Investment Thereafter' : 'Monthly Investment Amount'}
          </label>
          <Input
            id="investment-monthly"
            className={`${PILL_CLASS} mb-6`}
            type="text"
            inputMode="decimal"
            placeholder={product === 'Notice' ? 'R 0.00' : 'Max is R3 000.00'}
            value={monthlyText}
            onChange={(event) => setMonthlyText(event.target.value)}
            onBlur={() => monthlyText && setMonthlyText(formatRand(parseRand(monthlyText)))}
          />
        </>
      )}

      {product !== 'TxFree' && (
        <>
          <label htmlFor="investment-term" className={LABEL_CLASS}>
            {termLabel}
          </label>
          {select('investment-term', productCode, setProductCode,
            options[product].terms.map((term) => ({ value: term.productCode, label: term.label })))}
        </>
      )}

      <label htmlFor="investment-frequency" className={LABEL_CLASS}>
        Interest Payout Frequency *
      </label>
      {select('investment-frequency', frequency, setFrequency,
        options[product].frequencies.map((item) => ({ value: item.key, label: item.label })))}

      <div className="mt-8 text-left">
        <Button onClick={calculate} disabled={status === 'loading'} className="normal-case">
          {status === 'done' ? 'Re-calculate' : 'Calculate'}
        </Button>
      </div>
    </div>
  );

  let results: ReactNode;

  if (status === 'loading') {
    results = <p className="text-center text-sm text-white">Calculating, please wait...</p>;
  } else if (status === 'done' && finalAmount !== null) {
    results = (
      <div className="rounded-[20px] bg-[#002552] p-10 text-center text-white shadow-brand-card">
        <p className="mb-2 text-lg font-bold">{PRODUCT_LABELS[product]}</p>
        <p className="text-sm">Your estimated payout</p>
        <p className="my-4 text-4xl font-black text-brand-green">{formatRand(finalAmount)}</p>
        {selectedTerm && product !== 'TxFree' && <p className="mb-6 text-sm">After {selectedTerm.toLowerCase()}</p>}
        <Button href={openAccountUrl}>Open an account</Button>
      </div>
    );
  } else if (status === 'error') {
    results = (
      <div className="rounded-[20px] bg-white/90 p-8 text-center text-brand-navy">
        <p className="font-bold">The calculator is unavailable right now.</p>
        <p className="mt-2 text-sm">Please try again later, or call us on 0860 49 49 40.</p>
      </div>
    );
  } else {
    results = imageUrl ? <BlobImage src={imageUrl} alt={imageAlt} /> : null;
  }

  return (
    <section id="myCalculator" className="bg-brand-steel py-12 md:py-20" aria-labelledby="investment-calculator-heading">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <h2 id="investment-calculator-heading" className="mb-8 text-[28px] font-bold text-white md:text-[42px]">
          {heading}
        </h2>
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-[5fr_7fr] md:gap-16">
          {form}
          <div className="flex items-center justify-center">{results}</div>
        </div>
        {disclaimer && <p className="mt-10 text-sm text-white">{disclaimer}</p>}
      </div>
    </section>
  );
}
