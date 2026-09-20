// Shape and completeness rules for PersonalDetailsStep.tsx's form - split
// into its own file (rather than exported alongside the component) so Vite
// Fast Refresh can still hot-reload the component.
export interface PersonalDetailsForm {
  title: string;
  fullname: string;
  surname: string;
  idnumber: string;
  mobile: string;
  grosssalary: string;
  income: string;
  frequencytype: string;
  expenses: string;
  yourbank: string;
  employeeType: string;
  youremployer: string;
  occupationstatus: string;
  datetimeInput: string;
  occupationtype: string;
}

export const EMPTY_PERSONAL_DETAILS: PersonalDetailsForm = {
  title: '',
  fullname: '',
  surname: '',
  idnumber: '',
  mobile: '',
  grosssalary: '',
  income: '',
  frequencytype: '',
  expenses: '',
  yourbank: '',
  employeeType: '',
  youremployer: '',
  occupationstatus: '',
  datetimeInput: '',
  occupationtype: '',
};

export function isPersonalComplete(form: PersonalDetailsForm): boolean {
  return Boolean(
    form.title && form.fullname && form.surname && form.idnumber && form.mobile,
  );
}

export function isIncomeComplete(form: PersonalDetailsForm): boolean {
  return Boolean(
    form.grosssalary && form.income && form.frequencytype && form.expenses,
  );
}

export function isEmploymentComplete(form: PersonalDetailsForm): boolean {
  return Boolean(
    form.yourbank &&
    form.employeeType &&
    form.youremployer &&
    form.occupationstatus &&
    form.datetimeInput &&
    form.occupationtype,
  );
}

export function isPersonalDetailsComplete(form: PersonalDetailsForm): boolean {
  return (
    isPersonalComplete(form) &&
    isIncomeComplete(form) &&
    isEmploymentComplete(form)
  );
}
