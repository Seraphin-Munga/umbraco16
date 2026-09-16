import type { BlogPost, BlogSectionHeading } from './types';

// Ported from the blog block in PageHome.cshtml (lines 297-390): heading
// (heroBodySections[3]) + up to 3 latest posts under the blogLanding node
// (content id 2855 on the live site - see contentApi.ts's fetchLatestBlogPosts
// for why that can't be looked up by id here). blogBoxClass alternates
// blog-first-box / blog-second-box text-center / blog-third-box by index,
// exactly as the Razor view's blogcount switch does.
function blogBoxClass(index: number): string {
  if (index === 0) return 'blog-first-box';
  if (index === 1) return 'blog-second-box text-center';
  return 'blog-third-box';
}

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

interface BlogSectionProps {
  heading: BlogSectionHeading | null;
  posts: BlogPost[];
}

export function BlogSection({ heading, posts }: BlogSectionProps) {
  if (posts.length === 0 && !heading) return null;

  return (
    <div style={{ background: '0% 0% no-repeat padding-box padding-box rgb(0, 29, 66)' }}>
      <div className="container text-center section-blog">
        {heading && (
          <>
            <h1 className="blog-title">{heading.title}</h1>
            <h2 className="blog-discription" dangerouslySetInnerHTML={{ __html: heading.description }} />
          </>
        )}

        <div className="row">
          {posts.map((post, index) => (
            <div className="col-md-4 col-12" key={index}>
              <div
                className={`container ${blogBoxClass(index)}`}
                style={{
                  backgroundImage: `linear-gradient(rgba(128,128,128,0),rgba(0,0,0,1)),url(${post.imageUrl})`,
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  backgroundSize: 'cover',
                  borderRadius: '10px',
                  width: '95%',
                  margin: 'auto',
                }}
              >
                <p className="ab-thumbnail-card">{post.title}</p>
                <p className="ab-thumbnail-desc limited-text">{post.description}</p>
                <div className="ab-blog-button">
                  <a href={post.url}>
                    <button>Read More</button>
                  </a>
                </div>
                <p className="ab-thumbnail-desc" style={{ paddingTop: 10, paddingBottom: 10 }}>
                  Published: {formatPublishedDate(post.publishedDate)}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="row">
          <div className="col-12">
            <div className="text-center ab-viewmore-button">
              <a href={heading?.viewMoreUrl ?? '#'}>
                <button>View more</button>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
