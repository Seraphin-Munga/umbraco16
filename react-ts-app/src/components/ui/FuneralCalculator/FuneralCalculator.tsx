import { useMemo, useState } from 'react';
import { ChevronDown, Plus, Trash2, X } from 'lucide-react';
import { Button } from '../Button/Button';
import { BlobImage } from '../Image/BlobImage';

// Member rules ported from the legacy Family Funeral Cover page's own
// calculator script (coverRules / memberLimits / validateMemberAge) - the
// "Family Funeral Plan" (ab_enhanced_funeral) product, the only funeral
// type that page offers.
type MemberType = 'spouse' | 'child' | 'parent' | 'extended_family';

interface CoverRule {
  minAge: number;
  maxAge: number;
  options: number[];
}

const ALL_OPTIONS = [5000, 10000, 15000, 20000, 25000, 30000, 50000, 100000];
const TO_50K = [5000, 10000, 15000, 20000, 25000, 30000, 50000];
const TO_20K = [5000, 10000, 15000, 20000];

const MAIN_MEMBER_RULES: CoverRule[] = [{ minAge: 18, maxAge: 75, options: ALL_OPTIONS }];

const MEMBER_RULES: Record<MemberType, CoverRule[]> = {
  spouse: [{ minAge: 18, maxAge: 75, options: ALL_OPTIONS }],
  child: [
    { minAge: 0, maxAge: 5, options: TO_20K },
    { minAge: 6, maxAge: 14, options: TO_20K },
    { minAge: 15, maxAge: 25, options: TO_50K },
  ],
  parent: [{ minAge: 18, maxAge: 85, options: TO_50K }],
  extended_family: [
    { minAge: 0, maxAge: 6, options: TO_20K },
    { minAge: 7, maxAge: 18, options: TO_20K },
    { minAge: 19, maxAge: 75, options: TO_50K },
  ],
};

const MEMBER_LIMITS: Record<MemberType, number> = { spouse: 3, child: 8, parent: 4, extended_family: 8 };

const MEMBER_LABELS: Record<MemberType, string> = {
  child: 'Child',
  parent: 'Parent',
  extended_family: 'Extended Family',
  spouse: 'Spouse',
};

const AGE_RANGE_MESSAGES: Record<MemberType, string> = {
  child: 'Child must be between 0 and 25 years old.',
  spouse: 'Spouse must be between 18 and 75 years old.',
  parent: 'Parent must be between 18 and 85 years old.',
  extended_family: 'Extended Family must be between 0 and 75 years old.',
};

interface Member {
  gender: string;
  dateOfBirth: string;
  coverAmount: number | null;
}

