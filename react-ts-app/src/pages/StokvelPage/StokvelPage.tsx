import { useEffect } from 'react';
import './StokvelPage.css';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchStokvel } from '../../store/slices/stokvelSlice';

// Dispatches its Redux slice's fetch thunk (backed by
// src/services/stokvelService.ts) on mount, falling back to this page's
// known title/description from src/routes/personalMenuPages.ts while the
// fetch is in flight - see that file's comment for why this is still a
// stub until the page's real content is ported.
export function StokvelPage() {
  const dispatch = useAppDispatch();
  const { data, status } = useAppSelector((state) => state.stokvel);

  useEffect(() => {
    if (status === 'idle') dispatch(fetchStokvel());
  }, [status, dispatch]);

  const title = data?.title ?? 'Stokvel';
  const description = data?.description ?? 'A savings account that allows a group of people to save together to achieve shared goals and dreams.';

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
