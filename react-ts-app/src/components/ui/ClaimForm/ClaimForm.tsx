import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

// Same headers the legacy Razor master page sets on every AJAX.request
// (masterPublic.cshtml) - see CALCULATOR_HEADERS in InvestmentCalculator.tsx.
const SUBMIT_HEADERS = {
  'ITSAPP-DEVICE': 'CMS',
  'ITSAPP-LANG': 'en-GB',
  'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
};

// jQuery's $.param encoding (what the legacy mobile.js AJAX.request posts),
// including its `ExtendedProperties[0][Key]=...` form for nested arrays.
function encodeForm(value: unknown, prefix = '', params = new URLSearchParams()): URLSearchParams {
  if (Array.isArray(value)) {
    value.forEach((item, index) => encodeForm(item, `${prefix}[${index}]`, params));
  } else if (value !== null && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => encodeForm(item, prefix ? `${prefix}[${key}]` : key, params));
  } else {
    params.append(prefix, value === null || value === undefined ? '' : String(value));
  }
  return params;
}

// crypto.randomUUID() only exists in secure (HTTPS) contexts - the site
// is also served over plain HTTP, where calling it throws and blanks the
// page - so build the same v4 UUID shape from getRandomValues, which is
// available everywhere.
function newSessionId(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

interface ClaimFields {
  firstName: string;
  lastName: string;
  idNumber: string;
  cellPhone: string;
  email: string;
  message: string;
}

const EMPTY_FIELDS: ClaimFields = { firstName: '', lastName: '', idNumber: '', cellPhone: '', email: '', message: '' };

// Same rules as the legacy page's bootstrapValidator config
// (productcreditlifev2.cshtml).
function validate(fields: ClaimFields, step: 1 | 2): Partial<Record<keyof ClaimFields, string>> {
  const errors: Partial<Record<keyof ClaimFields, string>> = {};
  const name = /^[A-Za-zÀ-ÿ' -]+$/;

  if (step === 1) {
    if (!fields.firstName.trim()) errors.firstName = 'Your first name is required and cannot be empty';
    else if (!name.test(fields.firstName.trim()))
      errors.firstName = 'The first name can only consist of characters excluding special characters and numerics';
    if (!fields.lastName.trim()) errors.lastName = 'The surname is required and cannot be empty';
    else if (!name.test(fields.lastName.trim()))
      errors.lastName = 'Surname can only consist of characters excluding special characters and numerics';
    if (!fields.idNumber.trim()) errors.idNumber = 'The ID / Passport Number is required and cannot be empty';
    else if (!/^[A-Za-z0-9]{1,13}$/.test(fields.idNumber.trim()))
      errors.idNumber = 'The ID / Passport Number can only be a 13 or less alphanumeric sequence';
  } else {
    if (!fields.cellPhone.trim()) errors.cellPhone = 'The mobile number is required and cannot be empty';
    else if (!/^\d{10}$/.test(fields.cellPhone.trim())) errors.cellPhone = 'The mobile number can only be a 10 digit sequence';
    if (!fields.email.trim()) errors.email = 'The email address is required and cannot be empty';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email.trim())) errors.email = 'Please provide a valid email address';
    if (!fields.message.trim()) errors.message = 'A message is required';
  }

  return errors;
}

const INPUT_CLASS =
  'h-[50px] w-full rounded-full border-2 border-[#dbdbdb] bg-white px-6 text-base text-black outline-none placeholder:text-brand-muted focus:border-brand-navy';

export interface ClaimFormProps {
  heading?: string;
  intro?: string;
  imageUrl?: string;
  imageAlt?: string;
  submitUrl?: string;
  successMessage?: string;
  errorMessage?: string;
  background?: string;
}

