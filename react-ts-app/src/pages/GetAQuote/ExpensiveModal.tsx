import { useEffect, useState } from 'react';
import { Input } from '../../components/ui/Input/Input';
import { formatRand } from '../../utils/loanCalculator';
import {
  btnPrimary,
  fieldLabel,
  inputField,
  modalBody,
  modalCloseButton,
  modalDialog,
  modalFooter,
  modalHeader,
  modalOverlay,
  modalTitle,
} from './styles';

// Ported from "#expensivemodal" in Platform/Web/Views/newQQ.cshtml - the
// living-expenses breakdown that the "Living expenses" field on the income
// accordion opens on focus. onSave hands back the computed total for the
// caller to write into that field.
export interface ExpensesBreakdown {
  rent: number;
  transport: number;
  groceries: number;
  others: number;
}

interface ExpensiveModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (total: number, breakdown: ExpensesBreakdown) => void;
}

const DEFAULT_BREAKDOWN: ExpensesBreakdown = {
  rent: 0,
  transport: 0,
  groceries: 0,
  others: 0,
};

function toNumber(value: string): number {
  const digitsOnly = value.replace(/[^\d]/g, '');
  return digitsOnly === '' ? 0 : Number(digitsOnly);
}

export function ExpensiveModal({ open, onClose, onSave }: ExpensiveModalProps) {
  const [breakdown, setBreakdown] =
    useState<ExpensesBreakdown>(DEFAULT_BREAKDOWN);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  const total =
    breakdown.rent +
    breakdown.transport +
    breakdown.groceries +
    breakdown.others;

  function update(field: keyof ExpensesBreakdown, value: string) {
    setBreakdown((current) => ({ ...current, [field]: toNumber(value) }));
  }

  return (
    <div
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="expensive-modal-title"
    >
      <div className={modalDialog}>
        <div className={modalHeader}>
          <button
            type="button"
            className={modalCloseButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className={modalBody}>
          <h2 id="expensive-modal-title" className={modalTitle}>
            Calculate Your Expenses
          </h2>

          <span className="mb-[15px] block text-left text-xs leading-[18px] text-brand-navy">
            Please do not include medical aid contribution reflected on your
            payslip. Also do not include repayments on loans and other credit
            e.g. credit cards, clothing accounts and bonds. You may include the
            following expenses: accommodation, groceries, transport, medical
            expenses, education and child maintenance.
          </span>

          <label htmlFor="rent" className={`${fieldLabel} text-left`}>
            Rent
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-[25px] top-1/2 -translate-y-1/2 text-sm font-normal text-brand-navy">
              R
            </span>
            <Input
              id="rent"
              className={`${inputField} pl-10`}
              placeholder="0"
              value={breakdown.rent || ''}
              onChange={(event) => update('rent', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="transport" className={`${fieldLabel} text-left`}>
            Transport
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-[25px] top-1/2 -translate-y-1/2 text-sm font-normal text-brand-navy">
              R
            </span>
            <Input
              id="transport"
              className={`${inputField} pl-10`}
              placeholder="0"
              value={breakdown.transport || ''}
              onChange={(event) => update('transport', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="groceries" className={`${fieldLabel} text-left`}>
            Groceries
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-[25px] top-1/2 -translate-y-1/2 text-sm font-normal text-brand-navy">
              R
            </span>
            <Input
              id="groceries"
              className={`${inputField} pl-10`}
              placeholder="0"
              value={breakdown.groceries || ''}
              onChange={(event) => update('groceries', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="others" className={`${fieldLabel} text-left`}>
            Other (Medical Expenses, Education and Child Maintenance)
          </label>
          <div className="relative">
            <span className="pointer-events-none absolute left-[25px] top-1/2 -translate-y-1/2 text-sm font-normal text-brand-navy">
              R
            </span>
            <Input
              id="others"
              className={`${inputField} pl-10`}
              placeholder="0"
              value={breakdown.others || ''}
              onChange={(event) => update('others', event.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <p id="expense-summary" className="mt-[15px] text-center text-brand-navy">
          Total monthly expenses: <strong>{formatRand(total)}</strong>
        </p>

        <div className={modalFooter}>
          <button
            type="button"
            className={btnPrimary}
            disabled={total === 0}
            onClick={() => {
              onSave(total, breakdown);
              onClose();
            }}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
