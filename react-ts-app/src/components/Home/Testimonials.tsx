import { useEffect, useState } from 'react';
import { Play, X } from 'lucide-react';

// Ported from the "testimonial-section" video grid in the current live home
// page markup - replaces this file's old API-driven avatar/story carousel
// entirely. Content comes from the CMS-managed homePage node (see
// contentApi.ts's fetchHomePageSections) - no hardcoded fallback content.
// The source's data-toggle="modal" / data-target="#videoModal" wiring was
// dropped since no #videoModal markup existed anywhere in the ported source
// - clicking a thumbnail now opens a YouTube embed in a lightweight overlay
// instead, following the same open/onClose + body-scroll-lock pattern
// Header/NavModal.tsx already uses for its own modal.
export interface VideoTestimonial {
  id: string;
  videoId: string;
  thumbnailUrl: string;
}

interface TestimonialsProps {
  videos: VideoTestimonial[];
  heading?: string;
}

export function Testimonials({ videos, heading }: TestimonialsProps) {
  const [openVideoId, setOpenVideoId] = useState<string | null>(null);

  useEffect(() => {
    if (!openVideoId) return;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, [openVideoId]);

  return (
    <section className="bg-[linear-gradient(152deg,rgba(0,43,96,1)_33%,rgba(4,24,49,1)_51%)] px-4 py-[60px] text-center">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-[50px] text-[20px] font-bold text-white sm:text-[65px]">{heading}</h1>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {videos.map((video) => (
            <div
              className="relative w-full cursor-pointer overflow-hidden rounded-[29px] bg-brand-ink"
              role="button"
              tabIndex={0}
              aria-label="Play video"
              onClick={() => setOpenVideoId(video.videoId)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') setOpenVideoId(video.videoId);
              }}
              key={video.id}
            >
              <img className="block h-auto w-full" src={video.thumbnailUrl} alt="Video Preview" />
              <div className="absolute top-1/2 left-1/2 flex size-[60px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60">
                <Play className="size-6 fill-white text-white" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {openVideoId && (
        <div
          className="fixed inset-0 z-[1050] flex items-center justify-center bg-black/75 p-5"
          onClick={() => setOpenVideoId(null)}
        >
          <div className="relative w-full max-w-[900px]" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="absolute -top-10 right-0 cursor-pointer border-none bg-transparent p-0 text-white"
              aria-label="Close video"
              onClick={() => setOpenVideoId(null)}
            >
              <X className="size-8" />
            </button>
            <div className="aspect-video w-full overflow-hidden rounded-xl bg-black">
              <iframe
                width="100%"
                height="100%"
                src={`https://www.youtube.com/embed/${openVideoId}?autoplay=1`}
                title="Testimonial video"
                frameBorder={0}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
