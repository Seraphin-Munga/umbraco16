// Ported from the "testimonial-section" video grid in the current live home
// page markup - replaces this file's old API-driven avatar/story carousel
// entirely. Static content passed as props with defaults so it stays
// reusable. The data-toggle="modal" / data-target="#videoModal" wiring on
// each placeholder is dropped since no #videoModal markup exists anywhere
// in the ported source (same reasoning as BusinessAudacitySection.tsx).
const BASE_URL = 'https://www.africanbank.co.za';

export interface VideoTestimonial {
  id: string;
  videoId: string;
  thumbnailUrl: string;
}

const DEFAULT_VIDEOS: VideoTestimonial[] = [
  {
    id: 'video-1',
    videoId: '9Cbuqa8Gog4',
    thumbnailUrl: `${BASE_URL}/media/raxb5uwg/placeholder-thumbnails.png`,
  },
  {
    id: 'video-2',
    videoId: '3DSeauqrIpI',
    thumbnailUrl: `${BASE_URL}/media/5pnhzvlc/placeholder-thumbnails4.png`,
  },
];

interface TestimonialsProps {
  videos?: VideoTestimonial[];
  heading?: string;
}

export function Testimonials({ videos = DEFAULT_VIDEOS, heading = 'Testimonials' }: TestimonialsProps) {
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
