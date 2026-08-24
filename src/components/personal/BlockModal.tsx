import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { supabase } from "@/integrations/supabase/client";
import { invalidateProfileCache } from "@/hooks/useProfileCache";
import { ImageCropper } from "@/components/personal/ImageCropper";
import { 
  Youtube, 
  Image as ImageIcon, 
  Type, 
  MousePointerClick,
  Loader2,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Crop,
  Link as LinkIcon,
  Smartphone,
  Mail,
  Grid,
  X,
  Plus,
  ShoppingBag,
  UtensilsCrossed,
  MapPin,
  Trash2,
  ArrowUp,
  ArrowDown

} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { MenuBlockEditor } from "@/components/personal/MenuBlockEditor";
import { parseMenuContent, serializeMenuContent, type MenuSection } from "@/lib/menuBlock";
import {
  parseLocationsContent,
  serializeLocationsContent,
  resolveLocationDestination,
  DEFAULT_LOCATIONS_CTA,
  type LocationEntry,
} from "@/lib/locationsBlock";


interface PersonalBlock {
  id: string;
  block_type: string;
  content: unknown;
  sort_order: number;
  alignment: string | null;
  is_active?: boolean | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profileId: string;
  username?: string;
  editingBlock: PersonalBlock | null;
  currentMaxOrder: number;
  onBlockSaved: (block: PersonalBlock) => void;
  deferSave?: boolean;
  planType?: string | null;
  onUpgrade?: () => void;
}

const BLOCK_TYPES = [
  { type: "youtube", label: "YouTube Video", icon: Youtube, description: "Embed a video" },
  { type: "image", label: "Image", icon: ImageIcon, description: "Upload an image" },
  { type: "text", label: "Text", icon: Type, description: "Title and body text" },
  { type: "button", label: "Featured Button", icon: MousePointerClick, description: "Big CTA button" },
  { type: "email_capture", label: "Email Capture", icon: Mail, description: "Collect visitor emails" },
  { type: "sms_subscribe", label: "SMS VIP List", icon: Smartphone, description: "Let visitors join your text list" },
  { type: "photo_collage", label: "Photo Collage", icon: Grid, description: "Gallery of small images" },
  { type: "menu", label: "Menu", icon: UtensilsCrossed, description: "Sections, items and prices" },
  { type: "locations", label: "Locations", icon: MapPin, description: "Let visitors pick a location or hub" },
  { type: "product", label: "Product", icon: ShoppingBag, description: "Embed a product listing" },
] as const;

