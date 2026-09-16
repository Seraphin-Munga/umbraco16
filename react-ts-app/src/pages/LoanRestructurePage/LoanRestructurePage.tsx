import { useEffect } from 'react';
import './LoanRestructurePage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchLoanRestructure } from '../../store/slices/loanRestructureSlice';

// Dispatches its Redux slice's fetch thunk (backed by
// src/services/loanRestructureService.ts) on mount, falling back to this page's
// known title/description from src/routes/personalMenuPages.ts while the
// fetch is in flight - see that file's comment for why this is still a
// stub until the page's real content is ported.
export function LoanRestructurePage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.loanRestructure);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchLoanRestructure());
  }, [status, dispatch]);

  const title = data?.title ?? 'loan restructure';
  const description = data?.description ?? 'We can help you take control of your debt and manage your finances better';

  return (
    <div id="page">
      <div id="content">
        <main>
          <section className="mtb-120">
            <div className="container">
              <div className="row md-text-center">
                <div className="col-md-12">
                  <h1 className="color-brand-1 page-title">{title}</h1>
                  <p className="font-md color-brand-1">{description}</p>
                </div>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
