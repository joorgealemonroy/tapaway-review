import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Restaurant {
  id: string;
  restaurant_name: string;
  logo_url?: string | null;
  header_title?: string | null;
  header_subtitle?: string | null;
  menu_title?: string | null;
  meal_order_url?: string | null;
  instagram_url?: string | null;
  avm_question_title?: string | null;
  avm_question_subtitle?: string | null;
  avm_positive_label?: string | null;
  avm_negative_label?: string | null;
}

interface Meal {
  id: string;
  name: string;
  description: string;
  calories: number;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  image_url: string;
  order_url: string | null;
}

interface Testimonial {
  id: string;
  quote: string;
  author: string;
}

interface TrainerBundle {
  id: string;
  title: string;
  description: string;
  price_label: string | null;
  cta_label: string;
  cta_url: string;
}

interface AvMealPrepHubProps {
  restaurant: Restaurant;
  trackEvent: (eventName: string, eventData?: any) => Promise<void>;
}

export const AvMealPrepHub = ({ restaurant, trackEvent }: AvMealPrepHubProps) => {
  const [meals, setMeals] = useState<Meal[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [trainerBundles, setTrainerBundles] = useState<TrainerBundle[]>([]);
  const [showLoveModal, setShowLoveModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showA2HSModal, setShowA2HSModal] = useState(false);
  const [loveSubmitted, setLoveSubmitted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [starRating, setStarRating] = useState(0);
  const [hoverStars, setHoverStars] = useState(0);
  const [expandedMeals, setExpandedMeals] = useState<Set<string>>(new Set());
  const menuGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchMeals();
    fetchTestimonials();
    fetchTrainerBundles();
  }, [restaurant.id]);

  const fetchMeals = async () => {
    const { data } = await supabase
      .from("av_meal_prep_meals")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order");
    if (data) setMeals(data as Meal[]);
  };

  const fetchTestimonials = async () => {
    const { data } = await supabase
      .from("av_meal_prep_testimonials")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .order("sort_order");
    if (data) setTestimonials(data as Testimonial[]);
  };

  const fetchTrainerBundles = async () => {
    const { data } = await supabase
      .from("av_trainer_bundles")
      .select("*")
      .eq("restaurant_id", restaurant.id)
      .eq("is_active", true)
      .order("sort_order");
    if (data) setTrainerBundles(data as TrainerBundle[]);
  };

  const handleLovedClick = () => {
    trackEvent("avm_loved_click");
    setShowLoveModal(true);
    setLoveSubmitted(false);
  };

  const handleFeedbackClick = () => {
    trackEvent("avm_could_be_better_click");
    setShowFeedbackModal(true);
    setFeedbackSubmitted(false);
    setStarRating(0);
  };

  const handleLoveSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackEvent("avm_loved_submit");
    setLoveSubmitted(true);
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    trackEvent("avm_feedback_submit", { rating: starRating });
    setFeedbackSubmitted(true);
  };

  const handleOrderClick = () => {
    if (restaurant.meal_order_url) {
      trackEvent("avm_order_click", { source: "global" });
      window.open(restaurant.meal_order_url, "_blank");
    }
  };

  const handleInstagramClick = () => {
    if (restaurant.instagram_url) {
      trackEvent("avm_instagram_click");
      window.open(restaurant.instagram_url, "_blank");
    }
  };

  const handleTrainerClick = (bundle: TrainerBundle) => {
    trackEvent("avm_trainer_bundle_click", { bundleId: bundle.id, title: bundle.title });
    window.open(bundle.cta_url, "_blank");
  };

  const handleShare = async () => {
    trackEvent("avm_share_clicked");
    const shareData = {
      title: restaurant.restaurant_name,
      text: "Check out this meal prep service!",
      url: window.location.href,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        toast.success("Link copied to clipboard!");
      }
    } catch (_) {}
  };

  const handleA2HS = () => {
    trackEvent("avm_add_to_home_clicked");
    setShowA2HSModal(true);
  };

  const scrollMenu = (direction: "left" | "right") => {
    if (menuGridRef.current) {
      const scrollAmount = direction === "left" ? -360 : 360;
      menuGridRef.current.scrollBy({ left: scrollAmount, behavior: "smooth" });
    }
  };

  const toggleMealDetails = (mealId: string) => {
    setExpandedMeals((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(mealId)) {
        newSet.delete(mealId);
      } else {
        newSet.add(mealId);
      }
      return newSet;
    });
  };

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

  return (
    <div id="tapaway-av" style={{ display: "flex", justifyContent: "center", background: "#fff" }}>
      <style>{`
        #tapaway-av { --green:#166534; --text:#111827; --muted:#6b7280; --line:#e5e7eb; --radius:16px; --shadow:0 6px 24px rgba(0,0,0,.06); }
        #tapaway-av *{box-sizing:border-box}
        #tapaway-av .wrap{width:100%;max-width:480px;margin:0 auto;color:var(--text);font-family:Inter,system-ui,Segoe UI,Roboto,Arial,sans-serif}
        #tapaway-av .header{padding:20px 18px 8px;border-bottom:1px solid var(--line);text-align:center}
        #tapaway-av .name{font-weight:900;font-size:18px}
        #tapaway-av .tag{font-size:12px;color:var(--green);font-weight:700;margin-top:2px}
        #tapaway-av .card{background:#fff;border:1px solid var(--line);border-radius:var(--radius);box-shadow:var(--shadow);padding:18px;margin:14px 18px}
        #tapaway-av h1{margin:6px 0 6px;font-size:22px;line-height:1.25;font-weight:900}
        #tapaway-av .h2{font-weight:900;font-size:16px;margin:0 0 10px}
        #tapaway-av .sub{margin:0;color:var(--muted);font-size:14px;line-height:1.5}
        #tapaway-av .row{display:flex;gap:10px;flex-wrap:wrap}
        #tapaway-av .btn{flex:1 1 48%;display:inline-flex;align-items:center;justify-content:center;gap:8px;
          padding:14px 16px;border-radius:12px;font-weight:800;font-size:15px;cursor:pointer;border:1px solid transparent;
          text-decoration:none;transition:transform .06s ease,opacity .2s ease;box-shadow:0 2px 10px rgba(0,0,0,.06);line-height:1}
        #tapaway-av .btn:active{transform:translateY(1px)}
        #tapaway-av .btn-green{background:var(--green);color:#fff}
        #tapaway-av .btn-amber{background:#f59e0b;color:#111827}
        #tapaway-av .btn-outline{background:#fff;color:var(--green);border-color:#cbd5e1}
        #tapaway-av .btn-order{flex:1 1 100%;height:56px;font-size:16px;border-radius:14px;border:2px solid var(--green);background:#e8f5ee;color:#0b3f22}
        #tapaway-av .btn-order span{font-size:18px}
        #tapaway-av .btn-trainer{flex:1 1 100%;height:56px;font-size:16px;border-radius:14px;border:2px solid #8b5cf6;background:#f3e8ff;color:#5b21b6;margin-top:10px}
        #tapaway-av .btn-trainer span{font-size:18px}
        #tapaway-av .quotes{display:flex;gap:10px;overflow-x:auto;scroll-behavior:smooth;padding-bottom:2px}
        #tapaway-av .quotes::-webkit-scrollbar{display:none}
        #tapaway-av .quote{min-width:220px;max-width:220px;border:1px solid var(--line);border-radius:12px;padding:12px;background:#fafafa}
        #tapaway-av .qt{font-size:13px;line-height:1.45;color:#111}
        #tapaway-av .qn{margin-top:6px;font-size:12px;color:#6b7280;font-weight:700}
        #tapaway-av .menuWrap2{position:relative}
        #tapaway-av .menuGrid2{
          display:grid;grid-auto-flow:column;grid-auto-columns:56%;grid-template-rows:repeat(2,auto);
          gap:12px 12px;overflow-x:auto;padding:2px 2px 8px;scroll-snap-type:x mandatory
        }
        #tapaway-av .menuGrid2::-webkit-scrollbar{display:none}
        #tapaway-av .plate{scroll-snap-align:center;border:1px solid var(--line);border-radius:14px;overflow:hidden;background:#fff;box-shadow:0 2px 10px rgba(0,0,0,.06)}
        #tapaway-av .plate img{width:100%;height:130px;object-fit:cover;display:block}
        #tapaway-av .pb{padding:10px 12px}
        #tapaway-av .title{font-weight:800;font-size:14px;margin:0 0 2px;color:#111}
        #tapaway-av .meta{font-size:12px;color:#475569}
        #tapaway-av .desc{font-size:12px;color:#6b7280;margin-top:6px;line-height:1.45;display:none}
        #tapaway-av .plate.open .desc{display:block}
        #tapaway-av .more{margin-top:6px;width:100%;border:1px dashed #cbd5e1;background:#f8fafc;border-radius:10px;padding:6px 10px;font-size:12px;color:#0b3f22;cursor:pointer}
        #tapaway-av .nav{position:absolute;top:42%;width:36px;height:36px;border-radius:999px;border:1px solid var(--line);
          background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.08);display:flex;align-items:center;justify-content:center;cursor:pointer;z-index:2}
        #tapaway-av .navL{left:-6px} #tapaway-av .navR{right:-6px}
        @media (min-width:420px){#tapaway-av .menuGrid2{grid-auto-columns:46%}}
        #tapaway-av .modal{position:fixed;inset:0;background:rgba(17,24,39,.5);display:none;align-items:center;justify-content:center;z-index:9999;padding:18px}
        #tapaway-av .modal.show{display:flex}
        #tapaway-av .sheet{width:100%;max-width:460px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:var(--shadow);padding:18px;position:relative;max-height:90vh;overflow-y:auto}
        #tapaway-av .close{position:absolute;right:12px;top:12px;border:1px solid var(--line);background:#fff;border-radius:10px;padding:6px 10px;cursor:pointer;font-weight:900}
        #tapaway-av .field{margin-bottom:10px}
        #tapaway-av input[type="text"],#tapaway-av textarea{width:100%;padding:12px;border:1px solid var(--line);border-radius:12px;font-size:14px;outline:none}
        #tapaway-av .stars{display:flex;align-items:center;justify-content:center;gap:6px;margin:8px 0 12px}
        #tapaway-av .star-btn{background:none;border:0;padding:6px;cursor:pointer;line-height:0}
        #tapaway-av .star{width:24px;height:24px;fill:#e5e7eb;stroke:#9ca3af;stroke-width:1.5;transition:transform .06s ease}
        #tapaway-av .star.filled{fill:#f59e0b;stroke:#f59e0b}
        #tapaway-av .star-btn:active .star{transform:scale(.96)}
        #tapaway-av .bubble{width:100%;max-width:360px;background:#fff;border:1px solid var(--line);border-radius:16px;box-shadow:0 12px 30px rgba(0,0,0,.15);padding:14px 16px}
        #tapaway-av .bubble h4{margin:0 0 6px;font-size:16px;font-weight:900}
        #tapaway-av .bubble p{margin:4px 0;color:#4b5563;font-size:13px}
        #tapaway-av .shareIcon{width:18px;height:18px}
      `}</style>

      <div className="wrap">
        {/* Header */}
        <div className="header">
          <div className="name">{restaurant.header_title || restaurant.restaurant_name}</div>
          <div className="tag">{restaurant.header_subtitle || "Nutrition That Works as Hard as You Do"}</div>
        </div>

        {/* Feedback CTA */}
        <section className="card" style={{ marginTop: "12px" }}>
          <h1>{restaurant.avm_question_title || "How was your meal?"}</h1>
          <p className="sub">{restaurant.avm_question_subtitle || "Share feedback in seconds — no login."}</p>
          <div className="row" style={{ marginTop: "10px" }}>
            <button className="btn btn-green" onClick={handleLovedClick}>
              {restaurant.avm_positive_label || "Loved it! 💚"}
            </button>
            <button className="btn btn-amber" onClick={handleFeedbackClick}>
              {restaurant.avm_negative_label || "Could be better"}
            </button>
          </div>
        </section>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <section className="card">
            <div className="h2">What customers are saying</div>
            <div className="quotes">
              {testimonials.map((t) => (
                <div key={t.id} className="quote">
                  <div className="qt">"{t.quote}"</div>
                  <div className="qn">{t.author}</div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Menu */}
        {meals.length > 0 && (
          <section className="card">
            <div className="h2">{restaurant.menu_title || "Menu"}</div>
            <div className="menuWrap2">
              <button className="nav navL" onClick={() => scrollMenu("left")} aria-label="Scroll left">
                ‹
              </button>
              <div className="menuGrid2" ref={menuGridRef}>
                {meals.map((meal) => (
                  <div key={meal.id} className={`plate ${expandedMeals.has(meal.id) ? "open" : ""}`}>
                    <img src={meal.image_url} alt={meal.name} loading="lazy" />
                    <div className="pb">
                      <div className="title">{meal.name}</div>
                      <div className="meta">{meal.calories} kcal</div>
                      {meal.description && (
                        <>
                          <button
                            className="more"
                            onClick={() => toggleMealDetails(meal.id)}
                            aria-expanded={expandedMeals.has(meal.id)}
                          >
                            {expandedMeals.has(meal.id) ? "Hide details ▴" : "Details ▾"}
                          </button>
                          <div className="desc" style={{ display: expandedMeals.has(meal.id) ? "block" : "none" }}>
                            {meal.description}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button className="nav navR" onClick={() => scrollMenu("right")} aria-label="Scroll right">
                ›
              </button>
            </div>
            <div className="sub" style={{ marginTop: "8px", textAlign: "center" }}>
              Swipe to browse.
            </div>
          </section>
        )}

        {/* Actions */}
        <section className="card">
          <div className="row">
            {restaurant.meal_order_url && (
              <button className="btn btn-order" onClick={handleOrderClick}>
                <span>📦</span> Order / Subscribe
              </button>
            )}

            {/* Trainer Bundles */}
            {trainerBundles.map((bundle) => (
              <button
                key={bundle.id}
                className="btn btn-trainer"
                onClick={() => handleTrainerClick(bundle)}
              >
                <span>💪</span> {bundle.cta_label}
              </button>
            ))}

            {restaurant.instagram_url && (
              <a
                href={restaurant.instagram_url}
                target="_blank"
                rel="noopener"
                onClick={handleInstagramClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  justifyContent: "center",
                  width: "100%",
                  textDecoration: "none",
                  background: "linear-gradient(45deg,#f58529,#dd2a7b,#8134af,#515bd4)",
                  color: "#fff",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  fontWeight: 700,
                  marginTop: "10px",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  style={{ display: "block" }}
                >
                  <path
                    fill="#fff"
                    d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.31.975.975 1.248 2.242 1.31 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.31 3.608-.975.975-2.242 1.248-3.608 1.31-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.31-.975-.975-1.248-2.242-1.31-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.31-3.608.975-.975 2.242-1.248 3.608-1.31C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.735 0 8.332.014 7.052.072 5.775.13 4.897.304 4.158.543c-.78.255-1.438.597-2.096 1.255C1.403 2.456 1.06 3.114.806 3.894.567 4.633.393 5.511.335 6.788.277 8.068.263 8.471.263 12c0 3.529.014 3.932.072 5.212.058 1.277.232 2.155.471 2.894.255.78.597 1.438 1.255 2.096.658.658 1.316 1 2.096 1.255.739.239 1.617.413 2.894.471 1.28.058 1.683.072 5.212.072s3.932-.014 5.212-.072c1.277-.058 2.155-.232 2.894-.471.78-.255 1.438-.597 2.096-1.255.658-.658 1-1.316 1.255-2.096.239-.739.413-1.617.471-2.894.058-1.28.072-1.683.072-5.212 0-3.529-.014-3.932-.072-5.212-.058-1.277-.232-2.155-.471-2.894-.255-.78-.597-1.438-1.255-2.096C21.544 1.14 20.886.798 20.106.543c-.739-.239-1.617-.413-2.894-.471C15.932.014 15.529 0 12 0zM12 5.838a6.162 6.162 0 1 0 0 12.324A6.162 6.162 0 0 0 12 5.838zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"
                  />
                </svg>
                Follow Us on Instagram
              </a>
            )}
          </div>

          <div className="row" style={{ marginTop: "10px" }}>
            <button className="btn btn-outline" onClick={handleA2HS}>
              ➕ Add to Home Screen
            </button>
            <button className="btn btn-outline" onClick={handleShare}>
              🔗 Share
            </button>
          </div>
          <div className="sub" style={{ textAlign: "center", marginTop: "8px" }}>
            Love your meals? Share with a friend — they'll thank you later 😋.
          </div>
        </section>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "18px 0", fontSize: "12px", color: "#9ca3af" }}>
          Powered by{" "}
          <a
            href="https://tapaway.co"
            target="_blank"
            rel="noopener"
            style={{ color: "#0ea5e9", fontWeight: 700, textDecoration: "none" }}
          >
            TapAway
          </a>
        </div>
      </div>

      {/* Love Modal */}
      {showLoveModal && (
        <div className={`modal ${showLoveModal ? "show" : ""}`} onClick={(e) => e.target === e.currentTarget && setShowLoveModal(false)}>
          <div className="sheet">
            <button className="close" onClick={() => setShowLoveModal(false)}>
              ✕
            </button>
            {!loveSubmitted ? (
              <>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 900 }}>
                  {restaurant.avm_positive_label || "Loved it! 💚"}
                </h3>
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
                  <button className="btn btn-green" type="submit" style={{ width: "100%" }}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h3>Thank you! 💚</h3>
                <p className="sub">Your note helps us keep the good stuff coming.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <div className={`modal ${showFeedbackModal ? "show" : ""}`} onClick={(e) => e.target === e.currentTarget && setShowFeedbackModal(false)}>
          <div className="sheet">
            <button className="close" onClick={() => setShowFeedbackModal(false)}>
              ✕
            </button>
            {!feedbackSubmitted ? (
              <>
                <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 900 }}>Could be better</h3>
                <p className="sub">Help us improve your experience</p>
                <form onSubmit={handleFeedbackSubmit}>
                  <div className="stars" onMouseLeave={() => setHoverStars(0)}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className="star-btn"
                        onClick={() => setStarRating(star)}
                        onMouseEnter={() => setHoverStars(star)}
                      >
                        <svg
                          className={`star ${(hoverStars || starRating) >= star ? "filled" : ""}`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 3.5l2.8 5.7 6.3.9-4.6 4.5 1.1 6.3L12 17.9 6.4 21l1.1-6.3-4.6-4.5 6.3-.9L12 3.5z" />
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
                  <button className="btn btn-amber" type="submit" style={{ width: "100%" }}>
                    Send
                  </button>
                </form>
              </>
            ) : (
              <div style={{ textAlign: "center" }}>
                <h3>Got it — thank you 🙏</h3>
                <p className="sub">We'll review this personally and make it right.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* A2HS Modal */}
      {showA2HSModal && (
        <div className={`modal ${showA2HSModal ? "show" : ""}`} onClick={(e) => e.target === e.currentTarget && setShowA2HSModal(false)}>
          <div className="sheet" style={{ background: "transparent", border: "none", boxShadow: "none" }}>
            <div className="bubble">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                <div style={{ fontWeight: 900 }}>Install {restaurant.restaurant_name}</div>
                <button className="close" onClick={() => setShowA2HSModal(false)}>
                  ✕
                </button>
              </div>
              <p>Add this page to your home screen for quick access.</p>
              <p style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                {isIOS ? (
                  <>
                    Tap{" "}
                    <svg className="shareIcon" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 16V4m0 0-3 3m3-3 3 3"
                        stroke="#111827"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <rect x="5" y="10" width="14" height="10" rx="2" stroke="#111827" strokeWidth="2" />
                    </svg>{" "}
                    then "Add to Home Screen".
                  </>
                ) : (
                  "Open browser menu (⋮) then 'Add to Home screen'."
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
