import { useEffect, useState } from 'react';

// Ported from the "#creditQuestionsModal" overlay in Platform/Web/Views/
// newQQ.cshtml - the credit-status/POPIA consent step that follows the loan
// amount step (see LoanAmountModal.tsx). Styling (.toggle, .slider-qa,
// .toggle-line, and the #creditQuestionsModal-scoped custom checkbox rules)
// comes from GetAQuote.css. The "Select All" button from the source markup
// was left out - it's hidden via inline `style="display:none"` there with
// no visible trigger to un-hide it, so it renders nothing either way.
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
      className="model_overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="credit-questions-modal-title"
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
          <h2
            id="credit-questions-modal-title"
            className="color-brand-1 mt-15 mb-20"
          >
            Your credit status and preferences
          </h2>
          <p className="font-md color-brand-1 mb-20">
            In accordance with the Protection of Personal Information Act
            (POPIA).
          </p>

          {QUESTIONS.map((question) => (
            <div className="toggle" key={question.id}>
              <label>
                <div>
                  <input
                    type="checkbox"
                    id={question.id}
                    name={question.id}
                    checked={answers[question.id]}
                    onChange={() => toggle(question.id)}
                  />
                </div>
                <div>
                  <span className="slider-qa font-md color-brand-1">
                    {question.label}
                  </span>
                </div>
              </label>
            </div>
          ))}

          <hr className="toggle-line" />

          <div className="toggle">
            <label>
              <div>
                <input
                  type="checkbox"
                  id="popiaPermission"
                  name="popiaPermission"
                  checked={answers.popiaPermission}
                  onChange={() => toggle('popiaPermission')}
                />
              </div>
              <div>
                <span className="slider-qa font-md color-brand-1">
                  Can we inform you of African Bank specials and offers?
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="modal_footer">
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => onContinue(answers)}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
