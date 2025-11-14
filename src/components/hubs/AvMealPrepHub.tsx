import { useEffect, useState } from "react";

interface Restaurant {
  id: string;
  restaurant_name: string;
  instagram_url: string | null;
  custom_slug: string | null;
}

interface AvMealPrepHubProps {
  restaurant: Restaurant;
  trackEvent: (eventName: string) => Promise<void>;
}

interface MenuItem {
  img: string;
  name: string;
  cal: string;
  desc?: string;
}

interface Quote {
  t: string;
  n: string;
}

export const AvMealPrepHub = ({ restaurant, trackEvent }: AvMealPrepHubProps) => {
  const [loveModalOpen, setLoveModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [a2hsModalOpen, setA2hsModalOpen] = useState(false);
  const [currentStars, setCurrentStars] = useState(0);
  const [loveSubmitted, setLoveSubmitted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  // Menu data
  const MENU: MenuItem[] = [
    {img:"https://avmealpreps.com/data/meals/1.jpg?md=740b823bbabe1176ba36ab67b14cc062", name:"BBQ Chicken", cal:"335 kcal", desc:"Savory grilled chicken coated in Sweet BBQ sauce served with broccoli and white rice."},
    {img:"https://avmealpreps.com/data/meals/15.jpg?md=79b3111e22f34ff233c5d7e21017d571", name:"Bolognese Pasta", cal:"692 kcal", desc:"Ground beef in a rich tomato sauce with herbs, served over pasta."},
    {img:"https://avmealpreps.com/data/meals/22.jpg?md=7696ad22a0ef0c6f43e82d237dc10d71", name:"Chicken Alfredo", cal:"754 kcal", desc:"Grilled chicken served over pasta in a rich creamy alfredo sauce with broccoli."},
    {img:"https://avmealpreps.com/data/meals/17.jpg?md=25f8d2b063b21a3563f88a4b075ef2a7", name:"Chicken Chile Verde", cal:"327 kcal", desc:"Chicken cooked in a green salsa with a side of baby potatoes and corn."},
    {img:"https://avmealpreps.com/data/meals/19.jpg?md=8e530fcbd4a87d6edbb351828ba0f910", name:"Chicken Fajitas", cal:"481 kcal", desc:"Sliced chicken breast with grilled veggies and rice."},
    {img:"https://avmealpreps.com/data/meals/11.jpg?md=dd250a18a7fbac516b575e636661a617", name:"Chicken Stirfry", cal:"379 kcal", desc:"Sliced chicken with rice and mixed vegetables cooked in a savory Asian-inspired sauce."},
    {img:"https://avmealpreps.com/data/meals/13.jpg?md=4ff93fd0f07d684299f03966dd44ac5b", name:"Chicken Teriyaki", cal:"465 kcal", desc:"Chicken glazed with a sweet and salty teriyaki sauce with a side of broccoli and rice."},
    {img:"https://avmealpreps.com/data/meals/32.jpg?md=e62c0f00e6137ffa43cbb3bdf4530175", name:"Grilled Chicken Plate", cal:"442 kcal", desc:"Chicken Fajita, Sweet Potatoes, Asparagus."},
    {img:"https://avmealpreps.com/data/meals/35.jpg?md=ff3709493027faff164c16e3985e37a0", name:"Grilled Steak Plate", cal:"513 kcal", desc:"Steak Fajita Marinate, Sweet Potatoes, Broccoli."},
    {img:"https://avmealpreps.com/data/meals/30.jpg?md=8aee5c31b39ba9f78c17560ea35b57fc", name:"Orange Chicken", cal:"351 kcal", desc:"Orange Chicken Sauce, Chicken, Broccoli, White Rice, Ground Black Pepper, Salt."},
    {img:"https://avmealpreps.com/data/meals/6.jpg?md=86022a39bdb6ee4a5b628a2f1b8e93b3", name:"Breakfast Beef Bowl", cal:"459 kcal", desc:"Scrambled eggs and baby potatoes with ground beef and topped with cheese."},
    {img:"https://avmealpreps.com/data/meals/5.jpg?md=903a38f80bbfeb629a9007aaff99ab48", name:"Breakfast Bowl", cal:"481 kcal", desc:"Scrambled eggs and baby potatoes with cooked sausage slices and crispy bacon pieces topped with cheese."},
  ];

  const QUOTES: Quote[] = [
    {t:"Portions are perfect and always fresh. My go-to for busy weeks!", n:"Jasmine M."},
    {t:"Macros are on point and flavors slap 🔥", n:"Chris A."},
    {t:"Finally a meal prep I actually crave. Garlic shrimp = elite.", n:"Daniel R."},
    {t:"Pickup is fast and packaging is clean. 10/10.", n:"Y. Santos"}
  ];

  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleDescription = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const scrollMenu = (direction: 'left' | 'right') => {
    const grid = document.querySelector('#av-menu-grid');
    if (grid) {
      grid.scrollBy({ left: direction === 'left' ? -360 : 360, behavior: 'smooth' });
    }
  };

  const handleShare = async () => {
    trackEvent('share_clicked');
    const shareData = {
      title: "A.V. Meal Preps",
      text: "Menu + feedback here:",
      url: window.location.href
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`);
        alert("Link copied — thanks for sharing!");
      }
    } catch (e) {
      console.log("Share cancelled or failed", e);
    }
  };

  const handleOrderClick = () => {
    trackEvent('order_subscribe_clicked');
  };

  const handleInstagramClick = () => {
    trackEvent('instagram_click');
  };

  const handleA2HSClick = () => {
    trackEvent('a2hs_clicked');
    setA2hsModalOpen(true);
  };

  const handleLoveClick = () => {
    trackEvent('feedback_love_opened');
    setLoveModalOpen(true);
  };

  const handleFeedbackClick = () => {
    trackEvent('feedback_improvement_opened');
    setFeedbackModalOpen(true);
  };

  const handleLoveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackEvent('feedback_positive_sent');
    setLoveSubmitted(true);
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackEvent('feedback_improvement_sent');
    setFeedbackSubmitted(true);
  };

  const closeModal = () => {
    setLoveModalOpen(false);
    setFeedbackModalOpen(false);
    setA2hsModalOpen(false);
    setLoveSubmitted(false);
    setFeedbackSubmitted(false);
    setCurrentStars(0);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isAndroid = /android/i.test(navigator.userAgent);

  return (
    <>
      <style>{`
        #av-hub { --green:#166534; --text:#111827; --muted:#6b7280; --line:#e5e7eb; --radius:16px; --shadow:0 6px 24px rgba(0,0,0,.06); }
        #av-hub *{box-sizing:border-box}
        #av-hub .wrap{width:100%;max-width:480px;margin:0 auto;color:var(--text);font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif;padding:0 18px}
        #av-hub .header{padding:20px 0 8px;border-bottom:1px solid var(--line);text-align:center}
        #av-hub .name{font-weight:900;font-size:18px}
        #av-hub .tag{font-size:12px;color:var(--green);font-weight:700;margin-top:2px}
        #av-hub .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;margin:14px 0}
        #av-hub h1{margin:6px 0 6px;font-size:22px;line-height:1.25;font-weight:900}
        #av-hub .h2{font-weight:900;font-size:16px;margin:0 0 10px}
        #av-hub .sub{margin:0;color:var(--muted);font-size:14px;line-height:1.5}
        #av-hub .row{display:flex;gap:10px;flex-wrap:wrap}
        #av-hub .btn{flex:1 1 48%;display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:14px 16px;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;border:1px solid transparent;text-decoration:none;transition:transform .06s ease,opacity .2s ease;box-shadow:0 2px 10px rgba(0,0,0,.06);line-height:1;background:none}
        #av-hub .btn:active{transform:translateY(1px)}
        #av-hub .btn-green{background:var(--green);color:#fff}
        #av-hub .btn-amber{background:#f59e0b;color:#111827}
        #av-hub .btn-outline{background:#fff;color:var(--green);border-color:#cbd5e1}
        #av-hub .btn-order{flex:1 1 100%;height:56px;font-size:16px;border-radius:14px;border:2px solid var(--green);background:#e8f5ee;color:#0b3f22}
        #av-hub .quotes{display:flex;gap:10px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:2px}
        #av-hub .quotes::-webkit-scrollbar{display:none}
        #av-hub .quote{min-width:220px;max-width:220px;border:1px solid var(--line);border-radius:12px;padding:12px;background:#fafafa}
        #av-hub .qt{font-size:13px;line-height:1.45;color:#111}
        #av-hub .qn{margin-top:6px;font-size:12px;color:#6b7280;font-weight:700}
        #av-hub .menuWrap{position:relative}
        #av-hub .menuGrid{display:grid;grid-auto-flow:column;grid-auto-columns:56%;grid-template-rows:repeat(2,auto);gap:12px 12px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x mandatory}
        #av-hub .menuGrid::-webkit-scrollbar{display:none}
        #av-hub .plate{scroll-snap-align:center;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.06)}
        #av-hub .plate img{width:100%;height:130px;object-fit:cover;display:block}
        #av-hub .pb{padding:10px 12px}
        #av-hub .title{font-weight:800;font-size:14px;margin:0 0 2px;color:#111}
        #av-hub .meta{font-size:12px;color:#475569}
        #av-hub .desc{font-size:12px;color:#6b7280;margin-top:6px;line-height:1.45}
        #av-hub .more{margin-top:6px;width:100%;border:1px dashed #cbd5e1;background:#f8fafc;border-radius:10px;padding:6px 10px;font-size:12px;color:#0b3f22;cursor:pointer}
        #av-hub .nav{position:absolute;top:42%;width:36px;height:36px;border-radius:999px;border:1px solid var(--line);background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2;font-size:20px}
        #av-hub .navL{left:-6px} 
        #av-hub .navR{right:-6px}
        #av-hub .modal{position:fixed;inset:0;background:rgba(17,24,39,.5);display:flex;align-items:center;justify-content:center;z-index:9999;padding:18px}
        #av-hub .sheet{width:100%;max-width:460px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px;position:relative}
        #av-hub .close{position:absolute;right:12px;top:12px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:900}
        #av-hub .field{margin-bottom:10px}
        #av-hub input[type="text"],#av-hub textarea{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;font-size:14px;outline:none;font-family:inherit}
        #av-hub .stars{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px 0 12px}
        #av-hub .star-btn{background:none;border:0;padding:6px;cursor:pointer;line-height:0}
        #av-hub .star{width:24px;height:24px;fill:#e5e7eb;stroke:#9ca3af;stroke-width:1.5;transition:transform .06s ease}
        #av-hub .star.filled{fill:#f59e0b;stroke:#f59e0b}
        #av-hub .star-btn:active .star{transform:scale(.96)}
        #av-hub .bubble{width:100%;max-width:360px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:14px 16px}
        #av-hub .bubble h4{margin:0 0 6px;font-size:16px;font-weight:900}
        #av-hub .bubble p{margin:4px 0;color:#4b5563;font-size:13px}
        @media (min-width:420px){#av-hub .menuGrid{grid-auto-columns:46%}}
      `}</style>

      <div id="av-hub" style={{ display: 'flex', justifyContent: 'center', background: '#fff', minHeight: '100vh', paddingTop: '20px', paddingBottom: '40px' }}>
        <div className="wrap">
          {/* Header */}
          <div className="header">
            <div className="name">A.V. Meal Preps</div>
            <div className="tag">Nutrition That Works as Hard as You Do</div>
          </div>

          {/* Feedback CTA */}
          <section className="card" style={{ marginTop: '12px' }}>
            <h1>How was your meal?</h1>
            <p className="sub">Share feedback in seconds — no login.</p>
            <div className="row" style={{ marginTop: '10px' }}>
              <button className="btn btn-green" onClick={handleLoveClick}>Loved it! 💚</button>
              <button className="btn btn-amber" onClick={handleFeedbackClick}>Could be better</button>
            </div>
          </section>

          {/* Social proof */}
          <section className="card">
            <div className="h2">What customers are saying</div>
            <div className="quotes">
              {QUOTES.map((q, i) => (
                <div key={i} className="quote">
                  <div className="qt">"{q.t}"</div>
                  <div className="qn">— {q.n}</div>
                </div>
              ))}
            </div>
          </section>

          {/* Menu */}
          <section className="card">
            <div className="h2">Menu</div>
            <div className="menuWrap">
              <button className="nav navL" onClick={() => scrollMenu('left')} aria-label="Scroll left">‹</button>
              <div className="menuGrid" id="av-menu-grid">
                {MENU.map((item, idx) => (
                  <div key={idx} className="plate">
                    <a href={item.img} target="_blank" rel="noopener noreferrer">
                      <img src={item.img} alt={item.name} loading="lazy" />
                    </a>
                    <div className="pb">
                      <div className="title">{item.name}</div>
                      <div className="meta">{item.cal}</div>
                      {item.desc && (
                        <>
                          <button 
                            className="more" 
                            onClick={() => toggleDescription(idx)}
                            aria-expanded={expandedItems.has(idx)}
                          >
                            {expandedItems.has(idx) ? 'Hide details ▴' : 'Details ▾'}
                          </button>
                          {expandedItems.has(idx) && <div className="desc">{item.desc}</div>}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="nav navR" onClick={() => scrollMenu('right')} aria-label="Scroll right">›</button>
            </div>
            <div className="sub" style={{ marginTop: '8px', textAlign: 'center' }}>Swipe to browse.</div>
          </section>

          {/* Actions */}
          <section className="card">
            <div className="row">
              <a 
                className="btn btn-order" 
                href="https://avmealpreps.com" 
                target="_blank" 
                rel="noopener noreferrer"
                onClick={handleOrderClick}
              >
                <span>📦</span> Order / Subscribe
              </a>

              {restaurant.instagram_url && (
                <a 
                  href={restaurant.instagram_url}
                  target="_blank" 
                  rel="noopener noreferrer"
                  onClick={handleInstagramClick}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '10px', 
                    justifyContent: 'center', 
                    width: '100%', 
                    textDecoration: 'none', 
                    background: 'linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)', 
                    color: '#fff', 
                    padding: '14px 16px', 
                    borderRadius: '12px', 
                    fontWeight: '700', 
                    marginBottom: '12px',
                    fontSize: '15px'
                  }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" style={{ display: 'block' }}>
                    <path fill="#fff" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.31.975.975 1.248 2.242 1.31 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.31 3.608-.975.975-2.242 1.248-3.608 1.31-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.31-.975-.975-1.248-2.242-1.31-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.31-3.608.975-.975 2.242-1.248 3.608-1.31C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.735 0 8.332.014 7.052.072 5.775.13 4.897.304 4.158.543c-.78.255-1.438.597-2.096 1.255C1.403 2.456 1.06 3.114.806 3.894.567 4.633.393 5.511.335 6.788.277 8.068.263 8.471.263 12c0 3.529.014 3.932.072 5.212.058 1.277.232 2.155.471 2.894.255.78.597 1.438 1.255 2.096.658.658 1.316 1 2.096 1.255.739.239 1.617.413 2.894.471 1.28.058 1.683.072 5.212.072s3.932-.014 5.212-.072c1.277-.058 2.155-.232 2.894-.471.78-.255 1.438-.597 2.096-1.255.658-.658 1-1.316 1.255-2.096.239-.739.413-1.617.471-2.894.058-1.28.072-1.683.072-5.212 0-3.529-.014-3.932-.072-5.212-.058-1.277-.232-2.155-.471-2.894-.255-.78-.597-1.438-1.255-2.096C21.544 1.14 20.886.798 20.106.543c-.739-.239-1.617-.413-2.894-.471C15.932.014 15.529 0 12 0zM12 5.838a6.162 6.162 0 1 0 0 12.324A6.162 6.162 0 0 0 12 5.838zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                  </svg>
                  Follow Us on Instagram
                </a>
              )}
            </div>

            <div className="row" style={{ marginTop: '10px' }}>
              <button className="btn btn-outline" onClick={handleA2HSClick}>➕ Add to Home Screen</button>
              <button className="btn btn-outline" onClick={handleShare}>🔗 Share</button>
            </div>
            <div className="sub" style={{ textAlign: 'center', marginTop: '8px' }}>
              Love your meals? Share with a friend — they'll thank you later 😋.
            </div>
          </section>

          {/* Footer */}
          <div style={{ textAlign: 'center', padding: '18px 0', fontSize: '12px', color: '#9ca3af' }}>
            Powered by{' '}
            <a href="https://tapaway.co" target="_blank" rel="noopener noreferrer" style={{ color: '#0ea5e9', fontWeight: '700', textDecoration: 'none' }}>
              TapAway
            </a>
          </div>
        </div>
      </div>

      {/* Loved it modal */}
      {loveModalOpen && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="sheet">
            <button className="close" onClick={closeModal}>✕</button>
            {!loveSubmitted ? (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900' }}>Loved it! 💚</h3>
                <p className="sub">Quick shout-out — helps others pick.</p>
                <form onSubmit={handleLoveSubmit}>
                  <div className="field">
                    <input name="name" type="text" placeholder="Your name" required />
                  </div>
                  <div className="field">
                    <input name="favorite" type="text" placeholder="Favorite dish (optional)" />
                  </div>
                  <div className="field">
                    <textarea name="comment" rows={4} placeholder="What did you love most?" required />
                  </div>
                  <button className="btn btn-green" type="submit" style={{ width: '100%' }}>Send</button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3>Thank you! 💚</h3>
                <p className="sub">Your note helps us keep the good stuff coming.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Could be better modal */}
      {feedbackModalOpen && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="sheet">
            <button className="close" onClick={closeModal}>✕</button>
            {!feedbackSubmitted ? (
              <>
                <h3 style={{ margin: '0 0 8px', fontSize: '18px', fontWeight: '900' }}>Could be better</h3>
                <p className="sub">Help us improve your experience</p>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="stars">
                    {[1, 2, 3, 4, 5].map((val) => (
                      <button 
                        key={val}
                        type="button" 
                        className="star-btn" 
                        onClick={() => setCurrentStars(val)}
                        aria-label={`${val} star${val > 1 ? 's' : ''}`}
                      >
                        <svg className={`star ${val <= currentStars ? 'filled' : ''}`} viewBox="0 0 24 24">
                          <path d="M12 3.5l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.4 21l1.1-6.3-4.6-4.5 6.3-.9L12 3.5z"/>
                        </svg>
                      </button>
                    ))}
                  </div>
                  <div className="field">
                    <textarea name="comment" rows={4} placeholder="What happened? Portion, flavor, delivery?" required />
                  </div>
                  <div className="field">
                    <input name="contact" type="text" placeholder="Phone/email (optional)" />
                  </div>
                  <button className="btn btn-amber" type="submit" style={{ width: '100%' }}>Send</button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <h3>Got it — thank you 🙏</h3>
                <p className="sub">We'll review this personally and make it right.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A2HS modal */}
      {a2hsModalOpen && (
        <div className="modal" onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}>
          <div className="sheet" style={{ background: 'transparent', border: 'none', boxShadow: 'none' }}>
            <div className="bubble">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <div style={{ fontWeight: '900' }}>Install A.V. Meal Preps</div>
                <button className="close" onClick={closeModal}>✕</button>
              </div>
              <p>Add this page to your home screen for quick access.</p>
              <p style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {isIOS ? (
                  <>
                    Tap{' '}
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M12 16V4m0 0-3 3m3-3 3 3" stroke="#111827" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      <rect x="5" y="10" width="14" height="10" rx="2" stroke="#111827" strokeWidth="2"/>
                    </svg>
                    {' '}then "Add to Home Screen".
                  </>
                ) : isAndroid ? (
                  'Open browser menu (⋮) then "Add to Home screen".'
                ) : (
                  'Use your browser menu to add this page to your home screen.'
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
