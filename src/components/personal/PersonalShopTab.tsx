import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
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
  BookOpen
} from "lucide-react";

interface CreatorProduct {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  product_type: string;
  file_url: string | null;
  cover_image_url: string | null;
  is_active: boolean;
  created_at: string;
}

interface PersonalShopTabProps {
  profileId: string;
  userId: string;
  stripeConnectAccountId: string | null;
  isStripeOnboarded: boolean;
  onProfileUpdate: () => void;
}

export function PersonalShopTab({ 
  profileId, 
  userId,
  stripeConnectAccountId, 
  isStripeOnboarded,
  onProfileUpdate 
}: PersonalShopTabProps) {
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
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

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

  useEffect(() => {
    if (isStripeOnboarded) {
      loadProducts();
    }
  }, [isStripeOnboarded, loadProducts]);

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
      // Clean URL
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

  const handleSaveProduct = async () => {
    if (!title.trim()) { toast.error("Title is required"); return; }
    if (!priceDollars || parseFloat(priceDollars) <= 0) { toast.error("Enter a valid price"); return; }
    if (!selectedFile) { toast.error("Upload a file for your product"); return; }

    setSaving(true);
    try {
      const priceCents = Math.round(parseFloat(priceDollars) * 100);
      const productId = crypto.randomUUID();

      // Upload product file to creator-files bucket
      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${userId}/${productId}/product.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from("creator-files")
        .upload(filePath, selectedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Upload cover image if provided
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

      // Insert product record
      const { error: insertError } = await supabase
        .from("creator_products")
        .insert({
          id: productId,
          creator_id: profileId,
          title: title.trim(),
          description: description.trim() || null,
          price_cents: priceCents,
          product_type: productType,
          file_url: filePath,
          cover_image_url: coverImageUrl,
        } as any);

      if (insertError) throw insertError;

      toast.success("Product created!");
      setTitle("");
      setDescription("");
      setPriceDollars("");
      setProductType("pdf");
      setSelectedFile(null);
      setCoverFile(null);
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

    // Delete file from storage
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
          </CardContent>
        </Card>
      </div>
    );
  }

  // Onboarded — show product management
  return (
    <div className="space-y-6">
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
              <Label>Description (optional)</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What's included..." rows={3} />
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
            </div>
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
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