export const BlockModal = ({ 
  open, 
  onOpenChange, 
  profileId, 
  username,
  editingBlock, 
  currentMaxOrder,
  onBlockSaved,
  deferSave = false,
  planType,
  onUpgrade,
}: Props) => {
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  // Form states
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [youtubeOverlayTitle, setYoutubeOverlayTitle] = useState("");
  const [youtubeOverlaySubtitle, setYoutubeOverlaySubtitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [textTitle, setTextTitle] = useState("");
  const [textBody, setTextBody] = useState("");
  const [buttonLabel, setButtonLabel] = useState("");
  const [buttonUrl, setButtonUrl] = useState("");
  const [alignment, setAlignment] = useState("center");
  
  // New image block options
  const [imageLinkUrl, setImageLinkUrl] = useState("");
  const [imageSize, setImageSize] = useState<"small" | "large">("large");
  
  // Text overlay options for image blocks
  const [overlayTitle, setOverlayTitle] = useState("");
  const [overlaySubtitle, setOverlaySubtitle] = useState("");
  const [overlayCta, setOverlayCta] = useState("");
  
  // Email/Contact capture block options
  const [emailHeadline, setEmailHeadline] = useState("");
  const [emailDescription, setEmailDescription] = useState("");
  const [emailButtonText, setEmailButtonText] = useState("Submit");
  const [collectEmail, setCollectEmail] = useState(true);
  const [collectPhone, setCollectPhone] = useState(false);
  const [collectName, setCollectName] = useState(false);
  const [collectMessage, setCollectMessage] = useState(false);
  // Required toggles for each field
  const [emailRequired, setEmailRequired] = useState(true);
  const [phoneRequired, setPhoneRequired] = useState(true);
  const [nameRequired, setNameRequired] = useState(false);
  const [messageRequired, setMessageRequired] = useState(false);
  
  // Photo collage options (mixed media: images + videos)
  const [collageMedia, setCollageMedia] = useState<Array<{ url: string; type: "image" | "video"; poster?: string }>>([]);
  const [collageColumns, setCollageColumns] = useState<2 | 3>(3);
  const [uploadingCollageImage, setUploadingCollageImage] = useState(false);
  const [collageDragOver, setCollageDragOver] = useState(false);

  
  // Product block options
  const [selectedProductId, setSelectedProductId] = useState("");
  const [creatorProducts, setCreatorProducts] = useState<{ id: string; title: string; price_cents: number }[]>([]);

  // SMS subscribe block options
  const [smsHeadline, setSmsHeadline] = useState("");
  const [smsDescription, setSmsDescription] = useState("");
  const [smsButtonText, setSmsButtonText] = useState("");
  const [smsStyle, setSmsStyle] = useState<"card" | "button">("card");

  // Menu block options
  const [menuTitle, setMenuTitle] = useState("Our Menu");
  const [menuButtonLabel, setMenuButtonLabel] = useState("View Menu");
  const [menuSections, setMenuSections] = useState<MenuSection[]>([]);

  // Locations block
  const [locationsTitle, setLocationsTitle] = useState("Our Locations");
  const [locationsSubtitle, setLocationsSubtitle] = useState(
    "Choose a location to view their menu, directions, socials & more."
  );
  const [locationsCta, setLocationsCta] = useState(DEFAULT_LOCATIONS_CTA);
  const [locations, setLocations] = useState<LocationEntry[]>([]);
  const [uploadingLocationIndex, setUploadingLocationIndex] = useState<number | null>(null);
  const locationFileInputRef = useRef<HTMLInputElement>(null);
  const pendingLocationIndexRef = useRef<number | null>(null);

  
  // Cropper state
  const [showCropper, setShowCropper] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState<string | null>(null);
  const [collageRawImage, setCollageRawImage] = useState<string | null>(null);
  const [showCollageCropper, setShowCollageCropper] = useState(false);
  const [editingCollageIndex, setEditingCollageIndex] = useState<number | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const collageFileInputRef = useRef<HTMLInputElement>(null);

  const isMobile = useIsMobile();

  // Load creator products when product type is selected
  useEffect(() => {
    if (selectedType === "product" && profileId) {
      supabase
        .from("creator_products")
        .select("id, title, price_cents")
        .eq("creator_id", profileId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .then(({ data }) => {
          if (data) setCreatorProducts(data as any);
        });
    }
  }, [selectedType, profileId]);

  // Reset/populate form when modal opens or editingBlock changes
  useEffect(() => {
    if (open) {
      if (editingBlock) {
        setSelectedType(editingBlock.block_type);
        setAlignment(editingBlock.alignment || "center");
        const content = editingBlock.content as Record<string, string>;
        if (editingBlock.block_type === "youtube") {
          setYoutubeUrl(content.url || "");
          setYoutubeOverlayTitle(content.overlayTitle || "");
          setYoutubeOverlaySubtitle(content.overlaySubtitle || "");
        } else if (editingBlock.block_type === "image") {
          setImageUrl(content.url || "");
          setImageLinkUrl(content.linkUrl || "");
          setImageSize((content.size as "small" | "large") || "large");
          setOverlayTitle(content.overlayTitle || "");
          setOverlaySubtitle(content.overlaySubtitle || "");
          setOverlayCta(content.overlayCta || "");
        } else if (editingBlock.block_type === "text") {
          setTextTitle(content.title || "");
          setTextBody(content.body || "");
        } else if (editingBlock.block_type === "button") {
          setButtonLabel(content.label || "");
          setButtonUrl(content.url || "");
        } else if (editingBlock.block_type === "email_capture") {
          setEmailHeadline(content.headline || "");
          setEmailDescription(content.description || "");
          setEmailButtonText(content.buttonText || "Submit");
          // Default to email only for backward compat if not set
          setCollectEmail(content.collectEmail !== "false");
          setCollectPhone(content.collectPhone === "true");
          setCollectName(content.collectName === "true");
          setCollectMessage(content.collectMessage === "true");
          // Required toggles - default true for contact fields, false for name/message
          setEmailRequired(content.emailRequired !== "false");
          setPhoneRequired(content.phoneRequired !== "false");
          setNameRequired(content.nameRequired === "true");
          setMessageRequired(content.messageRequired === "true");
        } else if (editingBlock.block_type === "photo_collage") {
          let media: Array<{ url: string; type: "image" | "video" }> = [];
          try {
            // New format: content.media
            const rawMedia = content.media;
            if (rawMedia) {
              const parsed = typeof rawMedia === 'string' ? JSON.parse(rawMedia) : rawMedia;
              if (Array.isArray(parsed)) {
                media = parsed.map((item: any) => 
                  typeof item === 'string' ? { url: item, type: "image" as const } : item
                );
              }
            } else {
              // Legacy format: content.images
              const rawImages = content.images;
              let images: string[] = [];
              if (Array.isArray(rawImages)) {
                images = rawImages;
              } else if (typeof rawImages === 'string' && rawImages) {
                images = JSON.parse(rawImages);
              }
              media = images.map(url => ({ url, type: "image" as const }));
            }
          } catch {
            media = [];
          }
          setCollageMedia(media);
          setCollageColumns(parseInt(content.columns || "3") as 2 | 3);
        } else if (editingBlock.block_type === "product") {
          setSelectedProductId(content.product_id || "");
        } else if (editingBlock.block_type === "menu") {
          const parsedMenu = parseMenuContent(editingBlock.content);
          setMenuTitle(parsedMenu.title);
          setMenuButtonLabel(parsedMenu.buttonLabel);
          setMenuSections(parsedMenu.sections);
        } else if (editingBlock.block_type === "sms_subscribe") {
          setSmsHeadline(content.headline || "");
          setSmsDescription(content.description || "");
          setSmsButtonText(content.buttonText || "");
          setSmsStyle(content.style === "button" ? "button" : "card");
        } else if (editingBlock.block_type === "locations") {
          const parsedLocations = parseLocationsContent(editingBlock.content);
          setLocationsTitle(parsedLocations.title);
          setLocationsSubtitle(parsedLocations.subtitle);
          setLocationsCta(parsedLocations.ctaLabel);
          setLocations(parsedLocations.locations);
        }
      } else {
        resetForm();
      }
    }
  }, [open, editingBlock]);

  const resetForm = () => {
    setSelectedType(null);
    setYoutubeUrl("");
    setYoutubeOverlayTitle("");
    setYoutubeOverlaySubtitle("");
    setImageUrl("");
    setTextTitle("");
    setTextBody("");
    setButtonLabel("");
    setButtonUrl("");
    setAlignment("center");
    setImageLinkUrl("");
    setImageSize("large");
    setRawImageForCrop(null);
    setOverlayTitle("");
    setOverlaySubtitle("");
    setOverlayCta("");
    // Email/Contact capture
    setEmailHeadline("");
    setEmailDescription("");
    setEmailButtonText("Submit");
    setCollectEmail(true);
    setCollectPhone(false);
    setCollectName(false);
    setCollectMessage(false);
    // Required toggles
    setEmailRequired(true);
    setPhoneRequired(true);
    setNameRequired(false);
    setMessageRequired(false);
    // Photo collage
    setCollageMedia([]);
    setCollageColumns(3);
    setCollageRawImage(null);
    setSelectedProductId("");
    // SMS subscribe
    setSmsHeadline("");
    setSmsDescription("");
    setSmsButtonText("");
    setSmsStyle("card");
    // Menu
    setMenuTitle("Our Menu");
    setMenuButtonLabel("View Menu");
    setMenuSections([]);
    // Locations
    setLocationsTitle("Our Locations");
    setLocationsSubtitle("Choose a location to view their menu, directions, socials & more.");
    setLocationsCta(DEFAULT_LOCATIONS_CTA);
    setLocations([]);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const extractYoutubeId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const compressImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const maxDim = 1024;
        let { width, height } = img;
        
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("No 2d context"));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) resolve(blob);
            else reject(new Error("Compression failed"));
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  };

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Create object URL for cropper
    const objectUrl = URL.createObjectURL(file);
    setRawImageForCrop(objectUrl);
    setShowCropper(true);
  };

  const handleCropComplete = async (croppedBlob: Blob) => {
    setShowCropper(false);
    setUploadingImage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use webp extension for smaller files (cropper outputs webp when supported)
      const extension = croppedBlob.type === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${user.id}/blocks/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, croppedBlob, { contentType: croppedBlob.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      setImageUrl(publicUrl);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingImage(false);
      if (rawImageForCrop) {
        URL.revokeObjectURL(rawImageForCrop);
        setRawImageForCrop(null);
      }
    }
  };

  // Extract a poster frame from a video file as a JPEG blob
  const extractVideoPoster = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const video = document.createElement("video");
      video.preload = "auto";
      video.muted = true;
      video.playsInline = true;
      video.src = objectUrl;

      let settled = false;
      const cleanup = () => {
        try { URL.revokeObjectURL(objectUrl); } catch {}
        video.src = "";
      };

      video.onloadeddata = () => {
        video.currentTime = 0.1;
      };

      video.onseeked = () => {
        if (settled) return;
        try {
          const canvas = document.createElement("canvas");
          canvas.width = video.videoWidth || 320;
          canvas.height = video.videoHeight || 240;
          const ctx = canvas.getContext("2d");
          if (!ctx) { cleanup(); settled = true; reject(new Error("Canvas context failed")); return; }
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          canvas.toBlob(
            (blob) => {
              if (settled) return;
              settled = true;
              cleanup();
              if (blob) resolve(blob);
              else reject(new Error("Canvas toBlob returned null"));
            },
            "image/jpeg",
            0.8
          );
        } catch (err) {
          if (settled) return;
          settled = true;
          cleanup();
          reject(err);
        }
      };

      video.onerror = () => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Video load error"));
      };

      // Timeout safety net
      setTimeout(() => { if (settled) return; settled = true; cleanup(); reject(new Error("Poster extraction timed out")); }, 15000);
    });
  };

  // Collage media handlers (images + videos)
  // Auto-square center-crop an image file to at most 1200x1200 JPEG
  const autoSquareImage = (file: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const target = Math.min(1200, size);
        const canvas = document.createElement("canvas");
        canvas.width = target;
        canvas.height = target;
        const ctx = canvas.getContext("2d");
        if (!ctx) { URL.revokeObjectURL(url); reject(new Error("canvas")); return; }
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;
        ctx.drawImage(img, sx, sy, size, size, 0, 0, target, target);
        URL.revokeObjectURL(url);
        canvas.toBlob(b => b ? resolve(b) : reject(new Error("blob")), "image/jpeg", 0.9);
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("img")); };
      img.src = url;
    });
  };

  const uploadCollageImageBlob = async (blob: Blob, userId: string): Promise<string> => {
    const ext = blob.type === "image/webp" ? "webp" : "jpg";
    const filePath = `${userId}/collage/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("personal-photos")
      .upload(filePath, blob, { contentType: blob.type });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(filePath);
    return publicUrl;
  };

  const uploadCollageVideo = async (
    file: File,
    userId: string
  ): Promise<{ url: string; poster?: string }> => {
    // Validate duration
    await new Promise<void>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "metadata";
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.onloadedmetadata = () => {
        URL.revokeObjectURL(objectUrl);
        if (video.duration > 60) reject(new Error("Video must be under 1 minute"));
        else resolve();
      };
      video.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error("Could not read video file")); };
    });

    const timestamp = Date.now();
    const ext = file.name.split(".").pop() || "mp4";
    const filePath = `${userId}/collage/${timestamp}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("personal-photos")
      .upload(filePath, file, { contentType: file.type });
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(filePath);

    let posterUrl: string | undefined;
    try {
      const posterBlob = await extractVideoPoster(file);
      const thumbPath = `${userId}/collage/${timestamp}_thumb.jpg`;
      const { error: thumbErr } = await supabase.storage
        .from("personal-photos")
        .upload(thumbPath, posterBlob, { contentType: "image/jpeg" });
      if (!thumbErr) {
        const { data: { publicUrl: thumbPublicUrl } } = supabase.storage.from("personal-photos").getPublicUrl(thumbPath);
        posterUrl = thumbPublicUrl;
      }
    } catch (posterErr) {
      console.warn("Poster generation failed:", posterErr);
    }
    return { url: publicUrl, poster: posterUrl };
  };

  const handleCollageFiles = async (files: File[]) => {
    if (files.length === 0) return;
    const remaining = 9 - collageMedia.length;
    if (remaining <= 0) {
      toast.error("Maximum 9 items in a collage");
      return;
    }
    let batch = files;
    if (files.length > remaining) {
      toast.info(`Only adding ${remaining} of ${files.length} files (max 9)`);
      batch = files.slice(0, remaining);
    }

    setUploadingCollageImage(true);
    const toastId = toast.loading(`Uploading 0 of ${batch.length}…`);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      let done = 0;
      for (const file of batch) {
        try {
          if (file.type.startsWith("video/")) {
            if (file.size > 20 * 1024 * 1024) {
              toast.error(`${file.name}: video must be under 20 MB`);
            } else {
              const { url, poster } = await uploadCollageVideo(file, user.id);
              setCollageMedia(prev => [...prev, { url, type: "video", poster }]);
            }
          } else if (file.type.startsWith("image/")) {
            const squared = await autoSquareImage(file);
            const url = await uploadCollageImageBlob(squared, user.id);
            setCollageMedia(prev => [...prev, { url, type: "image" }]);
          }
        } catch (err) {
          console.error("Upload failed for", file.name, err);
          toast.error(`Failed: ${file.name}`);
        }
        done += 1;
        toast.loading(`Uploading ${done} of ${batch.length}…`, { id: toastId });
      }
      toast.success(`Added ${done} item${done !== 1 ? "s" : ""}`, { id: toastId });
    } catch (err) {
      console.error("Batch upload error:", err);
      toast.error("Upload failed", { id: toastId });
    } finally {
      setUploadingCollageImage(false);
    }
  };

  const handleCollageMediaSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (files.length === 0) return;

    // Single image via "+ Add" → keep cropper flow
    if (files.length === 1 && files[0].type.startsWith("image/")) {
      const objectUrl = URL.createObjectURL(files[0]);
      setCollageRawImage(objectUrl);
      setShowCollageCropper(true);
      return;
    }
    await handleCollageFiles(files);
  };


  const handleCollageCropComplete = async (croppedBlob: Blob) => {
    setShowCollageCropper(false);
    setUploadingCollageImage(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const extension = croppedBlob.type === 'image/webp' ? 'webp' : 'jpg';
      const filePath = `${user.id}/collage/${Date.now()}.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("personal-photos")
        .upload(filePath, croppedBlob, { contentType: croppedBlob.type });
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("personal-photos")
        .getPublicUrl(filePath);

      setCollageMedia(prev => {
        if (editingCollageIndex !== null && editingCollageIndex < prev.length) {
          const next = [...prev];
          next[editingCollageIndex] = { ...next[editingCollageIndex], url: publicUrl, type: "image" };
          return next;
        }
        return [...prev, { url: publicUrl, type: "image" }];
      });
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload image");
    } finally {
      setUploadingCollageImage(false);
      setEditingCollageIndex(null);
      if (collageRawImage) {
        URL.revokeObjectURL(collageRawImage);
        setCollageRawImage(null);
      }
    }
  };

  const handleEditCollageImage = async (index: number) => {
    const item = collageMedia[index];
    if (!item || item.type !== "image") return;
    try {
      const res = await fetch(item.url, { mode: "cors" });
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setEditingCollageIndex(index);
      setCollageRawImage(objectUrl);
      setShowCollageCropper(true);
    } catch (err) {
      console.error("Load image for crop failed:", err);
      toast.error("Couldn't load image to edit");
    }
  };


  const handleRemoveCollageMedia = (index: number) => {
    setCollageMedia(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!selectedType) return;

    let content: Record<string, string> = {};

    switch (selectedType) {
      case "youtube": {
        const videoId = extractYoutubeId(youtubeUrl);
        if (!videoId) {
          toast.error("Invalid YouTube URL");
          return;
        }
        content = { 
          url: youtubeUrl, 
          videoId,
          overlayTitle: youtubeOverlayTitle.trim(),
          overlaySubtitle: youtubeOverlaySubtitle.trim(),
        };
        break;
      }
      case "image": {
        if (!imageUrl) {
          toast.error("Please select an image");
          return;
        }
        content = { 
          url: imageUrl,
          linkUrl: imageLinkUrl.trim() ? (imageLinkUrl.startsWith("http") ? imageLinkUrl : `https://${imageLinkUrl}`) : "",
          size: imageSize,
          overlayTitle: overlayTitle.trim(),
          overlaySubtitle: overlaySubtitle.trim(),
          overlayCta: overlayCta.trim(),
        };
        break;
      }
      case "text": {
        if (!textTitle.trim()) {
          toast.error("Please enter a title");
          return;
        }
        content = { title: textTitle, body: textBody };
        break;
      }
      case "button": {
        if (!buttonLabel.trim() || !buttonUrl.trim()) {
          toast.error("Please fill in all fields");
          return;
        }
        content = { label: buttonLabel, url: buttonUrl.startsWith("http") ? buttonUrl : `https://${buttonUrl}` };
        break;
      }
      case "email_capture": {
        // Must collect at least email OR phone
        if (!collectEmail && !collectPhone) {
          toast.error("Please select at least email or phone to collect");
          return;
        }
        content = {
          headline: emailHeadline.trim() || "Stay Connected 💌",
          description: emailDescription.trim() || "Leave your info and I'll reach out!",
          buttonText: emailButtonText.trim() || "Submit",
          collectEmail: collectEmail.toString(),
          collectPhone: collectPhone.toString(),
          collectName: collectName.toString(),
          collectMessage: collectMessage.toString(),
          emailRequired: emailRequired.toString(),
          phoneRequired: phoneRequired.toString(),
          nameRequired: nameRequired.toString(),
          messageRequired: messageRequired.toString(),
        };
        break;
      }
      case "photo_collage": {
        if (collageMedia.length === 0) {
          toast.error("Please add at least one image or video");
          return;
        }
        content = {
          media: JSON.stringify(collageMedia),
          columns: collageColumns.toString(),
        };
        break;
      }
      case "product": {
        if (!selectedProductId) {
          toast.error("Please select a product");
          return;
        }
        content = { product_id: selectedProductId };
        break;
      }
      case "sms_subscribe": {
        content = smsStyle === "button"
          ? {
              style: "button",
              headline: "",
              description: "",
              buttonText: smsButtonText.trim() || "Join the VIP List",
            }
          : {
              style: "card",
              headline: smsHeadline.trim(),
              description: smsDescription.trim(),
              buttonText: smsButtonText.trim() || "Join the VIP List",
            };
        break;
      }
      case "locations": {
        const cleanedLocations = locations
          .map((l) => ({
            name: (l.name ?? "").trim(),
            city: (l.city ?? "").trim(),
            subtitle: (l.subtitle ?? "").trim(),
            imageUrl: (l.imageUrl ?? "").trim(),
            destination: (l.destination ?? "").trim(),
          }))
          .filter((l) => l.name.length > 0 && l.destination.length > 0);
        if (cleanedLocations.length === 0) {
          toast.error("Add at least one location with a name and destination");
          return;
        }
        const invalid = cleanedLocations.find(
          (l) => resolveLocationDestination(l.destination).kind === "none"
        );
        if (invalid) {
          toast.error(`"${invalid.name}" has an invalid destination`);
          return;
        }
        content = serializeLocationsContent({
          title: locationsTitle,
          subtitle: locationsSubtitle,
          ctaLabel: locationsCta,
          locations: cleanedLocations,
        });
        break;
      }
      case "menu": {
        const cleaned = menuSections
          .map((section) => ({
            name: section.name.trim(),
            items: section.items.filter((item) => item.name.trim().length > 0),
          }))
          .filter((section) => section.items.length > 0);
        if (cleaned.length === 0) {
          toast.error("Add at least one menu item");
          return;
        }
        content = serializeMenuContent({
          title: menuTitle,
          buttonLabel: menuButtonLabel,
          sections: cleaned,
        });
        break;
      }
    }

    // If deferSave is true, just return the block data without saving to DB
    if (deferSave) {
      if (editingBlock) {
        onBlockSaved({ ...editingBlock, content, alignment });
      } else {
        // Create a new block with a temporary ID
        const newBlock: PersonalBlock = {
          id: crypto.randomUUID(),
          block_type: selectedType,
          content,
          alignment,
          sort_order: currentMaxOrder + 1,
          is_active: true,
        };
        onBlockSaved(newBlock);
      }
      handleClose();
      return;
    }

    setSaving(true);
    try {
      if (editingBlock) {
        const { error } = await supabase
          .from("personal_blocks")
          .update({ content, alignment })
          .eq("id", editingBlock.id);

        if (error) throw error;

        onBlockSaved({ ...editingBlock, content, alignment });
        toast.success(
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Saved! Check the preview to see your changes.</span>
          </div>,
          { duration: 3000 }
        );
      } else {
        const { data, error } = await supabase
          .from("personal_blocks")
          .insert({
            profile_id: profileId,
            block_type: selectedType,
            content,
            alignment,
            sort_order: currentMaxOrder + 1,
          })
          .select()
          .single();

        if (error) throw error;

        onBlockSaved(data);
        toast.success(
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span>Saved! Check the preview to see your changes.</span>
          </div>,
          { duration: 3000 }
        );
      }
      
      // Invalidate cache
      if (username) {
        invalidateProfileCache(username);
      }
      
      handleClose();
    } catch (err) {
      console.error("Save error:", err);
      toast.error("Failed to save block");
    } finally {
      setSaving(false);
    }
  };

  const renderFormContent = () => (
    <>
      {!selectedType ? (
        <div className="space-y-2 pt-2">
          {BLOCK_TYPES.map((type) => {
            const isProLocked = type.type === "photo_collage" && (planType === "free");
            return (
              <button
                key={type.type}
                onClick={() => {
                  if (isProLocked) {
                    onUpgrade?.();
                  } else {
                    setSelectedType(type.type);
                  }
                }}
                className="w-full flex items-center gap-3 p-3 bg-muted/50 hover:bg-muted rounded-xl transition-colors text-left relative"
              >
                <type.icon className="h-5 w-5 text-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">{type.label}</p>
                  <p className="text-xs text-muted-foreground">{type.description}</p>
                </div>
                {isProLocked && (
                  <span className="flex items-center gap-0.5 text-[10px] font-semibold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">
                    Pro
                  </span>
                )}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-4 pt-2">
          {selectedType === "youtube" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>YouTube URL</Label>
                <Input
                  placeholder="https://youtube.com/watch?v=..."
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  className="h-12"
                />
              </div>
              
              {/* Text overlay options */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Text Overlay (optional)</Label>
                <Input
                  placeholder="Title text..."
                  value={youtubeOverlayTitle}
                  onChange={(e) => setYoutubeOverlayTitle(e.target.value)}
                  className="h-10"
                />
                <Input
                  placeholder="Subtitle text..."
                  value={youtubeOverlaySubtitle}
                  onChange={(e) => setYoutubeOverlaySubtitle(e.target.value)}
                  className="h-10"
                />
              </div>
            </div>
          )}

          {selectedType === "image" && (
            <>
              <div className="space-y-2">
                <Label>Image</Label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                />
                {imageUrl ? (
                  <div className="relative">
                    <img 
                      src={imageUrl} 
                      alt="Preview" 
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Change
                      </Button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="w-full h-32 border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-2 hover:bg-muted/50 transition-colors"
                  >
                    {uploadingImage ? (
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    ) : (
                      <>
                        <Crop className="h-6 w-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload & crop</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {/* Size toggle */}
              <div className="space-y-2">
                <Label>Display Size</Label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setImageSize("small")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageSize === "small" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    Small
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageSize("large")}
                    className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      imageSize === "large" 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted hover:bg-muted/80 text-foreground"
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>
              
              {/* Link URL (optional) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1.5">
                  <LinkIcon className="h-3.5 w-3.5" />
                  Link URL (optional)
                </Label>
                <Input
                  placeholder="https://example.com"
                  value={imageLinkUrl}
                  onChange={(e) => setImageLinkUrl(e.target.value)}
                  className="h-11"
                />
                <p className="text-xs text-muted-foreground">Make image clickable</p>
              </div>
              
              {/* Text Overlay (optional) */}
              {imageUrl && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <Label className="text-sm font-medium">Text Overlay (optional)</Label>
                  <div className="space-y-2">
                    <Input
                      placeholder="Title (e.g., NEW DROP 🔥)"
                      value={overlayTitle}
                      onChange={(e) => setOverlayTitle(e.target.value)}
                      className="h-10"
                    />
                    <Input
                      placeholder="Subtitle (e.g., Limited availability)"
                      value={overlaySubtitle}
                      onChange={(e) => setOverlaySubtitle(e.target.value)}
                      className="h-10"
                    />
                    <Input
                      placeholder="CTA text (e.g., Shop Now →)"
                      value={overlayCta}
                      onChange={(e) => setOverlayCta(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">Text will appear on top of the image</p>
                </div>
              )}
            </>
          )}

          {selectedType === "text" && (
            <>
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  placeholder="Section title"
                  value={textTitle}
                  onChange={(e) => setTextTitle(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Body (optional)</Label>
                <Textarea
                  placeholder="Add some details..."
                  value={textBody}
                  onChange={(e) => setTextBody(e.target.value)}
                  rows={3}
                />
              </div>
            </>
          )}

          {selectedType === "button" && (
            <>
              <div className="space-y-2">
                <Label>Button Label</Label>
                <Input
                  placeholder="Book Now"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Link URL</Label>
                <Input
                  placeholder="https://..."
                  value={buttonUrl}
                  onChange={(e) => setButtonUrl(e.target.value)}
                  className="h-12"
                />
              </div>
            </>
          )}

          {selectedType === "email_capture" && (
            <>
              <div className="space-y-2">
                <Label>Headline</Label>
                <Input
                  placeholder="Stay Connected 💌"
                  value={emailHeadline}
                  onChange={(e) => setEmailHeadline(e.target.value)}
                  className="h-12"
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea
                  placeholder="Leave your email and I'll reach out!"
                  value={emailDescription}
                  onChange={(e) => setEmailDescription(e.target.value)}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  placeholder="Submit"
                  value={emailButtonText}
                  onChange={(e) => setEmailButtonText(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-sm font-medium">Contact Fields</Label>
                {/* Phone first, then Email */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Collect Phone</p>
                      <p className="text-xs text-muted-foreground">Ask for their phone number</p>
                    </div>
                    <Switch checked={collectPhone} onCheckedChange={setCollectPhone} />
                  </div>
                  {collectPhone && (
                    <div className="flex items-center justify-between pl-4 py-1">
                      <p className="text-sm text-muted-foreground">Required</p>
                      <Switch checked={phoneRequired} onCheckedChange={setPhoneRequired} />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Collect Email</p>
                      <p className="text-xs text-muted-foreground">Ask for their email address</p>
                    </div>
                    <Switch checked={collectEmail} onCheckedChange={setCollectEmail} />
                  </div>
                  {collectEmail && (
                    <div className="flex items-center justify-between pl-4 py-1">
                      <p className="text-sm text-muted-foreground">Required</p>
                      <Switch checked={emailRequired} onCheckedChange={setEmailRequired} />
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-3 pt-2 border-t border-border">
                <Label className="text-sm font-medium">Additional Fields</Label>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Collect Name</p>
                      <p className="text-xs text-muted-foreground">Ask visitors for their name</p>
                    </div>
                    <Switch checked={collectName} onCheckedChange={setCollectName} />
                  </div>
                  {collectName && (
                    <div className="flex items-center justify-between pl-4 py-1">
                      <p className="text-sm text-muted-foreground">Required</p>
                      <Switch checked={nameRequired} onCheckedChange={setNameRequired} />
                    </div>
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">Collect Message</p>
                      <p className="text-xs text-muted-foreground">Let visitors add a message</p>
                    </div>
                    <Switch checked={collectMessage} onCheckedChange={setCollectMessage} />
                  </div>
                  {collectMessage && (
                    <div className="flex items-center justify-between pl-4 py-1">
                      <p className="text-sm text-muted-foreground">Required</p>
                      <Switch checked={messageRequired} onCheckedChange={setMessageRequired} />
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {selectedType === "photo_collage" && (
            <>
              <div className="space-y-2">
              <Label>Photos & Videos (max 9)</Label>
                <p className="text-xs text-muted-foreground">Drag &amp; drop or click to add. Images and videos up to 1 minute.</p>
                <input
                  ref={collageFileInputRef}
                  type="file"
                  accept="image/*,video/*"
                  multiple
                  onChange={handleCollageMediaSelect}
                  className="hidden"
                />
                <div
                  onDragOver={(e) => { e.preventDefault(); setCollageDragOver(true); }}
                  onDragLeave={() => setCollageDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setCollageDragOver(false);
                    const files = Array.from(e.dataTransfer.files || []).filter(
                      f => f.type.startsWith("image/") || f.type.startsWith("video/")
                    );
                    if (files.length) handleCollageFiles(files);
                  }}
                  className={`relative grid grid-cols-4 gap-2 rounded-lg p-2 transition-colors ${
                    collageDragOver ? "bg-primary/10 ring-2 ring-primary" : ""
                  }`}
                >
                  {collageMedia.map((item, idx) => (
                    <div
                      key={idx}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData("text/collage-idx", String(idx));
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragOver={(e) => {
                        if (e.dataTransfer.types.includes("text/collage-idx")) {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = "move";
                        }
                      }}
                      onDrop={(e) => {
                        const raw = e.dataTransfer.getData("text/collage-idx");
                        if (!raw) return;
                        e.preventDefault();
                        e.stopPropagation();
                        const from = parseInt(raw, 10);
                        if (Number.isNaN(from) || from === idx) return;
                        setCollageMedia((prev) => {
                          const next = [...prev];
                          const [moved] = next.splice(from, 1);
                          next.splice(idx, 0, moved);
                          return next;
                        });
                      }}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted cursor-move active:opacity-70"
                    >
                      {item.type === "video" ? (
                        <div className="w-full h-full relative">
                          <video src={item.url} muted playsInline className="w-full h-full object-cover" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                            <div className="h-6 w-6 rounded-full bg-white/80 flex items-center justify-center">
                              <div className="w-0 h-0 border-t-[5px] border-t-transparent border-l-[8px] border-l-black border-b-[5px] border-b-transparent ml-0.5" />
                            </div>
                          </div>
                        </div>
                      ) : (
                        <img src={item.url} alt="" draggable={false} className="w-full h-full object-cover pointer-events-none" />
                      )}
                      {item.type === "image" && (
                        <button
                          onClick={() => handleEditCollageImage(idx)}
                          className="absolute top-1 left-1 h-6 w-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
                          title="Crop image"
                        >
                          <Crop className="h-3 w-3 text-white" />
                        </button>
                      )}
                      <button
                        onClick={() => handleRemoveCollageMedia(idx)}
                        className="absolute top-1 right-1 h-6 w-6 bg-black/50 rounded-full flex items-center justify-center hover:bg-black/70"
                      >
                        <X className="h-3 w-3 text-white" />
                      </button>
                    </div>

                  ))}
                  {collageMedia.length < 9 && (
                    <button
                      onClick={() => collageFileInputRef.current?.click()}
                      disabled={uploadingCollageImage}
                      className="aspect-square border-2 border-dashed border-border rounded-lg flex flex-col items-center justify-center gap-1 hover:bg-muted/50 transition-colors"
                    >
                      {uploadingCollageImage ? (
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      ) : (
                        <>
                          <Plus className="h-5 w-5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">Add</span>
                        </>
                      )}
                    </button>
                  )}
                  {collageDragOver && (
                    <div className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-background/70 text-sm font-medium">
                      Drop to upload
                    </div>
                  )}
                </div>

              </div>
            </>
          )}

          {selectedType === "product" && (
            <div className="space-y-2">
              <Label>Select Product</Label>
              {creatorProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">No active products found. Create a product in the Shop tab first.</p>
              ) : (
                <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a product..." />
                  </SelectTrigger>
                  <SelectContent>
                    {creatorProducts.map(p => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.title} — ${(p.price_cents / 100).toFixed(2)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {selectedType === "menu" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Menu title</Label>
                <Input
                  value={menuTitle}
                  onChange={(e) => setMenuTitle(e.target.value)}
                  placeholder="Our Menu"
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label>Button label</Label>
                <Input
                  value={menuButtonLabel}
                  onChange={(e) => setMenuButtonLabel(e.target.value)}
                  placeholder="View Menu"
                  className="h-11"
                />
              </div>
              <MenuBlockEditor sections={menuSections} onSectionsChange={setMenuSections} />
            </div>
          )}

          {selectedType === "sms_subscribe" && (
            <>
              <div className="rounded-lg bg-muted/50 p-3 flex items-start gap-2">
                <Smartphone className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Visitors who tap this block will be asked for their name and phone, and added to your SMS VIP list.
                </p>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { value: "card", label: "Card", hint: "Headline + text" },
                    { value: "button", label: "Button only", hint: "Just one button" },
                  ] as const).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSmsStyle(opt.value)}
                      className={`rounded-lg border p-3 text-left transition-colors ${
                        smsStyle === opt.value
                          ? "border-primary bg-primary/10"
                          : "border-border hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium">{opt.label}</p>
                      <p className="text-xs text-muted-foreground">{opt.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
              {smsStyle === "card" && (
                <>
                  <div className="space-y-2">
                    <Label>Headline <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                    <Input
                      placeholder="Join our VIP Text List"
                      value={smsHeadline}
                      onChange={(e) => setSmsHeadline(e.target.value)}
                      className="h-12"
                      maxLength={60}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description <span className="text-xs text-muted-foreground font-normal">(optional)</span></Label>
                    <Textarea
                      placeholder="Get exclusive updates and offers via text."
                      value={smsDescription}
                      onChange={(e) => setSmsDescription(e.target.value)}
                      rows={2}
                      maxLength={140}
                    />
                  </div>
                </>
              )}
              <div className="space-y-2">
                <Label>Button Text</Label>
                <Input
                  placeholder="Join the VIP List"
                  value={smsButtonText}
                  onChange={(e) => setSmsButtonText(e.target.value)}
                  className="h-11"
                  maxLength={40}
                />
              </div>
            </>
          )}

          {/* Alignment picker */}
          <div className="space-y-2">
            <Label>Alignment</Label>
            <RadioGroup 
              value={alignment} 
              onValueChange={setAlignment}
              className="flex gap-2"
            >
              <div className="flex items-center">
                <RadioGroupItem value="left" id="align-left" className="sr-only" />
                <Label
                  htmlFor="align-left"
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    alignment === "left" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <AlignLeft className="h-4 w-4" />
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="center" id="align-center" className="sr-only" />
                <Label
                  htmlFor="align-center"
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    alignment === "center" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <AlignCenter className="h-4 w-4" />
                </Label>
              </div>
              <div className="flex items-center">
                <RadioGroupItem value="right" id="align-right" className="sr-only" />
                <Label
                  htmlFor="align-right"
                  className={`p-2 rounded-lg cursor-pointer transition-colors ${
                    alignment === "right" ? "bg-primary text-primary-foreground" : "bg-muted hover:bg-muted/80"
                  }`}
                >
                  <AlignRight className="h-4 w-4" />
                </Label>
              </div>
            </RadioGroup>
          </div>

          <div className="flex gap-2 pt-2">
            {!editingBlock && (
              <Button 
                variant="outline" 
                className="flex-1"
                onClick={() => setSelectedType(null)}
              >
                Back
              </Button>
            )}
            <Button 
              className="flex-1"
              onClick={handleSave}
              disabled={saving}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : editingBlock ? "Save" : "Add"}
            </Button>
          </div>
        </div>
      )}
    </>
  );

  const modalTitle = editingBlock ? "Edit block" : selectedType ? "Configure block" : "Add a block";

  return (
    <>
      {isMobile ? (
        <Drawer open={open} onOpenChange={onOpenChange}>
          <DrawerContent className="max-h-[90vh]">
            <DrawerHeader className="text-left">
              <DrawerTitle>{modalTitle}</DrawerTitle>
            </DrawerHeader>
            <div className="overflow-y-auto flex-1 px-4 pb-8">
              {renderFormContent()}
            </div>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent className="max-w-sm mx-4 max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{modalTitle}</DialogTitle>
            </DialogHeader>
            {renderFormContent()}
          </DialogContent>
        </Dialog>
      )}

      {/* Image Cropper */}
      {rawImageForCrop && (
        <ImageCropper
          open={showCropper}
          onOpenChange={(open) => {
            setShowCropper(open);
            if (!open && rawImageForCrop) {
              URL.revokeObjectURL(rawImageForCrop);
              setRawImageForCrop(null);
            }
          }}
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          aspectRatio={imageSize === "small" ? 1 : 16/9}
          cropShape="rect"
        />
      )}

      {/* Collage Image Cropper */}
      {collageRawImage && (
        <ImageCropper
          open={showCollageCropper}
          onOpenChange={(open) => {
            setShowCollageCropper(open);
            if (!open && collageRawImage) {
              URL.revokeObjectURL(collageRawImage);
              setCollageRawImage(null);
            }
          }}
          imageSrc={collageRawImage}
          onCropComplete={handleCollageCropComplete}
          aspectRatio={1}
          cropShape="rect"
        />
      )}
    </>
  );
};
