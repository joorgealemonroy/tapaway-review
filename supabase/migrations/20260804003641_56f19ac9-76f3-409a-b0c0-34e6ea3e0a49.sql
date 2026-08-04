CREATE POLICY "Admins can delete applications"
ON public.rep_applications
FOR DELETE
TO authenticated
USING (
  public.has_role(auth.uid(), 'admin')
  OR (auth.jwt() ->> 'email') = 'tap@tapaway.co'
);