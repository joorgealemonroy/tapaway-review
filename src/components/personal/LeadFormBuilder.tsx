import { useState, useEffect, useCallback, memo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, Trash2, Save, Loader2, Type, Mail, Phone, AlignLeft, ChevronDown, ListChecks, Hash } from "lucide-react";
import { toast } from "sonner";

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
}

const FIELD_TYPES = [
  { type: "text" as const, label: "Text Input", icon: Type },
  { type: "email" as const, label: "Email", icon: Mail },
  { type: "phone" as const, label: "Phone", icon: Phone },
  { type: "textarea" as const, label: "Long Text", icon: AlignLeft },
  { type: "select" as const, label: "Multiple Choice", icon: ListChecks },
  { type: "number" as const, label: "Number", icon: Hash },
];

const fieldTypeBadge = (type: string) => {
  const map: Record<string, string> = {
    text: "Text",
    email: "Email",
    phone: "Phone",
    textarea: "Long Text",
    select: "Choice",
    number: "Number",
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
      toast.error("Couldn't load your form. Pull to refresh or reopen this tab.");
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

    // Clean up select fields and validate
    const cleanedFields = fields.map((f) => {
      if (f.type === "select") {
        const cleaned = (f.options || []).map((o) => o.trim()).filter(Boolean);
        return { ...f, options: cleaned };
      }
      return f;
    });

    for (const f of cleanedFields) {
      if (f.type === "select" && (!f.options || f.options.length === 0)) {
        toast.error(`"${f.label}" needs at least one option`);
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        profile_id: profileId,
        is_active: isActive,
        button_title: buttonTitle.trim() || "Get a Quote",
        form_title: formTitle.trim() || "Request a Quote",
        fields: JSON.parse(JSON.stringify(cleanedFields)),
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
      select: "Choose One",
      number: "Quantity",
    };
    const newField: FormField = { type, label: defaultLabels[type], required: false };
    if (type === "select") {
      newField.options = ["Option 1", "Option 2"];
    }
    setFields([...fields, newField]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((f, i) => (i === index ? { ...f, ...updates } : f)));
  };

  const updateOption = (fieldIdx: number, optIdx: number, value: string) => {
    const field = fields[fieldIdx];
    const opts = [...(field.options || [])];
    opts[optIdx] = value;
    updateField(fieldIdx, { options: opts });
  };

  const removeOption = (fieldIdx: number, optIdx: number) => {
    const field = fields[fieldIdx];
    const opts = (field.options || []).filter((_, i) => i !== optIdx);
    updateField(fieldIdx, { options: opts });
  };

  const addOption = (fieldIdx: number) => {
    const field = fields[fieldIdx];
    const opts = [...(field.options || [])];
    if (opts.length >= 10) return;
    opts.push(`Option ${opts.length + 1}`);
    updateField(fieldIdx, { options: opts });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Collapsible defaultOpen={false} className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <CollapsibleTrigger className="flex items-center gap-2 text-left group flex-1">
          <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          <div>
            <h3 className="font-semibold text-foreground">Collect customer info</h3>
            <p className="text-sm text-muted-foreground">
              Turn this on and a button appears on your page. When a visitor fills it out, you get
              notified and their info lands here.
            </p>
          </div>
        </CollapsibleTrigger>
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
      </div>

      <CollapsibleContent className="mt-4">
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
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center gap-2 rounded-lg border border-border bg-background p-2.5">
                      <Badge variant="secondary" className="text-xs flex-shrink-0">
                        {fieldTypeBadge(field.type)}
                      </Badge>
                      <Input
                        value={field.label}
                        onChange={(e) => updateField(idx, { label: e.target.value })}
                        className="min-h-[44px] text-base"
                        maxLength={60}
                        aria-label="Field label"
                      />
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <Label className="text-xs text-muted-foreground">Req</Label>
                        <Switch
                          checked={field.required}
                          onCheckedChange={(val) => updateField(idx, { required: val })}
                          aria-label={`Mark "${field.label}" as required`}
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-11 w-11 flex-shrink-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeField(idx)}
                        aria-label={`Remove field "${field.label}"`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Options editor for select fields */}
                    {field.type === "select" && (
                      <div className="ml-8 space-y-1.5 rounded-md border border-dashed border-border bg-muted/30 p-2.5">
                        {(field.options || []).map((opt, optIdx) => (
                          <div key={optIdx} className="flex items-center gap-1.5">
                            <span className="text-xs text-muted-foreground w-4 text-right flex-shrink-0">
                              {optIdx + 1}.
                            </span>
                            <Input
                              value={opt}
                              onChange={(e) => updateOption(idx, optIdx, e.target.value)}
                              className="min-h-[44px] text-base"
                              maxLength={100}
                              placeholder="Option text"
                              aria-label={`Option ${optIdx + 1}`}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-11 w-11 flex-shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => removeOption(idx, optIdx)}
                              aria-label={`Remove option ${optIdx + 1}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        {(field.options || []).length < 10 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="min-h-[44px] text-sm w-full"
                            onClick={() => addOption(idx)}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Add Option
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {fields.length < 20 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="w-full min-h-[44px]">
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

            <Button onClick={handleSave} disabled={saving} className="w-full min-h-[44px]">
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
      </CollapsibleContent>
    </Collapsible>
  );
};

export default memo(LeadFormBuilder);
