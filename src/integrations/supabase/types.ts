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
          created_at: string
          id: string
          note: string | null
          paid_at: string | null
          period_label: string
          rep_id: string
          rep_restaurant_id: string | null
          restaurant_id: string | null
          status: string
          type: string
        }
        Insert: {
          amount: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_label: string
          rep_id: string
          rep_restaurant_id?: string | null
          restaurant_id?: string | null
          status?: string
          type: string
        }
        Update: {
          amount?: number
          created_at?: string
          id?: string
          note?: string | null
          paid_at?: string | null
          period_label?: string
          rep_id?: string
          rep_restaurant_id?: string | null
          restaurant_id?: string | null
          status?: string
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
        ]
      }
      personal_links: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          is_featured: boolean | null
          label: string
          link_type: string
          pill_color: string | null
          profile_id: string
          sort_order: number | null
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          label: string
          link_type: string
          pill_color?: string | null
          profile_id: string
          sort_order?: number | null
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          is_featured?: boolean | null
          label?: string
          link_type?: string
          pill_color?: string | null
          profile_id?: string
          sort_order?: number | null
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
        ]
      }
      personal_profiles: {
        Row: {
          background_color: string | null
          bio: string | null
          created_at: string | null
          email: string
          full_name: string
          header_color: string | null
          header_image_url: string | null
          header_type: string | null
          headline: string | null
          id: string
          pfp_position: string | null
          plan_type: string | null
          profile_photo_url: string | null
          stripe_customer_id: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          updated_at: string | null
          user_id: string
          username: string
        }
        Insert: {
          background_color?: string | null
          bio?: string | null
          created_at?: string | null
          email: string
          full_name: string
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id: string
          username: string
        }
        Update: {
          background_color?: string | null
          bio?: string | null
          created_at?: string | null
          email?: string
          full_name?: string
          header_color?: string | null
          header_image_url?: string | null
          header_type?: string | null
          headline?: string | null
          id?: string
          pfp_position?: string | null
          plan_type?: string | null
          profile_photo_url?: string | null
          stripe_customer_id?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          updated_at?: string | null
          user_id?: string
          username?: string
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
          bonus_threshold_closes: number
          created_at: string
          id: string
          updated_at: string
        }
        Insert: {
          base_commission_per_close?: number
          bonus_amount?: number
          bonus_period?: string
          bonus_threshold_closes?: number
          created_at?: string
          id?: string
          updated_at?: string
        }
        Update: {
          base_commission_per_close?: number
          bonus_amount?: number
          bonus_period?: string
          bonus_threshold_closes?: number
          created_at?: string
          id?: string
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
          state: string
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
          state: string
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
          state?: string
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
      restaurants: {
        Row: {
          address: string | null
          ai_coach_unlocked: boolean
          avm_default_order_url: string | null
          avm_negative_label: string | null
          avm_positive_label: string | null
          avm_question_subtitle: string | null
          avm_question_title: string | null
          created_at: string
          custom_background_url: string | null
          custom_slug: string | null
          directions_url: string | null
          email: string | null
          google_place_id: string | null
          google_rating: number | null
          google_review_url: string | null
          google_user_ratings_total: number | null
          greeting_name: string | null
          header_subtitle: string | null
          header_title: string | null
          hub_background_style: string | null
          id: string
          instagram_url: string | null
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
          phone: string | null
          plan_type: string | null
          restaurant_name: string
          review_hub_url: string | null
          sales_rep_id: string | null
          settings: Json | null
          slug_locked_at: string | null
          stripe_customer_id: string | null
          stripe_portal_url: string | null
          stripe_subscription_id: string | null
          subscription_status: string | null
          type: string | null
          updated_at: string
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
          created_at?: string
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_url?: string | null
          google_user_ratings_total?: number | null
          greeting_name?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string
          instagram_url?: string | null
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
          phone?: string | null
          plan_type?: string | null
          restaurant_name: string
          review_hub_url?: string | null
          sales_rep_id?: string | null
          settings?: Json | null
          slug_locked_at?: string | null
          stripe_customer_id?: string | null
          stripe_portal_url?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          type?: string | null
          updated_at?: string
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
          created_at?: string
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          email?: string | null
          google_place_id?: string | null
          google_rating?: number | null
          google_review_url?: string | null
          google_user_ratings_total?: number | null
          greeting_name?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string
          instagram_url?: string | null
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
          phone?: string | null
          plan_type?: string | null
          restaurant_name?: string
          review_hub_url?: string | null
          sales_rep_id?: string | null
          settings?: Json | null
          slug_locked_at?: string | null
          stripe_customer_id?: string | null
          stripe_portal_url?: string | null
          stripe_subscription_id?: string | null
          subscription_status?: string | null
          type?: string | null
          updated_at?: string
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
          custom_background_url: string | null
          custom_slug: string | null
          directions_url: string | null
          google_review_url: string | null
          header_subtitle: string | null
          header_title: string | null
          hub_background_style: string | null
          id: string | null
          instagram_url: string | null
          logo_url: string | null
          menu_title: string | null
          restaurant_name: string | null
          type: string | null
          yelp_review_url: string | null
        }
        Insert: {
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          google_review_url?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          menu_title?: string | null
          restaurant_name?: string | null
          type?: string | null
          yelp_review_url?: string | null
        }
        Update: {
          avm_negative_label?: string | null
          avm_positive_label?: string | null
          avm_question_subtitle?: string | null
          avm_question_title?: string | null
          custom_background_url?: string | null
          custom_slug?: string | null
          directions_url?: string | null
          google_review_url?: string | null
          header_subtitle?: string | null
          header_title?: string | null
          hub_background_style?: string | null
          id?: string | null
          instagram_url?: string | null
          logo_url?: string | null
          menu_title?: string | null
          restaurant_name?: string | null
          type?: string | null
          yelp_review_url?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      build_google_review_url: { Args: { place_id: string }; Returns: string }
      current_user_email: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_clean_greeting: { Args: { input: string }; Returns: boolean }
      is_google_review_url_valid: { Args: { url: string }; Returns: boolean }
      is_sales_rep: { Args: never; Returns: boolean }
      is_test_account: { Args: never; Returns: boolean }
      is_username_available: {
        Args: { check_username: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user" | "sales_rep"
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
      app_role: ["admin", "user", "sales_rep"],
    },
  },
} as const
