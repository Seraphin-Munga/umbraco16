import { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Input/Select';
import {
  isEmploymentComplete,
  isIncomeComplete,
  isPersonalComplete,
  type PersonalDetailsForm,
} from './personalDetailsForm';
import {
  fieldLabel,
  inputField,
  selectField,
  tooltipWrapperClass,
} from './styles';

// Ported from "#step2" in Platform/Web/Views/newQQ.cshtml - the personal
// details / income & expenses / employment & bank details accordion. The
// employer field is a plain filtered-suggestions list rather than the
// original's jQuery UI autocomplete (no new dependency, per scope), and the
// employment start date is a native <input type="date"> rather than the
// original's flatpickr widget, for the same reason. Form shape and
// completeness helpers live in personalDetailsForm.ts.
const BANKS = [
  { value: 'ABIL%430000', label: 'AFRICAN BANK' },
  { value: 'ABUB%431010', label: 'AFRICAN BANK INCORP. UBANK' },
  { value: 'GRIN%584000', label: 'AFRICAN BANK BUSINESS' },
  { value: 'SBSA%51001', label: 'STANDARD BANK' },
  { value: 'NED%198765', label: 'NEDBANK' },
  { value: 'FNB%250655', label: 'FNB' },
  { value: 'CAPI%470010', label: 'CAPITEC BANK' },
  { value: 'ABSA%632005', label: 'ABSA' },
  { value: 'INV%580105', label: 'INVESTEC BANK' },
  { value: 'DISC%679000', label: 'Discovery Bank' },
  { value: 'TYME%678910', label: 'GoTymeBank' },
];

const EMPLOYMENT_SECTORS = [
  { value: 'RET', label: 'Other' },
  { value: 'PER', label: 'Government Sector' },
];

const OCCUPATION_STATUSES = [
  { value: 'STE', label: 'State Pension / Grant' },
  { value: 'SEL', label: 'Micro entrepreneur' },
  { value: 'SEA', label: 'Seasonal Worker' },
  { value: 'PRO', label: 'Professionals/ Entrepreneurs' },
  { value: 'PEN', label: 'Pensioner' },
  { value: 'FUL', label: 'Full time' },
  { value: 'CON', label: 'Contract workers' },
  { value: 'COM', label: 'Pure Commission Earners' },
];

const OCCUPATION_TYPES = [
  { value: 'permanent', label: 'Permanent' },
  { value: 'contract', label: 'Contract' },
];

const EMPLOYER_SUGGESTIONS = [
  'African Bank',
  'Eskom',
  'Transnet',
  'City of Johannesburg',
  'Department of Health',
  'Department of Education',
  'Shoprite Checkers',
  'Pick n Pay',
  'Standard Bank',
  'Absa',
  'Vodacom',
  'MTN',
];

type Section = 'personal' | 'income' | 'employment';

const accordionClass =
  'relative mb-1.5 flex cursor-pointer items-center overflow-hidden rounded-[32px] bg-[#fff] px-[25px] py-[15px] text-left text-base font-bold text-[#112768] shadow-[0px_2px_4px_rgba(0,0,0,0.1)] transition-all duration-300 hover:bg-[#f9f9f9] hover:shadow-[0px_2px_6px_rgba(0,0,0,0.15)]';

const accordionContentClass = 'mb-4 mt-4 px-5 pb-2.5';

const rowClass = 'grid grid-cols-1 gap-x-[30px] md:grid-cols-2';

// The dropdown arrow / search glyph here used Bootstrap's Glyphicons font
// (.glyphicon-menu-down / .glyphicon-search), which this app never loaded -
// they rendered as empty, invisible spans. Swapped for real inline SVGs so
// the affordance the original markup clearly intended actually shows up.
function ChevronIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-[5%] top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d565f]"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 7.5L10 12.5L15 7.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute right-[5%] top-[29%] h-4 w-4 text-[#6b6f81]"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M14 14L18 18"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

interface PersonalDetailsStepProps {
  value: PersonalDetailsForm;
  onChange: (value: PersonalDetailsForm) => void;
  onOpenExpensesCalculator: () => void;
}

