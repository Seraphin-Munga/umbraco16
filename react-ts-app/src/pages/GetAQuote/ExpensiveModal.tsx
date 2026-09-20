import { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button/Button';
import { Input } from '../../components/ui/Input/Input';
import { formatRand } from '../../utils/loanCalculator';

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
      className="model_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expensive-modal-title"
    >
      <div className="modal_dialog">
        <div className="modal_header">
          <button
            type="button"
            className="get-a-quote-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="modal_body">
          <h2 id="expensive-modal-title" className="color-brand-1 mt-15 mb-20">
            Calculate Your Expenses
          </h2>

          <span
            style={{ lineHeight: '18px', fontSize: '12px' }}
            className="color-brand-1 expense-span"
          >
            Please do not include medical aid contribution reflected on your
            payslip. Also do not include repayments on loans and other credit
            e.g. credit cards, clothing accounts and bonds. You may include the
            following expenses: accommodation, groceries, transport, medical
            expenses, education and child maintenance.
          </span>

          <label htmlFor="rent">Rent</label>
          <div className="input-group-R">
            <span className="currency-prefix">R</span>
            <Input
              id="rent"
              className="rounded-right fullname-reset"
              placeholder="0"
              value={breakdown.rent || ''}
              onChange={(event) => update('rent', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="transport">Transport</label>
          <div className="input-group-R">
            <span className="currency-prefix">R</span>
            <Input
              id="transport"
              className="rounded-right fullname-reset"
              placeholder="0"
              value={breakdown.transport || ''}
              onChange={(event) => update('transport', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="groceries">Groceries</label>
          <div className="input-group-R">
            <span className="currency-prefix">R</span>
            <Input
              id="groceries"
              className="rounded-right fullname-reset"
              placeholder="0"
              value={breakdown.groceries || ''}
              onChange={(event) => update('groceries', event.target.value)}
              autoComplete="off"
            />
          </div>

          <label htmlFor="others">
            Other (Medical Expenses, Education and Child Maintenance)
          </label>
          <div className="input-group-R">
            <span className="currency-prefix">R</span>
            <Input
              id="others"
              className="rounded-right fullname-reset"
              placeholder="0"
              value={breakdown.others || ''}
              onChange={(event) => update('others', event.target.value)}
              autoComplete="off"
            />
          </div>
        </div>

        <p id="expense-summary" className="mt-15 color-brand-1 text-center">
          Total monthly expenses: <strong>{formatRand(total)}</strong>
        </p>

        <div className="modal_footer">
          <Button
            disabled={total === 0}
            onClick={() => {
              onSave(total, breakdown);
              onClose();
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
