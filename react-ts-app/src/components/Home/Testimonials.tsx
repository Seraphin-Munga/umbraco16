import { useEffect, useState } from 'react';

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
    <section className="testimonial-section">
      <div className="container">
        <div className="row">
          <div className="col-md-12 mb-50">
            <h1 className="text-white span-major-title">{heading}</h1>
          </div>
        </div>

        <div className="row">
          {videos.map((video) => (
            <div className="col-md-4 col-sm-4 col-xs-12 mb-20" key={video.id}>
              <div
                className="video-placeholder"
                role="button"
                tabIndex={0}
                aria-label="Play video"
                onClick={() => setOpenVideoId(video.videoId)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') setOpenVideoId(video.videoId);
                }}
              >
                <img src={video.thumbnailUrl} alt="Video Preview" />
                <div className="play-btn" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {openVideoId && (
        <div className="video-modal-overlay" onClick={() => setOpenVideoId(null)}>
          <div className="video-modal-wrapper" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="video-modal-close"
              aria-label="Close video"
              onClick={() => setOpenVideoId(null)}
            >
              ×
            </button>
            <div className="video-modal">
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
