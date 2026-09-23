import { useEffect, useState } from 'react';
import {
  modalBody,
  modalCloseButton,
  modalDialog,
  modalFooter,
  modalHeader,
  modalOverlay,
  modalTitle,
  btnPrimary,
} from './styles';

// Ported from the "#creditQuestionsModal" overlay in Platform/Web/Views/
// newQQ.cshtml - the credit-status/POPIA consent step that follows the loan
// amount step (see LoanAmountModal.tsx). The "Select All" button from the
// source markup was left out - it's hidden via inline `style="display:none"`
// there with no visible trigger to un-hide it, so it renders nothing either
// way.
//
// submitCreditQuestions() in the legacy page fed into further steps of that
// wizard that haven't been built here yet, so onContinue just hands back
// the four answers for the caller to wire up once that flow exists.
export interface CreditQuestionsAnswers {
  debtReview: boolean;
  insolvent: boolean;
  popiaConsent: boolean;
  popiaPermission: boolean;
}

interface CreditQuestionsModalProps {
  open: boolean;
  onClose: () => void;
  onContinue: (answers: CreditQuestionsAnswers) => void;
}

const QUESTIONS: {
  id: keyof CreditQuestionsAnswers;
  label: React.ReactNode;
}[] = [
  {
    id: 'debtReview',
    label: 'I confirm that I am not under debt review.',
  },
  {
    id: 'insolvent',
    label: 'I confirm that I have not been declared bankrupt.',
  },
  {
    id: 'popiaConsent',
    label: (
      <a
        href="https://www.africanbank.co.za/media/icynwcb2/african-bank-privacy-policy-final-19092018-pdf.pdf"
        target="_blank"
        rel="noreferrer"
        className="underline"
      >
        Do you give African Bank consent to process your personal information?
      </a>
    ),
  },
];

const DEFAULT_ANSWERS: CreditQuestionsAnswers = {
  debtReview: false,
  insolvent: false,
  popiaConsent: false,
  popiaPermission: false,
};

const checkboxClass =
  "relative h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-[3px] border-2 border-[#DBDBDB] bg-[#fff] align-middle transition-all duration-200 checked:border-[#5dc300] checked:bg-[#5dc300] checked:after:absolute checked:after:-top-[3px] checked:after:left-[3px] checked:after:text-base checked:after:font-bold checked:after:text-white checked:after:content-['✓']";

export function CreditQuestionsModal({
  open,
  onClose,
  onContinue,
}: CreditQuestionsModalProps) {
  const [answers, setAnswers] =
    useState<CreditQuestionsAnswers>(DEFAULT_ANSWERS);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open) return null;

  function toggle(id: keyof CreditQuestionsAnswers) {
    setAnswers((current) => ({ ...current, [id]: !current[id] }));
  }

  return (
    <div
      id="creditQuestionsModal"
      className={modalOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-questions-modal-title"
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
          <h2 id="credit-questions-modal-title" className={modalTitle}>
            Your credit status and preferences
          </h2>
          <p className="mb-5 text-base text-brand-navy">
            In accordance with the Protection of Personal Information Act
            (POPIA).
          </p>

          {QUESTIONS.map((question) => (
            <div className="mb-2 flex items-center text-left" key={question.id}>
              <label className="flex cursor-pointer items-center gap-[13px]">
                <input
                  type="checkbox"
                  id={question.id}
                  name={question.id}
                  checked={answers[question.id]}
                  onChange={() => toggle(question.id)}
                  className={checkboxClass}
                />
                <span className="inline-block text-left text-base text-brand-navy">
                  {question.label}
                </span>
              </label>
            </div>
          ))}

          <hr className="my-4 w-full border-t border-[#E5EAEF]" />

          <div className="mb-2 flex items-center text-left">
            <label className="flex cursor-pointer items-center gap-[13px]">
              <input
                type="checkbox"
                id="popiaPermission"
                name="popiaPermission"
                checked={answers.popiaPermission}
                onChange={() => toggle('popiaPermission')}
                className={checkboxClass}
              />
              <span className="inline-block text-left text-base text-brand-navy">
                Can we inform you of African Bank specials and offers?
              </span>
            </label>
          </div>
        </div>

        <div className={modalFooter}>
          <button
            type="button"
            className={btnPrimary}
            onClick={() => onContinue(answers)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
