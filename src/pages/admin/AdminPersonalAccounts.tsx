import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAccess } from "@/hooks/useAdminAccess";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import EmailLeadsTab from "@/components/personal/EmailLeadsTab";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  AlertDialog, 
  AlertDialogAction, 
  AlertDialogCancel, 
  AlertDialogContent, 
  AlertDialogDescription, 
  AlertDialogFooter, 
  AlertDialogHeader, 
  AlertDialogTitle 
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { 
  ArrowLeft, 
  Search, 
  Trash2, 
  Loader2, 
  User,
  ExternalLink,
  Plus,
  Copy,
  Check,
  X,
  Paintbrush,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  Upload,
  Pencil,
  Mail,
  Send,
  Sparkles,
  Eye,
  Building2,
  Link as LinkIcon
} from "lucide-react";
import { PERSONAL_PRICING } from "@/lib/personalConfig";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { AdminUnifiedContent, AdminLink, AdminBlock } from "@/components/admin/AdminUnifiedContent";
import { extractBottomColor, generateAmbientGradient } from "@/lib/imageColorExtraction";

interface PersonalAccount {
  id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  profile_photo_url: string | null;
  header_image_url: string | null;
  header_color: string | null;
  header_type: string | null;
  background_color: string | null;
  pfp_position: string | null;
  headline: string | null;
  bio: string | null;
  subscription_status: string | null;
  plan_type: string | null;
  created_at: string;
  // Contact card fields
  contact_enabled: boolean | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_photo_url: string | null;
  contact_phone: string | null;
  contact_company: string | null;
  contact_title: string | null;
  contact_address: string | null;
  contact_website: string | null;
  // Premium feature
  banner_image_url: string | null;
}

const COLOR_PRESETS = [
  "#000000", "#FFFFFF", "#1a1a2e", "#2d6a4f",
  "#e63946", "#4361ee", "#f4a261", "#9b5de5",
  "#F8C8DC", "#FFB6C1", "#DDA0DD", "#E8B4BC",
  "#B5EAD7", "#FFDAC1", "#C3B1E1",
];

const GRADIENT_PRESETS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
];

const BG_PRESETS = ["#ffffff", "#f5f5f5", "#fafafa", "#f0f0f0", "#e8e8e8", "#1a1a1a"];

// BG_GRADIENT_PRESETS removed - ambient gradients are now auto-generated from banner images

