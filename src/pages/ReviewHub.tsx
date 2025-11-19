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
  const { restaurantId, customSlug } = useParams();
  const location = useLocation();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [engagement, setEngagement] = useState<any>(null);
  const [pollVotes, setPollVotes] = useState<Record<string, number>>({});

  // Track when a restaurant is loaded (tap event)
  useEffect(() => {
    if (restaurant) {
      trackEvent('tap');
    }
  }, [restaurant]);

  useEffect(() => {
    // Check if we're on a custom slug route (not /hub/:id)
    const isCustomSlugRoute = !location.pathname.startsWith('/hub/');
    
    if (isCustomSlugRoute && customSlug) {
      // Fetch by custom slug
      fetchRestaurantBySlug(customSlug);
    } else if (restaurantId) {
      // Fetch by ID
      fetchRestaurant(restaurantId);
    }
  }, [restaurantId, customSlug, location]);

  const fetchRestaurantBySlug = async (slug: string) => {
    const { data, error } = await (supabase as any)
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url, custom_slug")
      .eq("custom_slug", slug)
      .single();

    if (error || !data) {
      console.error("Restaurant not found for slug:", slug);
      setRestaurant(null);
      setLoading(false);
      return;
    }

    if (data) {
      // Fetch type and hub_background_style from restaurants table
      const { data: restaurantData } = await (supabase as any)
        .from("restaurants")
        .select("type, hub_background_style")
        .eq("id", data.id)
        .single();
      
      setRestaurant({ 
        ...data, 
        type: restaurantData?.type || null,
        hub_background_style: restaurantData?.hub_background_style || 'classic',
        custom_background_url: restaurantData?.custom_background_url || null
      });
      fetchMenu(data.id);
      fetchEngagement(data.id);
    }
  };

  const fetchRestaurant = async (id: string) => {
    const { data } = await (supabase as any)
      .from("restaurant_public_info")
      .select("id, restaurant_name, header_title, header_subtitle, menu_title, google_review_url, yelp_review_url, directions_url, instagram_url, logo_url, custom_slug")
      .eq("id", id)
      .single();

    if (data) {
      // Fetch type and hub_background_style from restaurants table
      const { data: restaurantData } = await (supabase as any)
        .from("restaurants")
        .select("type, hub_background_style")
        .eq("id", data.id)
        .single();
      
      setRestaurant({ 
        ...data, 
        type: restaurantData?.type || null,
        hub_background_style: restaurantData?.hub_background_style || 'classic',
        custom_background_url: restaurantData?.custom_background_url || null
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
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setEngagement(data);
      if (data.type === 'poll' && data.options && typeof data.options === 'object' && 'votes' in data.options) {
        setPollVotes(data.options.votes as Record<string, number>);
      }
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
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
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

  const handlePollVote = async (optionIndex: number) => {
    if (!restaurant || !engagement) return;
    
    // Check if user has already voted using localStorage
    const voteKey = `poll_vote_${engagement.id}`;
    const hasVoted = localStorage.getItem(voteKey);
    
    if (hasVoted) {
      return; // User has already voted
    }
    
    try {
      const newVotes = { ...pollVotes };
      newVotes[optionIndex] = (newVotes[optionIndex] || 0) + 1;
      setPollVotes(newVotes);

      await supabase
        .from("restaurant_engagement")
        .update({ 
          options: { 
            ...engagement.options, 
            votes: newVotes 
          } 
        })
        .eq("id", engagement.id);

      // Mark as voted in localStorage
      localStorage.setItem(voteKey, 'true');
      trackEvent('poll_vote');
    } catch (err) {
      console.error("Error voting:", err);
    }
  };

  // Check if user has voted on current poll
  const hasVoted = engagement ? localStorage.getItem(`poll_vote_${engagement.id}`) === 'true' : false;

  // Strict Light/Dark Theme - only two options
  const getBackgroundStyle = () => {
    const style = restaurant.hub_background_style;
    
    // Only dark or light (classic/default)
    if (style === 'dark') {
      return { background: '#000000' };
    }
    
    // Default to light/classic (clean white)
    return { background: '#ffffff' };
  };

  const getCardBackground = () => {
    const style = restaurant.hub_background_style;
    if (style === 'dark') {
      return '#1a1a1a';
    }
    return '#ffffff';
  };

  const getTextColor = () => {
    const style = restaurant.hub_background_style;
    if (style === 'dark') {
      return '#ffffff';
    }
    return '#111827';
  };

  const getMutedTextColor = () => {
    const style = restaurant.hub_background_style;
    if (style === 'dark') {
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
        padding: '28px 16px',
        ...getBackgroundStyle()
      }}>
        <div style={{ 
          maxWidth: '480px', 
          width: '100%', 
          margin: '0 auto', 
          padding: '32px 28px', 
          border: '1px solid #eee', 
          borderRadius: '16px', 
          boxShadow: '0 10px 40px rgba(0,0,0,0.12)', 
          background: getCardBackground(), 
          fontFamily: "'Inter',system-ui,-apple-system,Segoe UI,Roboto,'Helvetica Neue',Arial,sans-serif", 
          textAlign: 'center' as const
        }}>
          
          {/* Logo */}
          {restaurant.logo_url && (
            <img 
              src={restaurant.logo_url} 
              alt="Restaurant Logo" 
              style={{ 
                maxWidth: '150px', 
                maxHeight: '150px', 
                width: 'auto',
                height: 'auto',
                borderRadius: '12px', 
                margin: '0 auto 24px', 
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

          {/* ENGAGEMENT: Promotion or Poll */}
          {engagement && (
            <div style={{
              background: restaurant.hub_background_style === 'dark' ? 'rgba(42, 42, 42, 0.9)' : 'rgba(249, 250, 251, 0.95)',
              border: `1px solid ${restaurant.hub_background_style === 'dark' ? '#3f3f46' : '#e5e7eb'}`,
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '24px',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
              animation: engagement.type === 'promotion' ? 'promotionFadeIn 0.6s ease-out' : 'none'
            }}>
              {engagement.type === 'promotion' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={getTextColor()} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
                    </svg>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: getTextColor(), letterSpacing: '0.02em' }}>Special Offer</span>
                  </div>
                  <p style={{ 
                    color: getTextColor(), 
                    fontSize: '24px', 
                    lineHeight: '1.3', 
                    marginBottom: engagement.options?.link ? '18px' : '0',
                    fontWeight: '700',
                    textTransform: 'uppercase',
                    letterSpacing: '0.01em'
                  }}>
                    {engagement.content}
                  </p>
                  {engagement.options?.link && (
                    <a
                      href={engagement.options.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => trackEvent('promotion_click')}
                      style={{
                        display: 'inline-block',
                        padding: '12px 24px',
                        background: restaurant.hub_background_style === 'dark' ? '#ffffff' : '#000000',
                        color: restaurant.hub_background_style === 'dark' ? '#000000' : '#ffffff',
                        borderRadius: '8px',
                        fontWeight: '700',
                        fontSize: '14px',
                        textDecoration: 'none',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                      }}
                    >
                      Learn More
                    </a>
                  )}
                </>
              )}
              
              {engagement.type === 'poll' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={getTextColor()} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/>
                    </svg>
                    <span style={{ fontWeight: '700', fontSize: '15px', color: getTextColor(), letterSpacing: '0.02em' }}>Quick Poll</span>
                  </div>
                  <p style={{ color: getTextColor(), fontSize: '20px', lineHeight: '1.4', marginBottom: '20px', fontWeight: '700' }}>
                    {engagement.content}
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {engagement.options?.choices?.map((choice: string, index: number) => {
                      const totalVotes = Object.values(pollVotes).reduce((a: any, b: any) => a + b, 0) as number;
                      const votes = pollVotes[index] || 0;
                      const percentage = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 0;
                      const isWinner = totalVotes > 0 && votes === Math.max(...Object.values(pollVotes) as number[]);
                      
                      return (
                        <button
                          key={index}
                          onClick={() => handlePollVote(index)}
                          disabled={hasVoted}
                          style={{
                            position: 'relative',
                            padding: '18px 20px',
                            background: restaurant.hub_background_style === 'dark' ? '#2d2d2d' : '#f3f4f6',
                            border: totalVotes > 0 && isWinner 
                              ? `3px solid ${restaurant.hub_background_style === 'dark' ? '#10b981' : '#10b981'}` 
                              : 'none',
                            borderRadius: '50px',
                            cursor: hasVoted ? 'default' : 'pointer',
                            textAlign: 'left',
                            overflow: 'hidden',
                            transition: 'all 0.3s ease',
                            boxShadow: totalVotes > 0 && isWinner
                              ? '0 0 0 4px rgba(16, 185, 129, 0.2)'
                              : '0 2px 8px rgba(0, 0, 0, 0.08)'
                          }}
                        >
                          {/* Progress bar with gradient for winner */}
                          {totalVotes > 0 && (
                            <div style={{
                              position: 'absolute',
                              left: 0,
                              top: 0,
                              bottom: 0,
                              width: `${percentage}%`,
                              background: isWinner
                                ? 'linear-gradient(90deg, rgba(251, 146, 60, 0.3) 0%, rgba(16, 185, 129, 0.3) 100%)'
                                : restaurant.hub_background_style === 'dark' 
                                  ? 'rgba(255, 255, 255, 0.1)'
                                  : 'rgba(0, 0, 0, 0.06)',
                              transition: 'width 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
                              borderRadius: '50px'
                            }} />
                          )}
                          <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '14px' }}>
                            <span style={{ fontWeight: '600', color: getTextColor(), fontSize: '16px', flex: 1 }}>{choice}</span>
                            {totalVotes > 0 && (
                              <span style={{ 
                                fontSize: '15px', 
                                color: getTextColor(), 
                                fontWeight: '700',
                                whiteSpace: 'nowrap'
                              }}>
                                {percentage}%{votes > 0 && ` (${votes})`}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {Object.values(pollVotes).reduce((a: any, b: any) => a + b, 0) > 0 && (
                    <p style={{ 
                      fontSize: '12px', 
                      color: getMutedTextColor(), 
                      marginTop: '16px',
                      textAlign: 'center',
                      fontWeight: '500'
                    }}>
                      Powered by TapAway
                    </p>
                  )}
                </>
              )}
            </div>
          )}

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
                background: restaurant.hub_background_style === 'dark' ? '#3a3a3a' : '#fff', 
                border: `1px solid ${restaurant.hub_background_style === 'dark' ? '#4a4a4a' : '#e5e7eb'}`, 
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
                cursor: 'pointer'
              }}
            >
              <YelpIcon className="w-[18px] h-[18px] flex-shrink-0 invert" />
              Find Us on Yelp
            </a>
          )}

          {/* INSTAGRAM */}
          {isSafeUrl(restaurant.instagram_url) && (
            <a 
              href={restaurant.instagram_url!}
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
              background: restaurant.hub_background_style === 'dark' ? '#4a4a4a' : '#111', 
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

          <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: `1px solid ${restaurant.hub_background_style === 'dark' ? '#4a4a4a' : '#eee'}`, fontSize: '12px', color: getMutedTextColor() }}>
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
                    <details key={section.id} open style={{ background: '#f9fafb', borderRadius: '12px', border: '1px solid #e5e7eb' }}>
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
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ReviewHub;