function ageOn(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function coverOptions(rules: CoverRule[], age: number | null): number[] {
  if (age === null) return [];
  return rules.find((rule) => age >= rule.minAge && age <= rule.maxAge)?.options ?? [];
}

function formatRand(value: number): string {
  return `R${value.toLocaleString('en-US')}`;
}

const today = () => new Date().toISOString().slice(0, 10);

const PILL_CLASS =
  'h-[56px] w-full appearance-none rounded-full border border-[#dbdbdb] bg-white px-5 text-base text-black outline-none focus:border-brand-navy disabled:opacity-60';

const LABEL_CLASS = 'mb-2 block text-lg font-bold text-brand-ink';

function PillSelect(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${PILL_CLASS} pr-12 ${props.className ?? ''}`} />
      <ChevronDown className="pointer-events-none absolute top-1/2 right-5 size-4 -translate-y-1/2 text-brand-ink" />
    </div>
  );
}

export interface FuneralCalculatorProps {
  heading?: string;
  imageUrl?: string;
  imageAlt?: string;
  applyUrl?: string;
  background?: string;
}

// "Funeral Calculator" (funeralCalculatorBlock, CMS-driven - see
// cms/renderPageSection.tsx) - ported from the legacy Family Funeral Cover
// page: main member gender/date of birth/cover amount, then up to 8
// children, 4 parents, 8 extended family and 3 spouses added through a
// dialog, each with age-based cover options capped at the main member's
// cover. The legacy page's premium calculation wasn't available to port,
// so Calculate shows a cover summary rather than an estimated premium.
export function FuneralCalculator({
  heading = 'Funeral Calculator',
  imageUrl,
  imageAlt = '',
  applyUrl = 'https://ib.africanbank.co.za/SignIn.aspx',
  background = '',
}: FuneralCalculatorProps) {
  const [gender, setGender] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [coverAmount, setCoverAmount] = useState<number | null>(null);
  const [members, setMembers] = useState<Record<MemberType, Member[]>>({
    spouse: [],
    child: [],
    parent: [],
    extended_family: [],
  });
  const [dialogType, setDialogType] = useState<MemberType | null>(null);
  const [draft, setDraft] = useState<Member[]>([]);
  const [draftErrors, setDraftErrors] = useState<string[][]>([]);
  const [showSummary, setShowSummary] = useState(false);
  const [mainError, setMainError] = useState('');

  const mainAge = ageOn(dateOfBirth);
  const mainOptions = coverOptions(MAIN_MEMBER_RULES, mainAge);
  const mainAgeInvalid = dateOfBirth !== '' && mainOptions.length === 0;
  const mainValid = Boolean(gender && dateOfBirth && coverAmount && !mainAgeInvalid);

  function changeDateOfBirth(value: string) {
    setDateOfBirth(value);
    setShowSummary(false);
    const options = coverOptions(MAIN_MEMBER_RULES, ageOn(value));
    setCoverAmount((current) => (current && options.includes(current) ? current : (options[0] ?? null)));
  }

  function openDialog(type: MemberType) {
    const saved = members[type];
    setDraft(saved.length > 0 ? saved.map((member) => ({ ...member })) : [{ gender: '', dateOfBirth: '', coverAmount: null }]);
    setDraftErrors([]);
    setDialogType(type);
  }

  function updateDraft(index: number, patch: Partial<Member>) {
    setDraft((current) =>
      current.map((member, i) => {
        if (i !== index) return member;
        const next = { ...member, ...patch };
        if (patch.dateOfBirth !== undefined && dialogType) {
          const options = coverOptions(MEMBER_RULES[dialogType], ageOn(next.dateOfBirth));
          next.coverAmount = next.coverAmount && options.includes(next.coverAmount) ? next.coverAmount : (options[0] ?? null);
        }
        return next;
      }),
    );
  }

  function submitDialog() {
    if (!dialogType) return;

    const errors = draft.map((member) => {
      const rowErrors: string[] = [];
      const age = ageOn(member.dateOfBirth);
      if (!member.gender) rowErrors.push('Please select a gender.');
      if (!member.dateOfBirth || age === null) rowErrors.push('Please select a valid date of birth.');
      else if (new Date(member.dateOfBirth) > new Date()) rowErrors.push('Date of birth cannot be in the future.');
      else if (coverOptions(MEMBER_RULES[dialogType], age).length === 0) rowErrors.push(AGE_RANGE_MESSAGES[dialogType]);
      if (member.coverAmount && coverAmount && member.coverAmount > coverAmount)
        rowErrors.push(`Cover amount cannot exceed main cover amount of ${formatRand(coverAmount)}.`);
      return rowErrors;
    });

    setDraftErrors(errors);
    if (errors.some((rowErrors) => rowErrors.length > 0)) return;

    setMembers((current) => ({ ...current, [dialogType]: draft }));
    setShowSummary(false);
    setDialogType(null);
  }

  function calculate() {
    if (!mainValid) {
      setMainError(
        mainAgeInvalid
          ? 'Main member must be between 18 and 75 years old for Family Funeral Plan cover.'
          : 'Please select the main member’s gender, date of birth and cover amount.',
      );
      return;
    }
    setMainError('');
    setShowSummary(true);
  }

  const allMembers = useMemo(
    () =>
      (Object.keys(members) as MemberType[]).flatMap((type) =>
        members[type].map((member) => ({ type, ...member })),
      ),
    [members],
  );

  const totalCover = (coverAmount ?? 0) + allMembers.reduce((sum, member) => sum + (member.coverAmount ?? 0), 0);

  const summary = (
    <div className="w-full rounded-[20px] bg-white p-8 text-brand-ink shadow-brand-card">
      <h3 className="text-center text-2xl font-bold">Your Cover Summary</h3>
      <ul className="mt-6 divide-y divide-brand-line text-base">
        <li className="flex justify-between py-2">
          <span>Main member</span>
          <strong>{formatRand(coverAmount ?? 0)}</strong>
        </li>
        {allMembers.map((member, index) => (
          <li key={`${member.type}-${index}`} className="flex justify-between py-2">
            <span>{MEMBER_LABELS[member.type]}</span>
            <strong>{formatRand(member.coverAmount ?? 0)}</strong>
          </li>
        ))}
        <li className="flex justify-between py-2 text-lg">
          <span className="font-bold">Total cover</span>
          <strong className="text-brand-green">{formatRand(totalCover)}</strong>
        </li>
      </ul>
      <h4 className="mt-6 text-center text-lg font-bold">Benefits:</h4>
      <ul className="mt-3 space-y-2 text-sm text-brand-slate">
        <li>✔ Get cover up to R100 000 each for the main and spouse.</li>
        <li>✔ Cover up to R20 000, each, for up to 8 children under the age of 25 years.</li>
        <li>✔ Cover up to R50 000, each, for up to 8 extended family.</li>
      </ul>
      <p className="mt-6 text-center text-sm text-brand-muted">Your premium will be confirmed when you apply.</p>
      <div className="mt-6 text-center">
        <Button href={applyUrl}>Apply Now</Button>
      </div>
    </div>
  );

  return (
    <section id="funeral-calculator" className={`scroll-mt-24 py-12 md:py-20 ${background}`}>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 sm:px-6 md:grid-cols-2 md:gap-16 lg:px-8">
        <div>
          <h1 className="mb-8 text-[32px] font-bold text-brand-ink md:text-[42px]">{heading}</h1>

          <label htmlFor="funeral-type" className={LABEL_CLASS}>
            Funeral Type
          </label>
          <div className="mb-6">
            <PillSelect id="funeral-type" defaultValue="ab_enhanced_funeral">
              <option value="ab_enhanced_funeral">Family Funeral Plan</option>
            </PillSelect>
          </div>

          <span className={LABEL_CLASS}>Main Member Details</span>
          <div className="mb-2 grid grid-cols-2 overflow-hidden rounded-full border border-[#dbdbdb] bg-white">
            <div className="relative border-r border-[#dbdbdb]">
              <select
                aria-label="Main member gender"
                value={gender}
                onChange={(event) => {
                  setGender(event.target.value);
                  setShowSummary(false);
                }}
                className="h-[56px] w-full appearance-none bg-transparent px-5 pr-10 text-base text-black outline-none"
              >
                <option value="" disabled hidden>
                  Gender
                </option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
              <ChevronDown className="pointer-events-none absolute top-1/2 right-4 size-4 -translate-y-1/2 text-brand-ink" />
            </div>
            <input
              type="date"
              aria-label="Main member date of birth"
              max={today()}
              value={dateOfBirth}
              onChange={(event) => changeDateOfBirth(event.target.value)}
              className="h-[56px] w-full bg-transparent px-5 text-base text-black outline-none"
            />
          </div>
          {mainAgeInvalid && (
            <p className="mb-2 text-sm text-red-600">
              Main member must be between 18 and 75 years old for Family Funeral Plan cover.
            </p>
          )}

          <label htmlFor="funeral-cover" className={`${LABEL_CLASS} mt-6`}>
            Cover Amount
          </label>
          <div className="mb-6">
            <PillSelect
              id="funeral-cover"
              value={coverAmount ?? ''}
              disabled={mainOptions.length === 0}
              onChange={(event) => {
                setCoverAmount(Number(event.target.value));
                setShowSummary(false);
              }}
            >
              {(mainOptions.length > 0 ? mainOptions : ALL_OPTIONS).map((value) => (
                <option key={value} value={value}>
                  {formatRand(value)}
                </option>
              ))}
            </PillSelect>
          </div>

          <span className={LABEL_CLASS}>Add Family Member(s)</span>
          <div className="mb-8 flex flex-wrap gap-x-10 gap-y-4 pl-4">
            {(Object.keys(MEMBER_LABELS) as MemberType[]).map((type) => (
              <button
                key={type}
                type="button"
                disabled={!mainValid}
                onClick={() => openDialog(type)}
                className="flex items-center gap-2 text-base text-brand-muted disabled:opacity-50 enabled:hover:text-brand-ink"
              >
                <span className="flex size-9 items-center justify-center rounded-md bg-white/70 text-brand-green">
                  <Plus className="size-5" />
                </span>
                {MEMBER_LABELS[type]} ({members[type].length}/{MEMBER_LIMITS[type]})
              </button>
            ))}
          </div>

          {mainError && <p className="mb-4 text-sm text-red-600">{mainError}</p>}
          <Button onClick={calculate} className="normal-case">
            Calculate
          </Button>
        </div>

        <div className="flex items-center justify-center">
          {showSummary ? summary : imageUrl ? <BlobImage src={imageUrl} alt={imageAlt} /> : null}
        </div>
      </div>

      {dialogType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[20px] bg-white p-6 md:p-10">
            <div className="mb-6 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-bold text-brand-ink">{MEMBER_LABELS[dialogType]} Details</h2>
                <p className="mt-1 text-sm text-brand-muted">
                  Members: {draft.length}/{MEMBER_LIMITS[dialogType]}
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setDialogType(null)}>
                <X className="size-6 text-brand-ink" />
              </button>
            </div>

            {draft.length === 0 && <p className="text-center text-brand-muted">No family members added yet.</p>}

            {draft.map((member, index) => {
              const options = coverOptions(MEMBER_RULES[dialogType], ageOn(member.dateOfBirth));
              return (
                <div key={index} className="mb-4">
                  <div className="grid grid-cols-1 items-center gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
                    <PillSelect
                      aria-label={`${MEMBER_LABELS[dialogType]} ${index + 1} gender`}
                      value={member.gender}
                      onChange={(event) => updateDraft(index, { gender: event.target.value })}
                    >
                      <option value="" disabled hidden>
                        Gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </PillSelect>
                    <input
                      type="date"
                      aria-label={`${MEMBER_LABELS[dialogType]} ${index + 1} date of birth`}
                      max={today()}
                      value={member.dateOfBirth}
                      onChange={(event) => updateDraft(index, { dateOfBirth: event.target.value })}
                      className={PILL_CLASS}
                    />
                    <PillSelect
                      aria-label={`${MEMBER_LABELS[dialogType]} ${index + 1} cover amount`}
                      value={member.coverAmount ?? ''}
                      disabled={options.length === 0}
                      onChange={(event) => updateDraft(index, { coverAmount: Number(event.target.value) })}
                    >
                      {options.length === 0 && <option value="">Cover amount</option>}
                      {options.map((value) => (
                        <option key={value} value={value}>
                          {formatRand(value)}
                        </option>
                      ))}
                    </PillSelect>
                    <button
                      type="button"
                      aria-label="Remove member"
                      onClick={() => {
                        setDraft((current) => current.filter((_, i) => i !== index));
                        setDraftErrors((current) => current.filter((_, i) => i !== index));
                      }}
                      className="flex items-center gap-1 text-sm text-red-600"
                    >
                      <Trash2 className="size-4" /> Remove
                    </button>
                  </div>
                  {draftErrors[index]?.map((error) => (
                    <p key={error} className="mt-1 text-xs text-red-600">
                      {error}
                    </p>
                  ))}
                </div>
              );
            })}

            {draft.length < MEMBER_LIMITS[dialogType] && (
              <button
                type="button"
                onClick={() => setDraft((current) => [...current, { gender: '', dateOfBirth: '', coverAmount: null }])}
                className="mb-6 flex items-center gap-2 text-base font-semibold text-brand-ink"
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-brand-mist text-brand-green">
                  <Plus className="size-5" />
                </span>
                Add Member
              </button>
            )}

            <div>
              <Button onClick={submitDialog} className="normal-case">
                Submit
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