const AdminPersonalAccounts = () => {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdminAccess();

  const [accounts, setAccounts] = useState<PersonalAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingAccount, setDeletingAccount] = useState<PersonalAccount | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  // Create account state
  const [accountType, setAccountType] = useState<"small" | "bigger">("small");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");
  // Bigger business form
  const [biggerForm, setBiggerForm] = useState({ businessName: "", email: "", password: "" });
  const [createForm, setCreateForm] = useState({
    email: "",
    fullName: "",
    username: "",
    planType: "free" as "free" | "monthly" | "yearly" | "vip",
    headline: "",
    bio: "",
    // Design fields
    headerType: "color" as "color" | "image",
    headerColor: "#6BCB77",
    backgroundColor: "#000000",
    pfpPosition: "center" as "center" | "left",
  });
  const [adminLinks, setAdminLinks] = useState<AdminLink[]>([]);
  const [adminBlocks, setAdminBlocks] = useState<AdminBlock[]>([]);

  // Image upload state
  const [profilePhotoFile, setProfilePhotoFile] = useState<File | null>(null);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState<string | null>(null);
  const [headerImageFile, setHeaderImageFile] = useState<File | null>(null);
  const [headerImagePreview, setHeaderImagePreview] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [cropperType, setCropperType] = useState<"profile" | "header">("profile");
  const [rawImageUrl, setRawImageUrl] = useState<string | null>(null);
  const profileInputRef = useRef<HTMLInputElement>(null);
  const headerInputRef = useRef<HTMLInputElement>(null);

  // Success state
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    tempPassword: string;
    profileUrl: string;
    username: string;
  } | null>(null);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Edit account state
  const [editingAccount, setEditingAccount] = useState<PersonalAccount | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingEmail, setUpdatingEmail] = useState(false);
  const [sendingMagicLink, setSendingMagicLink] = useState(false);
  
  // Username edit state
  const [editUsername, setEditUsername] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [savingUsername, setSavingUsername] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    fullName: "",
    headline: "",
    bio: "",
    headerType: "color" as "color" | "image" | "banner",
    headerColor: "#6BCB77",
    backgroundColor: "#000000",
    pfpPosition: "center" as "center" | "left",
    // Contact card fields
    contactEnabled: false,
    contactName: "",
    contactEmail: "",
    contactPhotoUrl: "",
    contactPhone: "",
    contactCompany: "",
    contactTitle: "",
    contactAddress: "",
    contactWebsite: "",
    // Banner
    bannerImageUrl: "" as string | null,
  });
  const [editLinks, setEditLinks] = useState<AdminLink[]>([]);
  const [editBlocks, setEditBlocks] = useState<AdminBlock[]>([]);
  const [editProfilePhotoFile, setEditProfilePhotoFile] = useState<File | null>(null);
  const [editProfilePhotoPreview, setEditProfilePhotoPreview] = useState<string | null>(null);
  const [editHeaderImageFile, setEditHeaderImageFile] = useState<File | null>(null);
  const [editHeaderImagePreview, setEditHeaderImagePreview] = useState<string | null>(null);
  const [editContactPhotoFile, setEditContactPhotoFile] = useState<File | null>(null);
  const [editContactPhotoPreview, setEditContactPhotoPreview] = useState<string | null>(null);
  const [editBannerImageFile, setEditBannerImageFile] = useState<File | null>(null);
  const [editBannerImagePreview, setEditBannerImagePreview] = useState<string | null>(null);
  const editProfileInputRef = useRef<HTMLInputElement>(null);
  const editHeaderInputRef = useRef<HTMLInputElement>(null);
  const editContactPhotoInputRef = useRef<HTMLInputElement>(null);
  const editBannerInputRef = useRef<HTMLInputElement>(null);

  // Link profile state
  const [linkingAccount, setLinkingAccount] = useState<PersonalAccount | null>(null);
  const [linkTargetEmail, setLinkTargetEmail] = useState("");
  const [linkLookedUpUser, setLinkLookedUpUser] = useState<{ id: string; email: string } | null>(null);
  const [linkLooking, setLinkLooking] = useState(false);
  const [linkSaving, setLinkSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!isAdmin || adminLoading) return;
    loadAccounts();
  }, [isAdmin, adminLoading]);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAccounts(data || []);
    } catch (err) {
      console.error("Error loading accounts:", err);
      toast.error("Failed to load accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deletingAccount || deleteConfirmText !== "DELETE") return;

    setDeleting(true);
    try {
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (!adminUser) throw new Error("Not authenticated");

      // Delete all related data
      await supabase.from("personal_blocks").delete().eq("profile_id", deletingAccount.id);
      await supabase.from("personal_links").delete().eq("profile_id", deletingAccount.id);
      await supabase.from("personal_analytics").delete().eq("profile_id", deletingAccount.id);

      // Delete storage assets
      try {
        await supabase.storage
          .from("personal-photos")
          .remove([
            `${deletingAccount.user_id}/profile.jpg`,
            `${deletingAccount.user_id}/header.jpg`,
          ]);

        const { data: files } = await supabase.storage
          .from("personal-photos")
          .list(`${deletingAccount.user_id}/blocks`);

        if (files && files.length > 0) {
          await supabase.storage
            .from("personal-photos")
            .remove(files.map(f => `${deletingAccount.user_id}/blocks/${f.name}`));
        }
      } catch (storageErr) {
        console.warn("Storage cleanup error (non-fatal):", storageErr);
      }

      // Delete the profile
      const { error: profileError } = await supabase
        .from("personal_profiles")
        .delete()
        .eq("id", deletingAccount.id);

      if (profileError) throw profileError;

      // Try to delete auth user via edge function
      try {
        await supabase.functions.invoke("delete-user-complete", {
          body: { userId: deletingAccount.user_id, isPersonalAccount: true }
        });
      } catch (authErr) {
        console.warn("Auth deletion error (non-fatal):", authErr);
      }

      // Log the deletion
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action: "delete_personal_account",
        target_type: "personal_profile",
        target_id: deletingAccount.id,
        details: {
          username: deletingAccount.username,
          email: deletingAccount.email,
          user_id: deletingAccount.user_id,
        }
      });

      toast.success(`Account @${deletingAccount.username} deleted permanently`);
      setAccounts(accounts.filter(a => a.id !== deletingAccount.id));
      setDeletingAccount(null);
      setDeleteConfirmText("");
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete account");
    } finally {
      setDeleting(false);
    }
  };

  const handleProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCropperType("profile");
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCropperType("header");
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (cropperType === "profile") {
      const file = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });
      setProfilePhotoFile(file);
      setProfilePhotoPreview(URL.createObjectURL(croppedBlob));
    } else {
      const file = new File([croppedBlob], "header.jpg", { type: "image/jpeg" });
      setHeaderImageFile(file);
      setHeaderImagePreview(URL.createObjectURL(croppedBlob));
      setCreateForm({ ...createForm, headerType: "image" });
    }
    setCropperOpen(false);
    setRawImageUrl(null);
  };

  const handleCreateAccount = async () => {
    if (!createForm.email || !createForm.fullName || !createForm.username) {
      toast.error("Email, name, and username are required");
      return;
    }

    // Basic username validation
    const usernameRegex = /^[a-zA-Z0-9_]+$/;
    if (!usernameRegex.test(createForm.username)) {
      toast.error("Username can only contain letters, numbers, and underscores");
      return;
    }

    setCreating(true);
    try {
      // First, create the account to get the user ID
      const { data, error } = await supabase.functions.invoke("create-personal-account", {
        body: {
          email: createForm.email,
          fullName: createForm.fullName,
          username: createForm.username.toLowerCase(),
          planType: createForm.planType,
          headline: createForm.headline || null,
          bio: createForm.bio || null,
          // Full link objects with all customization
          links: adminLinks.map((link) => ({
            type: link.type,
            label: link.label,
            url: link.url,
            value: link.value,
            pillColor: link.pillColor,
            displayStyle: link.displayStyle || "pill",
            isActive: link.isActive,
            isFeatured: link.isFeatured,
            sortOrder: link.sortOrder,
          })),
          // Content blocks
          blocks: adminBlocks.map((block) => ({
            blockType: block.block_type,
            content: block.content,
            alignment: block.alignment,
            isActive: block.is_active,
            sortOrder: block.sort_order,
          })),
          // Design fields
          headerType: createForm.headerType,
          headerColor: createForm.headerColor,
          backgroundColor: createForm.backgroundColor,
          pfpPosition: createForm.pfpPosition,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const userId = data.userId;

      // Upload images if present
      if (profilePhotoFile && userId) {
        const filePath = `${userId}/profile.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, profilePhotoFile, { upsert: true, contentType: "image/jpeg" });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ profile_photo_url: `${publicUrl}?t=${Date.now()}` })
            .eq("id", data.profileId);
        }
      }

      if (headerImageFile && userId && createForm.headerType === "image") {
        const filePath = `${userId}/header.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, headerImageFile, { upsert: true, contentType: "image/jpeg" });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ header_image_url: `${publicUrl}?t=${Date.now()}` })
            .eq("id", data.profileId);
        }
      }

      // Show success with credentials
      setCreatedCredentials({
        email: data.credentials.email,
        tempPassword: data.credentials.tempPassword,
        profileUrl: data.profileUrl,
        username: data.username,
      });

      // Reload accounts list
      loadAccounts();

      toast.success(`Account created for ${createForm.fullName}`);
    } catch (err: any) {
      console.error("Create error:", err);
      toast.error(err.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  const copyPassword = async () => {
    if (!createdCredentials) return;
    await navigator.clipboard.writeText(createdCredentials.tempPassword);
    setCopiedPassword(true);
    toast.success("Password copied to clipboard");
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const copyAllCredentials = async () => {
    if (!createdCredentials) return;
    const text = `Login Credentials for TapAway Personal
    
Email: ${createdCredentials.email}
Password: ${createdCredentials.tempPassword}

Profile URL: ${window.location.origin}${createdCredentials.profileUrl}

Login at: ${window.location.origin}/auth`;
    
    await navigator.clipboard.writeText(text);
    toast.success("All credentials copied to clipboard");
  };

  const resetCreateModal = () => {
    setShowCreateModal(false);
    setAccountType("small");
    setActiveTab("basic");
    setCreateForm({
      email: "",
      fullName: "",
      username: "",
      planType: "free",
      headline: "",
      bio: "",
      headerType: "color",
      headerColor: "#6BCB77",
      backgroundColor: "#000000",
      pfpPosition: "center",
    });
    setBiggerForm({ businessName: "", email: "", password: "" });
    setAdminLinks([]);
    setAdminBlocks([]);
    setCreatedCredentials(null);
    setCopiedPassword(false);
    setProfilePhotoFile(null);
    setProfilePhotoPreview(null);
    setHeaderImageFile(null);
    setHeaderImagePreview(null);
  };

  const handleCreateBiggerBusiness = async () => {
    if (!biggerForm.email || !biggerForm.businessName || !biggerForm.password) {
      toast.error("Business name, email, and password are required");
      return;
    }
    if (biggerForm.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-legacy-client-account", {
        body: {
          email: biggerForm.email,
          password: biggerForm.password,
          businessName: biggerForm.businessName,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreatedCredentials({
        email: biggerForm.email,
        tempPassword: biggerForm.password,
        profileUrl: "/dashboard",
        username: biggerForm.businessName,
      });
      toast.success(`Bigger Business account created for ${biggerForm.businessName}`);
    } catch (err: any) {
      console.error("Create bigger business error:", err);
      toast.error(err.message || "Failed to create account");
    } finally {
      setCreating(false);
    }
  };

  // Edit functions
  const openEditModal = async (account: PersonalAccount) => {
    setEditingAccount(account);
    setShowEditModal(true);
    setEditLoading(true);
    setActiveTab("basic");
    
    // Initialize username editing state
    setEditUsername(account.username);
    setUsernameAvailable(null);
    setUsernameChecking(false);

    // Set form values from account
    setEditForm({
      email: account.email || "",
      fullName: account.full_name || "",
      headline: account.headline || "",
      bio: account.bio || "",
      headerType: (account.header_type as "color" | "image") || "color",
      headerColor: account.header_color || "#6BCB77",
      backgroundColor: account.background_color || "#ffffff",
      pfpPosition: (account.pfp_position as "center" | "left") || "center",
      contactEnabled: account.contact_enabled || false,
      contactName: account.contact_name || "",
      contactEmail: account.contact_email || "",
      contactPhotoUrl: account.contact_photo_url || "",
      contactPhone: account.contact_phone || "",
      contactCompany: account.contact_company || "",
      contactTitle: account.contact_title || "",
      contactAddress: account.contact_address || "",
      contactWebsite: account.contact_website || "",
      bannerImageUrl: account.banner_image_url || null,
    });

    // Set image previews from existing data
    setEditProfilePhotoPreview(account.profile_photo_url || null);
    setEditHeaderImagePreview(account.header_image_url || null);
    setEditContactPhotoPreview(account.contact_photo_url || null);
    setEditBannerImagePreview(account.banner_image_url || null);
    setEditProfilePhotoFile(null);
    setEditHeaderImageFile(null);
    setEditContactPhotoFile(null);
    setEditBannerImageFile(null);

    try {
      // Load links
      const { data: linksData } = await supabase
        .from("personal_links")
        .select("*")
        .eq("profile_id", account.id)
        .order("sort_order", { ascending: true });

      if (linksData) {
        setEditLinks(linksData.map((l, index) => ({
          id: l.id,
          type: l.link_type,
          label: l.label,
          url: l.url,
          value: l.url,
          pillColor: l.pill_color || undefined,
          displayStyle: (l.display_style as "icon" | "pill" | "both") || "pill",
          isActive: l.is_active ?? true,
          isFeatured: l.is_featured ?? false,
          sortOrder: l.sort_order ?? index,
          coverImageUrl: l.cover_image_url || undefined,
          gridSize: l.grid_size || undefined,
          thumbnailUrl: l.thumbnail_url || undefined,
        })));
      }

      // Load blocks
      const { data: blocksData } = await supabase
        .from("personal_blocks")
        .select("*")
        .eq("profile_id", account.id)
        .order("sort_order", { ascending: true });

      if (blocksData) {
        setEditBlocks(blocksData.map((b, index) => ({
          id: b.id,
          block_type: b.block_type as AdminBlock["block_type"],
          content: b.content as Record<string, unknown>,
          alignment: (b.alignment as "left" | "center" | "right") || "center",
          is_active: b.is_active ?? true,
          sort_order: b.sort_order ?? index,
        })));
      }
    } catch (err) {
      console.error("Error loading account data:", err);
      toast.error("Failed to load account data");
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditProfilePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCropperType("profile");
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleEditHeaderImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    setCropperType("header");
    setRawImageUrl(URL.createObjectURL(file));
    setCropperOpen(true);
  };

  const handleEditCropComplete = async (croppedBlob: Blob) => {
    if (cropperType === "profile") {
      const file = new File([croppedBlob], "profile.jpg", { type: "image/jpeg" });
      setEditProfilePhotoFile(file);
      setEditProfilePhotoPreview(URL.createObjectURL(croppedBlob));
    } else if (cropperType === "header") {
      const file = new File([croppedBlob], "header.jpg", { type: "image/jpeg" });
      setEditHeaderImageFile(file);
      setEditHeaderImagePreview(URL.createObjectURL(croppedBlob));
      setEditForm({ ...editForm, headerType: "image" });
    }
    setCropperOpen(false);
    setRawImageUrl(null);
  };

  const handleEditContactPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    // For contact photo, we don't need a cropper - just use as-is
    const previewUrl = URL.createObjectURL(file);
    setEditContactPhotoFile(file);
    setEditContactPhotoPreview(previewUrl);
  };

  const handleEditBannerImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setEditBannerImageFile(file);
    setEditBannerImagePreview(previewUrl);
  };

  const handleRemoveEditBanner = async () => {
    if (!editingAccount) return;
    try {
      await supabase
        .from("personal_profiles")
        .update({ banner_image_url: null })
        .eq("id", editingAccount.id);
      
      setEditBannerImageFile(null);
      setEditBannerImagePreview(null);
      setEditForm(prev => ({ ...prev, bannerImageUrl: null }));
      toast.success("Banner removed");
    } catch (err) {
      console.error("Error removing banner:", err);
      toast.error("Failed to remove banner");
    }
  };

  const handleUpdateEmail = async () => {
    if (!editingAccount || !editForm.email) return;
    
    // Check if email actually changed
    if (editForm.email === editingAccount.email) {
      toast.info("Email hasn't changed");
      return;
    }

    setUpdatingEmail(true);
    try {
      const { data, error } = await supabase.functions.invoke("update-personal-account-email", {
        body: {
          userId: editingAccount.user_id,
          profileId: editingAccount.id,
          newEmail: editForm.email,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Update the local account state
      setEditingAccount({ ...editingAccount, email: editForm.email });
      
      toast.success(`Email updated to ${editForm.email}`);
      loadAccounts();
    } catch (err: unknown) {
      console.error("Email update error:", err);
      const message = err instanceof Error ? err.message : "Failed to update email";
      toast.error(message);
    } finally {
      setUpdatingEmail(false);
    }
  };

  const handleSendMagicLink = async () => {
    if (!editingAccount) return;
    
    const emailToUse = editForm.email || editingAccount.email;
    if (!emailToUse) {
      toast.error("No email address available");
      return;
    }

    setSendingMagicLink(true);
    try {
      // Use custom TapAway-branded magic link email with dynamic base URL
      const { data, error } = await supabase.functions.invoke("send-magic-link-email", {
        body: {
          userId: editingAccount.user_id,
          email: emailToUse,
          fullName: editingAccount.full_name,
          baseUrl: window.location.origin,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success(`Magic link sent to ${emailToUse}. They can use it to log in.`);
    } catch (err: unknown) {
      console.error("Magic link error:", err);
      const message = err instanceof Error ? err.message : "Failed to send magic link";
      toast.error(message);
    } finally {
      setSendingMagicLink(false);
    }
  };

  // Username availability check with debounce
  const checkUsernameAvailability = async (newUsername: string) => {
    if (!newUsername || newUsername === editingAccount?.username) {
      setUsernameAvailable(null);
      return;
    }
    
    // Validate format - lowercase letters, numbers, underscore only
    if (!/^[a-z0-9_]+$/.test(newUsername.toLowerCase())) {
      setUsernameAvailable(false);
      return;
    }
    
    setUsernameChecking(true);
    try {
      const { data, error } = await supabase
        .from("personal_profiles")
        .select("id")
        .eq("username", newUsername.toLowerCase())
        .maybeSingle();
      
      if (error) throw error;
      setUsernameAvailable(!data); // Available if no profile found
    } catch (err) {
      console.error("Username check error:", err);
      setUsernameAvailable(null);
    } finally {
      setUsernameChecking(false);
    }
  };

  // Handle username update
  const handleUpdateUsername = async () => {
    if (!editingAccount || !editUsername || editUsername === editingAccount.username) return;
    if (!usernameAvailable) {
      toast.error("This username is already taken");
      return;
    }
    
    setSavingUsername(true);
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({ username: editUsername.toLowerCase() })
        .eq("id", editingAccount.id);
      
      if (error) throw error;
      
      // Log the change
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUser?.id,
        action: "update_username",
        target_type: "personal_profile",
        target_id: editingAccount.id,
        details: {
          old_username: editingAccount.username,
          new_username: editUsername.toLowerCase(),
        }
      });
      
      // Update local state
      setEditingAccount({ ...editingAccount, username: editUsername.toLowerCase() });
      toast.success(`Username changed to @${editUsername.toLowerCase()}`);
      loadAccounts();
    } catch (err) {
      console.error("Username update error:", err);
      toast.error("Failed to update username");
    } finally {
      setSavingUsername(false);
    }
  };

  // Debounced username check
  useEffect(() => {
    if (!editUsername || editUsername === editingAccount?.username) {
      setUsernameAvailable(null);
      return;
    }
    
    const timer = setTimeout(() => {
      checkUsernameAvailability(editUsername);
    }, 300);
    
    return () => clearTimeout(timer);
  }, [editUsername, editingAccount?.username]);

  const handleSaveEdit = async () => {
    if (!editingAccount) return;

    setSaving(true);
    try {
      // Update profile
      const { error: profileError } = await supabase
        .from("personal_profiles")
        .update({
          full_name: editForm.fullName,
          headline: editForm.headline || null,
          bio: editForm.bio || null,
          header_type: editForm.headerType,
          header_color: editForm.headerColor,
          background_color: editForm.backgroundColor,
          pfp_position: editForm.pfpPosition,
          contact_enabled: editForm.contactEnabled,
          contact_name: editForm.contactName || null,
          contact_email: editForm.contactEmail || null,
          contact_photo_url: editForm.contactPhotoUrl || null,
          contact_phone: editForm.contactPhone || null,
          contact_company: editForm.contactCompany || null,
          contact_title: editForm.contactTitle || null,
          contact_address: editForm.contactAddress || null,
          contact_website: editForm.contactWebsite || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingAccount.id);

      if (profileError) throw profileError;

      // Upload profile photo if changed
      if (editProfilePhotoFile) {
        const filePath = `${editingAccount.user_id}/profile.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, editProfilePhotoFile, { upsert: true, contentType: "image/jpeg" });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ profile_photo_url: `${publicUrl}?t=${Date.now()}` })
            .eq("id", editingAccount.id);
        }
      }

      // Upload header image if changed
      if (editHeaderImageFile && editForm.headerType === "image") {
        const filePath = `${editingAccount.user_id}/header.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, editHeaderImageFile, { upsert: true, contentType: "image/jpeg" });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ header_image_url: `${publicUrl}?t=${Date.now()}` })
            .eq("id", editingAccount.id);
        }
      }

      // Upload contact photo if changed
      if (editContactPhotoFile) {
        const fileExt = editContactPhotoFile.name.split(".").pop()?.toLowerCase() || "jpg";
        const filePath = `${editingAccount.user_id}/contact-photo-${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, editContactPhotoFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ contact_photo_url: publicUrl })
            .eq("id", editingAccount.id);
        }
      }

      // Upload banner image if changed
      if (editBannerImageFile) {
        const filePath = `banners/${editingAccount.id}/banner-${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from("personal-photos")
          .upload(filePath, editBannerImageFile, { upsert: true, contentType: "image/jpeg" });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(filePath);

          await supabase
            .from("personal_profiles")
            .update({ banner_image_url: `${publicUrl}?t=${Date.now()}` })
            .eq("id", editingAccount.id);
        }
      }

      // Sync links - delete all and re-insert
      const { error: deleteLinksError } = await supabase
        .from("personal_links")
        .delete()
        .eq("profile_id", editingAccount.id);
      
      if (deleteLinksError) throw deleteLinksError;
      
      if (editLinks.length > 0) {
        const linksToInsert = editLinks.map((link) => ({
          profile_id: editingAccount.id,
          link_type: link.type,
          label: link.label,
          url: link.url || link.value,
          pill_color: link.pillColor || null,
          display_style: link.displayStyle || "pill",
          is_active: link.isActive,
          is_featured: link.isFeatured,
          sort_order: link.sortOrder,
          cover_image_url: link.coverImageUrl || null,
          grid_size: link.gridSize || null,
          thumbnail_url: link.thumbnailUrl || null,
        }));
        const { error: insertLinksError } = await supabase
          .from("personal_links")
          .insert(linksToInsert);
        
        if (insertLinksError) throw insertLinksError;
      }

      // Sync blocks - delete all and re-insert
      const { error: deleteBlocksError } = await supabase
        .from("personal_blocks")
        .delete()
        .eq("profile_id", editingAccount.id);
      
      if (deleteBlocksError) throw deleteBlocksError;
      
      if (editBlocks.length > 0) {
        const blocksToInsert = editBlocks.map((block) => ({
          profile_id: editingAccount.id,
          block_type: block.block_type,
          content: block.content as unknown as Record<string, never>,
          alignment: block.alignment,
          is_active: block.is_active,
          sort_order: block.sort_order,
        }));
        const { error: insertBlocksError } = await supabase
          .from("personal_blocks")
          .insert(blocksToInsert);
        
        if (insertBlocksError) throw insertBlocksError;
      }

      toast.success("Profile updated successfully");
      loadAccounts();
      resetEditModal();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save changes");
    } finally {
      setSaving(false);
    }
  };

  const resetEditModal = () => {
    setShowEditModal(false);
    setEditingAccount(null);
    setEditForm({
      email: "",
      fullName: "",
      headline: "",
      bio: "",
      headerType: "color",
      headerColor: "#6BCB77",
      backgroundColor: "#ffffff",
      pfpPosition: "center",
      contactEnabled: false,
      contactName: "",
      contactEmail: "",
      contactPhotoUrl: "",
      contactPhone: "",
      contactCompany: "",
      contactTitle: "",
      contactAddress: "",
      contactWebsite: "",
      bannerImageUrl: null,
    });
    setEditLinks([]);
    setEditBlocks([]);
    setEditProfilePhotoFile(null);
    setEditProfilePhotoPreview(null);
    setEditHeaderImageFile(null);
    setEditHeaderImagePreview(null);
    setEditContactPhotoFile(null);
    setEditContactPhotoPreview(null);
    setEditBannerImageFile(null);
    setEditBannerImagePreview(null);
    setActiveTab("basic");
    // Reset username state
    setEditUsername("");
    setUsernameAvailable(null);
    setUsernameChecking(false);
  };

  // Link Profile handlers
  const handleLookupLinkUser = async () => {
    if (!linkTargetEmail.trim()) return;
    setLinkLooking(true);
    setLinkLookedUpUser(null);
    try {
      const { data, error } = await supabase.rpc("get_auth_user_by_email", {
        lookup_email: linkTargetEmail.trim(),
      });
      if (error) throw error;
      if (data && data.length > 0) {
        setLinkLookedUpUser({ id: data[0].id, email: data[0].email });
      } else {
        toast.error("No user found with that email");
      }
    } catch (err) {
      console.error("Lookup error:", err);
      toast.error("Failed to look up user");
    } finally {
      setLinkLooking(false);
    }
  };

  const handleLinkProfile = async () => {
    if (!linkingAccount || !linkLookedUpUser) return;
    setLinkSaving(true);
    try {
      const { error } = await supabase
        .from("personal_profiles")
        .update({ user_id: linkLookedUpUser.id })
        .eq("id", linkingAccount.id);
      if (error) throw error;

      // Audit log
      const { data: { user: adminUser } } = await supabase.auth.getUser();
      if (adminUser) {
        await supabase.from("admin_audit_log").insert({
          admin_user_id: adminUser.id,
          action: "link_profile_to_user",
          target_type: "personal_profile",
          target_id: linkingAccount.id,
          details: {
            username: linkingAccount.username,
            old_user_id: linkingAccount.user_id,
            new_user_id: linkLookedUpUser.id,
            new_user_email: linkLookedUpUser.email,
          },
        });
      }

      toast.success(`@${linkingAccount.username} linked to ${linkLookedUpUser.email}`);
      setLinkingAccount(null);
      setLinkTargetEmail("");
      setLinkLookedUpUser(null);
      loadAccounts();
    } catch (err) {
      console.error("Link error:", err);
      toast.error("Failed to link profile");
    } finally {
      setLinkSaving(false);
    }
  };


    try {
      // Check if already an affiliate
      const { data: existing } = await supabase
        .from("affiliates")
        .select("id, is_active")
        .eq("user_id", account.user_id)
        .maybeSingle();

      if (existing) {
        // Toggle active status
        const { error } = await supabase
          .from("affiliates")
          .update({ is_active: !existing.is_active })
          .eq("id", existing.id);
        if (error) throw error;
        toast.success(existing.is_active ? `Affiliate revoked for @${account.username}` : `Affiliate restored for @${account.username}`);
      } else {
        // Create new affiliate
        const { error } = await supabase
          .from("affiliates")
          .insert({
            user_id: account.user_id,
            referral_code: account.username.toLowerCase(),
          });
        if (error) throw error;

        // Also add the affiliate role
        await supabase.from("user_roles").insert({
          user_id: account.user_id,
          role: "affiliate" as any,
        });

        toast.success(`@${account.username} is now an affiliate!`);
      }
    } catch (err: any) {
      console.error("Toggle affiliate error:", err);
      toast.error(err.message || "Failed to update affiliate status");
    }
  };

  const filteredAccounts = accounts.filter((account) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (
      account.username.toLowerCase().includes(s) ||
      account.email.toLowerCase().includes(s) ||
      account.full_name.toLowerCase().includes(s)
    );
  });

  if (authLoading || adminLoading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!isAdmin) {
    return (
      <div className="p-6">
        <h1 className="text-xl font-semibold">Access denied</h1>
        <p className="text-muted-foreground">Admin access required</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Personal Accounts</h1>
            <p className="text-sm text-muted-foreground">
              Manage personal TapAway accounts
            </p>
          </div>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Account
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search by username, email, or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Accounts list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {search ? "No accounts match your search" : "No personal accounts yet"}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAccounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border"
            >
              {account.profile_photo_url ? (
                <img
                  src={account.profile_photo_url}
                  alt={account.full_name}
                  className="h-12 w-12 rounded-full object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <User className="h-6 w-6 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{account.full_name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    account.subscription_status === "active" 
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" 
                      : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                  }`}>
                    {account.subscription_status || "pending"}
                  </span>
                  {account.plan_type && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary">
                      {account.plan_type}
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">@{account.username}</p>
                <p className="text-xs text-muted-foreground">{account.email}</p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditModal(account)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/${account.username}`, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/dashboard?admin_view_personal=${account.id}`)}
                  title="View Dashboard"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleToggleAffiliate(account)}
                  title="Toggle Affiliate"
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => setDeletingAccount(account)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Account Modal */}
      <Dialog open={showCreateModal} onOpenChange={(open) => !open && resetCreateModal()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {createdCredentials ? "Account Created!" : "Create Account"}
            </DialogTitle>
            <DialogDescription>
              {createdCredentials 
                ? "Share these credentials with the client" 
                : "Set up a new TapAway account"
              }
            </DialogDescription>
          </DialogHeader>

          {/* Account Type Selector - only show before creation */}
          {!createdCredentials && (
            <div className="flex gap-2 pb-2">
              <Button
                variant={accountType === "small" ? "default" : "outline"}
                size="sm"
                onClick={() => setAccountType("small")}
                className="flex-1 gap-2"
              >
                <User className="h-4 w-4" />
                Small Business
              </Button>
              <Button
                variant={accountType === "bigger" ? "default" : "outline"}
                size="sm"
                onClick={() => setAccountType("bigger")}
                className="flex-1 gap-2"
              >
                <Building2 className="h-4 w-4" />
                Bigger Business
              </Button>
            </div>
          )}

          {createdCredentials ? (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <p className="font-mono text-sm">{createdCredentials.email}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Temporary Password</Label>
                  <div className="flex items-center gap-2">
                    <p className="font-mono text-sm bg-background px-2 py-1 rounded flex-1">
                      {createdCredentials.tempPassword}
                    </p>
                    <Button size="sm" variant="outline" onClick={copyPassword}>
                      {copiedPassword ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Profile URL</Label>
                  <p className="font-mono text-sm">
                    {window.location.origin}{createdCredentials.profileUrl}
                  </p>
                </div>
              </div>

              <Button onClick={copyAllCredentials} className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy All Credentials
              </Button>

              <Button variant="outline" onClick={resetCreateModal} className="w-full">
                Create Another
              </Button>
            </div>
          ) : accountType === "bigger" ? (
            /* Bigger Business Form */
            <div className="space-y-4 py-4">
              <div>
                <Label>Business Name *</Label>
                <Input
                  placeholder="Reborn Wraps"
                  value={biggerForm.businessName}
                  onChange={(e) => setBiggerForm({ ...biggerForm, businessName: e.target.value })}
                />
              </div>
              <div>
                <Label>Email *</Label>
                <Input
                  type="email"
                  placeholder="owner@business.com"
                  value={biggerForm.email}
                  onChange={(e) => setBiggerForm({ ...biggerForm, email: e.target.value })}
                />
              </div>
              <div>
                <Label>Password *</Label>
                <Input
                  type="text"
                  placeholder="Temporary password"
                  value={biggerForm.password}
                  onChange={(e) => setBiggerForm({ ...biggerForm, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground mt-1">Min 6 characters. Client should change after first login.</p>
              </div>
              <Button
                onClick={handleCreateBiggerBusiness}
                disabled={creating}
                className="w-full mt-4"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Bigger Business Account"
                )}
              </Button>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <Label>Full Name *</Label>
                    <Input
                      placeholder="John Doe"
                      value={createForm.fullName}
                      onChange={(e) => setCreateForm({ ...createForm, fullName: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      placeholder="john@example.com"
                      value={createForm.email}
                      onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>Username *</Label>
                    <Input
                      placeholder="johndoe"
                      value={createForm.username}
                      onChange={(e) => setCreateForm({ ...createForm, username: e.target.value.toLowerCase() })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {createForm.planType === "free" ? "tap" : ""}{createForm.username || "username"}
                    </p>
                  </div>
                  <div>
                    <Label>Plan Type</Label>
                    <Select
                      value={createForm.planType}
                      onValueChange={(v) => setCreateForm({ ...createForm, planType: v as any })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free (tap prefix)</SelectItem>
                        <SelectItem value="vip">
                          <span className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-emerald-500" />
                            TapAway VIP (Free forever)
                          </span>
                        </SelectItem>
                        <SelectItem value="monthly">Pro Monthly (${PERSONAL_PRICING.monthly}/mo)</SelectItem>
                        <SelectItem value="yearly">Pro Yearly (${PERSONAL_PRICING.yearly}/yr)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label>Headline</Label>
                  <Input
                    placeholder="Fitness Coach | Content Creator"
                    value={createForm.headline}
                    onChange={(e) => setCreateForm({ ...createForm, headline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="A short bio..."
                    value={createForm.bio}
                    onChange={(e) => setCreateForm({ ...createForm, bio: e.target.value })}
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-6 mt-4">
                {/* Profile Photo */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    {profilePhotoPreview ? (
                      <div className="relative">
                        <img
                          src={profilePhotoPreview}
                          alt="Profile preview"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setProfilePhotoFile(null);
                            setProfilePhotoPreview(null);
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => profileInputRef.current?.click()}
                        className="h-20 w-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </button>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <p>Click to upload profile photo</p>
                      <p className="text-xs">Recommended: Square image</p>
                    </div>
                  </div>
                  <input
                    ref={profileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleProfilePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Header Style */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Header Style</Label>
                  <RadioGroup
                    value={createForm.headerType}
                    onValueChange={(v) => setCreateForm({ ...createForm, headerType: v as "color" | "image" })}
                    className="flex gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="color" id="header-color" />
                      <Label htmlFor="header-color" className="text-sm flex items-center gap-1.5 cursor-pointer">
                        <Paintbrush className="h-4 w-4" />
                        Solid Color
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="image" id="header-image" />
                      <Label htmlFor="header-image" className="text-sm flex items-center gap-1.5 cursor-pointer">
                        <ImageIcon className="h-4 w-4" />
                        Custom Image
                      </Label>
                    </div>
                  </RadioGroup>

                  {createForm.headerType === "color" ? (
                    <div className="space-y-3">
                      {/* Color presets */}
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setCreateForm({ ...createForm, headerColor: color })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              createForm.headerColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      {/* Gradient presets */}
                      <div className="flex flex-wrap gap-2">
                        {GRADIENT_PRESETS.map((gradient, i) => (
                          <button
                            key={i}
                            onClick={() => setCreateForm({ ...createForm, headerColor: gradient })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              createForm.headerColor === gradient ? "border-primary scale-110" : "border-border hover:scale-105"
                            }`}
                            style={{ background: gradient }}
                          />
                        ))}
                      </div>
                      {/* Custom hex */}
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          placeholder="#6BCB77"
                          value={createForm.headerColor}
                          onChange={(e) => setCreateForm({ ...createForm, headerColor: e.target.value })}
                          className="h-10 flex-1"
                        />
                        <input
                          type="color"
                          value={createForm.headerColor.startsWith("#") ? createForm.headerColor : "#6BCB77"}
                          onChange={(e) => setCreateForm({ ...createForm, headerColor: e.target.value })}
                          className="h-10 w-10 rounded border border-border cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {headerImagePreview ? (
                        <div className="relative">
                          <img
                            src={headerImagePreview}
                            alt="Header preview"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setHeaderImageFile(null);
                              setHeaderImagePreview(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => headerInputRef.current?.click()}
                          className="w-full h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                        >
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload header image</span>
                        </button>
                      )}
                      <input
                        ref={headerInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleHeaderImageSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* PFP Position */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Profile Photo Position</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCreateForm({ ...createForm, pfpPosition: "left" })}
                      className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                        createForm.pfpPosition === "left" ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <AlignLeft className="h-4 w-4" />
                      <span className="text-sm">Left</span>
                    </button>
                    <button
                      onClick={() => setCreateForm({ ...createForm, pfpPosition: "center" })}
                      className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                        createForm.pfpPosition === "center" ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <AlignCenter className="h-4 w-4" />
                      <span className="text-sm">Center</span>
                    </button>
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Page Background</Label>
                  <div className="flex flex-wrap gap-2">
                    {BG_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setCreateForm({ ...createForm, backgroundColor: color })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          createForm.backgroundColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {/* Ambient gradients auto-applied when banner is uploaded */}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      placeholder="#ffffff"
                      value={createForm.backgroundColor}
                      onChange={(e) => setCreateForm({ ...createForm, backgroundColor: e.target.value })}
                      className="h-10 flex-1"
                    />
                    {!createForm.backgroundColor.startsWith("linear-gradient") && !createForm.backgroundColor.startsWith("radial-gradient") && (
                      <input
                        type="color"
                        value={createForm.backgroundColor.startsWith("#") ? createForm.backgroundColor : "#ffffff"}
                        onChange={(e) => setCreateForm({ ...createForm, backgroundColor: e.target.value })}
                        className="h-10 w-10 rounded border border-border cursor-pointer"
                      />
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab - Unified links and blocks */}
              <TabsContent value="content" className="mt-4">
                <AdminUnifiedContent 
                  links={adminLinks}
                  blocks={adminBlocks}
                  onLinksChange={setAdminLinks}
                  onBlocksChange={setAdminBlocks}
                />
              </TabsContent>

              <Button 
                onClick={handleCreateAccount} 
                disabled={creating}
                className="w-full mt-4"
              >
                {creating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Account Modal */}
      <Dialog open={showEditModal} onOpenChange={(open) => !open && resetEditModal()}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit @{editingAccount?.username}</DialogTitle>
            <DialogDescription>
              Modify profile details, links, and content blocks
            </DialogDescription>
          </DialogHeader>

          {editLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="py-4">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic">Basic Info</TabsTrigger>
                <TabsTrigger value="design">Design</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="leads">Leads</TabsTrigger>
              </TabsList>

              {/* Basic Info Tab */}
              <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Email Section with Update + Magic Link */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Mail className="h-4 w-4" />
                    Account Email
                  </div>
                  <div className="flex gap-2">
                    <Input
                      type="email"
                      placeholder="user@example.com"
                      value={editForm.email}
                      onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateEmail}
                      disabled={updatingEmail || editForm.email === editingAccount?.email}
                    >
                      {updatingEmail ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                    </Button>
                  </div>
                  {editForm.email !== editingAccount?.email && (
                    <p className="text-xs text-amber-600">
                      Email changed from {editingAccount?.email} → {editForm.email}
                    </p>
                  )}
                  <div className="flex items-center gap-2 pt-2 border-t border-border">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleSendMagicLink}
                      disabled={sendingMagicLink}
                      className="flex items-center gap-2"
                    >
                      {sendingMagicLink ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send Magic Link
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Sends a login link to {editForm.email || editingAccount?.email}
                    </span>
                  </div>
                </div>

                {/* Username Section */}
                <div className="p-4 bg-muted/50 rounded-lg space-y-3 border border-border">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <User className="h-4 w-4" />
                    Username
                  </div>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        type="text"
                        placeholder="username"
                        value={editUsername}
                        onChange={(e) => setEditUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        className="pr-8"
                      />
                      {usernameChecking && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {!usernameChecking && usernameAvailable === true && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <Check className="h-4 w-4 text-green-500" />
                        </div>
                      )}
                      {!usernameChecking && usernameAvailable === false && (
                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                          <X className="h-4 w-4 text-red-500" />
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleUpdateUsername}
                      disabled={savingUsername || !usernameAvailable || editUsername === editingAccount?.username}
                    >
                      {savingUsername ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                    </Button>
                  </div>
                  {editUsername && editUsername !== editingAccount?.username && (
                    <p className="text-xs text-muted-foreground">
                      New URL: tapaway.co/{editUsername}
                    </p>
                  )}
                  {usernameAvailable === true && editUsername !== editingAccount?.username && (
                    <p className="text-xs text-green-600 flex items-center gap-1">
                      <Check className="h-3 w-3" /> Username available
                    </p>
                  )}
                  {usernameAvailable === false && (
                    <p className="text-xs text-red-600 flex items-center gap-1">
                      <X className="h-3 w-3" /> Already taken or invalid
                    </p>
                  )}
                </div>

                <div>
                  <Label>Full Name</Label>
                  <Input
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Headline</Label>
                  <Input
                    placeholder="Fitness Coach | Content Creator"
                    value={editForm.headline}
                    onChange={(e) => setEditForm({ ...editForm, headline: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Bio</Label>
                  <Textarea
                    placeholder="A short bio..."
                    value={editForm.bio}
                    onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                    rows={2}
                  />
                </div>
              </TabsContent>

              {/* Design Tab */}
              <TabsContent value="design" className="space-y-6 mt-4">
                {/* Profile Photo */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Profile Photo</Label>
                  <div className="flex items-center gap-4">
                    {editProfilePhotoPreview ? (
                      <div className="relative">
                        <img
                          src={editProfilePhotoPreview}
                          alt="Profile preview"
                          className="h-20 w-20 rounded-full object-cover"
                        />
                        <button
                          onClick={() => {
                            setEditProfilePhotoFile(null);
                            setEditProfilePhotoPreview(null);
                          }}
                          className="absolute -top-1 -right-1 p-1 bg-destructive text-destructive-foreground rounded-full"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => editProfileInputRef.current?.click()}
                        className="h-20 w-20 rounded-full bg-muted border-2 border-dashed border-border flex items-center justify-center hover:border-primary transition-colors"
                      >
                        <Upload className="h-6 w-6 text-muted-foreground" />
                      </button>
                    )}
                    <div className="text-sm text-muted-foreground">
                      <p>Click to upload profile photo</p>
                    </div>
                  </div>
                  <input
                    ref={editProfileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleEditProfilePhotoSelect}
                    className="hidden"
                  />
                </div>

                {/* Header Style */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Header Style</Label>
                  <RadioGroup
                    value={editForm.headerType}
                    onValueChange={(v) => setEditForm({ ...editForm, headerType: v as "color" | "image" | "banner" })}
                    className="flex flex-wrap gap-3"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="color" id="edit-header-color" />
                      <Label htmlFor="edit-header-color" className="text-sm flex items-center gap-1.5 cursor-pointer">
                        <Paintbrush className="h-4 w-4" />
                        Solid Color
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="image" id="edit-header-image" />
                      <Label htmlFor="edit-header-image" className="text-sm flex items-center gap-1.5 cursor-pointer">
                        <ImageIcon className="h-4 w-4" />
                        Custom Image
                      </Label>
                    </div>
                    {editingAccount?.plan_type !== 'free' && editingAccount?.plan_type !== null && (
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="banner" id="edit-header-banner" />
                        <Label htmlFor="edit-header-banner" className="text-sm flex items-center gap-1.5 cursor-pointer text-primary">
                          ✨ Full Banner
                        </Label>
                      </div>
                    )}
                  </RadioGroup>

                  {editForm.headerType === "banner" ? (
                    /* Full Banner mode - uses profile photo as banner (no separate upload) */
                    <div className="space-y-3">
                      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                        <p className="text-sm font-medium text-foreground mb-1">
                          ✨ Full-Screen Banner Mode
                        </p>
                        <p className="text-xs text-muted-foreground">
                          The profile photo will be displayed as a full-screen banner that fades behind the content.
                          Update the profile photo in the Profile Photo section above.
                        </p>
                      </div>
                    </div>
                  ) : editForm.headerType === "color" ? (
                    <div className="space-y-3">
                      <div className="flex flex-wrap gap-2">
                        {COLOR_PRESETS.map((color) => (
                          <button
                            key={color}
                            onClick={() => setEditForm({ ...editForm, headerColor: color })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              editForm.headerColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                            }`}
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {GRADIENT_PRESETS.map((gradient, i) => (
                          <button
                            key={i}
                            onClick={() => setEditForm({ ...editForm, headerColor: gradient })}
                            className={`h-8 w-8 rounded-full border-2 transition-all ${
                              editForm.headerColor === gradient ? "border-primary scale-110" : "border-border hover:scale-105"
                            }`}
                            style={{ background: gradient }}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-2">
                        <Input
                          type="text"
                          value={editForm.headerColor}
                          onChange={(e) => setEditForm({ ...editForm, headerColor: e.target.value })}
                          className="h-10 flex-1"
                        />
                        <input
                          type="color"
                          value={editForm.headerColor.startsWith("#") ? editForm.headerColor : "#6BCB77"}
                          onChange={(e) => setEditForm({ ...editForm, headerColor: e.target.value })}
                          className="h-10 w-10 rounded border border-border cursor-pointer"
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {editHeaderImagePreview ? (
                        <div className="relative">
                          <img
                            src={editHeaderImagePreview}
                            alt="Header preview"
                            className="w-full h-24 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => {
                              setEditHeaderImageFile(null);
                              setEditHeaderImagePreview(null);
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-black/50 rounded-full hover:bg-black/70"
                          >
                            <X className="h-4 w-4 text-white" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => editHeaderInputRef.current?.click()}
                          className="w-full h-24 bg-muted/50 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:border-primary transition-colors"
                        >
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">Upload header image</span>
                        </button>
                      )}
                      <input
                        ref={editHeaderInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditHeaderImageSelect}
                        className="hidden"
                      />
                    </div>
                  )}
                </div>

                {/* PFP Position */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Profile Photo Position</Label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditForm({ ...editForm, pfpPosition: "left" })}
                      className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                        editForm.pfpPosition === "left" ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <AlignLeft className="h-4 w-4" />
                      <span className="text-sm">Left</span>
                    </button>
                    <button
                      onClick={() => setEditForm({ ...editForm, pfpPosition: "center" })}
                      className={`flex-1 p-3 rounded-lg border flex items-center justify-center gap-2 ${
                        editForm.pfpPosition === "center" ? "border-primary bg-primary/10" : "border-border"
                      }`}
                    >
                      <AlignCenter className="h-4 w-4" />
                      <span className="text-sm">Center</span>
                    </button>
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Page Background</Label>
                  <div className="flex flex-wrap gap-2">
                    {BG_PRESETS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setEditForm({ ...editForm, backgroundColor: color })}
                        className={`h-8 w-8 rounded-full border-2 transition-all ${
                          editForm.backgroundColor === color ? "border-primary scale-110" : "border-border hover:scale-105"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  {/* Auto-apply ambient gradient when banner mode is active */}
                  {editForm.headerType === "banner" && (editProfilePhotoPreview || editingAccount?.profile_photo_url) && (
                    <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
                      <p className="text-xs text-primary font-medium mb-2">✨ Ambient background will auto-match profile photo</p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={async () => {
                          const photoUrl = editProfilePhotoPreview || editingAccount?.profile_photo_url;
                          if (!photoUrl) return;
                          try {
                            const color = await extractBottomColor(photoUrl);
                            const ambientGradient = generateAmbientGradient(color);
                            setEditForm({ ...editForm, backgroundColor: ambientGradient });
                            toast.success("Background matched to profile photo");
                          } catch {
                            toast.error("Failed to extract color from photo");
                          }
                        }}
                      >
                        Apply Ambient Gradient Now
                      </Button>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Input
                      type="text"
                      value={editForm.backgroundColor}
                      onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                      className="h-10 flex-1"
                    />
                    {!editForm.backgroundColor.startsWith("linear-gradient") && !editForm.backgroundColor.startsWith("radial-gradient") && (
                      <input
                        type="color"
                        value={editForm.backgroundColor.startsWith("#") ? editForm.backgroundColor : "#ffffff"}
                        onChange={(e) => setEditForm({ ...editForm, backgroundColor: e.target.value })}
                        className="h-10 w-10 rounded border border-border cursor-pointer"
                      />
                    )}
                  </div>
                </div>

                {/* Contact Card Settings */}
                <div className="space-y-3 border-t pt-4">
                  <Label className="text-sm font-medium">Contact Card</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="edit-contact-enabled"
                      checked={editForm.contactEnabled}
                      onChange={(e) => setEditForm({ ...editForm, contactEnabled: e.target.checked })}
                      className="h-4 w-4"
                    />
                    <Label htmlFor="edit-contact-enabled" className="text-sm">Enable "Save Contact" button</Label>
                  </div>
                  
                  {/* Contact Photo Upload */}
                  <div className="space-y-2">
                    <Label className="text-xs">Contact Photo</Label>
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-full bg-muted overflow-hidden flex-shrink-0">
                        {(editContactPhotoPreview || editForm.contactPhotoUrl) ? (
                          <img 
                            src={editContactPhotoPreview || editForm.contactPhotoUrl} 
                            alt="Contact" 
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center">
                            <User className="h-6 w-6 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      <input
                        ref={editContactPhotoInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleEditContactPhotoSelect}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => editContactPhotoInputRef.current?.click()}
                      >
                        <Upload className="h-3 w-3 mr-1" />
                        Upload
                      </Button>
                      {(editContactPhotoPreview || editForm.contactPhotoUrl) && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditContactPhotoFile(null);
                            setEditContactPhotoPreview(null);
                            setEditForm({ ...editForm, contactPhotoUrl: "" });
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Remove
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">Leave empty to use profile photo</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Contact Name</Label>
                      <Input
                        placeholder="Leave empty to use display name"
                        value={editForm.contactName}
                        onChange={(e) => setEditForm({ ...editForm, contactName: e.target.value })}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label className="text-xs">Email</Label>
                      <Input
                        type="email"
                        placeholder="Leave empty to use account email"
                        value={editForm.contactEmail}
                        onChange={(e) => setEditForm({ ...editForm, contactEmail: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Phone</Label>
                      <Input
                        placeholder="+1 555-123-4567"
                        value={editForm.contactPhone}
                        onChange={(e) => setEditForm({ ...editForm, contactPhone: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Company</Label>
                      <Input
                        placeholder="Company name"
                        value={editForm.contactCompany}
                        onChange={(e) => setEditForm({ ...editForm, contactCompany: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Job Title</Label>
                      <Input
                        placeholder="Job title"
                        value={editForm.contactTitle}
                        onChange={(e) => setEditForm({ ...editForm, contactTitle: e.target.value })}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Website</Label>
                      <Input
                        placeholder="https://..."
                        value={editForm.contactWebsite}
                        onChange={(e) => setEditForm({ ...editForm, contactWebsite: e.target.value })}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Address</Label>
                    <Input
                      placeholder="123 Main St, City, State"
                      value={editForm.contactAddress}
                      onChange={(e) => setEditForm({ ...editForm, contactAddress: e.target.value })}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab - Unified links and blocks */}
              <TabsContent value="content" className="mt-4">
                <AdminUnifiedContent 
                  links={editLinks}
                  blocks={editBlocks}
                  onLinksChange={setEditLinks}
                  onBlocksChange={setEditBlocks}
                />
              </TabsContent>

              {/* Leads Tab */}
              <TabsContent value="leads" className="mt-4">
                {editingAccount && (
                  <EmailLeadsTab profileId={editingAccount.id} />
                )}
              </TabsContent>

              <Button 
                onClick={handleSaveEdit} 
                disabled={saving}
                className="w-full mt-4"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Image Cropper */}
      {rawImageUrl && (
        <ImageCropper
          open={cropperOpen}
          onOpenChange={(open) => {
            setCropperOpen(open);
            if (!open) setRawImageUrl(null);
          }}
          imageSrc={rawImageUrl}
          onCropComplete={showEditModal ? handleEditCropComplete : handleCropComplete}
          aspectRatio={cropperType === "profile" ? 1 : 16 / 5}
          cropShape={cropperType === "profile" ? "round" : "rect"}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deletingAccount} onOpenChange={() => {
        setDeletingAccount(null);
        setDeleteConfirmText("");
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">
              Permanently Delete Account
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                You are about to permanently delete the account for{" "}
                <strong>@{deletingAccount?.username}</strong> ({deletingAccount?.email}).
              </p>
              <p className="font-semibold text-destructive">
                This will delete ALL data including:
              </p>
              <ul className="list-disc list-inside text-sm space-y-1">
                <li>Profile information</li>
                <li>All links and blocks</li>
                <li>Analytics data</li>
                <li>Profile and header images</li>
                <li>The auth user account</li>
              </ul>
              <p className="font-semibold">This action cannot be undone.</p>
              <div className="pt-2">
                <p className="text-sm mb-2">Type <strong>DELETE</strong> to confirm:</p>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                  className="font-mono"
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteConfirmText !== "DELETE" || deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete Permanently"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AdminPersonalAccounts;
