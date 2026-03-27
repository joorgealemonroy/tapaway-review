import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface PersonalLink {
  id: string;
  type: string;
  label: string;
  value: string; // username/handle/email
  url: string; // generated full URL
  pillColor?: string | null; // custom button color
  isFeatured?: boolean; // highlighted/featured link
  displayStyle?: string; // "pill" | "icon" | "both"
  coverImageUrl?: string | null; // optional cover image for card-style display
  gridSize?: string | null; // "half" | "full" - controls 2-col grid
  thumbnailUrl?: string | null; // optional small icon image
  sortOrder?: number; // unified ordering with blocks
  placeholder?: string; // ghost cue text from template (e.g. "@yourhandle")
}

export type ContentItem =
  | { kind: "link"; item: PersonalLink }
  | { kind: "block"; item: PersonalBlock };

export interface PersonalBlock {
  id: string;
  type: "youtube" | "image" | "text" | "button";
  content: Record<string, string>;
  sortOrder: number;
}

export interface PersonalOnboardingData {
  fullName: string;
  email: string;
  username: string;
  password: string;
  profilePhoto: File | null;
  profilePhotoUrl: string | null;
  croppedPhotoBlob: Blob | null;
  headerType: "color" | "image" | "banner";
  headerImageUrl: string | null;
  headerColor: string | null;
  backgroundColor: string | null;
  cardHeadline: string;
  links: PersonalLink[];
  blocks: PersonalBlock[];
  addExtraCard: boolean;
  extraCardCount: number;
  planType: "free" | "monthly" | "yearly" | "vip";
  cardChoice: "custom" | "basic" | "none";
  basicCardColor: string | null;
  isOAuthUser: boolean;
  selectedTemplate?: string | null;
  vibeId?: string | null;
  bgStyle?: string | null;
  textColor?: string | null;
}

const STORAGE_KEY = "tapaway_personal_draft";
const DEBOUNCE_MS = 1000;

const initialData: PersonalOnboardingData = {
  fullName: "",
  email: "",
  username: "",
  password: "",
  profilePhoto: null,
  profilePhotoUrl: null,
  croppedPhotoBlob: null,
  headerType: "color",
  headerImageUrl: null,
  headerColor: "#6BCB77",
  backgroundColor: "#000000",
  cardHeadline: "",
  links: [],
  blocks: [],
  addExtraCard: false,
  extraCardCount: 1,
  planType: "yearly",
  cardChoice: "none",
  basicCardColor: null,
  isOAuthUser: false,
  selectedTemplate: null,
  vibeId: null,
  bgStyle: null,
  textColor: null,
};

export const usePersonalOnboarding = () => {
  const [data, setData] = useState<PersonalOnboardingData>(initialData);
  const [isDirty, setIsDirty] = useState(false);

  // Load draft from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        
        // Reconstruct the croppedPhotoBlob from the saved profilePhotoUrl (base64)
        let restoredBlob: Blob | null = null;
        if (parsed.profilePhotoUrl && parsed.profilePhotoUrl.startsWith("data:")) {
          // Convert data URL to Blob
          const arr = parsed.profilePhotoUrl.split(",");
          const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
          const bstr = atob(arr[1]);
          let n = bstr.length;
          const u8arr = new Uint8Array(n);
          while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
          }
          restoredBlob = new Blob([u8arr], { type: mime });
        }
        
        setData(prev => ({
          ...prev,
          ...parsed,
          profilePhoto: null, // Can't restore File objects
          croppedPhotoBlob: restoredBlob, // Restore from data URL
        }));
      } catch (err) {
        console.error("Failed to restore draft:", err);
      }
    }
  }, []);

  // Debounced save to localStorage
  useEffect(() => {
    if (!isDirty) return;

    const timer = setTimeout(() => {
      const toSave = {
        ...data,
        profilePhoto: null,
        croppedPhotoBlob: null,
        password: "", // Never save password to localStorage
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [data, isDirty]);

  const update = useCallback((updates: Partial<PersonalOnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }));
    setIsDirty(true);
  }, []);

  const addLink = useCallback((link: Omit<PersonalLink, "id">) => {
    const newLink: PersonalLink = {
      ...link,
      id: crypto.randomUUID(),
    };
    setData(prev => ({ ...prev, links: [...prev.links, newLink] }));
    setIsDirty(true);
  }, []);

  const updateLink = useCallback((id: string, updates: Partial<PersonalLink>) => {
    setData(prev => ({
      ...prev,
      links: prev.links.map(link =>
        link.id === id ? { ...link, ...updates } : link
      ),
    }));
    setIsDirty(true);
  }, []);

  const removeLink = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      links: prev.links.filter(link => link.id !== id),
    }));
    setIsDirty(true);
  }, []);

  const reorderLinks = useCallback((links: PersonalLink[]) => {
    setData(prev => ({ ...prev, links }));
    setIsDirty(true);
  }, []);

  const addBlock = useCallback((block: Omit<PersonalBlock, "id"> & { sortOrder?: number }) => {
    const newBlock: PersonalBlock = {
      id: crypto.randomUUID(),
      type: block.type,
      content: block.content,
      sortOrder: block.sortOrder ?? data.blocks.length,
    };
    setData(prev => ({ ...prev, blocks: [...prev.blocks, newBlock] }));
    setIsDirty(true);
  }, [data.blocks.length]);

  const updateBlock = useCallback((id: string, updates: Partial<PersonalBlock>) => {
    setData(prev => ({
      ...prev,
      blocks: prev.blocks.map(block =>
        block.id === id ? { ...block, ...updates } : block
      ),
    }));
    setIsDirty(true);
  }, []);

  const removeBlock = useCallback((id: string) => {
    setData(prev => ({
      ...prev,
      blocks: prev.blocks.filter(block => block.id !== id),
    }));
    setIsDirty(true);
  }, []);

  const reorderBlocks = useCallback((blocks: PersonalBlock[]) => {
    setData(prev => ({
      ...prev,
      blocks: blocks.map((b, i) => ({ ...b, sortOrder: i })),
    }));
    setIsDirty(true);
  }, []);

  // Unified reorder: accepts mixed links+blocks, assigns sequential sort orders
  const reorderContent = useCallback((items: ContentItem[]) => {
    const newLinks: PersonalLink[] = [];
    const newBlocks: PersonalBlock[] = [];
    items.forEach((ci, index) => {
      if (ci.kind === "link") {
        newLinks.push({ ...ci.item, sortOrder: index });
      } else {
        newBlocks.push({ ...ci.item, sortOrder: index });
      }
    });
    setData(prev => ({ ...prev, links: newLinks, blocks: newBlocks }));
    setIsDirty(true);
  }, []);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(initialData);
    setIsDirty(false);
  }, []);

  // Immediately save to localStorage (bypass debounce)
  const flushSave = useCallback(() => {
    const toSave = {
      ...data,
      profilePhoto: null,
      croppedPhotoBlob: null,
      password: "", // Never save password to localStorage
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(toSave));
    setIsDirty(false);
  }, [data]);

  const hasDraft = Boolean(localStorage.getItem(STORAGE_KEY));

  return {
    data,
    update,
    addLink,
    updateLink,
    removeLink,
    reorderLinks,
    addBlock,
    updateBlock,
    removeBlock,
    reorderBlocks,
    reorderContent,
    clearDraft,
    flushSave,
    hasDraft,
    isDirty,
  };
};
