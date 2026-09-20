import { useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { Select } from '../../components/ui/Input/Select';
import {
  isEmploymentComplete,
  isIncomeComplete,
  isPersonalComplete,
  type PersonalDetailsForm,
} from './personalDetailsForm';

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
    <div id="step2" className="step active">
      <h1 className="color-brand-1 major-title1 mt-24 mb-34">
        <span className="span-major-title1">
          Let&rsquo;s find out what you qualify for
        </span>
      </h1>
      <p className="font-md color-brand-1 mb-20">
        Please enter your details below to continue:
      </p>

      <div
        className={`accordion${openSection === 'personal' ? ' active' : ''}`}
        onClick={() => toggle('personal')}
      >
        1. Personal details
        {isPersonalComplete(value) && (
          <i className="material-symbols-outlined check-icon">✓</i>
        )}
        <i className="material-icons">⌄</i>
      </div>
      <div
        className="accordion_content"
        style={{ display: openSection === 'personal' ? 'block' : 'none' }}
      >
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="fullname">Full name(s)</label>
            <div className="input-group">
              <span className="input-group-addon title-id" id="basic-addon1">
                <Select
                  value={value.title}
                  onChange={(event) => set('title', event.target.value)}
                >
                  <option value="">Title</option>
                  <option value="Mr">Mr</option>
                  <option value="Mrs">Mrs</option>
                  <option value="Ms">Ms</option>
                </Select>
              </span>
              <Input
                id="fullname"
                className="rounded-right fullname-reset"
                placeholder="Enter here"
                value={value.fullname}
                onChange={(event) => set('fullname', event.target.value)}
                autoFocus
              />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="surname">Surname</label>
            <div className="input-group">
              <Input
                id="surname"
                className="rounded-right fullname-reset"
                placeholder="Enter here"
                value={value.surname}
                onChange={(event) => set('surname', event.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="idnumber">ID number</label>
            <div className="input-group">
              <Input
                id="idnumber"
                placeholder="Enter here"
                maxLength={13}
                value={value.idnumber}
                onChange={(event) =>
                  set('idnumber', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="mobile">Contact number</label>
            <div className="input-group">
              <Input
                id="mobile"
                type="tel"
                className="rounded-right mobile-reset"
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
        className={`accordion${openSection === 'income' ? ' active' : ''}`}
        onClick={() => toggle('income')}
      >
        2. Income &amp; expenses
        {isIncomeComplete(value) && (
          <i className="material-symbols-outlined check-icon">✓</i>
        )}
        <i className="material-icons">⌄</i>
      </div>
      <div
        className="accordion_content"
        style={{ display: openSection === 'income' ? 'block' : 'none' }}
      >
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="grosssalary">Gross income (in Rands)</label>
            <div className="input-group">
              <Input
                id="grosssalary"
                className="rounded-right fullname-reset"
                placeholder="Enter here"
                value={value.grosssalary}
                onChange={(event) =>
                  set('grosssalary', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="income">Net income (in Rands)</label>
            <div className="input-group-R">
              <Input
                id="income"
                className="rounded-right fullname-reset"
                placeholder="Enter here"
                value={value.income}
                onChange={(event) =>
                  set('income', event.target.value.replace(/\D/g, ''))
                }
              />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="frequencytype">Frequency</label>
            <div className="custom-select-wrapper">
              <Select
                id="frequencytype"
                value={value.frequencytype}
                onChange={(event) => set('frequencytype', event.target.value)}
              >
                <option value="">Select here</option>
                <option value="M">Monthly</option>
                <option value="F">Fortnightly</option>
                <option value="W">Weekly</option>
              </Select>
              <span className="glyphicon glyphicon-menu-down" />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="expenses">Living expenses (in Rands)</label>
            <div className="input-group-R">
              <Input
                id="expenses"
                className="rounded-right fullname-reset"
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
        className={`accordion${openSection === 'employment' ? ' active' : ''}`}
        onClick={() => toggle('employment')}
      >
        3. Employment &amp; bank details
        {isEmploymentComplete(value) && (
          <i className="material-symbols-outlined check-icon">✓</i>
        )}
        <i className="material-icons">⌄</i>
      </div>
      <div
        className="accordion_content"
        style={{ display: openSection === 'employment' ? 'block' : 'none' }}
      >
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="yourbank">Select your bank</label>
            <div className="custom-select-wrapper">
              <Select
                id="yourbank"
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
              <span className="glyphicon glyphicon-menu-down" />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="employeeType">Employment sector</label>
            <div
              className="custom-select-wrapper tooltip-wrapper"
              data-tooltip="Government Sector refers to the South African government's payroll system used for processing salaries of public sector employees."
            >
              <Select
                id="employeeType"
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
              <span className="glyphicon glyphicon-menu-down" />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="youremployer">Search your employer</label>
            <div className="search-controls">
              <Input
                id="youremployer"
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
              <span className="glyphicon glyphicon-search" />
              {showEmployerSuggestions &&
                employerQuery &&
                employerMatches.length > 0 && (
                  <div className="autocomplete-items">
                    {employerMatches.map((name) => (
                      <div
                        className="autocomplete-item"
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
          <div className="col-md-6">
            <label htmlFor="occupationstatus">
              Select your employment status
            </label>
            <div className="custom-select-wrapper">
              <Select
                id="occupationstatus"
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
              <span className="glyphicon glyphicon-menu-down" />
            </div>
          </div>
        </div>
        <div className="row">
          <div className="col-md-6">
            <label htmlFor="datetimeInput">Employment start date</label>
            <div className="input-group">
              <Input
                id="datetimeInput"
                type="date"
                value={value.datetimeInput}
                onChange={(event) => set('datetimeInput', event.target.value)}
              />
            </div>
          </div>
          <div className="col-md-6">
            <label htmlFor="occupationtype">Select your occupation type</label>
            <div className="custom-select-wrapper">
              <Select
                id="occupationtype"
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
              <span className="glyphicon glyphicon-menu-down" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