export function PersonalDetailsStep({
  value,
  onChange,
  onOpenExpensesCalculator,
}: PersonalDetailsStepProps) {
  const [openSection, setOpenSection] = useState<Section>('personal');
  const [employerQuery, setEmployerQuery] = useState(value.youremployer);
  const [showEmployerSuggestions, setShowEmployerSuggestions] = useState(false);

  function set<K extends keyof PersonalDetailsForm>(
    field: K,
    fieldValue: PersonalDetailsForm[K],
  ) {
    onChange({ ...value, [field]: fieldValue });
  }

  function toggle(section: Section) {
    setOpenSection((current) => (current === section ? current : section));
  }

  const employerMatches = EMPLOYER_SUGGESTIONS.filter((name) =>
    name.toLowerCase().includes(employerQuery.toLowerCase()),
  );

  return (
    <div id="step2" className="animate-[get-a-quote-slide-up_0.5s_ease-in-out]">
      <h1 className="mb-[34px] mt-6 pb-3 text-center text-[30px] font-semibold text-brand-navy max-md:text-[28px]">
        <span className="text-[30px] font-bold max-md:text-[28px] max-md:leading-[25px]">
          Let&rsquo;s find out what you qualify for
        </span>
      </h1>
      <p className="mb-5 pb-1 text-base text-brand-navy">
        Please enter your details below to continue:
      </p>

      <div
        className={accordionClass}
        onClick={() => toggle('personal')}
      >
        1. Personal details
        {isPersonalComplete(value) && (
          <i className="mr-[3px] text-base text-[green]">✓</i>
        )}
        <i
          className={`ml-auto transition-transform duration-300 ${openSection === 'personal' ? 'rotate-180' : 'rotate-[270deg]'}`}
        >
          ⌄
        </i>
      </div>
      <div
        className={accordionContentClass}
        style={{ display: openSection === 'personal' ? 'block' : 'none' }}
      >
        <div className={rowClass}>
          <div>
            <label htmlFor="fullname" className={fieldLabel}>
              Full name(s)
            </label>
            <div className="flex w-full">
              <span
                id="basic-addon1"
                className="flex w-[29%] shrink-0 items-center justify-center rounded-l-[30px] border-2 border-r-0 border-[#e5eaef] bg-[#F8F7F8]"
              >
                <Select
                  value={value.title}
                  onChange={(event) => set('title', event.target.value)}
                  className="w-full appearance-none bg-none px-[15px] py-[5px] text-[#112768] outline-none"
                >
                  <option value="">Title</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                </Select>
              </span>
              <Input
                id="fullname"
                className={`${inputField} rounded-l-none`}
                placeholder="Enter here"
                value={value.fullname}
                onChange={(event) => set('fullname', event.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div>
            <label htmlFor="surname" className={fieldLabel}>
              Surname
            </label>
            <div className="w-full">
              <Input
                id="surname"
                className={inputField}
                placeholder="Enter here"
                value={value.surname}
                onChange={(event) => set('surname', event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className={rowClass}>
          <div>
            <label htmlFor="idnumber" className={fieldLabel}>
              ID number
            </label>
            <div className="w-full">
              <Input
                id="idnumber"
                className={inputField}
                placeholder="Enter here"
                maxLength={13}
                value={value.idnumber}
                onChange={(event) =>
                  set('idnumber', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="mobile" className={fieldLabel}>
              Contact number
            </label>
            <div className="w-full">
              <Input
                id="mobile"
                type="tel"
                className={inputField}
                placeholder="Enter here"
                maxLength={10}
                value={value.mobile}
                onChange={(event) =>
                  set('mobile', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={accordionClass}
        onClick={() => toggle('income')}
      >
        2. Income &amp; expenses
        {isIncomeComplete(value) && (
          <i className="mr-[3px] text-base text-[green]">✓</i>
        )}
        <i
          className={`ml-auto transition-transform duration-300 ${openSection === 'income' ? 'rotate-180' : 'rotate-[270deg]'}`}
        >
          ⌄
        </i>
      </div>
      <div
        className={accordionContentClass}
        style={{ display: openSection === 'income' ? 'block' : 'none' }}
      >
        <div className={rowClass}>
          <div>
            <label htmlFor="grosssalary" className={fieldLabel}>
              Gross income (in Rands)
            </label>
            <div className="w-full">
              <Input
                id="grosssalary"
                className={inputField}
                placeholder="Enter here"
                value={value.grosssalary}
                onChange={(event) =>
                  set('grosssalary', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
          <div>
            <label htmlFor="income" className={fieldLabel}>
              Net income (in Rands)
            </label>
            <div className="w-full">
              <Input
                id="income"
                className={inputField}
                placeholder="Enter here"
                value={value.income}
                onChange={(event) =>
                  set('income', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
        </div>
        <div className={rowClass}>
          <div>
            <label htmlFor="frequencytype" className={fieldLabel}>
              Frequency
            </label>
            <div className="relative w-full">
              <Select
                id="frequencytype"
                className={selectField}
                value={value.frequencytype}
                onChange={(event) => set('frequencytype', event.target.value)}
              >
                <option value="">Select here</option>
                <option value="M">Monthly</option>
                <option value="F">Fortnightly</option>
                <option value="W">Weekly</option>
              </Select>
              <ChevronIcon />
            </div>
          </div>
          <div>
            <label htmlFor="expenses" className={fieldLabel}>
              Living expenses (in Rands)
            </label>
            <div className="w-full">
              <Input
                id="expenses"
                className={inputField}
                placeholder="Enter here"
                value={value.expenses}
                onFocus={onOpenExpensesCalculator}
                onChange={(event) =>
                  set('expenses', event.target.value.replace(/\D/g, ''))
                }
                autoComplete="off"
              />
            </div>
          </div>
        </div>
      </div>

      <div
        className={accordionClass}
        onClick={() => toggle('employment')}
      >
        3. Employment &amp; bank details
        {isEmploymentComplete(value) && (
          <i className="mr-[3px] text-base text-[green]">✓</i>
        )}
        <i
          className={`ml-auto transition-transform duration-300 ${openSection === 'employment' ? 'rotate-180' : 'rotate-[270deg]'}`}
        >
          ⌄
        </i>
      </div>
      <div
        className={accordionContentClass}
        style={{ display: openSection === 'employment' ? 'block' : 'none' }}
      >
        <div className={rowClass}>
          <div>
            <label htmlFor="yourbank" className={fieldLabel}>
              Select your bank
            </label>
            <div className="relative w-full">
              <Select
                id="yourbank"
                className={selectField}
                value={value.yourbank}
                onChange={(event) => set('yourbank', event.target.value)}
              >
                <option value="">Select here</option>
                {BANKS.map((bank) => (
                  <option value={bank.value} key={bank.value}>
                    {bank.label}
                  </option>
                ))}
              </Select>
              <ChevronIcon />
            </div>
          </div>
          <div>
            <label htmlFor="employeeType" className={fieldLabel}>
              Employment sector
            </label>
            <div
              className={`relative ${tooltipWrapperClass}`}
              data-tooltip="Government Sector refers to the South African government's payroll system used for processing salaries of public sector employees."
            >
              <Select
                id="employeeType"
                className={selectField}
                value={value.employeeType}
                onChange={(event) => set('employeeType', event.target.value)}
              >
                <option value="">Select here</option>
                {EMPLOYMENT_SECTORS.map((sector) => (
                  <option value={sector.value} key={sector.value}>
                    {sector.label}
                  </option>
                ))}
              </Select>
              <ChevronIcon />
            </div>
          </div>
        </div>
        <div className={rowClass}>
          <div>
            <label htmlFor="youremployer" className={fieldLabel}>
              Search your employer
            </label>
            <div className="relative">
              <Input
                id="youremployer"
                className={inputField}
                placeholder="Search here"
                autoComplete="off"
                value={employerQuery}
                onChange={(event) => {
                  setEmployerQuery(event.target.value);
                  set('youremployer', event.target.value);
                  setShowEmployerSuggestions(true);
                }}
                onFocus={() => setShowEmployerSuggestions(true)}
                onBlur={() =>
                  setTimeout(() => setShowEmployerSuggestions(false), 150)
                }
              />
              <SearchIcon />
              {showEmployerSuggestions &&
                employerQuery &&
                employerMatches.length > 0 && (
                  <div className="relative top-full z-[99] -mt-[15px] text-[15px] font-medium text-brand-navy">
                    {employerMatches.map((name) => (
                      <div
                        className="cursor-pointer border-2 border-t-0 border-[#f2f2f2] p-2.5 first:border-t-2 hover:bg-[#e9e9e9]"
                        key={name}
                        onMouseDown={() => {
                          setEmployerQuery(name);
                          set('youremployer', name);
                          setShowEmployerSuggestions(false);
                        }}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
          <div>
            <label htmlFor="occupationstatus" className={fieldLabel}>
              Select your employment status
            </label>
            <div className="relative w-full">
              <Select
                id="occupationstatus"
                className={selectField}
                value={value.occupationstatus}
                onChange={(event) =>
                  set('occupationstatus', event.target.value)
                }
              >
                <option value="">Select here</option>
                {OCCUPATION_STATUSES.map((status) => (
                  <option value={status.value} key={status.value}>
                    {status.label}
                  </option>
                ))}
              </Select>
              <ChevronIcon />
            </div>
          </div>
        </div>
        <div className={rowClass}>
          <div>
            <label htmlFor="datetimeInput" className={fieldLabel}>
              Employment start date
            </label>
            <div className="w-full">
              <Input
                id="datetimeInput"
                type="date"
                className={inputField}
                value={value.datetimeInput}
                onChange={(event) => set('datetimeInput', event.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="occupationtype" className={fieldLabel}>
              Select your occupation type
            </label>
            <div className="relative w-full">
              <Select
                id="occupationtype"
                className={selectField}
                value={value.occupationtype}
                onChange={(event) => set('occupationtype', event.target.value)}
              >
                <option value="">Select here</option>
                {OCCUPATION_TYPES.map((type) => (
                  <option value={type.value} key={type.value}>
                    {type.label}
                  </option>
                ))}
              </Select>
              <ChevronIcon />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
