-- Add settings column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'restaurants' 
    AND column_name = 'settings'
  ) THEN
    ALTER TABLE public.restaurants 
    ADD COLUMN settings jsonb DEFAULT '{"staff_prompts": {"default_instructions": "Be professional and courteous at all times", "negative_experience_guidance": "If a guest mentions concerns, empathize and offer to connect them with management", "positive_experience_guidance": "Thank guests for positive feedback and encourage them to share their experience"}}'::jsonb;
  END IF;
END $$;

-- Insert test restaurant (will be linked to test@me.com user once they sign up)
INSERT INTO public.restaurants (
  id,
  owner_id,
  restaurant_name,
  custom_slug,
  google_review_url,
  yelp_review_url,
  instagram_url,
  directions_url,
  header_title,
  header_subtitle,
  menu_title,
  subscription_status,
  plan_type,
  email,
  phone,
  address
) VALUES (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000001',
  'Test Restaurant',
  'test-hub',
  'https://google.com/reviews',
  'https://yelp.com/biz/test',
  'https://instagram.com/testrestaurant',
  'https://maps.apple.com/?q=Test+Restaurant',
  'How was your visit?',
  'We''d love to hear about your experience!',
  'Our Menu',
  'active',
  'monthly',
  'test@me.com',
  '555-0100',
  '123 Test Street'
) ON CONFLICT (id) DO NOTHING;

-- Create test menu sections
INSERT INTO public.menu_sections (id, restaurant_id, name, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Appetizers', 0),
  ('10000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Main Course', 1),
  ('10000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'Desserts', 2)
ON CONFLICT (id) DO NOTHING;

-- Create test menu items
INSERT INTO public.menu_items (section_id, name, description, price, sort_order) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Caesar Salad', 'Fresh romaine, parmesan, croutons', '$12', 0),
  ('10000000-0000-0000-0000-000000000001', 'Bruschetta', 'Toasted bread with tomato and basil', '$10', 1),
  ('10000000-0000-0000-0000-000000000001', 'Soup of the Day', 'Ask your server', '$8', 2),
  ('10000000-0000-0000-0000-000000000002', 'Grilled Salmon', 'With seasonal vegetables', '$28', 0),
  ('10000000-0000-0000-0000-000000000002', 'Ribeye Steak', '12oz with mashed potatoes', '$38', 1),
  ('10000000-0000-0000-0000-000000000002', 'Pasta Primavera', 'Fresh vegetables in garlic oil', '$22', 2),
  ('10000000-0000-0000-0000-000000000003', 'Tiramisu', 'Classic Italian dessert', '$9', 0),
  ('10000000-0000-0000-0000-000000000003', 'Chocolate Lava Cake', 'Warm with vanilla ice cream', '$10', 1),
  ('10000000-0000-0000-0000-000000000003', 'Cheesecake', 'New York style', '$9', 2)
ON CONFLICT DO NOTHING;