import React, { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type RestaurantBasic = {
  id: string;
  restaurant_name: string | null;
  greeting_name?: string | null;
};

type SettingsGreetingProps = {
  restaurant: RestaurantBasic;
  onUpdated?: (updated: RestaurantBasic) => void;
};

function isGreetingLikelyClean(text: string): boolean {
  if (!text.trim()) return true;
  if (text.length > 40) return false;
  return true;
}

export const SettingsGreeting: React.FC<SettingsGreetingProps> = ({
  restaurant,
  onUpdated,
}) => {
  const [value, setValue] = useState<string>(
    restaurant.greeting_name || restaurant.restaurant_name || ""
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);

    if (!isGreetingLikelyClean(value)) {
      setSaving(false);
      setError(
        "Please choose a short, professional name for your greeting."
      );
      return;
    }

    try {
      const { data, error } = await supabase
        .from("restaurants")
        .update({
          greeting_name: value.trim() === "" ? null : value.trim(),
        })
        .eq("id", restaurant.id)
        .select("id, restaurant_name, greeting_name")
        .single();

      if (error) throw error;

      if (onUpdated && data) {
        onUpdated(data as RestaurantBasic);
      }

      setSuccess(true);
    } catch (e: any) {
      setError(
        e.message ??
          "Something went wrong while saving your greeting. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dashboard Greeting</CardTitle>
        <CardDescription>
          This controls what appears in your dashboard welcome message.
          Example: <span className="font-mono">Hi, Jorge! 👋</span>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="greeting">Name to display in greeting</Label>
          <Input
            id="greeting"
            type="text"
            placeholder="e.g. Jorge, Jorge & Team, Las Islas Marías"
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              setSuccess(false);
              setError(null);
            }}
          />
          <p className="text-xs text-muted-foreground">
            Keep it short and professional. Offensive or inappropriate text
            will be blocked.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save greeting"}
          </Button>

          {success && (
            <span className="text-xs text-green-600">
              Saved. Your greeting will update on the dashboard.
            </span>
          )}

          {error && (
            <span className="text-xs text-destructive">
              {error}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
