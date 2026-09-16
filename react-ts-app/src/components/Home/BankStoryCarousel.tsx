import { useState } from 'react';
import type { BlogPost, WhatsNew } from './types';

// Ported from the "bank-story-container" block in home.cshtml (lines
// 553-674): a single carousel of blog posts (newest first), where - only
// for the very first slide, and only if a "whatsNew" content item exists -
// the slide splits in half: the whatsNew content on the left, that same
// first blog post's own teaser on the right (lines 580-626). Every other
// slide is just the blog post teaser alone, full width, over a static
// pattern background (not the post's own image - home.cshtml never reads
// one). No Bootstrap JS is loaded here (see Header.tsx's own comment), so
// this is plain React state instead of data-ride="carousel".
interface BankStoryCarouselProps {
  whatsNew: WhatsNew | null;
  posts: BlogPost[];
}

function formatPublishedDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : date.toLocaleDateString();
}

export function BankStoryCarousel({ whatsNew, posts }: BankStoryCarouselProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  if (posts.length === 0) return null;

  const goTo = (index: number) => setActiveIndex((index + posts.length) % posts.length);

  return (
    <div className="bank-story-container">
      <div className="pull-up">
        <div className="bank-story-carousel">
          <div id="bank-story" className="carousel slide">
            <div className="carousel-inner">
              {posts.map((post, index) => (
                <div className={`item${index === activeIndex ? ' active' : ''}`} key={index}>
                  {whatsNew && index === 0 ? (
                    <>
                      <div
                        className="bank-story-img"
                        style={{ backgroundImage: "url('/Media/ymiaoysk/backgroundnew.jpg')" }}
                      />
                      <div className="bank-story-caption whatsnew col-md-6">
                        <a href={whatsNew.linkUrl}>
                          <div className="whatsnew-title whatsnew-copy">
                            <p>{whatsNew.title}</p>
                          </div>
                          <div
                            className="bank-story-description whatsnew-copy"
                            dangerouslySetInnerHTML={{ __html: whatsNew.contentMarkup }}
                          />
                        </a>
                        <div className="bank-story-read-more" style={{ marginTop: '5%' }}>
                          <a
                            className="button primary clearfix"
                            style={{ backgroundColor: '#88bc47' }}
                            href={whatsNew.linkUrl}
                          >
                            {whatsNew.linkLabel}
                          </a>
                        </div>
                      </div>
                      <br />
                      <div
                        className="bank-story-caption col-md-6 whatsnew-sibling"
                        style={{ marginLeft: 'unset' }}
                      >
                        <span className="bank-story-tag">The Blog</span>
                        <div className="bank-story-title">{post.title}</div>
                        <div className="bank-story-description">{post.description}</div>
                        <div className="bank-story-read-more">
                          <a className="button primary clearfix" href={post.url}>
                            Read more
                          </a>
                        </div>
                        <div className="bank-story-author">{formatPublishedDate(post.publishedDate)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div
                        className="bank-story-img"
                        style={{ backgroundImage: 'url(/media/xmlmnwsy/blog_patterns_1.jpg)' }}
                      />
                      {/* Source wraps this whole card in an <a href="blog-landing/">
                          AND nests another <a> ("Read more") inside it -
                          invalid HTML that browsers silently reparent but
                          React warns about (and its DOM math doesn't
                          account for). Dropping the outer wrapper only;
                          the "Read more" link still does the job. */}
                      <div className="bank-story-caption">
                        <span className="bank-story-tag">The Blog</span>
                        <div className="bank-story-title">{post.title}</div>
                        <div className="bank-story-description">{post.description}</div>
                        <div className="bank-story-read-more">
                          <a className="button primary clearfix" href={post.url}>
                            Read more
                          </a>
                        </div>
                        <div className="bank-story-author">{formatPublishedDate(post.publishedDate)}</div>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>

            <a className="left carousel-control" role="button" onClick={() => goTo(activeIndex - 1)}>
              <span className="icon-arrow-left" />
            </a>
            <a className="right carousel-control" role="button" onClick={() => goTo(activeIndex + 1)}>
              <span className="icon-arrow-right" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