// Two-step "Submit your claim" form (claimFormBlock, CMS-driven - see
// cms/renderPageSection.tsx) - ported from productcreditlifev2.cshtml:
// personal details, then contact details, posted to the bank's contact
// service with the same fields/encoding the legacy page sends. The target
// URL is a CMS field so a non-production environment can be pointed
// elsewhere (or blanked, which shows the error message instead of posting).
export function ClaimForm({
  heading = 'Submit your claim.',
  intro = 'Please fill in your details to get started with your application.',
  imageUrl,
  imageAlt = '',
  submitUrl,
  successMessage = 'Thank you for logging a claim. We will attend to this shortly. For any queries, please contact our call centre on 0861888786.',
  errorMessage = 'An error occurred while trying to submit the information. For any queries, please contact our call centre on 0861888786.',
  background = '',
}: ClaimFormProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [errors, setErrors] = useState<Partial<Record<keyof ClaimFields, string>>>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');
  const enteredPageAt = useMemo(() => new Date().toISOString(), []);
  const sessionId = useMemo(newSessionId, []);

  function update(key: keyof ClaimFields, value: string) {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  }

  function next() {
    const stepErrors = validate(fields, 1);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length === 0) setStep(2);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const stepErrors = validate(fields, 2);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0 || status === 'sending') return;

    if (!submitUrl) {
      setStatus('error');
      return;
    }

    setStatus('sending');

    const payload = {
      FirstName: fields.firstName.trim(),
      LastName: fields.lastName.trim(),
      Subject: 'Log a claim online - Log a Claim',
      ProductID: '1',
      Email: fields.email.trim(),
      CellPhone: fields.cellPhone.trim(),
      SAID: fields.idNumber.trim(),
      HasSubmit: true,
      TimeEnteredOnPage: enteredPageAt,
      SessionId: sessionId,
      FreeText: fields.message.trim(),
      ProcessID: '',
      ContactType: 'Log a claim Funeral',
      ExtendedProperties: [
        { Key: 'SubmitedPageDate', Value: new Date().toLocaleString() },
        { Key: 'userAgent', Value: navigator.userAgent },
        { Key: 'screenWidth', Value: String(window.screen.width) },
        { Key: 'screenHeight', Value: String(window.screen.height) },
        { Key: 'URL', Value: window.location.href },
      ],
    };

    try {
      const response = await fetch(submitUrl, {
        method: 'POST',
        headers: SUBMIT_HEADERS,
        body: encodeForm(payload).toString(),
      });
      const json = (await response.json()) as { Status?: string };
      if (!response.ok || json.Status !== 'Ok') throw new Error('Claim submission failed');
      setStatus('success');
      setFields(EMPTY_FIELDS);
      setStep(1);
    } catch {
      setStatus('error');
    }
  }

  const field = (key: keyof ClaimFields, label: string, placeholder: string, props: Record<string, unknown> = {}) => (
    <div className="mb-6">
      <label htmlFor={`claim-${key}`} className="mb-2 block text-base font-bold text-black">
        {label}
      </label>
      <input
        id={`claim-${key}`}
        className={INPUT_CLASS}
        placeholder={placeholder}
        value={fields[key]}
        onChange={(event) => update(key, event.target.value)}
        aria-invalid={Boolean(errors[key])}
        {...props}
      />
      {errors[key] && <p className="mt-1 text-xs text-red-600">{errors[key]}</p>}
    </div>
  );

  return (
    <section id="submit-claim" className={`scroll-mt-24 py-12 md:py-24 ${background}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-16 lg:px-8">
        {imageUrl ? <BlobImage src={imageUrl} alt={imageAlt} /> : <div />}

        <div>
          <h1 className="mb-10 text-[32px] font-bold text-brand-ink md:text-[52px]">{heading}</h1>

          <form noValidate onSubmit={submit} className="rounded-[15px] bg-white px-8 py-10 shadow-[0_0_20px_rgba(0,0,0,0.1)] md:px-20">
            {status === 'success' && (
              <p role="status" className="mb-6 rounded-md bg-green-100 p-3 text-sm text-green-800">
                {successMessage}
              </p>
            )}
            {status === 'error' && (
              <p role="alert" className="mb-6 rounded-md bg-red-100 p-3 text-sm text-red-800">
                {errorMessage}
              </p>
            )}

            {step === 2 && (
              <button
                type="button"
                onClick={() => setStep(1)}
                className="mb-4 flex items-center gap-1 text-sm text-black hover:underline"
              >
                <ChevronLeft className="size-4" /> Back
              </button>
            )}

            <p className="mb-6 text-base text-black">{intro}</p>

            {step === 1 ? (
              <>
                {field('firstName', 'First Name', 'First Name', { autoComplete: 'given-name' })}
                {field('lastName', 'Surname', 'Surname', { autoComplete: 'family-name' })}
                {field('idNumber', 'ID/Passport Number', 'ID / Passport Number', { maxLength: 13 })}
                <Button onClick={next} className="w-full normal-case">
                  Next
                </Button>
              </>
            ) : (
              <>
                {field('cellPhone', 'Cellphone Number', 'Mobile Number', {
                  maxLength: 10,
                  inputMode: 'numeric',
                  autoComplete: 'tel',
                })}
                {field('email', 'Email', 'Email', { type: 'email', autoComplete: 'email' })}
                <div className="mb-6">
                  <label htmlFor="claim-message" className="mb-2 block text-base font-bold text-black">
                    Message
                  </label>
                  <textarea
                    id="claim-message"
                    className="h-[70px] w-full rounded-[20px] border-2 border-[#dbdbdb] bg-white px-6 py-3 text-base text-black outline-none placeholder:text-brand-muted focus:border-brand-navy"
                    placeholder="Message"
                    value={fields.message}
                    onChange={(event) => update('message', event.target.value)}
                    aria-invalid={Boolean(errors.message)}
                  />
                  {errors.message && <p className="mt-1 text-xs text-red-600">{errors.message}</p>}
                </div>
                <Button type="submit" disabled={status === 'sending'} className="w-full normal-case">
                  {status === 'sending' ? 'Submitting...' : 'Submit Claim'}
                </Button>
              </>
            )}
          </form>
        </div>
      </div>
    </section>
  );
}
