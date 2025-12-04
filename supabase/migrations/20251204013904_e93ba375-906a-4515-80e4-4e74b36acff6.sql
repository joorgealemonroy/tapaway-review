-- Add ai_coach_unlocked column to restaurants table
ALTER TABLE public.restaurants 
ADD COLUMN ai_coach_unlocked boolean NOT NULL DEFAULT false;