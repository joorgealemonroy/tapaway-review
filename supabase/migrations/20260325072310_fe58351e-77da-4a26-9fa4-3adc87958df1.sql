
-- Lead forms table
CREATE TABLE public.lead_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  is_active boolean NOT NULL DEFAULT true,
  button_title text NOT NULL DEFAULT 'Get a Quote',
  form_title text NOT NULL DEFAULT 'Request a Quote',
  fields jsonb NOT NULL DEFAULT '[{"type":"text","label":"Full Name","required":true},{"type":"email","label":"Email","required":true},{"type":"phone","label":"Phone","required":false}]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Lead submissions table
CREATE TABLE public.lead_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.lead_forms(id) ON DELETE CASCADE,
  profile_id uuid NOT NULL REFERENCES public.personal_profiles(id) ON DELETE CASCADE,
  submission_data jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Updated_at trigger for lead_forms
CREATE TRIGGER update_lead_forms_updated_at
  BEFORE UPDATE ON public.lead_forms
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS
ALTER TABLE public.lead_forms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_submissions ENABLE ROW LEVEL SECURITY;

-- RLS: Owners CRUD their own lead_forms
CREATE POLICY "Owners manage their lead forms"
  ON public.lead_forms
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_profiles pp
      WHERE pp.id = lead_forms.profile_id AND pp.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.personal_profiles pp
      WHERE pp.id = lead_forms.profile_id AND pp.user_id = auth.uid()
    )
  );

-- RLS: Public can read active lead forms (for profile rendering)
CREATE POLICY "Public can view active lead forms"
  ON public.lead_forms
  FOR SELECT
  TO anon
  USING (is_active = true);

-- RLS: Anyone can insert lead submissions (public form)
CREATE POLICY "Anyone can submit leads"
  ON public.lead_submissions
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- RLS: Owners can view their own submissions
CREATE POLICY "Owners view their lead submissions"
  ON public.lead_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.personal_profiles pp
      WHERE pp.id = lead_submissions.profile_id AND pp.user_id = auth.uid()
    )
  );

-- RLS: Admins full access on both
CREATE POLICY "Admins manage all lead forms"
  ON public.lead_forms
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "Admins view all lead submissions"
  ON public.lead_submissions
  FOR ALL
  TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
