import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Loader2, 
  Plus, 
  Trash2, 
  Upload, 
  ExternalLink,
  ShoppingBag,
  DollarSign,
  FileText,
  Video,
  BookOpen,
  FlaskConical,
  CheckCircle2,
  Copy,
  Download,
  ChevronDown,
  Terminal
} from "lucide-react";

interface CreatorProduct {
  id: string;
  title: string;
  description: string | null;
  long_description: string | null;
  price_cents: number;
  product_type: string;
  file_url: string | null;
  cover_image_url: string | null;
  image_urls: string[] | null;
  is_active: boolean;
  created_at: string;
}

interface CreatorPurchase {
  id: string;
  product_id: string;
  buyer_email: string;
  stripe_session_id: string;
  access_token: string;
  access_expires_at: string;
  created_at: string;
}

interface PersonalShopTabProps {
  profileId: string;
  userId: string;
  stripeConnectAccountId: string | null;
  isStripeOnboarded: boolean;
  onProfileUpdate: () => void;
  planType?: string | null;
}

function ShopLockedPreview() {
  return (
    <div className="text-center py-16 space-y-6 max-w-md mx-auto">
      <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
        <ShoppingBag className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-2">
        <h3 className="text-xl font-bold text-foreground">Sell Digital Products</h3>
        <p className="text-sm text-muted-foreground">
          Turn your profile into a storefront. Sell courses, PDFs, templates, presets, and more — directly to your audience.
        </p>
      </div>
      <ul className="text-left space-y-3 text-sm text-muted-foreground">
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>Instant Stripe payouts to your bank account</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>Secure, time-limited download links</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>Sales dashboard with buyer history</span>
        </li>
        <li className="flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <span>Automatic buyer & creator email notifications</span>
        </li>
      </ul>
      <Button
        onClick={() => window.location.href = '/personal/pricing'}
        className="gap-2"
        size="lg"
      >
        <ShoppingBag className="h-4 w-4" />
        Upgrade to Pro
      </Button>
    </div>
  );
}

