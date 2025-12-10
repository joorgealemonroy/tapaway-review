-- Add sales_rep role to existing app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'sales_rep';

-- Create rep_applications table for self-signup with approval
CREATE TABLE public.rep_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  reviewed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create sales_reps table
CREATE TABLE public.sales_reps (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  phone TEXT,
  payout_method TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create rep_compensation_settings table (single row for global config)
CREATE TABLE public.rep_compensation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  base_commission_per_close NUMERIC NOT NULL DEFAULT 50,
  bonus_amount NUMERIC NOT NULL DEFAULT 500,
  bonus_threshold_closes INTEGER NOT NULL DEFAULT 30,
  bonus_period TEXT NOT NULL DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default compensation settings row
INSERT INTO public.rep_compensation_settings (id) VALUES (gen_random_uuid());

-- Create rep_restaurants table for rep's mini-CRM (prospects they're working)
CREATE TABLE public.rep_restaurants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sales_rep_id UUID NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_name TEXT,
  phone TEXT,
  email TEXT,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'not_contacted' CHECK (status IN ('not_contacted', 'contacted', 'closed', 'lost')),
  plan_type TEXT CHECK (plan_type IN ('monthly', 'yearly_150', 'yearly_300')),
  closed_at TIMESTAMP WITH TIME ZONE,
  linked_restaurant_id UUID REFERENCES public.restaurants(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create commissions table
CREATE TABLE public.commissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id UUID NOT NULL REFERENCES public.sales_reps(id) ON DELETE CASCADE,
  rep_restaurant_id UUID REFERENCES public.rep_restaurants(id),
  restaurant_id UUID REFERENCES public.restaurants(id),
  type TEXT NOT NULL CHECK (type IN ('close', 'bonus')),
  amount NUMERIC NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  period_label TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Add sales_rep_id to restaurants table for tracking which rep closed the deal
ALTER TABLE public.restaurants 
  ADD COLUMN IF NOT EXISTS sales_rep_id UUID REFERENCES public.sales_reps(id);

-- Enable RLS on all new tables
ALTER TABLE public.rep_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_reps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_compensation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rep_restaurants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

-- Create function to check if user is a sales rep
CREATE OR REPLACE FUNCTION public.is_sales_rep()
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.sales_reps
    WHERE id = auth.uid() AND is_active = true
  )
$$;

-- RLS Policies for rep_applications
CREATE POLICY "Anyone can insert applications" ON public.rep_applications
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view all applications" ON public.rep_applications
  FOR SELECT USING (is_admin());

CREATE POLICY "Admins can update applications" ON public.rep_applications
  FOR UPDATE USING (is_admin());

-- RLS Policies for sales_reps
CREATE POLICY "Admins can manage all reps" ON public.sales_reps
  FOR ALL USING (is_admin());

CREATE POLICY "Reps can view own record" ON public.sales_reps
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Reps can update own record" ON public.sales_reps
  FOR UPDATE USING (id = auth.uid());

-- RLS Policies for rep_compensation_settings
CREATE POLICY "Only admins can manage compensation settings" ON public.rep_compensation_settings
  FOR ALL USING (is_admin());

-- RLS Policies for rep_restaurants
CREATE POLICY "Admins can manage all rep restaurants" ON public.rep_restaurants
  FOR ALL USING (is_admin());

CREATE POLICY "Reps can view own restaurants" ON public.rep_restaurants
  FOR SELECT USING (sales_rep_id = auth.uid());

CREATE POLICY "Reps can insert own restaurants" ON public.rep_restaurants
  FOR INSERT WITH CHECK (sales_rep_id = auth.uid());

CREATE POLICY "Reps can update own restaurants" ON public.rep_restaurants
  FOR UPDATE USING (sales_rep_id = auth.uid());

CREATE POLICY "Reps can delete own restaurants" ON public.rep_restaurants
  FOR DELETE USING (sales_rep_id = auth.uid());

-- RLS Policies for commissions
CREATE POLICY "Admins can manage all commissions" ON public.commissions
  FOR ALL USING (is_admin());

CREATE POLICY "Reps can view own commissions" ON public.commissions
  FOR SELECT USING (rep_id = auth.uid());

-- Create trigger for updated_at on new tables
CREATE TRIGGER update_sales_reps_updated_at
  BEFORE UPDATE ON public.sales_reps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rep_compensation_settings_updated_at
  BEFORE UPDATE ON public.rep_compensation_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rep_restaurants_updated_at
  BEFORE UPDATE ON public.rep_restaurants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to auto-create bonus when threshold is reached
CREATE OR REPLACE FUNCTION public.check_and_create_bonus()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_close_count INTEGER;
  v_bonus_count INTEGER;
  v_settings RECORD;
  v_expected_bonuses INTEGER;
BEGIN
  -- Only process close commissions
  IF NEW.type != 'close' THEN
    RETURN NEW;
  END IF;

  -- Get compensation settings
  SELECT * INTO v_settings FROM public.rep_compensation_settings LIMIT 1;

  -- Count close commissions for this rep in this period
  SELECT COUNT(*) INTO v_close_count
  FROM public.commissions
  WHERE rep_id = NEW.rep_id
    AND type = 'close'
    AND period_label = NEW.period_label;

  -- Count existing bonus commissions for this rep in this period
  SELECT COUNT(*) INTO v_bonus_count
  FROM public.commissions
  WHERE rep_id = NEW.rep_id
    AND type = 'bonus'
    AND period_label = NEW.period_label;

  -- Calculate expected number of bonuses
  v_expected_bonuses := v_close_count / v_settings.bonus_threshold_closes;

  -- Create bonus if needed
  IF v_expected_bonuses > v_bonus_count THEN
    INSERT INTO public.commissions (rep_id, type, amount, status, period_label, note)
    VALUES (
      NEW.rep_id,
      'bonus',
      v_settings.bonus_amount,
      'pending',
      NEW.period_label,
      'Bonus for ' || v_settings.bonus_threshold_closes || ' closes this month'
    );
  END IF;

  RETURN NEW;
END;
$$;

-- Create trigger to check for bonus on commission insert
CREATE TRIGGER check_bonus_on_commission_insert
  AFTER INSERT ON public.commissions
  FOR EACH ROW EXECUTE FUNCTION public.check_and_create_bonus();

-- Create indexes for better performance
CREATE INDEX idx_rep_restaurants_sales_rep_id ON public.rep_restaurants(sales_rep_id);
CREATE INDEX idx_rep_restaurants_status ON public.rep_restaurants(status);
CREATE INDEX idx_commissions_rep_id ON public.commissions(rep_id);
CREATE INDEX idx_commissions_period_label ON public.commissions(period_label);
CREATE INDEX idx_commissions_status ON public.commissions(status);
CREATE INDEX idx_restaurants_sales_rep_id ON public.restaurants(sales_rep_id);