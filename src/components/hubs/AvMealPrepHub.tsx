import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Restaurant {
  id: string;
  restaurant_name: string;
  instagram_url: string | null;
  custom_slug: string | null;
  logo_url: string | null;
  header_title: string | null;
  header_subtitle: string | null;
  menu_title: string | null;
  avm_question_title?: string | null;
  avm_question_subtitle?: string | null;
  avm_positive_label?: string | null;
  avm_negative_label?: string | null;
}

interface AvMealPrepHubProps {
  restaurant: Restaurant;
  trackEvent: (eventName: string, eventData?: any) => Promise<void>;
}

interface MenuItem {
  id: string;
  name: string;
  calories: string;
  details: string;
  image_url: string;
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
  price_label: string;
  cta_label: string;
  cta_url: string;
}

export const AvMealPrepHub = ({ restaurant, trackEvent }: AvMealPrepHubProps) => {
  const [loveModalOpen, setLoveModalOpen] = useState(false);
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false);
  const [a2hsModalOpen, setA2hsModalOpen] = useState(false);
  const [currentStars, setCurrentStars] = useState(0);
  const [loveSubmitted, setLoveSubmitted] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [trainerBundles, setTrainerBundles] = useState<TrainerBundle[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [restaurant.id]);

  const fetchData = async () => {
    try {
      // Fetch menu items
      const { data: sections } = await supabase
        .from("avm_menu_sections")
        .select("id")
        .eq("restaurant_id", restaurant.id)
        .order("sort_order");

      if (sections && sections.length > 0) {
        const sectionIds = sections.map(s => s.id);
        const { data: items } = await supabase
          .from("avm_menu_items")
          .select("*")
          .in("section_id", sectionIds)
          .eq("is_active", true)
          .order("sort_order");
        
        if (items) setMenuItems(items as MenuItem[]);
      }

      // Fetch testimonials
      const { data: testimonialsData } = await supabase
        .from("avm_testimonials")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order");
      
      if (testimonialsData) setTestimonials(testimonialsData as Testimonial[]);

      // Fetch trainer bundles
      const { data: bundlesData } = await supabase
        .from("avm_trainer_bundles")
        .select("*")
        .eq("restaurant_id", restaurant.id)
        .eq("is_active", true)
        .order("sort_order");
      
      if (bundlesData) setTrainerBundles(bundlesData as TrainerBundle[]);
    } catch (error) {
      console.error("Failed to fetch AV data:", error);
    } finally {
      setLoading(false);
    }
  };

  const toggleDescription = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const scrollMenu = (direction: 'left' | 'right') => {
    const container = document.getElementById('avm-menu-container');
    if (container) {
      const scrollAmount = direction === 'left' ? -300 : 300;
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const handleLoveClick = async () => {
    await trackEvent('avm_loved_click');
    setLoveModalOpen(true);
  };

  const handleFeedbackClick = async () => {
    await trackEvent('avm_could_be_better_click');
    setFeedbackModalOpen(true);
  };

  const handleTrainerBundleClick = async (bundle: TrainerBundle) => {
    await trackEvent('avm_trainer_bundle_click', {
      bundle_id: bundle.id,
      title: bundle.title
    });
    window.open(bundle.cta_url, '_blank');
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLoveModalOpen(false);
        setFeedbackModalOpen(false);
        setA2hsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const questionTitle = restaurant.avm_question_title || "How was your meal?";
  const questionSubtitle = restaurant.avm_question_subtitle || "Share feedback in seconds — no login.";
  const positiveLabel = restaurant.avm_positive_label || "Loved it! 💚";
  const negativeLabel = restaurant.avm_negative_label || "Could be better";

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#00ff41]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white font-sans">
      <style>{`
        * { margin:0; padding:0; box-sizing:border-box; }
        body { background:#0a0a0a; color:#fff; font-family:system-ui,-apple-system,sans-serif; overflow-x:hidden; }
        .avm-container { max-width:1100px; margin:0 auto; padding:0 20px; }
        .avm-header { text-align:center; padding:40px 20px; }
        .avm-logo { width:120px; height:120px; border-radius:50%; margin:0 auto 20px; object-fit:cover; }
        .avm-title { font-size:2.5rem; font-weight:700; margin-bottom:10px; }
        .avm-subtitle { font-size:1.1rem; color:#aaa; }
        .avm-feedback-section { text-align:center; padding:40px 20px; background:linear-gradient(135deg,#1a1a1a,#0f0f0f); border-radius:20px; margin:20px; }
        .avm-question { font-size:1.8rem; font-weight:600; margin-bottom:10px; }
        .avm-subtext { color:#aaa; margin-bottom:30px; }
        .avm-buttons { display:flex; gap:15px; justify-content:center; flex-wrap:wrap; }
        .avm-btn { padding:15px 30px; border-radius:50px; font-size:1rem; font-weight:600; border:none; cursor:pointer; transition:transform 0.2s; }
        .avm-btn:hover { transform:scale(1.05); }
        .avm-btn-love { background:#00ff41; color:#000; }
        .avm-btn-feedback { background:#ff6b35; color:#fff; }
        .avm-quotes-section { padding:60px 20px; }
        .avm-section-title { font-size:2rem; font-weight:700; text-align:center; margin-bottom:40px; }
        .avm-quotes-row { display:flex; gap:20px; overflow-x:auto; padding:10px 0; scrollbar-width:none; }
        .avm-quotes-row::-webkit-scrollbar { display:none; }
        .avm-quote-card { min-width:300px; background:#1a1a1a; padding:25px; border-radius:15px; border-left:4px solid #00ff41; }
        .avm-quote-text { font-style:italic; margin-bottom:15px; line-height:1.6; }
        .avm-quote-author { color:#00ff41; font-weight:600; }
        .avm-menu-section { padding:60px 20px; }
        .avm-menu-controls { display:flex; justify-content:space-between; align-items:center; margin-bottom:30px; }
        .avm-scroll-btn { background:#1a1a1a; border:1px solid #333; color:#fff; width:40px; height:40px; border-radius:50%; cursor:pointer; transition:background 0.2s; }
        .avm-scroll-btn:hover { background:#333; }
        .avm-menu-container { display:flex; gap:20px; overflow-x:auto; padding:10px 0; scrollbar-width:none; }
        .avm-menu-container::-webkit-scrollbar { display:none; }
        .avm-menu-card { min-width:280px; background:#1a1a1a; border-radius:15px; overflow:hidden; }
        .avm-menu-img { width:100%; height:200px; object-fit:cover; }
        .avm-menu-info { padding:20px; }
        .avm-menu-name { font-size:1.2rem; font-weight:600; margin-bottom:5px; }
        .avm-menu-cal { color:#00ff41; margin-bottom:10px; }
        .avm-menu-details-btn { background:none; border:none; color:#aaa; cursor:pointer; margin-top:10px; }
        .avm-menu-desc { color:#ccc; margin-top:10px; line-height:1.5; }
        .avm-trainer-section { padding:60px 20px; }
        .avm-trainer-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(300px,1fr)); gap:20px; margin-top:30px; }
        .avm-trainer-card { background:linear-gradient(135deg,#1a1a1a,#0f0f0f); padding:30px; border-radius:15px; border:1px solid #333; }
        .avm-trainer-title { font-size:1.5rem; font-weight:700; margin-bottom:15px; }
        .avm-trainer-desc { color:#aaa; margin-bottom:15px; line-height:1.6; }
        .avm-trainer-price { color:#00ff41; font-size:1.2rem; font-weight:600; margin-bottom:20px; }
        .avm-trainer-cta { background:#00ff41; color:#000; padding:12px 24px; border-radius:50px; border:none; font-weight:600; cursor:pointer; width:100%; }
        .avm-trainer-cta:hover { transform:scale(1.05); }
        .avm-modal { position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.85); display:flex; align-items:center; justify-center; z-index:1000; }
        .avm-modal-content { background:#1a1a1a; padding:40px; border-radius:20px; max-width:500px; width:90%; }
        .avm-modal-close { float:right; background:none; border:none; color:#fff; font-size:1.5rem; cursor:pointer; }
      `}</style>

      <div className="avm-container">
        {/* Header */}
        <div className="avm-header">
          {restaurant.logo_url && (
            <img src={restaurant.logo_url} alt={restaurant.restaurant_name} className="avm-logo" />
          )}
          <h1 className="avm-title">{restaurant.header_title || restaurant.restaurant_name}</h1>
          <p className="avm-subtitle">{restaurant.header_subtitle || "Nutrition That Works as Hard as You Do"}</p>
        </div>

        {/* Feedback Section */}
        <div className="avm-feedback-section">
          <h2 className="avm-question">{questionTitle}</h2>
          <p className="avm-subtext">{questionSubtitle}</p>
          <div className="avm-buttons">
            <button className="avm-btn avm-btn-love" onClick={handleLoveClick}>
              {positiveLabel}
            </button>
            <button className="avm-btn avm-btn-feedback" onClick={handleFeedbackClick}>
              {negativeLabel}
            </button>
          </div>
        </div>

        {/* Testimonials */}
        {testimonials.length > 0 && (
          <div className="avm-quotes-section">
            <h2 className="avm-section-title">What customers are saying</h2>
            <div className="avm-quotes-row">
              {testimonials.map((quote) => (
                <div key={quote.id} className="avm-quote-card">
                  <p className="avm-quote-text">"{quote.quote}"</p>
                  <p className="avm-quote-author">{quote.author}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        {menuItems.length > 0 && (
          <div className="avm-menu-section">
            <div className="avm-menu-controls">
              <h2 className="avm-section-title" style={{margin:0}}>{restaurant.menu_title || "Menu"}</h2>
              <div style={{display:'flex',gap:'10px'}}>
                <button className="avm-scroll-btn" onClick={() => scrollMenu('left')}>←</button>
                <button className="avm-scroll-btn" onClick={() => scrollMenu('right')}>→</button>
              </div>
            </div>
            <div id="avm-menu-container" className="avm-menu-container">
              {menuItems.map((item) => (
                <div key={item.id} className="avm-menu-card">
                  <img src={item.image_url} alt={item.name} className="avm-menu-img" />
                  <div className="avm-menu-info">
                    <h3 className="avm-menu-name">{item.name}</h3>
                    <p className="avm-menu-cal">{item.calories}</p>
                    {item.details && (
                      <>
                        <button
                          className="avm-menu-details-btn"
                          onClick={() => toggleDescription(item.id)}
                        >
                          Details {expandedItems.has(item.id) ? '▲' : '▼'}
                        </button>
                        {expandedItems.has(item.id) && (
                          <p className="avm-menu-desc">{item.details}</p>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Trainer Bundles */}
        {trainerBundles.length > 0 && (
          <div className="avm-trainer-section">
            <h2 className="avm-section-title">Connect with a personal trainer</h2>
            <div className="avm-trainer-grid">
              {trainerBundles.map((bundle) => (
                <div key={bundle.id} className="avm-trainer-card">
                  <h3 className="avm-trainer-title">{bundle.title}</h3>
                  <p className="avm-trainer-desc">{bundle.description}</p>
                  {bundle.price_label && (
                    <p className="avm-trainer-price">{bundle.price_label}</p>
                  )}
                  <button
                    className="avm-trainer-cta"
                    onClick={() => handleTrainerBundleClick(bundle)}
                  >
                    {bundle.cta_label}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals remain the same */}
      {loveModalOpen && (
        <div className="avm-modal" onClick={() => setLoveModalOpen(false)}>
          <div className="avm-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="avm-modal-close" onClick={() => setLoveModalOpen(false)}>×</button>
            {!loveSubmitted ? (
              <>
                <h3 style={{marginBottom:'20px'}}>Share your love!</h3>
                <p style={{color:'#aaa',marginBottom:'20px'}}>Leave us a review on Google to help others discover us!</p>
                <button
                  className="avm-btn avm-btn-love"
                  style={{width:'100%'}}
                  onClick={() => {
                    window.open('https://g.page/r/YOUR_GOOGLE_REVIEW_LINK', '_blank');
                    setLoveSubmitted(true);
                  }}
                >
                  Leave a Google Review
                </button>
              </>
            ) : (
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'3rem',marginBottom:'20px'}}>🎉</div>
                <h3>Thank you!</h3>
                <p style={{color:'#aaa',marginTop:'10px'}}>We appreciate your feedback!</p>
              </div>
            )}
          </div>
        </div>
      )}

      {feedbackModalOpen && (
        <div className="avm-modal" onClick={() => setFeedbackModalOpen(false)}>
          <div className="avm-modal-content" onClick={(e) => e.stopPropagation()}>
            <button className="avm-modal-close" onClick={() => setFeedbackModalOpen(false)}>×</button>
            {!feedbackSubmitted ? (
              <>
                <h3 style={{marginBottom:'20px'}}>Tell us more</h3>
                <textarea
                  placeholder="What could we improve?"
                  style={{width:'100%',minHeight:'100px',padding:'15px',borderRadius:'10px',background:'#0a0a0a',border:'1px solid #333',color:'#fff',marginBottom:'20px'}}
                />
                <button
                  className="avm-btn avm-btn-feedback"
                  style={{width:'100%'}}
                  onClick={() => setFeedbackSubmitted(true)}
                >
                  Submit Feedback
                </button>
              </>
            ) : (
              <div style={{textAlign:'center'}}>
                <div style={{fontSize:'3rem',marginBottom:'20px'}}>✅</div>
                <h3>Thank you!</h3>
                <p style={{color:'#aaa',marginTop:'10px'}}>We'll work on making it better!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
