import { useEffect } from 'react';
import './OnlineBankingPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchOnlineBanking } from '../../store/slices/onlineBankingSlice';

// Dispatches its Redux slice's fetch thunk (backed by
// src/services/onlineBankingService.ts) on mount, falling back to this page's
// known title/description from src/routes/personalMenuPages.ts while the
// fetch is in flight - see that file's comment for why this is still a
// stub until the page's real content is ported.
export function OnlineBankingPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.onlineBanking);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchOnlineBanking());
  }, [status, dispatch]);

  const title = data?.title ?? 'Online Banking';
  const description = data?.description ?? 'Manage your account online';

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
