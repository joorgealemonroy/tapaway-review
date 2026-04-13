import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ResponsiveModal } from "@/components/personal/ResponsiveModal";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Loader2, MessageSquareText } from "lucide-react";

interface FormField {
  type: "text" | "email" | "phone" | "textarea" | "select" | "number";
  label: string;
  required: boolean;
  options?: string[];
}

interface LeadForm {
  id: string;
  profile_id: string;
  is_active: boolean;
  button_title: string;
  form_title: string;
  fields: FormField[];
}

interface Props {
  profileId: string;
  accentColor?: string | null;
}

const LeadFormSheet = ({ profileId, accentColor }: Props) => {
  const [form, setForm] = useState<LeadForm | null>(null);
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadForm = async () => {
      const { data } = await supabase
        .from("lead_forms")
        .select("*")
        .eq("profile_id", profileId)
        .eq("is_active", true)
        .limit(1)
        .maybeSingle();

      if (data) {
        setForm(data as unknown as LeadForm);
      }
    };
    loadForm();
  }, [profileId]);

  const handleSubmit = useCallback(async () => {
    if (!form) return;

    // Validate required fields
    for (const field of form.fields) {
      if (field.required && !formData[field.label]?.trim()) {
        return;
      }
    }

    setSubmitting(true);
    try {
      const { error } = await supabase.from("lead_submissions").insert([{
        form_id: form.id,
        profile_id: profileId,
        submission_data: JSON.parse(JSON.stringify(formData)),
      }]);

      if (error) throw error;

      // Fire-and-forget notification
      supabase.functions
        .invoke("notify-new-lead", {
          body: {
            profileId,
            formTitle: form.form_title,
            submissionData: formData,
          },
        })
        .catch(() => {});

      setSubmitted(true);
      setTimeout(() => {
        setOpen(false);
        setSubmitted(false);
        setFormData({});
      }, 2000);
    } catch (err) {
      console.error("Submission error:", err);
    } finally {
      setSubmitting(false);
    }
  }, [form, formData, profileId]);

  if (!form) return null;

  const buttonBg = accentColor || "hsl(var(--primary))";
  const isHex = accentColor && /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(accentColor);

  const renderField = (field: FormField, idx: number) => {
    switch (field.type) {
      case "select":
        return (
          <RadioGroup
            value={formData[field.label] || ""}
            onValueChange={(val) => setFormData({ ...formData, [field.label]: val })}
            className="space-y-2"
          >
            {(field.options || []).map((opt, optIdx) => (
              <div key={optIdx} className="flex items-center space-x-2">
                <RadioGroupItem value={opt} id={`field-${idx}-opt-${optIdx}`} />
                <Label htmlFor={`field-${idx}-opt-${optIdx}`} className="text-sm font-normal cursor-pointer">
                  {opt}
                </Label>
              </div>
            ))}
          </RadioGroup>
        );
      case "number":
        return (
          <Input
            type="number"
            inputMode="numeric"
            placeholder={field.label}
            value={formData[field.label] || ""}
            onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
            maxLength={20}
            required={field.required}
          />
        );
      case "textarea":
        return (
          <Textarea
            placeholder={field.label}
            value={formData[field.label] || ""}
            onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
            maxLength={1000}
            required={field.required}
          />
        );
      default:
        return (
          <Input
            type={field.type === "phone" ? "tel" : field.type}
            placeholder={field.label}
            value={formData[field.label] || ""}
            onChange={(e) => setFormData({ ...formData, [field.label]: e.target.value })}
            maxLength={255}
            required={field.required}
          />
        );
    }
  };

  return (
    <>
      {/* CTA Pill */}
      <button
        onClick={() => setOpen(true)}
        className="w-full rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.97] shadow-lg"
        style={{
          backgroundColor: isHex ? accentColor : undefined,
          color: isHex ? "#ffffff" : undefined,
          boxShadow: isHex ? `0 4px 20px ${accentColor}40` : undefined,
        }}
        {...(!isHex ? { className: "w-full rounded-full py-3.5 px-6 font-semibold text-sm flex items-center justify-center gap-2 transition-transform active:scale-[0.97] shadow-lg bg-primary text-primary-foreground" } : {})}
      >
        <MessageSquareText className="h-4 w-4" />
        {form.button_title}
      </button>

      {/* Modal/Sheet */}
      <ResponsiveModal
        open={open}
        onOpenChange={setOpen}
        title={form.form_title}
        description="Fill out the form below and we'll get back to you."
      >
        <AnimatePresence mode="wait">
          {submitted ? (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-12 gap-3"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 15 }}
              >
                <CheckCircle2 className="h-16 w-16 text-green-500" />
              </motion.div>
              <p className="text-lg font-semibold text-foreground">Sent!</p>
              <p className="text-sm text-muted-foreground">We'll be in touch soon.</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              {form.fields.map((field, idx) => (
                <div key={idx} className="space-y-1.5">
                  <Label className="text-sm">
                    {field.label}
                    {field.required && <span className="text-destructive ml-0.5">*</span>}
                  </Label>
                  {renderField(field, idx)}
                </div>
              ))}

              <Button
                onClick={handleSubmit}
                disabled={submitting}
                className="w-full"
                style={isHex ? { backgroundColor: accentColor, color: "#ffffff" } : undefined}
              >
                {submitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                Submit
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </ResponsiveModal>
    </>
  );
};

export default memo(LeadFormSheet);
