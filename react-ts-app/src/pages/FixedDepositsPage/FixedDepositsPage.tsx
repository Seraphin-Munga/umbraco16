import { useEffect } from 'react';
import './FixedDepositsPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchFixedDeposits } from '../../store/slices/fixedDepositsSlice';

// Dispatches its Redux slice's fetch thunk (backed by
// src/services/fixedDepositsService.ts) on mount, falling back to this page's
// known title/description from src/routes/personalMenuPages.ts while the
// fetch is in flight - see that file's comment for why this is still a
// stub until the page's real content is ported.
export function FixedDepositsPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.fixedDeposits);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchFixedDeposits());
  }, [status, dispatch]);

  const title = data?.title ?? 'Fixed deposits';
  const description = data?.description ?? 'Make a single deposit for 3 to 60 months';

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