export function PersonalShopTab({ 
  profileId, 
  userId,
  stripeConnectAccountId, 
  isStripeOnboarded,
  onProfileUpdate,
  planType
}: PersonalShopTabProps) {
  const isFreeUser = !planType || planType === 'free';

  const [connecting, setConnecting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [products, setProducts] = useState<CreatorProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  
  // New product form
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priceDollars, setPriceDollars] = useState("");
  const [productType, setProductType] = useState("pdf");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
  const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);
  const [longDescription, setLongDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [showShopSection, setShowShopSection] = useState(true);
  const [loadingShopToggle, setLoadingShopToggle] = useState(false);

  // Sales dashboard state
  const [salesTotal, setSalesTotal] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [recentSales, setRecentSales] = useState<Array<{
    buyer_email: string;
    product_title: string;
    price_cents: number;
    created_at: string;
  }>>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Test mode state
  const [testCheckoutUrls, setTestCheckoutUrls] = useState<Record<string, string>>({});
  const [generatingCheckout, setGeneratingCheckout] = useState<string | null>(null);
  const [testConsoleOpen, setTestConsoleOpen] = useState(false);
  const [testPurchases, setTestPurchases] = useState<CreatorPurchase[]>([]);
  const [previousPurchaseCount, setPreviousPurchaseCount] = useState(0);

  const isDev = import.meta.env.DEV;

  // Load products
  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    const { data, error } = await supabase
      .from("creator_products")
      .select("*")
      .eq("creator_id", profileId)
      .order("created_at", { ascending: false });
    
    if (!error && data) {
      setProducts(data as unknown as CreatorProduct[]);
    }
    setLoadingProducts(false);
  }, [profileId]);

  // Load sales data
  const loadSalesData = useCallback(async () => {
    setLoadingSales(true);
    try {
      const { data, error } = await supabase
        .from("creator_purchases")
        .select("buyer_email, created_at, product:creator_products!product_id(title, price_cents, creator_id)")
        .order("created_at", { ascending: false });

      if (!error && data) {
        // Filter to only this creator's products (client-side since we can't filter on joined column easily)
        const creatorSales = (data as any[]).filter(
          (p: any) => p.product?.creator_id === profileId
        );
        
        const mapped = creatorSales.map((s: any) => ({
          buyer_email: s.buyer_email,
          product_title: s.product?.title || "Unknown",
          price_cents: s.product?.price_cents || 0,
          created_at: s.created_at,
        }));

        setSalesCount(mapped.length);
        setSalesTotal(mapped.reduce((sum, s) => sum + s.price_cents, 0));
        setRecentSales(mapped.slice(0, 10));
      }
    } catch (err) {
      console.error("Failed to load sales data:", err);
    }
    setLoadingSales(false);
  }, [profileId]);

  // Load shop toggle state + sales
  useEffect(() => {
    if (isStripeOnboarded) {
      loadProducts();
      loadSalesData();
      // Load show_shop_section from profile
      supabase
        .from("personal_profiles")
        .select("show_shop_section")
        .eq("id", profileId)
        .single()
        .then(({ data }) => {
          if (data) setShowShopSection((data as any).show_shop_section ?? true);
        });
    }
  }, [isStripeOnboarded, loadProducts, loadSalesData, profileId]);

  const handleToggleShopSection = async (checked: boolean) => {
    setLoadingShopToggle(true);
    setShowShopSection(checked);
    const { error } = await supabase
      .from("personal_profiles")
      .update({ show_shop_section: checked } as any)
      .eq("id", profileId);
    if (error) {
      toast.error("Failed to update shop visibility");
      setShowShopSection(!checked);
    }
    setLoadingShopToggle(false);
  };

  // Poll for test purchases when console is open
  useEffect(() => {
    if (!isDev || !testConsoleOpen || !isStripeOnboarded) return;

    const poll = async () => {
      const productIds = products.map(p => p.id);
      if (productIds.length === 0) return;

      const { data: purchases } = await supabase
        .from("creator_purchases")
        .select("*")
        .in("product_id", productIds)
        .order("created_at", { ascending: false })
        .limit(20);

      if (purchases) {
        const typed = purchases as unknown as CreatorPurchase[];
        if (typed.length > previousPurchaseCount && previousPurchaseCount > 0) {
          toast.success("✅ New purchase detected! Webhook succeeded.");
        }
        setPreviousPurchaseCount(typed.length);
        setTestPurchases(typed);
      }
    };

    poll();
    const interval = setInterval(poll, 5000);
    return () => clearInterval(interval);
  }, [isDev, testConsoleOpen, isStripeOnboarded, products, previousPurchaseCount]);

  // Check onboarding status on return from Stripe
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe_connect") === "success" && stripeConnectAccountId && !isStripeOnboarded) {
      setVerifying(true);
      supabase.functions.invoke("verify-connect-onboarding", {
        body: { profileId },
      }).then(({ data, error }) => {
        if (!error && data?.is_onboarded) {
          toast.success("Stripe connected successfully! 🎉");
          onProfileUpdate();
        } else {
          toast.info("Stripe setup is not complete yet. Please finish onboarding.");
        }
        setVerifying(false);
      });
      const url = new URL(window.location.href);
      url.searchParams.delete("stripe_connect");
      window.history.replaceState({}, "", url.toString());
    }
  }, [stripeConnectAccountId, isStripeOnboarded, profileId, onProfileUpdate]);

  const handleConnectStripe = async () => {
    setConnecting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-connect-account-link", {
        body: { profileId },
      });
      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error("Connect error:", err);
      toast.error("Failed to start Stripe setup");
      setConnecting(false);
    }
  };

  const handleSimulateConnect = async () => {
    const fakeAccountId = `acct_test_${crypto.randomUUID().slice(0, 8)}`;
    const { error } = await supabase
      .from("personal_profiles")
      .update({ 
        stripe_connect_account_id: fakeAccountId, 
        is_stripe_onboarded: true 
      } as any)
      .eq("id", profileId);

    if (error) {
      toast.error("Failed to simulate connect: " + error.message);
    } else {
      toast.success(`Simulated Stripe Connect: ${fakeAccountId}`);
      onProfileUpdate();
    }
  };

  const handleGenerateTestCheckout = async (productId: string) => {
    setGeneratingCheckout(productId);
    try {
      const { data, error } = await supabase.functions.invoke("create-product-checkout", {
        body: { productId, testMode: true },
      });
      if (error) throw error;
      if (data?.url) {
        setTestCheckoutUrls(prev => ({ ...prev, [productId]: data.url }));
        toast.success("Test checkout link generated!");
      }
    } catch (err: any) {
      console.error("Test checkout error:", err);
      toast.error(err.message || "Failed to generate test checkout");
    } finally {
      setGeneratingCheckout(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        toast.error("File must be under 50MB");
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleCoverSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select an image file");
        return;
      }
      setCoverFile(file);
    }
  };

  const handleGallerySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(f => {
      if (!f.type.startsWith("image/")) { toast.error(`${f.name} is not an image`); return false; }
      if (f.size > 20 * 1024 * 1024) { toast.error(`${f.name} is too large (max 20MB)`); return false; }
      return true;
    });
    const total = galleryFiles.length + validFiles.length;
    if (total > 5) {
      toast.error("Maximum 5 gallery images");
      return;
    }
    setGalleryFiles(prev => [...prev, ...validFiles]);
    validFiles.forEach(f => {
      setGalleryPreviews(prev => [...prev, URL.createObjectURL(f)]);
    });
  };

  const handleRemoveGalleryImage = (index: number) => {
    URL.revokeObjectURL(galleryPreviews[index]);
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveProduct = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!priceDollars || parseFloat(priceDollars) <= 0) { toast.error("Enter a valid price"); return; }
    if (!selectedFile) { toast.error("Upload a file for your product"); return; }

    setSaving(true);
    try {
      const priceCents = Math.round(parseFloat(priceDollars) * 100);
      const productId = crypto.randomUUID();

      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${userId}/${productId}/product.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("creator-files")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      let coverImageUrl: string | null = null;
      if (coverFile) {
        const coverPath = `${userId}/${productId}/cover.jpg`;
        const { error: coverError } = await supabase.storage
          .from("personal-photos")
          .upload(coverPath, coverFile, { upsert: true, contentType: coverFile.type });

        if (!coverError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(coverPath);
          coverImageUrl = publicUrl;
        }
      }

      // Upload gallery images
      const imageUrls: string[] = [];
      for (let i = 0; i < galleryFiles.length; i++) {
        const gFile = galleryFiles[i];
        const gExt = gFile.name.split('.').pop();
        const gPath = `${userId}/${productId}/gallery/${i}.${gExt}`;
        const { error: gError } = await supabase.storage
          .from("personal-photos")
          .upload(gPath, gFile, { upsert: true, contentType: gFile.type });
        if (!gError) {
          const { data: { publicUrl } } = supabase.storage
            .from("personal-photos")
            .getPublicUrl(gPath);
          imageUrls.push(publicUrl);
        }
      }

      const { error: insertError } = await supabase
        .from("creator_products")
        .insert({
          id: productId,
          creator_id: profileId,
          title: title.trim(),
          description: description.trim() || null,
          long_description: longDescription.trim() || null,
          price_cents: priceCents,
          product_type: productType,
          file_url: filePath,
          cover_image_url: coverImageUrl,
          image_urls: imageUrls.length > 0 ? imageUrls : null,
        } as any);

      if (insertError) throw insertError;

      toast.success("Product created!");
      setTitle("");
      setDescription("");
      setLongDescription("");
      setPriceDollars("");
      setProductType("pdf");
      setSelectedFile(null);
      setCoverFile(null);
      setGalleryFiles([]);
      galleryPreviews.forEach(p => URL.revokeObjectURL(p));
      setGalleryPreviews([]);
      setShowForm(false);
      loadProducts();
    } catch (err: any) {
      console.error("Save product error:", err);
      toast.error(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (product: CreatorProduct) => {
    const { error } = await supabase
      .from("creator_products")
      .update({ is_active: !product.is_active } as any)
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to update product");
    } else {
      setProducts(prev => prev.map(p => p.id === product.id ? { ...p, is_active: !p.is_active } : p));
    }
  };

  const handleDeleteProduct = async (product: CreatorProduct) => {
    if (!confirm(`Delete "${product.title}"? This cannot be undone.`)) return;

    if (product.file_url) {
      await supabase.storage.from("creator-files").remove([product.file_url]);
    }

    const { error } = await supabase
      .from("creator_products")
      .delete()
      .eq("id", product.id);

    if (error) {
      toast.error("Failed to delete product");
    } else {
      setProducts(prev => prev.filter(p => p.id !== product.id));
      toast.success("Product deleted");
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case "pdf": return <FileText className="h-4 w-4" />;
      case "video": return <Video className="h-4 w-4" />;
      case "course": return <BookOpen className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  // Not onboarded yet — show Connect Stripe
  if (!isStripeOnboarded) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <ShoppingBag className="h-8 w-8 text-primary" />
            </div>
            <CardTitle className="text-xl">Sell Digital Products</CardTitle>
            <p className="text-sm text-muted-foreground mt-2">
              Sell PDFs, courses, and videos directly from your TapAway profile.
              Connect your Stripe account to get started — you'll collect payments directly.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Payments go directly to your Stripe account — you're in full control of refunds and disputes.</span>
              </div>
              <div className="flex items-start gap-3">
                <Upload className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Upload your files securely. Buyers get a time-limited download link after purchase.</span>
              </div>
              <div className="flex items-start gap-3">
                <ExternalLink className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                <span>Products appear as a "Shop" section on your public profile — no extra setup needed.</span>
              </div>
            </div>

            <Button 
              onClick={handleConnectStripe} 
              disabled={connecting || verifying}
              className="w-full"
              size="lg"
            >
              {connecting || verifying ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {verifying ? "Verifying..." : "Connect Stripe"}
            </Button>

            {stripeConnectAccountId && !isStripeOnboarded && (
              <p className="text-xs text-center text-muted-foreground">
                Stripe account connected but onboarding is incomplete.{" "}
                <button onClick={handleConnectStripe} className="text-primary underline">
                  Resume setup
                </button>
              </p>
            )}

            {/* Dev-only: Simulate Connect */}
            {isDev && (
              <div className="border-t border-dashed border-amber-500/30 pt-4 mt-4">
                <div className="flex items-center gap-2 mb-2">
                  <FlaskConical className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">Dev Only</span>
                </div>
                <Button 
                  onClick={handleSimulateConnect}
                  variant="outline"
                  className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
                >
                  <FlaskConical className="h-4 w-4 mr-2" />
                  Simulate Stripe Connect (Test)
                </Button>
                <p className="text-xs text-muted-foreground mt-1.5">
                  Bypasses real Stripe onboarding. Sets a fake acct_test_xxx ID.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarded — show product management
  return (
    <div className="space-y-6">
      {/* Shop toggle */}
      <div className="flex items-center justify-between p-3 bg-card border rounded-lg">
        <div>
          <p className="text-sm font-medium text-foreground">Show Shop on Profile</p>
          <p className="text-xs text-muted-foreground">Display your products as a section on your public profile</p>
        </div>
        <Switch
          checked={showShopSection}
          onCheckedChange={handleToggleShopSection}
          disabled={loadingShopToggle}
        />
      </div>


      {/* Sales Summary */}
      {(salesCount > 0 || loadingSales) && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                  <p className="text-lg font-bold text-foreground">
                    {loadingSales ? "..." : `$${(salesTotal / 100).toFixed(2)}`}
                  </p>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                  <p className="text-lg font-bold text-foreground">
                    {loadingSales ? "..." : salesCount}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {recentSales.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Recent Transactions</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-64 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Buyer</TableHead>
                        <TableHead className="text-xs">Product</TableHead>
                        <TableHead className="text-xs">Date</TableHead>
                        <TableHead className="text-xs text-right">Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentSales.map((sale, i) => (
                        <TableRow key={i}>
                          <TableCell className="text-xs truncate max-w-[120px]">
                            {sale.buyer_email}
                          </TableCell>
                          <TableCell className="text-xs truncate max-w-[120px]">
                            {sale.product_title}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {new Date(sale.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-xs text-right font-medium">
                            ${(sale.price_cents / 100).toFixed(2)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Your Products</h2>
          <p className="text-sm text-muted-foreground">
            {products.length} product{products.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)} size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Add Product
        </Button>
      </div>

      {/* New Product Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New Product</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. My Fitness Guide" />
            </div>
            <div className="space-y-2">
              <Label>Short Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Brief teaser shown on cards..." rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Long Description (optional)</Label>
              <Textarea 
                value={longDescription} 
                onChange={e => setLongDescription(e.target.value)} 
                placeholder="Sell your product — tell buyers everything they need to know. Supports line breaks." 
                rows={5} 
              />
              <p className="text-xs text-muted-foreground">Shown in the product preview modal. Supports line breaks.</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Price (USD)</Label>
                <Input 
                  type="number" 
                  min="0.50" 
                  step="0.01" 
                  value={priceDollars} 
                  onChange={e => setPriceDollars(e.target.value)} 
                  placeholder="9.99" 
                />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={productType} onValueChange={setProductType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="video">Video</SelectItem>
                    <SelectItem value="course">Course</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Product File</Label>
              <Input type="file" onChange={handleFileSelect} />
              {selectedFile && (
                <p className="text-xs text-muted-foreground">{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(1)}MB)</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Cover Image (optional)</Label>
              <Input type="file" accept="image/*" onChange={handleCoverSelect} />
              {coverFile && (
                <img src={URL.createObjectURL(coverFile)} alt="Cover preview" className="h-20 w-32 object-cover rounded-lg" />
              )}
            </div>
            <div className="space-y-2">
              <Label>Gallery Images (optional, max 5)</Label>
              <Input type="file" accept="image/*" multiple onChange={handleGallerySelect} />
              {galleryPreviews.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {galleryPreviews.map((preview, idx) => (
                    <div key={idx} className="relative h-16 w-16">
                      <img src={preview} alt="" className="h-16 w-16 object-cover rounded-lg" />
                      <button
                        onClick={() => handleRemoveGalleryImage(idx)}
                        className="absolute -top-1 -right-1 h-5 w-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview Card */}
            {title.trim() && (
              <div className="border rounded-xl overflow-hidden bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground px-3 pt-2">Preview</p>
                {coverFile && (
                  <img src={URL.createObjectURL(coverFile)} alt="" className="w-full h-32 object-cover mt-1" />
                )}
                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm text-foreground">{title}</h4>
                    {priceDollars && <Badge variant="default">${parseFloat(priceDollars || "0").toFixed(2)}</Badge>}
                  </div>
                  {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button onClick={handleSaveProduct} disabled={saving} className="flex-1">
                {saving && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Save Product
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Product List */}
      {loadingProducts ? (
        <div className="flex justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <ShoppingBag className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No products yet. Add your first product above.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {products.map(product => (
            <Card key={product.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {product.cover_image_url ? (
                    <img src={product.cover_image_url} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="h-16 w-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                      {getTypeIcon(product.product_type)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-sm text-foreground truncate">{product.title}</h3>
                      <Badge variant={product.is_active ? "default" : "secondary"} className="text-xs">
                        {product.is_active ? "Active" : "Hidden"}
                      </Badge>
                    </div>
                    <p className="text-sm font-semibold text-foreground mt-0.5">
                      ${(product.price_cents / 100).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">{product.product_type}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Switch 
                      checked={product.is_active} 
                      onCheckedChange={() => handleToggleActive(product)}
                    />
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteProduct(product)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Dev-only: Generate Test Checkout */}
                {isDev && (
                  <div className="mt-3 pt-3 border-t border-dashed border-amber-500/30">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleGenerateTestCheckout(product.id)}
                        disabled={generatingCheckout === product.id}
                        className="border-amber-500/50 text-amber-600 hover:bg-amber-500/10 text-xs"
                      >
                        {generatingCheckout === product.id ? (
                          <Loader2 className="h-3 w-3 animate-spin mr-1" />
                        ) : (
                          <FlaskConical className="h-3 w-3 mr-1" />
                        )}
                        Generate Test Checkout
                      </Button>
                    </div>
                    {testCheckoutUrls[product.id] && (
                      <div className="mt-2 space-y-1.5">
                        <div className="flex items-center gap-1.5">
                          <Input 
                            value={testCheckoutUrls[product.id]} 
                            readOnly 
                            className="text-xs font-mono h-8 bg-muted"
                          />
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => copyToClipboard(testCheckoutUrls[product.id])}
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 flex-shrink-0"
                            onClick={() => window.open(testCheckoutUrls[product.id], "_blank")}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Use test card: <code className="bg-muted px-1 rounded">4242 4242 4242 4242</code> | Any future exp | Any CVC
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dev-only: Test Console */}
      {isDev && products.length > 0 && (
        <Collapsible open={testConsoleOpen} onOpenChange={setTestConsoleOpen}>
          <CollapsibleTrigger asChild>
            <Button 
              variant="outline" 
              className="w-full border-amber-500/50 text-amber-600 hover:bg-amber-500/10"
            >
              <Terminal className="h-4 w-4 mr-2" />
              Test Console — Webhook Monitor
              <ChevronDown className={`h-4 w-4 ml-auto transition-transform ${testConsoleOpen ? "rotate-180" : ""}`} />
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <Card className="mt-2 border-amber-500/30 bg-amber-500/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <FlaskConical className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold text-amber-500 uppercase tracking-wide">
                    Purchase Monitor (polling every 5s)
                  </span>
                  <Badge variant="outline" className="ml-auto text-xs border-amber-500/50 text-amber-600">
                    {testPurchases.length} purchase{testPurchases.length !== 1 ? "s" : ""}
                  </Badge>
                </div>

                {testPurchases.length === 0 ? (
                  <div className="text-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-amber-500 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground">
                      Waiting for purchases… Complete a test checkout to see results here.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-80 overflow-y-auto">
                    {testPurchases.map(purchase => {
                      const downloadUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/download-product?token=${purchase.access_token}`;
                      const isExpired = new Date(purchase.access_expires_at) < new Date();
                      return (
                        <div 
                          key={purchase.id} 
                          className="p-3 rounded-lg bg-background border border-border space-y-2"
                        >
                          <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-foreground truncate">{purchase.buyer_email}</span>
                            <Badge variant={isExpired ? "destructive" : "default"} className="ml-auto text-xs">
                              {isExpired ? "Expired" : "Active"}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-1 gap-1 text-xs font-mono text-muted-foreground">
                            <div><span className="text-foreground/60">session:</span> {purchase.stripe_session_id.slice(0, 30)}…</div>
                            <div><span className="text-foreground/60">token:</span> {purchase.access_token.slice(0, 20)}…</div>
                            <div><span className="text-foreground/60">expires:</span> {new Date(purchase.access_expires_at).toLocaleString()}</div>
                            <div><span className="text-foreground/60">created:</span> {new Date(purchase.created_at || "").toLocaleString()}</div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => window.open(downloadUrl, "_blank")}
                              disabled={isExpired}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Test Download
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => copyToClipboard(downloadUrl)}
                            >
                              <Copy className="h-3 w-3 mr-1" />
                              Copy URL
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}
