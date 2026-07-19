export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      admin_audit_log: {
        Row: {
          action: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          id: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          id?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: []
      }
      affiliate_abuse_flags: {
        Row: {
          created_at: string
          details: string | null
          flag_type: string
          id: string
          referral_id: string
          resolved: boolean
          resolved_by: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          flag_type: string
          id?: string
          referral_id: string
          resolved?: boolean
          resolved_by?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          flag_type?: string
          id?: string
          referral_id?: string
          resolved?: boolean
          resolved_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_abuse_flags_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: false
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_commissions: {
        Row: {
          affiliate_id: string
          amount: number
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          referral_id: string
          status: string
        }
        Insert: {
          affiliate_id: string
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          referral_id: string
          status?: string
        }
        Update: {
          affiliate_id?: string
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          referral_id?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_commissions_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_commissions_referral_id_fkey"
            columns: ["referral_id"]
            isOneToOne: true
            referencedRelation: "affiliate_referrals"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_referrals: {
        Row: {
          affiliate_id: string
          created_at: string
          id: string
          ip_address: string | null
          referred_profile_id: string | null
          referred_user_id: string
        }
        Insert: {
          affiliate_id: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referred_profile_id?: string | null
          referred_user_id: string
        }
        Update: {
          affiliate_id?: string
          created_at?: string
          id?: string
          ip_address?: string | null
          referred_profile_id?: string | null
          referred_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_referrals_affiliate_id_fkey"
            columns: ["affiliate_id"]
            isOneToOne: false
            referencedRelation: "affiliates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_referrals_referred_profile_id_fkey"
            columns: ["referred_profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      affiliate_settings: {
        Row: {
          bonus_threshold: number
          commission_free_base: number
          commission_free_bonus: number
          commission_paid_base: number
          commission_paid_bonus: number
          commission_per_referral: number
          id: string
          payout_minimum: number
          program_enabled: boolean
          updated_at: string
        }
        Insert: {
          bonus_threshold?: number
          commission_free_base?: number
          commission_free_bonus?: number
          commission_paid_base?: number
          commission_paid_bonus?: number
          commission_per_referral?: number
          id?: string
          payout_minimum?: number
          program_enabled?: boolean
          updated_at?: string
        }
        Update: {
          bonus_threshold?: number
          commission_free_base?: number
          commission_free_bonus?: number
          commission_paid_base?: number
          commission_paid_bonus?: number
          commission_per_referral?: number
          id?: string
          payout_minimum?: number
          program_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      affiliates: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          max_invites: number | null
          referral_code: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_invites?: number | null
          referral_code: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          max_invites?: number | null
          referral_code?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      analytics_events: {
        Row: {
          created_at: string
          event_data: Json | null
          event_type: string
          id: string
          location_id: string | null
          restaurant_id: string
        }
        Insert: {
          created_at?: string
          event_data?: Json | null
          event_type: string
          id?: string
          location_id?: string | null
          restaurant_id: string
        }
        Update: {
          created_at?: string
          event_data?: Json | null
          event_type?: string
          id?: string
          location_id?: string | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          created_at: string
          id: string
          paywall_enabled: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          paywall_enabled?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          paywall_enabled?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      av_meal_prep_meals: {
        Row: {
          calories: number
          carbs_g: number | null
          created_at: string
          description: string | null
          fat_g: number | null
          id: string
          image_url: string
          is_active: boolean | null
          name: string
          order_url: string | null
          protein_g: number | null
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          calories: number
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          image_url: string
          is_active?: boolean | null
          name: string
          order_url?: string | null
          protein_g?: number | null
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          calories?: number
          carbs_g?: number | null
          created_at?: string
          description?: string | null
          fat_g?: number | null
          id?: string
          image_url?: string
          is_active?: boolean | null
          name?: string
          order_url?: string | null
          protein_g?: number | null
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "av_meal_prep_meals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "av_meal_prep_meals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      av_meal_prep_testimonials: {
        Row: {
          author: string
          created_at: string
          id: string
          quote: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          author: string
          created_at?: string
          id?: string
          quote: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          author?: string
          created_at?: string
          id?: string
          quote?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "av_meal_prep_testimonials_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "av_meal_prep_testimonials_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      av_trainer_bundles: {
        Row: {
          created_at: string
          cta_label: string
          cta_url: string
          description: string | null
          id: string
          is_active: boolean | null
          price_label: string | null
          restaurant_id: string
          sort_order: number | null
          title: string
        }
        Insert: {
          created_at?: string
          cta_label?: string
          cta_url: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_label?: string | null
          restaurant_id: string
          sort_order?: number | null
          title: string
        }
        Update: {
          created_at?: string
          cta_label?: string
          cta_url?: string
          description?: string | null
          id?: string
          is_active?: boolean | null
          price_label?: string | null
          restaurant_id?: string
          sort_order?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "av_trainer_bundles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "av_trainer_bundles_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      banned_words: {
        Row: {
          word: string
        }
        Insert: {
          word: string
        }
        Update: {
          word?: string
        }
        Relationships: []
      }
      bookings: {
        Row: {
          booking_date: string
          buyer_email: string | null
          created_at: string | null
          creator_id: string
          id: string
          product_id: string
          start_time: string
          status: string
          stripe_session_id: string | null
          timezone: string
          updated_at: string | null
        }
        Insert: {
          booking_date: string
          buyer_email?: string | null
          created_at?: string | null
          creator_id: string
          id?: string
          product_id: string
          start_time: string
          status?: string
          stripe_session_id?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Update: {
          booking_date?: string
          buyer_email?: string | null
          created_at?: string | null
          creator_id?: string
          id?: string
          product_id?: string
          start_time?: string
          status?: string
          stripe_session_id?: string | null
          timezone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "creator_products"
            referencedColumns: ["id"]
          },
        ]
      }
      coach_ignored: {
        Row: {
          category: string
          created_at: string
          id: string
          ignore_until: string
          ignored_at: string
          restaurant_id: string
        }
        Insert: {
          category: string
          created_at?: string
          id?: string
          ignore_until: string
          ignored_at?: string
          restaurant_id: string
        }
        Update: {
          category?: string
          created_at?: string
          id?: string
          ignore_until?: string
          ignored_at?: string
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coach_ignored_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coach_ignored_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      commissions: {
        Row: {
          amount: number
          billing_cycle: string | null
          clawback_until: string | null
          commission_type: string | null
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          period_label: string
          plan_tier: string | null
          points_value: number
          rep_id: string
          rep_restaurant_id: string | null
          restaurant_id: string | null
          status: string
          stripe_subscription_id: string | null
          type: string
        }
        Insert: {
          amount: number
          billing_cycle?: string | null
          clawback_until?: string | null
          commission_type?: string | null
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_label: string
          plan_tier?: string | null
          points_value?: number
          rep_id: string
          rep_restaurant_id?: string | null
          restaurant_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          type: string
        }
        Update: {
          amount?: number
          billing_cycle?: string | null
          clawback_until?: string | null
          commission_type?: string | null
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_label?: string
          plan_tier?: string | null
          points_value?: number
          rep_id?: string
          rep_restaurant_id?: string | null
          restaurant_id?: string | null
          status?: string
          stripe_subscription_id?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissions_rep_id_fkey"
            columns: ["rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_rep_restaurant_id_fkey"
            columns: ["rep_restaurant_id"]
            isOneToOne: false
            referencedRelation: "rep_restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissions_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      competitors: {
        Row: {
          competitor_link: string | null
          competitor_name: string
          created_at: string
          current_review_count: number | null
          id: string
          last_checked_at: string | null
          rating: number | null
          restaurant_id: string
        }
        Insert: {
          competitor_link?: string | null
          competitor_name: string
          created_at?: string
          current_review_count?: number | null
          id?: string
          last_checked_at?: string | null
          rating?: number | null
          restaurant_id: string
        }
        Update: {
          competitor_link?: string | null
          competitor_name?: string
          created_at?: string
          current_review_count?: number | null
          id?: string
          last_checked_at?: string | null
          rating?: number | null
          restaurant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "competitors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "competitors_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_availability: {
        Row: {
          created_at: string | null
          creator_id: string
          day_of_week: number
          end_time: string
          id: string
          start_time: string
          timezone: string
        }
        Insert: {
          created_at?: string | null
          creator_id: string
          day_of_week: number
          end_time: string
          id?: string
          start_time: string
          timezone?: string
        }
        Update: {
          created_at?: string | null
          creator_id?: string
          day_of_week?: number
          end_time?: string
          id?: string
          start_time?: string
          timezone?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_availability_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_availability_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_products: {
        Row: {
          booking_url: string | null
          cover_image_url: string | null
          created_at: string | null
          creator_id: string
          description: string | null
          duration_minutes: number
          file_url: string | null
          id: string
          image_urls: string[] | null
          is_active: boolean | null
          long_description: string | null
          price_cents: number
          product_type: string
          title: string
          updated_at: string | null
        }
        Insert: {
          booking_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id: string
          description?: string | null
          duration_minutes?: number
          file_url?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          long_description?: string | null
          price_cents: number
          product_type?: string
          title: string
          updated_at?: string | null
        }
        Update: {
          booking_url?: string | null
          cover_image_url?: string | null
          created_at?: string | null
          creator_id?: string
          description?: string | null
          duration_minutes?: number
          file_url?: string | null
          id?: string
          image_urls?: string[] | null
          is_active?: boolean | null
          long_description?: string | null
          price_cents?: number
          product_type?: string
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "creator_products_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "creator_products_creator_id_fkey"
            columns: ["creator_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_purchases: {
        Row: {
          access_expires_at: string
          access_token: string
          buyer_email: string
          created_at: string | null
          id: string
          product_id: string
          stripe_session_id: string
        }
        Insert: {
          access_expires_at: string
          access_token: string
          buyer_email: string
          created_at?: string | null
          id?: string
          product_id: string
          stripe_session_id: string
        }
        Update: {
          access_expires_at?: string
          access_token?: string
          buyer_email?: string
          created_at?: string | null
          id?: string
          product_id?: string
          stripe_session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "creator_purchases_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "creator_products"
            referencedColumns: ["id"]
          },
        ]
      }
      fulfillment_orders: {
        Row: {
          created_at: string
          id: string
          plan: string
          quantity: number
          restaurant_id: string
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          status: string
          stripe_customer_id: string | null
          stripe_payment_intent_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          plan: string
          quantity?: number
          restaurant_id: string
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          plan?: string
          quantity?: number
          restaurant_id?: string
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_customer_id?: string | null
          stripe_payment_intent_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fulfillment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fulfillment_orders_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      goals: {
        Row: {
          created_at: string
          current_value: number | null
          description: string | null
          goal_type: string
          id: string
          restaurant_id: string
          status: string
          target_value: number | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type: string
          id?: string
          restaurant_id: string
          status?: string
          target_value?: number | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_value?: number | null
          description?: string | null
          goal_type?: string
          id?: string
          restaurant_id?: string
          status?: string
          target_value?: number | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "goals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goals_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      google_reviews: {
        Row: {
          author_name: string | null
          created_at: string | null
          id: number
          place_id: string | null
          profile_photo_url: string | null
          rating: number
          relative_time_description: string | null
          restaurant_id: string
          review_time: string | null
          source: string | null
          text: string | null
        }
        Insert: {
          author_name?: string | null
          created_at?: string | null
          id?: never
          place_id?: string | null
          profile_photo_url?: string | null
          rating: number
          relative_time_description?: string | null
          restaurant_id: string
          review_time?: string | null
          source?: string | null
          text?: string | null
        }
        Update: {
          author_name?: string | null
          created_at?: string | null
          id?: never
          place_id?: string | null
          profile_photo_url?: string | null
          rating?: number
          relative_time_description?: string | null
          restaurant_id?: string
          review_time?: string | null
          source?: string | null
          text?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "google_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "google_reviews_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_forms: {
        Row: {
          button_title: string
          created_at: string
          fields: Json
          form_title: string
          id: string
          is_active: boolean
          profile_id: string
          updated_at: string
        }
        Insert: {
          button_title?: string
          created_at?: string
          fields?: Json
          form_title?: string
          id?: string
          is_active?: boolean
          profile_id: string
          updated_at?: string
        }
        Update: {
          button_title?: string
          created_at?: string
          fields?: Json
          form_title?: string
          id?: string
          is_active?: boolean
          profile_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lead_forms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_forms_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_submissions: {
        Row: {
          created_at: string
          form_id: string
          id: string
          profile_id: string
          submission_data: Json
        }
        Insert: {
          created_at?: string
          form_id: string
          id?: string
          profile_id: string
          submission_data?: Json
        }
        Update: {
          created_at?: string
          form_id?: string
          id?: string
          profile_id?: string
          submission_data?: Json
        }
        Relationships: [
          {
            foreignKeyName: "lead_submissions_form_id_fkey"
            columns: ["form_id"]
            isOneToOne: false
            referencedRelation: "lead_forms"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lead_submissions_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      locations: {
        Row: {
          address: string | null
          created_at: string
          custom_slug: string | null
          directions_url: string | null
          google_review_url: string | null
          id: string
          instagram_url: string | null
          is_active: boolean
          name: string
          phone: string | null
          restaurant_id: string
          updated_at: string
          yelp_review_url: string | null
        }
        Insert: {
          address?: string | null
          created_at?: string
          custom_slug?: string | null
          directions_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name: string
          phone?: string | null
          restaurant_id: string
          updated_at?: string
          yelp_review_url?: string | null
        }
        Update: {
          address?: string | null
          created_at?: string
          custom_slug?: string | null
          directions_url?: string | null
          google_review_url?: string | null
          id?: string
          instagram_url?: string | null
          is_active?: boolean
          name?: string
          phone?: string | null
          restaurant_id?: string
          updated_at?: string
          yelp_review_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locations_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      magic_link_tokens: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          token_hash: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          token_hash: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          token_hash?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      menu_items: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          price: string | null
          section_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          price?: string | null
          section_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          price?: string | null
          section_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_items_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "menu_sections"
            referencedColumns: ["id"]
          },
        ]
      }
      menu_sections: {
        Row: {
          created_at: string
          id: string
          location_id: string | null
          name: string
          restaurant_id: string
          sort_order: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          location_id?: string | null
          name: string
          restaurant_id: string
          sort_order?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          location_id?: string | null
          name?: string
          restaurant_id?: string
          sort_order?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "menu_sections_location_id_fkey"
            columns: ["location_id"]
            isOneToOne: false
            referencedRelation: "locations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_sections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "menu_sections_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_card_taps: {
        Row: {
          card_id: string
          id: string
          ip_hash: string | null
          tapped_at: string
          user_agent: string | null
        }
        Insert: {
          card_id: string
          id?: string
          ip_hash?: string | null
          tapped_at?: string
          user_agent?: string | null
        }
        Update: {
          card_id?: string
          id?: string
          ip_hash?: string | null
          tapped_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nfc_card_taps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nfc_cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nfc_card_taps_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "nfc_cards_public"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_cards: {
        Row: {
          batch_id: string | null
          card_type: string
          claim_code_hash: string | null
          claimed_at: string | null
          created_at: string
          destination_type: string
          destination_value: string | null
          id: string
          owner_user_id: string | null
          public_code: string
          status: string
        }
        Insert: {
          batch_id?: string | null
          card_type?: string
          claim_code_hash?: string | null
          claimed_at?: string | null
          created_at?: string
          destination_type?: string
          destination_value?: string | null
          id?: string
          owner_user_id?: string | null
          public_code: string
          status?: string
        }
        Update: {
          batch_id?: string | null
          card_type?: string
          claim_code_hash?: string | null
          claimed_at?: string | null
          created_at?: string
          destination_type?: string
          destination_value?: string | null
          id?: string
          owner_user_id?: string | null
          public_code?: string
          status?: string
        }
        Relationships: []
      }
      pending_otps: {
        Row: {
          code: string
          created_at: string
          email: string
          expires_at: string
          id: string
          verified_at: string | null
        }
        Insert: {
          code: string
          created_at?: string
          email: string
          expires_at: string
          id?: string
          verified_at?: string | null
        }
        Update: {
          code?: string
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          verified_at?: string | null
        }
        Relationships: []
      }
      pending_trials: {
        Row: {
          business_name: string
          business_type: string
          city: string
          created_at: string
          email: string
          id: string
          linked_restaurant_id: string | null
          state: string
          status: string
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          updated_at: string
        }
        Insert: {
          business_name: string
          business_type: string
          city: string
          created_at?: string
          email: string
          id?: string
          linked_restaurant_id?: string | null
          state: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Update: {
          business_name?: string
          business_type?: string
          city?: string
          created_at?: string
          email?: string
          id?: string
          linked_restaurant_id?: string | null
          state?: string
          status?: string
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "pending_trials_linked_restaurant_id_fkey"
            columns: ["linked_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pending_trials_linked_restaurant_id_fkey"
            columns: ["linked_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_analytics: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          profile_id: string
          visitor_info: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string
          id?: string
          profile_id: string
          visitor_info?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          profile_id?: string
          visitor_info?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_analytics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_analytics_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_blocks: {
        Row: {
          alignment: string | null
          block_type: string
          content: Json
          created_at: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_placeholder: boolean
          profile_id: string
          sort_order: number
        }
        Insert: {
          alignment?: string | null
          block_type: string
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_placeholder?: boolean
          profile_id: string
          sort_order?: number
        }
        Update: {
          alignment?: string | null
          block_type?: string
          content?: Json
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_placeholder?: boolean
          profile_id?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "personal_blocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_blocks_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_card_requests: {
        Row: {
          created_at: string
          id: string
          is_addon: boolean
          profile_id: string
          quantity: number
          shipping_address_line1: string | null
          shipping_address_line2: string | null
          shipping_city: string | null
          shipping_country: string | null
          shipping_name: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          status: string
          stripe_session_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_addon?: boolean
          profile_id: string
          quantity?: number
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_addon?: boolean
          profile_id?: string
          quantity?: number
          shipping_address_line1?: string | null
          shipping_address_line2?: string | null
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_name?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          status?: string
          stripe_session_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_card_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_card_requests_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_email_captures: {
        Row: {
          created_at: string | null
          email: string | null
          id: string
          message: string | null
          name: string | null
          phone: string | null
          profile_id: string
          sms_opt_in: boolean
          sms_opt_in_at: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          profile_id: string
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          id?: string
          message?: string | null
          name?: string | null
          phone?: string | null
          profile_id?: string
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "personal_email_captures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_email_captures_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_links: {
        Row: {
          cover_image_url: string | null
          created_at: string | null
          display_style: string | null
          grid_size: string | null
          id: string
          is_active: boolean | null
          is_archived: boolean | null
          is_featured: boolean | null
          is_placeholder: boolean
          label: string
          link_type: string
          pill_color: string | null
          profile_id: string
          sort_order: number | null
          thumbnail_bg_url: string | null
          thumbnail_url: string | null
          url: string
        }
        Insert: {
          cover_image_url?: string | null
          created_at?: string | null
          display_style?: string | null
          grid_size?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_featured?: boolean | null
          is_placeholder?: boolean
          label: string
          link_type: string
          pill_color?: string | null
          profile_id: string
          sort_order?: number | null
          thumbnail_bg_url?: string | null
          thumbnail_url?: string | null
          url: string
        }
        Update: {
          cover_image_url?: string | null
          created_at?: string | null
          display_style?: string | null
          grid_size?: string | null
          id?: string
          is_active?: boolean | null
          is_archived?: boolean | null
          is_featured?: boolean | null
          is_placeholder?: boolean
          label?: string
          link_type?: string
          pill_color?: string | null
          profile_id?: string
          sort_order?: number | null
          thumbnail_bg_url?: string | null
          thumbnail_url?: string | null
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "personal_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "personal_links_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      personal_profiles: {
        Row: {
          archived_at: string | null
          archived_header_image_url: string | null
          archived_header_type: string | null
          background_color: string | null
          banner_image_url: string | null
          bg_style: string | null
          bio: string | null
          button_theme: string | null
          card_back_text: string | null
          card_confirmed: boolean | null
          card_confirmed_at: string | null
          card_front_headline: string | null
          contact_address: string | null
          contact_button_label: string | null
          contact_company: string | null
          contact_display_style: string
          contact_email: string | null
          contact_enabled: boolean | null
          contact_name: string | null
          contact_phone: string | null
          contact_photo_url: string | null
          contact_title: string | null
          contact_website: string | null
          created_at: string | null
          created_by_rep_id: string | null
          email: string
          founding_number: number | null
          full_name: string
          has_card_addon: boolean
          header_color: string | null
          header_image_url: string | null
          header_type: string | null
          headline: string | null
          id: string
          is_approved: boolean
          is_founding_user: boolean
          is_stripe_onboarded: boolean | null
          pfp_position: string | null
          plan_type: string | null
          profile_photo_url: string | null
          referred_by: string | null
          sales_rep_id: string | null
          show_founding_badge: boolean
          show_shop_section: boolean | null
          show_username: boolean
          stripe_billing_email: string | null
          stripe_connect_account_id: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          text_color: string | null
          trial_ends_at: string | null
          updated_at: string | null
          user_id: string
          username: string
          vibe_id: string | null
        }
        Insert: {
          archived_at?: string | null
          archived_header_image_url?: string | null
          archived_header_type?: string | null
          background_color?: string | null
          banner_image_url?: string | null
          bg_style?: string | null
          bio?: string | null
          button_theme?: string | null
          card_back_text?: string | null
          card_confirmed?: boolean | null
          card_confirmed_at?: string | null
          card_front_headline?: string | null
          contact_address?: string | null
          contact_button_label?: string | null
          contact_company?: string | null
          contact_display_style?: string
          contact_email?: string | null
          contact_enabled?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          contact_title?: string | null
          contact_website?: string | null
          created_at?: string | null
          created_by_rep_id?: string | null
          email: string
          founding_number?: number | null
          full_name: string
          has_card_addon?: boolean
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string
          is_approved?: boolean
          is_founding_user?: boolean
          is_stripe_onboarded?: boolean | null
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          referred_by?: string | null
          sales_rep_id?: string | null
          show_founding_badge?: boolean
          show_shop_section?: boolean | null
          show_username?: boolean
          stripe_billing_email?: string | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          text_color?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id: string
          username: string
          vibe_id?: string | null
        }
        Update: {
          archived_at?: string | null
          archived_header_image_url?: string | null
          archived_header_type?: string | null
          background_color?: string | null
          banner_image_url?: string | null
          bg_style?: string | null
          bio?: string | null
          button_theme?: string | null
          card_back_text?: string | null
          card_confirmed?: boolean | null
          card_confirmed_at?: string | null
          card_front_headline?: string | null
          contact_address?: string | null
          contact_button_label?: string | null
          contact_company?: string | null
          contact_display_style?: string
          contact_email?: string | null
          contact_enabled?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          contact_title?: string | null
          contact_website?: string | null
          created_at?: string | null
          created_by_rep_id?: string | null
          email?: string
          founding_number?: number | null
          full_name?: string
          has_card_addon?: boolean
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string
          is_approved?: boolean
          is_founding_user?: boolean
          is_stripe_onboarded?: boolean | null
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          referred_by?: string | null
          sales_rep_id?: string | null
          show_founding_badge?: boolean
          show_shop_section?: boolean | null
          show_username?: boolean
          stripe_billing_email?: string | null
          stripe_connect_account_id?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          text_color?: string | null
          trial_ends_at?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
          vibe_id?: string | null
        }
        Relationships: []
      }
      promo_tokens: {
        Row: {
          created_at: string
          created_by_user_id: string
          discount_type: string
          expires_at: string
          id: string
          is_used: boolean
          token: string
          used_by_user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by_user_id: string
          discount_type: string
          expires_at: string
          id?: string
          is_used?: boolean
          token?: string
          used_by_user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by_user_id?: string
          discount_type?: string
          expires_at?: string
          id?: string
          is_used?: boolean
          token?: string
          used_by_user_id?: string | null
        }
        Relationships: []
      }
      rep_applications: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          phone: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          phone?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
        }
        Relationships: []
      }
      rep_compensation_settings: {
        Row: {
          base_commission_per_close: number
          bonus_amount: number
          bonus_period: string
          bonus_point_threshold: number
          bonus_threshold_closes: number
          clawback_days: number
          created_at: string
          id: string
          lite_annual_recurring: number
          lite_annual_upfront: number
          lite_monthly_recurring: number
          lite_monthly_upfront: number
          lite_point_value: number
          restaurant_annual_recurring: number
          restaurant_annual_upfront: number
          restaurant_monthly_recurring: number
          restaurant_monthly_upfront: number
          restaurant_point_value: number
          updated_at: string
        }
        Insert: {
          base_commission_per_close?: number
          bonus_amount?: number
          bonus_period?: string
          bonus_point_threshold?: number
          bonus_threshold_closes?: number
          clawback_days?: number
          created_at?: string
          id?: string
          lite_annual_recurring?: number
          lite_annual_upfront?: number
          lite_monthly_recurring?: number
          lite_monthly_upfront?: number
          lite_point_value?: number
          restaurant_annual_recurring?: number
          restaurant_annual_upfront?: number
          restaurant_monthly_recurring?: number
          restaurant_monthly_upfront?: number
          restaurant_point_value?: number
          updated_at?: string
        }
        Update: {
          base_commission_per_close?: number
          bonus_amount?: number
          bonus_period?: string
          bonus_point_threshold?: number
          bonus_threshold_closes?: number
          clawback_days?: number
          created_at?: string
          id?: string
          lite_annual_recurring?: number
          lite_annual_upfront?: number
          lite_monthly_recurring?: number
          lite_monthly_upfront?: number
          lite_point_value?: number
          restaurant_annual_recurring?: number
          restaurant_annual_upfront?: number
          restaurant_monthly_recurring?: number
          restaurant_monthly_upfront?: number
          restaurant_point_value?: number
          updated_at?: string
        }
        Relationships: []
      }
      rep_demo_requests: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          fulfilled: boolean | null
          full_name: string
          id: string
          rep_user_id: string
          requested_at: string | null
          shipped_at: string | null
          state: string
          tracking_number: string | null
          zip: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          fulfilled?: boolean | null
          full_name: string
          id?: string
          rep_user_id: string
          requested_at?: string | null
          shipped_at?: string | null
          state: string
          tracking_number?: string | null
          zip: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          fulfilled?: boolean | null
          full_name?: string
          id?: string
          rep_user_id?: string
          requested_at?: string | null
          shipped_at?: string | null
          state?: string
          tracking_number?: string | null
          zip?: string
        }
        Relationships: []
      }
      rep_payout_accounts: {
        Row: {
          account_last4: string
          account_number: string
          acknowledged_payout_policy: boolean | null
          bank_name: string | null
          created_at: string
          email_payout_notifications: boolean
          id: string
          payee_name: string
          payee_type: string
          rep_user_id: string
          routing_number: string
          updated_at: string
        }
        Insert: {
          account_last4: string
          account_number: string
          acknowledged_payout_policy?: boolean | null
          bank_name?: string | null
          created_at?: string
          email_payout_notifications?: boolean
          id?: string
          payee_name: string
          payee_type: string
          rep_user_id: string
          routing_number: string
          updated_at?: string
        }
        Update: {
          account_last4?: string
          account_number?: string
          acknowledged_payout_policy?: boolean | null
          bank_name?: string | null
          created_at?: string
          email_payout_notifications?: boolean
          id?: string
          payee_name?: string
          payee_type?: string
          rep_user_id?: string
          routing_number?: string
          updated_at?: string
        }
        Relationships: []
      }
      rep_payout_history: {
        Row: {
          amount: number
          created_at: string
          email_sent_at: string | null
          id: string
          note: string | null
          paid_at: string | null
          rep_user_id: string
          status: string
        }
        Insert: {
          amount: number
          created_at?: string
          email_sent_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          rep_user_id: string
          status: string
        }
        Update: {
          amount?: number
          created_at?: string
          email_sent_at?: string | null
          id?: string
          note?: string | null
          paid_at?: string | null
          rep_user_id?: string
          status?: string
        }
        Relationships: []
      }
      rep_restaurants: {
        Row: {
          closed_at: string | null
          contact_name: string | null
          created_at: string
          email: string | null
          id: string
          linked_restaurant_id: string | null
          name: string
          notes: string | null
          phone: string | null
          plan_type: string | null
          sales_rep_id: string
          status: string
          updated_at: string
        }
        Insert: {
          closed_at?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_restaurant_id?: string | null
          name: string
          notes?: string | null
          phone?: string | null
          plan_type?: string | null
          sales_rep_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          closed_at?: string | null
          contact_name?: string | null
          created_at?: string
          email?: string | null
          id?: string
          linked_restaurant_id?: string | null
          name?: string
          notes?: string | null
          phone?: string | null
          plan_type?: string | null
          sales_rep_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rep_restaurants_linked_restaurant_id_fkey"
            columns: ["linked_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_restaurants_linked_restaurant_id_fkey"
            columns: ["linked_restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rep_restaurants_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      rep_setup_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          token: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          token: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          token?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      rep_tax_profiles: {
        Row: {
          created_at: string
          id: string
          note: string | null
          rep_user_id: string
          status: string
          updated_at: string
          w9_file_path: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          note?: string | null
          rep_user_id: string
          status?: string
          updated_at?: string
          w9_file_path?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          note?: string | null
          rep_user_id?: string
          status?: string
          updated_at?: string
          w9_file_path?: string | null
        }
        Relationships: []
      }
      restaurant_engagement: {
        Row: {
          content: string
          created_at: string | null
          id: string
          is_active: boolean | null
          options: Json | null
          restaurant_id: string
          type: string
          updated_at: string | null
        }
        Insert: {
          content: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          restaurant_id: string
          type: string
          updated_at?: string | null
        }
        Update: {
          content?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          options?: Json | null
          restaurant_id?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_engagement_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_engagement_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sms_campaigns: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          message: string
          recipient_count: number
          restaurant_id: string
          success_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          message: string
          recipient_count?: number
          restaurant_id: string
          success_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          message?: string
          recipient_count?: number
          restaurant_id?: string
          success_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sms_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sms_campaigns_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_sms_subscribers: {
        Row: {
          created_at: string
          id: string
          name: string | null
          phone: string
          restaurant_id: string
          sms_opt_in: boolean
          sms_opt_in_at: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name?: string | null
          phone: string
          restaurant_id: string
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string | null
          phone?: string
          restaurant_id?: string
          sms_opt_in?: boolean
          sms_opt_in_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurant_sms_subscribers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "restaurant_sms_subscribers_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurants: {
        Row: {
          address: string | null
          ai_coach_unlocked: boolean
          avm_default_order_url: string | null
          avm_negative_label: string | null
          avm_positive_label: string | null
          avm_question_subtitle: string | null
          avm_question_title: string | null
          background_theme_style: string
          business_phone: string | null
          card_print_pdf_path: string | null
          created_at: string
          created_by: string | null
          custom_background_url: string | null
          custom_slug: string | null
          directions_url: string | null
          email: string | null
          expires_at: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_url: string | null
          google_user_ratings_total: number | null
          greeting_name: string | null
          has_loss_protection: boolean
          header_subtitle: string | null
          header_title: string | null
          hub_background_style: string | null
          id: string
          instagram_url: string | null
          is_approved: boolean
          is_demo_account: boolean | null
          is_legacy_user: boolean
          last_google_sync_at: string | null
          logo_url: string | null
          meal_order_url: string | null
          menu_image_url: string | null
          menu_title: string | null
          next_billing_date: string | null
          onboarding_completed: boolean | null
          onboarding_step: number | null
          owner_id: string
          owner_name: string | null
          owner_phone: string | null
          phone: string | null
          pipeline_status: string
          plan_type: string | null
          primary_color: string
          restaurant_name: string
          review_hub_url: string | null
          sales_rep_id: string | null
          secondary_color: string
          settings: Json | null
          slug_locked_at: string | null
          stripe_customer_id: string | null
          stripe_portal_url: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          trial_ends_at: string | null
          type: string | null
          updated_at: string
          website_url: string | null
          yelp_business_id: string | null
          yelp_review_url: string | null
        }
        Insert: {
          address?: string | null
          ai_coach_unlocked?: boolean
          avm_default_order_url?: string | null
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          background_theme_style?: string
          business_phone?: string | null
          card_print_pdf_path?: string | null
          created_at?: string
          created_by?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          email?: string | null
          expires_at?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_url?: string | null
          google_user_ratings_total?: number | null
          greeting_name?: string | null
          has_loss_protection?: boolean
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_demo_account?: boolean | null
          is_legacy_user?: boolean
          last_google_sync_at?: string | null
          logo_url?: string | null
          meal_order_url?: string | null
          menu_image_url?: string | null
          menu_title?: string | null
          next_billing_date?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id: string
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          pipeline_status?: string
          plan_type?: string | null
          primary_color?: string
          restaurant_name: string
          review_hub_url?: string | null
          sales_rep_id?: string | null
          secondary_color?: string
          settings?: Json | null
          slug_locked_at?: string | null
          stripe_customer_id?: string | null
          stripe_portal_url?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          type?: string | null
          updated_at?: string
          website_url?: string | null
          yelp_business_id?: string | null
          yelp_review_url?: string | null
        }
        Update: {
          address?: string | null
          ai_coach_unlocked?: boolean
          avm_default_order_url?: string | null
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          background_theme_style?: string
          business_phone?: string | null
          card_print_pdf_path?: string | null
          created_at?: string
          created_by?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          email?: string | null
          expires_at?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_url?: string | null
          google_user_ratings_total?: number | null
          greeting_name?: string | null
          has_loss_protection?: boolean
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string
          instagram_url?: string | null
          is_approved?: boolean
          is_demo_account?: boolean | null
          is_legacy_user?: boolean
          last_google_sync_at?: string | null
          logo_url?: string | null
          meal_order_url?: string | null
          menu_image_url?: string | null
          menu_title?: string | null
          next_billing_date?: string | null
          onboarding_completed?: boolean | null
          onboarding_step?: number | null
          owner_id?: string
          owner_name?: string | null
          owner_phone?: string | null
          phone?: string | null
          pipeline_status?: string
          plan_type?: string | null
          primary_color?: string
          restaurant_name?: string
          review_hub_url?: string | null
          sales_rep_id?: string | null
          secondary_color?: string
          settings?: Json | null
          slug_locked_at?: string | null
          stripe_customer_id?: string | null
          stripe_portal_url?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          trial_ends_at?: string | null
          type?: string | null
          updated_at?: string
          website_url?: string | null
          yelp_business_id?: string | null
          yelp_review_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "restaurants_sales_rep_id_fkey"
            columns: ["sales_rep_id"]
            isOneToOne: false
            referencedRelation: "sales_reps"
            referencedColumns: ["id"]
          },
        ]
      }
      review_sentiments: {
        Row: {
          ai_reply: string | null
          created_at: string
          id: string
          platform: string
          rating: number | null
          restaurant_id: string
          review_text: string
          reviewer_name: string | null
          sentiment: string
          sentiment_score: number | null
        }
        Insert: {
          ai_reply?: string | null
          created_at?: string
          id?: string
          platform: string
          rating?: number | null
          restaurant_id: string
          review_text: string
          reviewer_name?: string | null
          sentiment: string
          sentiment_score?: number | null
        }
        Update: {
          ai_reply?: string | null
          created_at?: string
          id?: string
          platform?: string
          rating?: number | null
          restaurant_id?: string
          review_text?: string
          reviewer_name?: string | null
          sentiment?: string
          sentiment_score?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "review_sentiments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurant_public_info"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "review_sentiments_restaurant_id_fkey"
            columns: ["restaurant_id"]
            isOneToOne: false
            referencedRelation: "restaurants"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_reps: {
        Row: {
          agreement_accepted: boolean | null
          agreement_accepted_at: string | null
          agreement_version: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          name: string
          payout_method: string | null
          phone: string | null
          signature_at: string | null
          signature_name: string | null
          updated_at: string
        }
        Insert: {
          agreement_accepted?: boolean | null
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          created_at?: string
          email: string
          id: string
          is_active?: boolean
          name: string
          payout_method?: string | null
          phone?: string | null
          signature_at?: string | null
          signature_name?: string | null
          updated_at?: string
        }
        Update: {
          agreement_accepted?: boolean | null
          agreement_accepted_at?: string | null
          agreement_version?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          name?: string
          payout_method?: string | null
          phone?: string | null
          signature_at?: string | null
          signature_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      sms_campaigns: {
        Row: {
          created_at: string
          failure_count: number
          id: string
          message: string
          profile_id: string
          recipient_count: number
          success_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          failure_count?: number
          id?: string
          message: string
          profile_id: string
          recipient_count?: number
          success_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          failure_count?: number
          id?: string
          message?: string
          profile_id?: string
          recipient_count?: number
          success_count?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sms_campaigns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sms_campaigns_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "personal_profiles_public"
            referencedColumns: ["id"]
          },
        ]
      }
      support_requests: {
        Row: {
          business_name: string
          created_at: string
          description: string | null
          email: string
          id: string
          location: string | null
          name: string
          phone: string | null
          quantity_requested: number | null
          request_details: Json | null
          request_type: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          business_name: string
          created_at?: string
          description?: string | null
          email: string
          id?: string
          location?: string | null
          name: string
          phone?: string | null
          quantity_requested?: number | null
          request_details?: Json | null
          request_type: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          business_name?: string
          created_at?: string
          description?: string | null
          email?: string
          id?: string
          location?: string | null
          name?: string
          phone?: string | null
          quantity_requested?: number | null
          request_details?: Json | null
          request_type?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      bookings_public: {
        Row: {
          booking_date: string | null
          created_at: string | null
          product_id: string | null
          start_time: string | null
          status: string | null
          timezone: string | null
        }
        Insert: {
          booking_date?: string | null
          created_at?: string | null
          product_id?: string | null
          start_time?: string | null
          status?: string | null
          timezone?: string | null
        }
        Update: {
          booking_date?: string | null
          created_at?: string | null
          product_id?: string | null
          start_time?: string | null
          status?: string | null
          timezone?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "bookings_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "creator_products"
            referencedColumns: ["id"]
          },
        ]
      }
      nfc_cards_public: {
        Row: {
          card_type: string | null
          destination_type: string | null
          destination_value: string | null
          id: string | null
          public_code: string | null
          status: string | null
        }
        Insert: {
          card_type?: string | null
          destination_type?: string | null
          destination_value?: string | null
          id?: string | null
          public_code?: string | null
          status?: string | null
        }
        Update: {
          card_type?: string | null
          destination_type?: string | null
          destination_value?: string | null
          id?: string | null
          public_code?: string | null
          status?: string | null
        }
        Relationships: []
      }
      personal_profiles_public: {
        Row: {
          background_color: string | null
          banner_image_url: string | null
          bg_style: string | null
          bio: string | null
          button_theme: string | null
          contact_address: string | null
          contact_button_label: string | null
          contact_company: string | null
          contact_display_style: string | null
          contact_email: string | null
          contact_enabled: boolean | null
          contact_name: string | null
          contact_phone: string | null
          contact_photo_url: string | null
          contact_title: string | null
          contact_website: string | null
          founding_number: number | null
          full_name: string | null
          header_color: string | null
          header_image_url: string | null
          header_type: string | null
          headline: string | null
          id: string | null
          is_founding_user: boolean | null
          pfp_position: string | null
          plan_type: string | null
          profile_photo_url: string | null
          show_founding_badge: boolean | null
          show_shop_section: boolean | null
          show_username: boolean | null
          subscription_status: string | null
          text_color: string | null
          user_id: string | null
          username: string | null
          vibe_id: string | null
        }
        Insert: {
          background_color?: string | null
          banner_image_url?: string | null
          bg_style?: string | null
          bio?: string | null
          button_theme?: string | null
          contact_address?: string | null
          contact_button_label?: string | null
          contact_company?: string | null
          contact_display_style?: string | null
          contact_email?: string | null
          contact_enabled?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          contact_title?: string | null
          contact_website?: string | null
          founding_number?: number | null
          full_name?: string | null
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string | null
          is_founding_user?: boolean | null
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          show_founding_badge?: boolean | null
          show_shop_section?: boolean | null
          show_username?: boolean | null
          subscription_status?: string | null
          text_color?: string | null
          user_id?: string | null
          username?: string | null
          vibe_id?: string | null
        }
        Update: {
          background_color?: string | null
          banner_image_url?: string | null
          bg_style?: string | null
          bio?: string | null
          button_theme?: string | null
          contact_address?: string | null
          contact_button_label?: string | null
          contact_company?: string | null
          contact_display_style?: string | null
          contact_email?: string | null
          contact_enabled?: boolean | null
          contact_name?: string | null
          contact_phone?: string | null
          contact_photo_url?: string | null
          contact_title?: string | null
          contact_website?: string | null
          founding_number?: number | null
          full_name?: string | null
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string | null
          is_founding_user?: boolean | null
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          show_founding_badge?: boolean | null
          show_shop_section?: boolean | null
          show_username?: boolean | null
          subscription_status?: string | null
          text_color?: string | null
          user_id?: string | null
          username?: string | null
          vibe_id?: string | null
        }
        Relationships: []
      }
      rep_payout_display: {
        Row: {
          account_last4: string | null
          bank_name: string | null
          created_at: string | null
          id: string | null
          payee_name: string | null
          payee_type: string | null
          rep_user_id: string | null
          updated_at: string | null
        }
        Insert: {
          account_last4?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string | null
          payee_name?: string | null
          payee_type?: string | null
          rep_user_id?: string | null
          updated_at?: string | null
        }
        Update: {
          account_last4?: string | null
          bank_name?: string | null
          created_at?: string | null
          id?: string | null
          payee_name?: string | null
          payee_type?: string | null
          rep_user_id?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      rep_tax_status: {
        Row: {
          created_at: string | null
          rejection_note: string | null
          rep_user_id: string | null
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          rejection_note?: never
          rep_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          rejection_note?: never
          rep_user_id?: string | null
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      restaurant_public_info: {
        Row: {
          avm_negative_label: string | null
          avm_positive_label: string | null
          avm_question_subtitle: string | null
          avm_question_title: string | null
          background_theme_style: string | null
          business_phone: string | null
          custom_background_url: string | null
          custom_slug: string | null
          directions_url: string | null
          expires_at: string | null
          google_review_url: string | null
          header_subtitle: string | null
          header_title: string | null
          hub_background_style: string | null
          id: string | null
          instagram_url: string | null
          is_approved: boolean | null
          logo_url: string | null
          menu_title: string | null
          phone: string | null
          primary_color: string | null
          restaurant_name: string | null
          secondary_color: string | null
          type: string | null
          yelp_review_url: string | null
        }
        Insert: {
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          background_theme_style?: string | null
          business_phone?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          expires_at?: string | null
          google_review_url?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string | null
          instagram_url?: string | null
          is_approved?: boolean | null
          logo_url?: string | null
          menu_title?: string | null
          phone?: string | null
          primary_color?: string | null
          restaurant_name?: string | null
          secondary_color?: string | null
          type?: string | null
          yelp_review_url?: string | null
        }
        Update: {
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          background_theme_style?: string | null
          business_phone?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          expires_at?: string | null
          google_review_url?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string | null
          instagram_url?: string | null
          is_approved?: boolean | null
          logo_url?: string | null
          menu_title?: string | null
          phone?: string | null
          primary_color?: string | null
          restaurant_name?: string | null
          secondary_color?: string | null
          type?: string | null
          yelp_review_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      build_google_review_url: { Args: { place_id: string }; Returns: string }
      cleanup_expired_archives: { Args: never; Returns: undefined }
      current_user_email: { Args: never; Returns: string }
      get_auth_user_by_email: {
        Args: { lookup_email: string }
        Returns: {
          email: string
          id: string
        }[]
      }
      get_founding_count: { Args: never; Returns: number }
      get_signup_dropoff_stats: { Args: { days_back?: number }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_affiliate: { Args: never; Returns: boolean }
      is_clean_greeting: { Args: { input: string }; Returns: boolean }
      is_google_review_url_valid: { Args: { url: string }; Returns: boolean }
      is_sales_rep: { Args: never; Returns: boolean }
      is_test_account: { Args: never; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
      personal_profile_is_active: {
        Args: { _profile_id: string }
        Returns: boolean
      }
      profile_has_active_card: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "user" | "sales_rep" | "affiliate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "user", "sales_rep", "affiliate"],
    },
  },
} as const
