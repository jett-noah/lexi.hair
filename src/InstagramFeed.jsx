import React, { useState, useEffect } from 'react';
import { SALON_INFO } from './constants';
import { ExternalLink } from 'lucide-react';

// Clean inline SVG for the Instagram logo (never breaks across icon library versions)
function InstagramIcon({ className = 'w-4 h-4' }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

export default function InstagramFeed() {
  const [posts, setPosts] = useState([]);

  // Optional JSON feed URL from Behold.so (e.g. https://feeds.behold.so/xxxxxx)
  const feedUrl = import.meta.env.VITE_INSTAGRAM_FEED_URL;

  useEffect(() => {
    if (!feedUrl) return;

    fetch(feedUrl)
      .then((res) => res.json())
      .then((data) => {
        const rawPosts = Array.isArray(data) ? data : data.posts || [];
        setPosts(rawPosts.slice(0, 4));
      })
      .catch((err) => console.error('Could not load Instagram feed:', err));
  }, [feedUrl]);

  return (
    <section id="gallery" className="bg-cream-dark/50 border-t border-espresso/10 py-16 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Link to @hair.by.lexih_ */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-10">
          <div>
            <span className="text-xs uppercase tracking-widest text-terracotta font-semibold flex items-center gap-1.5">
              <InstagramIcon className="w-3.5 h-3.5" /> Latest on Instagram
            </span>
            <h2 className="font-serif text-4xl font-semibold mt-1">
              Recent Work & Transformations
            </h2>
            <p className="text-sm text-espresso-light mt-1">
              See Lexi’s newest client results and styling inspiration on Instagram.
            </p>
          </div>

          <a
            href={SALON_INFO.instagramUrl || 'https://www.instagram.com/hair.by.lexih_/'}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-espresso text-cream text-xs sm:text-sm font-medium hover:bg-espresso-light transition self-start sm:self-auto shrink-0"
          >
            <InstagramIcon className="w-4 h-4" />
            Follow {SALON_INFO.instagramHandle || '@hair.by.lexih_'}
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {/* Mode A: If VITE_INSTAGRAM_FEED_URL is connected, render the 4 custom cards */}
        {feedUrl && posts.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {posts.map((post) => {
              const imageUrl =
                post.sizes?.medium?.mediaUrl ||
                post.thumbnailUrl ||
                post.mediaUrl ||
                post.media_url;
              const caption = post.prunedCaption || post.caption || '';

              return (
                <a
                  key={post.id}
                  href={post.permalink || SALON_INFO.instagramUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="group bg-cream-card rounded-2xl overflow-hidden border border-espresso/10 shadow-sm flex flex-col justify-between hover:border-espresso/30 transition"
                >
                  <div className="aspect-square overflow-hidden bg-cream-dark relative">
                    <img
                      src={imageUrl}
                      alt={caption.slice(0, 60) || 'Hair By Lexi Instagram post'}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div className="absolute top-3 right-3 bg-espresso/75 backdrop-blur-sm text-cream p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition">
                      <ExternalLink className="w-3.5 h-3.5" />
                    </div>
                  </div>
                  <div className="p-4 flex items-center justify-between gap-2">
                    <p className="text-xs text-espresso-light line-clamp-2">
                      {caption || `View post on ${SALON_INFO.instagramHandle}`}
                    </p>
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          /* Mode B: Automatic Live Instagram Profile Embed */
          <div className="bg-cream-card border border-espresso/15 rounded-3xl p-4 sm:p-6 shadow-sm overflow-hidden">
            <iframe
              src="https://www.instagram.com/hair.by.lexih_/embed"
              title="Hair By Lexi Instagram Feed"
              className="w-full min-h-[480px] border-0 rounded-2xl bg-white"
            />
            <div className="text-center pt-4">
              <a
                href={SALON_INFO.instagramUrl || 'https://www.instagram.com/hair.by.lexih_/'}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-medium text-espresso underline hover:text-terracotta inline-flex items-center gap-1"
              >
                View full portfolio on Instagram ({SALON_INFO.instagramHandle || '@hair.by.lexih_'})
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}