import { useEffect } from 'react';
import './AccessAccumulatorPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchAccessAccumulator } from '../../store/slices/accessAccumulatorSlice';

// Dispatches its Redux slice's fetch thunk (backed by
// src/services/accessAccumulatorService.ts) on mount, falling back to this page's
// known title/description from src/routes/personalMenuPages.ts while the
// fetch is in flight - see that file's comment for why this is still a
// stub until the page's real content is ported.
export function AccessAccumulatorPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.accessAccumulator);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchAccessAccumulator());
  }, [status, dispatch]);

  const title = data?.title ?? 'Access accumulator';
  const description = data?.description ?? 'Earn increasing interest with anytime access';

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
