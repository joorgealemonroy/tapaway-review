import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, GripVertical, Save, Loader2, Type, Mail, Phone, AlignLeft } from "lucide-react";
import { toast } from "sonner";

interface FormField {
  type: "text" | "email" | "phone" | "textarea";
  label: string;
  required: boolean;
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
}

const FIELD_TYPES = [
  { type: "text" as const, label: "Text Input", icon: Type },
  { type: "email" as const, label: "Email", icon: Mail },
  { type: "phone" as const, label: "Phone", icon: Phone },
  { type: "textarea" as const, label: "Long Text", icon: AlignLeft },
];

const fieldTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    text: "Text",
    email: "Email",
    phone: "Phone",
    textarea: "Long Text",
  };
  return map[type] || type;
};

const LeadFormBuilder = ({ profileId }: Props) => {
  const [form, setForm] = useState<LeadForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [buttonTitle, setButtonTitle] = useState("Get a Quote");
  const [formTitle, setFormTitle] = useState("Request a Quote");
  const [fields, setFields] = useState<FormField[]>([
    { type: "text", label: "Full Name", required: true },
    { type: "email", label: "Email", required: true },
    { type: "phone", label: "Phone", required: false },
  ]);

  const loadForm = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("lead_forms")
        .select("*")
        .eq("profile_id", profileId)
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setForm(data as unknown as LeadForm);
        setIsActive(data.is_active);
        setButtonTitle(data.button_title);
        setFormTitle(data.form_title);
        setFields((data.fields as unknown as FormField[]) || []);
      }
    } catch (err) {
      console.error("Error loading lead form:", err);
    } finally {
      setLoading(false);
    }
  }, [profileId]);

  useEffect(() => {
    loadForm();
  }, [loadForm]);

  const handleSave = async () => {
    if (fields.length === 0) {
      toast.error("Add at least one field");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        profile_id: profileId,
        is_active: isActive,
        button_title: buttonTitle.trim() || "Get a Quote",
        form_title: formTitle.trim() || "Request a Quote",
        fields: JSON.parse(JSON.stringify(fields)),
      };

      if (form) {
        const { error } = await supabase
          .from("lead_forms")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("lead_forms")
          .insert([payload]);
        if (error) throw error;
      }

      toast.success("Lead form saved!");
      await loadForm();
    } catch (err) {
      console.error("Error saving lead form:", err);
      toast.error("Failed to save form");
    } finally {
      setSaving(false);
    }
  };

  const addField = (type: FormField["type"]) => {
    const defaultLabels: Record<string, string> = {
      text: "Name",
      email: "Email Address",
      phone: "Phone Number",
      textarea: "Message",
    };
    setFields([...fields, { type, label: defaultLabels[type], required: false }]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-foreground">Lead Capture Form</h3>
          <p className="text-sm text-muted-foreground">
            Collect quotes & inquiries from your profile visitors
          </p>
        </div>
        <Switch checked={isActive} onCheckedChange={setIsActive} />
      </div>

      {isActive && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Button Title</Label>
              <Input
                value={buttonTitle}
                onChange={(e) => setButtonTitle(e.target.value)}
                placeholder="Get a Quote"
                maxLength={50}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Form Title</Label>
              <Input
                value={formTitle}
                onChange={(e) => setFormTitle(e.target.value)}
                placeholder="Request a Quote"
                maxLength={80}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Form Fields</Label>
            <div className="space-y-2">
              {fields.map((field, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                  <Badge variant="secondary" className="text-xs flex-shrink-0">
                    {fieldTypeBadge(field.type)}
                  </Badge>
                  <Input
                    value={field.label}
                    onChange={(e) => updateField(idx, { label: e.target.value })}
                    className="h-8 text-sm"
                    maxLength={60}
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Label className="text-xs text-muted-foreground">Req</Label>
                    <Switch
                      checked={field.required}
                      onCheckedChange={(val) => updateField(idx, { required: val })}
                      className="scale-75"
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 flex-shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => removeField(idx)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>

            {fields.length < 8 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Field
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center">
                  {FIELD_TYPES.map((ft) => (
                    <DropdownMenuItem key={ft.type} onClick={() => addField(ft.type)}>
                      <ft.icon className="h-4 w-4 mr-2" />
                      {ft.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
            Save Form
          </Button>
        </div>
      )}

      {!isActive && form && (
        <p className="text-sm text-muted-foreground">
          Your form is currently hidden from your profile. Toggle it on to start collecting leads.
        </p>
      )}
    </div>
  );
};

export default memo(LeadFormBuilder);
