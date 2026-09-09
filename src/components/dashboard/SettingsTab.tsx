import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Settings, Lock, ExternalLink, Upload, Edit, Loader2 } from "lucide-react";
import { validateAllUrls } from "@/lib/urlValidation";
import { useState as useReactState } from "react";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { SettingsGreeting } from "./SettingsGreeting";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import { RequestMoreCards } from "./RequestMoreCards";
import { DeveloperResetButton } from "../admin/DeveloperResetButton";
import { registerUnsavedGuard } from "@/lib/unsavedChanges";

interface Restaurant {
  id: string;
  restaurant_name: string;
  custom_slug: string;
  logo_url: string | null;
  hub_background_style: string | null;
  google_place_id: string | null;
  google_review_url: string | null;
  yelp_review_url: string | null;
  instagram_url: string | null;
  directions_url: string | null;
  greeting_name?: string | null;
  phone: string | null;
}

interface SettingsTabProps {
  restaurantId: string;
}

export const SettingsTab = ({ restaurantId }: SettingsTabProps) => {
  const { toast } = useToast();
  const { isAdmin } = useAdminAccess();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useReactState(false);
  // Double-submit guard for the Save Changes button.
  const [saving, setSaving] = useState(false);

  // Unsaved-changes tracking: snapshot of the last-saved settings. The
  // dashboard shell warns before switching tabs or closing while dirty.
  // Note: the logo upload and the greeting editor save immediately —
  // their handlers re-sync the snapshot so they don't false-positive.
  const restaurantRef = useRef<Restaurant | null>(null);
  const snapshotRef = useRef<string | null>(null);
  useEffect(() => {
    restaurantRef.current = restaurant;
  }, [restaurant]);
  const syncSnapshot = (next: Restaurant | null) => {
    snapshotRef.current = next ? JSON.stringify(next) : null;
  };
  useEffect(() => {
    return registerUnsavedGuard("settings", {
      isDirty: () => {
        const snap = snapshotRef.current;
        return snap !== null && JSON.stringify(restaurantRef.current) !== snap;
      },
    });
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [restaurantId]);

  const fetchSettings = async () => {
    const { data } = await supabase
      .from("restaurants")
      .select("id, restaurant_name, custom_slug, logo_url, hub_background_style, google_place_id, google_review_url, yelp_review_url, instagram_url, directions_url, greeting_name, phone")
      .eq("id", restaurantId)
      .single();

    if (data) {
      setRestaurant(data);
      syncSnapshot(data);
    }
    
    setLoading(false);
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const randomUuid = crypto.randomUUID();
      const filePath = `${restaurantId}/${randomUuid}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      setRestaurant(prev => {
        const next = prev ? { ...prev, logo_url: publicUrl } : null;
        syncSnapshot(next);
        return next;
      });
      toast({ title: "Logo updated", description: "Your logo has been updated successfully." });
    } catch (error: any) {
      toast({ title: "Error", description: `Upload failed: ${error.message}`, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const saveSettings = async () => {
    if (!restaurant) return;
    // Double-click guard — without it, two rapid saves fire duplicate updates.
    if (saving) return;

    // Validate URLs before saving
    const validation = validateAllUrls({
      google: restaurant.google_review_url,
      yelp: restaurant.yelp_review_url,
      instagram: restaurant.instagram_url,
      directions: restaurant.directions_url,
    });

    if (!validation.valid) {
      const errorMessages = Object.entries(validation.errors)
        .map(([field, message]) => `${field}: ${message}`)
        .join("\n");
      toast({ 
        title: "Invalid URLs", 
        description: errorMessages,
        variant: "destructive" 
      });
      return;
    }

    // If admin is changing slug, check uniqueness
    if (isAdmin && restaurant.custom_slug) {
      const { data: existingSlug } = await supabase
        .from("restaurants")
        .select("id")
        .eq("custom_slug", restaurant.custom_slug)
        .neq("id", restaurantId)
        .maybeSingle();

      if (existingSlug) {
        toast({
          title: "Slug already taken",
          description: `The slug "${restaurant.custom_slug}" is already in use by another restaurant. Please choose a different one.`,
          variant: "destructive"
        });
        return;
      }
    }

    setSaving(true);
    try {
      // Normalize Google Place ID from the input (could be URL or bare ID)
      const normalizedPlaceId = normalizeGooglePlaceId(restaurant.google_place_id);
      // Build canonical review URL from the normalized Place ID
      const canonicalGoogleUrl = buildGoogleReviewUrl(normalizedPlaceId);

      const updateData: any = {
        restaurant_name: restaurant.restaurant_name,
        hub_background_style: restaurant.hub_background_style,
        google_place_id: normalizedPlaceId,
        google_review_url: canonicalGoogleUrl,
        yelp_review_url: restaurant.yelp_review_url,
        instagram_url: restaurant.instagram_url,
        directions_url: restaurant.directions_url,
        phone: restaurant.phone,
      };

      // Only allow admins to update custom_slug
      if (isAdmin && restaurant.custom_slug) {
        updateData.custom_slug = restaurant.custom_slug;
      }

      const { error } = await supabase
        .from("restaurants")
        .update(updateData)
        .eq("id", restaurantId);

      if (error) {
        // Handle unique constraint violation for custom_slug
        if (error.code === '23505' && error.message.includes('custom_slug')) {
          toast({
            title: "Slug already taken",
            description: `The slug "${restaurant.custom_slug}" is already in use. Please choose a different one.`,
            variant: "destructive"
          });
          return;
        }
        throw error;
      }

      // Update local state with normalized values
      const saved = {
        ...restaurant,
        google_place_id: normalizedPlaceId,
        google_review_url: canonicalGoogleUrl,
      };
      setRestaurant(saved);
      syncSnapshot(saved);

      toast({ title: "Settings saved", description: "Your settings have been updated successfully." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to save settings.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-muted-foreground">Restaurant not found.</div>;
  }

  return (
    <div className="space-y-6 pb-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold mb-2 flex items-center gap-2">
            <Settings className="w-7 h-7 text-primary" />
            Settings
          </h2>
          <p className="text-muted-foreground">Manage your restaurant information and links</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <RequestMoreCards restaurantId={restaurantId} />
          <Button
            onClick={saveSettings}
            disabled={saving}
            className="gradient-primary text-white flex-1 sm:flex-none min-h-[44px]"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Saving…
              </>
            ) : (
              "Save Changes"
            )}
          </Button>
        </div>
      </div>

      {/* Greeting Settings */}
      <SettingsGreeting
        restaurant={restaurant}
        onUpdated={(updated) => {
          // Greeting saves itself immediately — keep the unsaved-changes
          // snapshot in sync so it doesn't false-positive as dirty.
          const next = { ...restaurant, ...updated };
          setRestaurant(next);
          syncSnapshot(next);
        }}
      />

      {/* Logo Upload Section */}
      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <Upload className="w-5 h-5 text-primary" />
          Restaurant Logo
        </h3>
        <div className="space-y-4">
          <div>
            <Label>Current Logo</Label>
            {restaurant.logo_url ? (
              <div className="mt-2">
                <img src={restaurant.logo_url} alt="Logo" className="w-32 h-32 object-cover rounded-lg border-2 border-border" />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground mt-2">No logo uploaded</p>
            )}
          </div>
          
          <div>
            <Label htmlFor="logo-upload">Upload New Logo</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={uploading}
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              This logo will appear in your review hub and dashboard
            </p>
          </div>
        </div>
      </Card>


      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          Basic Information
        </h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="name" className="text-sm font-semibold">Restaurant Name</Label>
            <Input
              id="name"
              value={restaurant.restaurant_name}
              onChange={(e) => setRestaurant({ ...restaurant, restaurant_name: e.target.value })}
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="slug" className="text-sm font-semibold flex items-center gap-2">
              Custom Slug
              {isAdmin ? (
                <Edit className="w-4 h-4 text-primary" />
              ) : (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
            </Label>
            <Input
              id="slug"
              value={restaurant.custom_slug || ""}
              onChange={(e) => {
                if (isAdmin) {
                  // Only allow lowercase letters, numbers, and hyphens
                  const sanitized = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '');
                  setRestaurant({ ...restaurant, custom_slug: sanitized });
                }
              }}
              disabled={!isAdmin}
              className={`mt-2 ${!isAdmin ? 'bg-muted cursor-not-allowed' : ''}`}
              placeholder="my-restaurant-name"
            />
            <div className={`mt-2 p-3 rounded-lg border ${isAdmin ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
              <p className={`text-sm ${isAdmin ? 'text-blue-900' : 'text-amber-900'}`}>
                <strong>Your Review Hub:</strong> tapaway.co/{restaurant.custom_slug || "your-slug"}
              </p>
              <p className={`text-xs mt-1 ${isAdmin ? 'text-blue-700' : 'text-amber-700'}`}>
                {isAdmin ? (
                  <>✓ Admin: You can edit this slug. Use only lowercase letters, numbers, and hyphens.</>
                ) : (
                  <>⚠️ Slug cannot be changed after creation. Contact TapAway support if needed.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </Card>

      <Card className="p-6 card-elevated">
        <h3 className="text-lg font-bold mb-4">Links & Social Media</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="google" className="text-sm font-semibold flex items-center gap-2">
              Google Place ID or Review URL
              {restaurant.google_place_id && !isAdmin && (
                <Lock className="w-4 h-4 text-muted-foreground" />
              )}
              {restaurant.google_place_id && isAdmin && (
                <Edit className="w-4 h-4 text-primary" />
              )}
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="google"
                value={restaurant.google_place_id || ""}
                onChange={(e) => {
                  // Only allow changes if no Place ID set yet, or if admin
                  if (!restaurant.google_place_id || isAdmin) {
                    setRestaurant({ ...restaurant, google_place_id: e.target.value });
                  }
                }}
                disabled={!!restaurant.google_place_id && !isAdmin}
                className={restaurant.google_place_id && !isAdmin ? 'bg-muted cursor-not-allowed' : ''}
                placeholder="ChIJ... or https://search.google.com/local/writereview?placeid=..."
              />
              {restaurant.google_review_url && (
                <Button variant="outline" asChild className="shrink-0 h-11 w-11">
                  <a href={restaurant.google_review_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            {restaurant.google_place_id && !isAdmin ? (
              <div className="mt-2 p-3 rounded-lg border bg-amber-50 border-amber-200">
                <p className="text-xs text-amber-700">
                  🔒 Google Place ID is locked to prevent accidental changes. Contact TapAway support if you need to update it.
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-1">
                {isAdmin && restaurant.google_place_id 
                  ? "✓ Admin: You can edit this Google Place ID."
                  : "Paste either the full Google Review URL or just the Place ID (e.g., ChIJV_SjbZJMw4ARZINlm2uAaoE). Used for AI Coach insights."
                }
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="yelp" className="text-sm font-semibold">Yelp URL (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="yelp"
                value={restaurant.yelp_review_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, yelp_review_url: e.target.value })}
                placeholder="https://www.yelp.com/biz/..."
              />
              {restaurant.yelp_review_url && (
                <Button variant="outline" asChild className="shrink-0 h-11 w-11">
                  <a href={restaurant.yelp_review_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Leave blank to hide Yelp button from your Review Hub
            </p>
          </div>
          <div>
            <Label htmlFor="instagram" className="text-sm font-semibold">Instagram URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="instagram"
                value={restaurant.instagram_url || ""}
                onChange={(e) => {
                  let val = e.target.value.trim();
                  const deep = val.match(/^instagram:\/\/user\?username=(.+)$/i);
                  if (deep) {
                    val = `https://instagram.com/${deep[1]}`;
                  } else if (val.startsWith('@')) {
                    val = `https://instagram.com/${val.slice(1)}`;
                  } else if (val && !val.startsWith('http')) {
                    val = `https://instagram.com/${val.replace(/^(www\.)?instagram\.com\//i, '')}`;
                  }
                  setRestaurant({ ...restaurant, instagram_url: val });
                }}

                placeholder="https://instagram.com/yourbusiness"
              />
              {restaurant.instagram_url && (
                <Button variant="outline" asChild className="shrink-0 h-11 w-11">
                  <a href={restaurant.instagram_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your handle (e.g. @yourbusiness) or full URL
            </p>
          </div>
          <div>
            <Label htmlFor="directions" className="text-sm font-semibold">Directions URL</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="directions"
                value={restaurant.directions_url || ""}
                onChange={(e) => setRestaurant({ ...restaurant, directions_url: e.target.value })}
                placeholder="https://maps.apple.com/?q=..."
              />
              {restaurant.directions_url && (
                <Button variant="outline" asChild className="shrink-0 h-11 w-11">
                  <a href={restaurant.directions_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </Button>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="phone" className="text-sm font-semibold">Phone Number (Optional)</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="phone"
                value={restaurant.phone || ""}
                onChange={(e) => setRestaurant({ ...restaurant, phone: e.target.value })}
                placeholder="(555) 123-4567"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Adds a "Call to Place an Order" button to your Review Hub
            </p>
          </div>
        </div>
      </Card>

      {/* Developer Reset — admin only */}
      {isAdmin && (
        <div className="flex justify-center pt-4 pb-2">
          <DeveloperResetButton />
        </div>
      )}
    </div>
  );
};