// Ported from the "testimonial-section" video grid in the current live home
// page markup - replaces this file's old API-driven avatar/story carousel
// entirely. Content comes from the CMS-managed homePage node (see
// contentApi.ts's fetchHomePageSections) - no hardcoded fallback content.
// The data-toggle="modal" / data-target="#videoModal" wiring on each
// placeholder is dropped since no #videoModal markup exists anywhere in the
// ported source (same reasoning as BusinessAudacitySection.tsx).
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
              <div className="video-placeholder">
                <img src={video.thumbnailUrl} alt="Video Preview" />
                <div className="play-btn" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
