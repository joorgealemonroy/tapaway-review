import { useEffect, useState } from "react";
import { useParams, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { YelpIcon } from "@/components/icons/YelpIcon";
import { AvMealPrepHub } from "@/components/hubs/AvMealPrepHub";

interface Restaurant {
  id: string;
  restaurant_name: string;
  header_title: string;
  header_subtitle: string;
  menu_title: string;
  google_review_url: string | null;
  yelp_review_url: string | null;
  directions_url: string | null;
  instagram_url: string | null;
  logo_url: string | null;
  hub_background_style: string | null;
  custom_slug: string | null;
  custom_background_url: string | null;
  phone: string | null;
  type?: string | null;
  avm_question_title?: string | null;
  avm_question_subtitle?: string | null;
  avm_positive_label?: string | null;
  avm_negative_label?: string | null;
}

interface MenuSection {
  id: string;
  name: string;
  items: MenuItem[];
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string | null;
}

const ReviewHub = () => {
  const { restaurantId, customSlug, slug } = useParams<{ 
    restaurantId?: string; 
    customSlug?: string; 
    slug?: string; 
  }>();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagements, setEngagements] = useState<any[]>([]);
  const [pollVotes, setPollVotes] = useState<Record<string, Record<string, number>>>({});
  
  // Visitor theme preference (light/dark) - defaults to light, respects saved preference
  const [visitorTheme, setVisitorTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('tapaway_hub_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'light';
  });

  // Track when a restaurant is loaded (tap event)
  useEffect(() => {
    if (restaurant) {
      trackEvent('tap');
    }
  }, [restaurant]);

  useEffect(() => {
    // Check if we're on a custom slug route (not /hub/:id)
    const isCustomSlugRoute = !location.pathname.startsWith('/hub/');
    
    // Try customSlug first, then slug (from /:slug route via UsernameResolver)
    const effectiveSlug = customSlug || slug;
    
    if (isCustomSlugRoute && effectiveSlug) {
      // Fetch by custom slug
      fetchRestaurantBySlug(effectiveSlug);
    } else if (restaurantId) {
      // Fetch by ID
      fetchRestaurant(restaurantId);
    }
  }, [restaurantId, customSlug, slug, location]);

  const fetchRestaurantBySlug = async (slug: string) => {
    // Use restaurant_public_info view which is publicly accessible (no RLS restrictions)
    const { data, error } = await supabase
      .from("restaurant_public_info")
      .select("*")
      .eq("custom_slug", slug)
      .single();

    if (error || !data) {
      console.error("Restaurant not found for slug:", slug, error);
      setRestaurant(null);
      setLoading(false);
      return;
    }

    setRestaurant({ 
      ...data, 
      hub_background_style: data.hub_background_style || 'classic'
    } as Restaurant);
    setLoading(false);
    if (data.id) {
      fetchMenu(data.id);
      fetchEngagement(data.id);
    }
  };

  const fetchRestaurant = async (id: string) => {
    const { data } = await supabase
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url, hub_background_style, custom_slug, custom_background_url, type, avm_question_title, avm_question_subtitle, avm_positive_label, avm_negative_label, phone")
      .eq("id", id)
      .single();

    if (data) {
      setRestaurant({ 
        ...data, 
        hub_background_style: data.hub_background_style || 'classic'
      });
      fetchMenu(data.id);
      fetchEngagement(data.id);
    }
  };

  const fetchEngagement = async (restId: string) => {
    const { data } = await supabase
      .from("restaurant_engagement")
      .select("*")
      .eq("restaurant_id", restId)
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      // Get max 1 promotion + 1 poll
      const promotion = data.find(e => e.type === 'promotion');
      const poll = data.find(e => e.type === 'poll');
      const activeEngagements = [promotion, poll].filter(Boolean);
      setEngagements(activeEngagements);
      
      // Set poll votes for each poll
      const votes: Record<string, Record<string, number>> = {};
      activeEngagements.forEach(e => {
        if (e.type === 'poll' && e.options && typeof e.options === 'object' && 'votes' in e.options) {
          votes[e.id] = e.options.votes as Record<string, number>;
        }
      });
      setPollVotes(votes);
    }
  };

  const fetchMenu = async (restId: string) => {
    const { data: sections } = await supabase
      .from("menu_sections")
      .select(`
        *,
        menu_items (*)
      `)
      .eq("restaurant_id", restId)
      .order("sort_order");

    if (sections) {
      setMenuSections(sections.map(s => ({
        ...s,
        items: s.menu_items || []
      })));
    }
  };

  const isSafeUrl = (url: string | null): boolean => {
    if (!url) return false;
    try {
      const parsed = new URL(url);
      return ['http:', 'https:', 'instagram:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  };

  const getInstagramDeepLink = (url: string): string => {
    try {
      if (url.startsWith('instagram://')) return url;
      const username = url.replace(/^https?:\/\/(www\.)?instagram\.com\/@?/, "").split("/")[0];
      if (username) return `instagram://user?username=${username}`;
    } catch {}
    return url;
  };

  const trackEvent = async (eventName: string) => {
    if (!restaurant) return;
    
    try {
      const { error } = await supabase.functions.invoke('track-event', {
        body: {
          restaurant_id: restaurant.id,
          event_type: eventName,
          event_data: {},
        }
      });

      if (error) {
        console.error("Error tracking event:", error);
      }
    } catch (err) {
      console.error("Error tracking event:", err);
    }
  };

  useEffect(() => {
    if (menuOpen) {
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
    } else {
      document.documentElement.style.overflow = 'unset';
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.documentElement.style.overflow = 'unset';
      document.body.style.overflow = 'unset';
    };
  }, [menuOpen]);

  useEffect(() => {
    // Set loading to false after attempting to fetch
    const timer = setTimeout(() => setLoading(false), 2000);
    return () => clearTimeout(timer);
  }, []);

  if (loading && !restaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '100vh', background: '#fff' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: '48px', height: '48px', border: '4px solid #111', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 1s linear infinite', margin: '0 auto 16px' }}></div>
          <p style={{ color: '#6b7280' }}>Loading...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // If not loading and still no restaurant, show not found
  if (!restaurant) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', minHeight: '100vh', background: '#fff', padding: '16px' }}>
        <div style={{ textAlign: 'center', maxWidth: '480px' }}>
          <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', fontSize: '32px' }}>
            🔍
          </div>
          <h1 style={{ fontSize: '28px', fontWeight: '800', color: '#111', marginBottom: '8px' }}>Hub Not Found</h1>
          <p style={{ color: '#6b7280', marginBottom: '24px', fontSize: '15px', lineHeight: '1.5' }}>
            We couldn't find the review hub you're looking for. Please check the URL and try again.
          </p>
          <a 
            href="https://tapaway.co" 
            style={{ display: 'inline-block', padding: '14px 24px', background: '#111', color: '#fff', borderRadius: '12px', textDecoration: 'none', fontWeight: '700' }}
          >
            Visit TapAway.co
          </a>
        </div>
      </div>
    );
  }

  // AV Meal Prep custom hub
  if (restaurant.custom_slug === 'avmealpreps' || restaurant.type === 'meal_prep') {
    return <AvMealPrepHub restaurant={restaurant} trackEvent={trackEvent} />;
  }

  const handlePollVote = async (engagementId: string, optionIndex: number, engagementOptions: any) => {
    if (!restaurant) return;
    
    // Check if user has already voted using localStorage
    const voteKey = `poll_vote_${engagementId}`;
    const hasVotedOnPoll = localStorage.getItem(voteKey);
    
    if (hasVotedOnPoll) {
      return; // User has already voted
    }
    
    try {
      const currentVotes = pollVotes[engagementId] || {};
      const newVotes = { ...currentVotes };
      newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
      setPollVotes(prev => ({ ...prev, [engagementId]: newVotes }));

      await supabase
        .from("restaurant_engagement")
        .update({ 
          options: { 
            ...engagementOptions, 
            votes: newVotes 
          } 
        })
        .eq("id", engagementId);

      // Mark as voted in localStorage
      localStorage.setItem(voteKey, 'true');
      trackEvent('poll_vote');
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  // Helper to check if user has voted on a specific poll
  const hasVotedOnPoll = (engagementId: string) => localStorage.getItem(`poll_vote_${engagementId}`) === 'true';

  // Toggle visitor theme preference
  const toggleVisitorTheme = () => {
    const newTheme = visitorTheme === 'light' ? 'dark' : 'light';
    setVisitorTheme(newTheme);
    localStorage.setItem('tapaway_hub_theme', newTheme);
  };

  // Use visitor theme instead of restaurant setting
  const getBackgroundStyle = () => {
    if (visitorTheme === 'dark') {
      return { background: '#1a1a1a' };
    }
    return { background: '#f9fafb' };
  };

  const getCardBackground = () => {
    if (visitorTheme === 'dark') {
      return '#262626';
    }
    return '#ffffff';
  };

  const getTextColor = () => {
    if (visitorTheme === 'dark') {
      return '#ffffff';
    }
    return '#111827';
  };

  const getMutedTextColor = () => {
    if (visitorTheme === 'dark') {
      return '#d1d5db';
    }
    return '#6b7280';
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'flex-start', 
        width: '100%', 
        boxSizing: 'border-box', 
        minHeight: '100vh', 
        paddingTop: '0',
        marginTop: '0',
        paddingBottom: '40px',
        paddingLeft: '16px',
        paddingRight: '16px',
        transition: 'background 0.3s ease',
        ...getBackgroundStyle()
      }}>
        <div style={{ 
          maxWidth: '480px', 
          width: '100%', 
          margin: '0 auto', 
          padding: '32px 28px', 
          border: `1px solid ${visitorTheme === 'dark' ? '#404040' : '#e5e7eb'}`, 
          borderRadius: '16px', 
          boxShadow: visitorTheme === 'dark' ? '0 10px 40px rgba(0,0,0,0.5)' : '0 10px 40px rgba(0,0,0,0.12)', 
          background: getCardBackground(), 
          fontFamily: "'Inter',system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif", 
          textAlign: 'center' as const,
          position: 'relative' as const,
          transition: 'all 0.3s ease'
        }}>
          
          {/* Theme Toggle */}
          <button
            onClick={toggleVisitorTheme}
            style={{
              position: 'absolute',
              top: '16px',
              right: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: visitorTheme === 'dark' ? '#404040' : '#f3f4f6',
              border: `1px solid ${visitorTheme === 'dark' ? '#525252' : '#d1d5db'}`,
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: '600',
              color: getTextColor(),
              transition: 'all 0.2s ease'
            }}
            aria-label="Toggle theme"
          >
            {visitorTheme === 'light' ? (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <span>Light</span>
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
                <span>Dark</span>
              </>
            )}
          </button>
          
          {/* Logo */}
          {restaurant.logo_url && (
            <img 
              src={restaurant.logo_url} 
              alt="Restaurant Logo" 
              style={{ 
                maxWidth: '280px', 
                maxHeight: '280px', 
                width: 'auto',
                height: 'auto',
                borderRadius: '16px', 
                margin: '32px auto 28px', 
                objectFit: 'contain',
                display: 'block'
              }} 
            />
          )}

          {/* Header */}
          <h2 style={{ margin: '0 0 8px', fontSize: '28px', lineHeight: '1.2', fontWeight: '800', color: getTextColor() }}>
            {restaurant.header_title}
          </h2>
          <p style={{ margin: '0 0 22px', color: getMutedTextColor(), fontSize: '15px', lineHeight: '1.5' }}>
            {restaurant.header_subtitle}
          </p>

          {/* ENGAGEMENT: Promotions and Polls */}
          {engagements.map((eng) => (
            <div key={eng.id} style={{
              background: '#2a2a2a',
              borderRadius: '20px',
              padding: '24px',
              marginBottom: '24px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
              textAlign: 'left'
            }}>
              {eng.type === 'promotion' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                    </svg>
                    <span style={{ fontWeight: '700', fontSize: '16px', color: '#ffffff', letterSpacing: '0.02em' }}>Special Offer</span>
                  </div>
                  <p style={{ 
                    color: '#ffffff', 
                    fontSize: '28px', 
                    lineHeight: '1.25', 
                    marginBottom: eng.options?.link ? '20px' : '0',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '-0.01em'
                  }}>
                    {eng.content}
                  </p>
                  {eng.options?.link && (
                    <a
                      href={eng.options.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('promotion_click')}
                      style={{
                        display: 'inline-block',
                        padding: '14px 28px',
                        background: '#ffffff',
                        color: '#000000',
                        borderRadius: '12px',
                        fontWeight: '700',
                        fontSize: '15px',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.2)'
                      }}
                    >
                      Learn More
                    </a>
                  )}
                </>
              )}
              
              {eng.type === 'poll' && (() => {
                const currentPollVotes = pollVotes[eng.id] || {};
                const totalVotes = Object.values(currentPollVotes).reduce((a, b) => a + b, 0);
                const hasVoted = hasVotedOnPoll(eng.id);
                
                return (
                  <>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a1a1aa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
                      </svg>
                      <span style={{ fontWeight: '700', fontSize: '16px', color: '#a1a1aa', letterSpacing: '0.02em' }}>Quick Poll</span>
                    </div>
                    <p style={{ color: '#ffffff', fontSize: '32px', lineHeight: '1.2', marginBottom: '24px', fontWeight: '700' }}>
                      {eng.content}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                      {eng.options?.choices?.map((choice: string, index: number) => {
                        const votes = currentPollVotes[index] || 0;
                        const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                        const isWinner = totalVotes > 0 && votes === Math.max(...Object.values(currentPollVotes));
                        
                        return (
                          <div
                            key={index}
                            style={{
                              position: 'relative',
                              padding: isWinner && totalVotes > 0 ? '3px' : '0',
                              background: isWinner && totalVotes > 0 
                                ? 'linear-gradient(90deg, #22c55e, #fb923c)' 
                                : 'transparent',
                              borderRadius: '50px',
                              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                          >
                            <button
                              onClick={() => handlePollVote(eng.id, index, eng.options)}
                              disabled={hasVoted}
                              style={{
                                position: 'relative',
                                width: '100%',
                                padding: '16px 20px',
                                background: '#f5f5f5',
                                border: 'none',
                                borderRadius: '50px',
                                cursor: hasVoted ? 'default' : 'pointer',
                                textAlign: 'left',
                                overflow: 'hidden',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1), transform 0.15s ease',
                                boxShadow: isWinner && totalVotes > 0 
                                  ? 'none' 
                                  : '0 2px 8px rgba(0, 0, 0, 0.1)',
                                transform: 'scale(1)'
                              }}
                              onMouseDown={(e) => {
                                if (!hasVoted) {
                                  (e.currentTarget as HTMLButtonElement).style.transform = 'scale(0.98)';
                                }
                              }}
                              onMouseUp={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                              }}
                              onMouseLeave={(e) => {
                                (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)';
                              }}
                            >
                              {/* Progress bar */}
                              {totalVotes > 0 && (
                                <div style={{
                                  position: 'absolute',
                                  left: 0,
                                  bottom: 0,
                                  height: '4px',
                                  width: `${percentage}%`,
                                  background: isWinner
                                    ? 'linear-gradient(90deg, #22c55e, #fb923c)'
                                    : '#fb923c',
                                  transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                                  borderRadius: '0 0 50px 50px'
                                }} />
                              )}
                              <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                                <span style={{ fontWeight: '700', color: '#1f1f1f', fontSize: '17px', flex: 1 }}>{choice}</span>
                                {totalVotes > 0 && (
                                  <span style={{ 
                                    fontSize: '15px', 
                                    color: '#6b7280', 
                                    fontWeight: '600',
                                    whiteSpace: 'nowrap',
                                    opacity: 1,
                                    transition: 'opacity 0.4s ease'
                                  }}>
                                    <span style={{ fontWeight: '700', color: '#1f1f1f' }}>{percentage}%</span>
                                    <span style={{ color: '#9ca3af', marginLeft: '6px' }}>
                                      {votes === 1 ? `${votes} vote` : `${votes} votes`}
                                    </span>
                                  </span>
                                )}
                              </div>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                    {totalVotes > 0 && (
                      <p style={{ 
                        fontSize: '13px', 
                        color: '#71717a', 
                        marginTop: '20px',
                        textAlign: 'center',
                        fontWeight: '500'
                      }}>
                        Powered by <span style={{ fontWeight: '700', color: '#a1a1aa' }}>TapAway</span>
                      </p>
                    )}
                  </>
                );
              })()}
            </div>
          ))}

          {/* GOOGLE REVIEW */}
          {isSafeUrl(restaurant.google_review_url) && (
            <a 
              href={restaurant.google_review_url!}
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent('google_click')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                justifyContent: 'center', 
                width: '100%', 
                textDecoration: 'none', 
                background: visitorTheme === 'dark' ? '#3a3a3a' : '#fff', 
                border: `1px solid ${visitorTheme === 'dark' ? '#4a4a4a' : '#e5e7eb'}`,
                color: getTextColor(), 
                padding: '14px 16px', 
                borderRadius: '12px', 
                fontWeight: '700', 
                marginBottom: '12px', 
                transition: '.2s',
                cursor: 'pointer'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.084 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C33.64 6.053 29.084 4 24 4c-7.682 0-14.344 4.337-17.694 10.691z"/>
                <path fill="#4CAF50" d="M24 44c5.167 0 9.86-1.977 13.409-5.193l-6.198-5.238C29.104 35.091 26.715 36 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.794 2.241-2.231 4.166-3.894 5.569l6.2 5.238C36.945 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
              </svg>
              Leave a Google Review
            </a>
          )}

          {/* YELP */}
          {isSafeUrl(restaurant.yelp_review_url) && (
            <a 
              href={restaurant.yelp_review_url!}
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent('yelp_click')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                justifyContent: 'center', 
                width: '100%', 
                textDecoration: 'none', 
                background: '#d32323', 
                color: '#fff', 
                padding: '14px 16px', 
                borderRadius: '12px', 
                fontWeight: '700', 
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <YelpIcon size={20} />
              Find Us on Yelp
            </a>
          )}

          {/* INSTAGRAM */}
          {isSafeUrl(restaurant.instagram_url) && (
            <a 
              href={getInstagramDeepLink(restaurant.instagram_url!)}
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent('instagram_click')}
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
                cursor: 'pointer'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true" style={{ display: 'block', flexShrink: 0 }}>
                <path fill="#fff" d="M12 2.163c3.204 0 3.584.012 4.85.07 1.366.062 2.633.334 3.608 1.31.975.975 1.248 2.242 1.31 3.608.058 1.266.07 1.646.07 4.85s-.012 3.584-.07 4.85c-.062 1.366-.334 2.633-1.31 3.608-.975.975-2.242 1.248-3.608 1.31-1.266.058-1.646.07-4.85.07s-3.584-.012-4.85-.07c-1.366-.062-2.633-.334-3.608-1.31-.975-.975-1.248-2.242-1.31-3.608C2.175 15.747 2.163 15.367 2.163 12s.012-3.584.07-4.85c.062-1.366.334-2.633 1.31-3.608.975-.975 2.242-1.248 3.608-1.31C8.416 2.175 8.796 2.163 12 2.163zm0-2.163C8.735 0 8.332.014 7.052.072 5.775.13 4.897.304 4.158.543c-.78.255-1.438.597-2.096 1.255C1.403 2.456 1.06 3.114.806 3.894.567 4.633.393 5.511.335 6.788.277 8.068.263 8.471.263 12c0 3.529.014 3.932.072 5.212.058 1.277.232 2.155.471 2.894.255.78.597 1.438 1.255 2.096.658.658 1.316 1 2.096 1.255.739.239 1.617.413 2.894.471 1.28.058 1.683.072 5.212.072s3.932-.014 5.212-.072c1.277-.058 2.155-.232 2.894-.471.78-.255 1.438-.597 2.096-1.255.658-.658 1-1.316 1.255-2.096.239-.739.413-1.617.471-2.894.058-1.28.072-1.683.072-5.212 0-3.529-.014-3.932-.072-5.212-.058-1.277-.232-2.155-.471-2.894-.255-.78-.597-1.438-1.255-2.096C21.544 1.14 20.886.798 20.106.543c-.739-.239-1.617-.413-2.894-.471C15.932.014 15.529 0 12 0zM12 5.838a6.162 6.162 0 1 0 0 12.324A6.162 6.162 0 0 0 12 5.838zm0 10.162a3.999 3.999 0 1 1 0-7.998 3.999 3.999 0 0 1 0 7.998zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
              </svg>
              Follow Us on Instagram
            </a>
          )}

          {/* DIRECTIONS */}
          {isSafeUrl(restaurant.directions_url) && (
            <a 
              href={restaurant.directions_url!}
              target="_blank" 
              rel="noopener noreferrer"
              onClick={() => trackEvent('directions_click')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                justifyContent: 'center', 
                width: '100%', 
                textDecoration: 'none', 
                background: '#2563eb', 
                color: '#fff', 
                padding: '14px 16px', 
                borderRadius: '12px', 
                fontWeight: '700', 
                marginBottom: '12px',
                cursor: 'pointer'
              }}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 2C8.14 2 5 5.14 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.86-3.14-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5S10.62 6.5 12 6.5s2.5 1.12 2.5 2.5S13.38 11.5 12 11.5z"/>
              </svg>
              Get Directions
            </a>
          )}

          {/* PHONE - Call to Order */}
          {restaurant.phone && (
            <a 
              href={`tel:${restaurant.phone}`}
              onClick={() => trackEvent('phone_click')}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px', 
                justifyContent: 'center', 
                width: '100%', 
                textDecoration: 'none', 
                background: '#16a34a', 
                color: '#fff', 
                padding: '14px 16px', 
                borderRadius: '12px', 
                fontWeight: '700', 
                marginBottom: '12px',
                cursor: 'pointer',
                transition: 'opacity 0.2s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2a1.003 1.003 0 011.01-.24c1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/>
              </svg>
              Call to Place an Order
            </a>
          )}

          {/* MENU BUTTON */}
          <a 
            href="#"
            onClick={(e) => {
              e.preventDefault();
              trackEvent('menu_view');
              setMenuOpen(true);
            }}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              justifyContent: 'center', 
              width: '100%', 
              textDecoration: 'none', 
              background: visitorTheme === 'dark' ? '#4a4a4a' : '#111',
              color: '#fff', 
              padding: '14px 16px', 
              borderRadius: '12px', 
              fontWeight: '700', 
              marginBottom: '8px',
              cursor: 'pointer'
            }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#fff" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 20H3V8h18v12zm0-14H3V4h18v2zm-9 8v2h5v-2h-5z"/>
            </svg>
            {restaurant.menu_title}
          </a>

          <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: `1px solid ${visitorTheme === 'dark' ? '#4a4a4a' : '#eee'}`, fontSize: '12px', color: getMutedTextColor() }}>
            Powered by <a href="https://tapaway.co" target="_blank" rel="noopener noreferrer" style={{ color: getTextColor(), textDecoration: 'none', fontWeight: '700' }}>TapAway</a>
          </div>
        </div>
      </div>

      {/* Promotion animation keyframes */}
      <style>{`
        @keyframes promotionFadeIn {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      {/* MENU MODAL */}
      {menuOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(17,24,39,0.6)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
          onClick={() => setMenuOpen(false)}
        >
          <div 
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '780px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sticky Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
              <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#111', margin: 0 }}>{restaurant.restaurant_name}</h2>
              <Button
                variant="ghost"
                size="sm"
                style={{ borderRadius: '9999px', padding: '8px 16px', fontWeight: '600' }}
                onClick={() => setMenuOpen(false)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
                <span style={{ marginLeft: '8px' }}>Close</span>
              </Button>
            </div>

            {/* Scrollable Menu Content */}
            <div style={{ overflowY: 'auto', padding: '24px' }}>
              {menuSections.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {menuSections.map((section) => (
                    <details key={section.id} style={{ background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
                      <summary style={{ cursor: 'pointer', padding: '16px', fontWeight: '700', fontSize: '18px', color: '#111', listStyle: 'none' }}>
                        {section.name}
                      </summary>
                      <div style={{ padding: '0 16px 16px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {section.items.map((item) => (
                          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '8px', paddingBottom: '8px' }}>
                            <div style={{ flex: 1 }}>
                              <p style={{ fontWeight: '600', color: '#111', margin: '0 0 4px 0' }}>{item.name}</p>
                              {item.description && (
                                <p style={{ fontSize: '14px', color: '#6b7280', margin: 0, lineHeight: '1.5' }}>{item.description}</p>
                              )}
                            </div>
                            {item.price && (
                              <p style={{ fontWeight: '700', color: '#111', marginLeft: '16px', flexShrink: 0, margin: 0 }}>{item.price}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '48px 0' }}>
                  <p style={{ color: '#6b7280', fontSize: '15px' }}>Menu coming soon...</p>
                </div>
              )}
              
              {/* Menu Disclaimers */}
              {menuSections.length > 0 && (
                <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #e5e7eb' }}>
                  <p style={{ fontSize: '11px', color: '#9ca3af', textAlign: 'center', marginBottom: '16px' }}>
                    Prices may change at any time. Please refer to in-person menu for the most accurate pricing.
                  </p>
                  <div style={{ fontSize: '11px', color: '#6b7280', lineHeight: '1.5', background: '#fef3c7', padding: '12px', borderRadius: '8px', border: '1px solid #fcd34d' }}>
                    <p style={{ margin: '0 0 8px 0' }}>
                      <strong>AVISO IMPORTANTE:</strong> El comer ostras y mariscos crudos puede causar una enfermedad grave y hasta la muerte, especialmente en personas con enfermedades del hígado u otras condiciones que debilitan el sistema inmunológico. Si come ostras crudas y se enferma, busque atención médica inmediata.
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>WARNING:</strong> Eating raw oysters/seafood may cause severe illness or death in individuals with liver disease or weakened immune systems. Seek immediate medical attention if you become ill.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewHub;
