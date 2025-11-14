import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, Loader2, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface MenuImageUploadProps {
  restaurantId: string;
  onMenuParsed: (menuData: any) => void;
}

export const MenuImageUpload = ({ restaurantId, onMenuParsed }: MenuImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [imageUrl, setImageUrl] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file size (max 20MB)
    if (file.size > 20971520) {
      toast.error("Image must be less than 20MB");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please upload an image file");
      return;
    }

    setUploading(true);

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}/menu-${Date.now()}.${fileExt}`;
      
      const { error: uploadError, data: uploadData } = await supabase.storage
        .from('restaurant-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) {
        console.error('❌ STORAGE RLS ERROR - Menu Image Upload Failed', {
          errorMessage: uploadError.message,
          table: 'storage.objects',
          bucket: 'restaurant-logos',
          attemptedPath: fileName,
          restaurantId: restaurantId,
          fullError: JSON.stringify(uploadError, null, 2)
        });
        // RLS currently blocking inserts on storage.objects for bucket 'restaurant-logos'
        throw uploadError;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(fileName);

      const publicUrl = urlData.publicUrl;
      setImageUrl(publicUrl);

      // Update restaurant with menu image URL
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ menu_image_url: publicUrl } as any)
        .eq('id', restaurantId);

      if (updateError) {
        console.error('Update error:', updateError);
        throw updateError;
      }

      toast.success("Image uploaded successfully!");
      
      // Start parsing
      setParsing(true);
      parseMenuImage(publicUrl);
    } catch (error: any) {
      console.error('❌ Upload error:', error);
      toast.error(error.message || "Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  const parseMenuImage = async (url: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('parse-menu-image', {
        body: { imageUrl: url }
      });

      if (error) throw error;

      if (data?.success && data?.menu) {
        toast.success("Menu parsed successfully! Review and edit below.");
        onMenuParsed(data.menu);
      } else {
        throw new Error('No menu data returned');
      }
    } catch (error: any) {
      console.error('Parse error:', error);
      
      if (error.message?.includes('Rate limit')) {
        toast.error("AI rate limit reached. Please try again in a few minutes.");
      } else if (error.message?.includes('credits')) {
        toast.error("AI credits exhausted. Please contact support.");
      } else {
        toast.error("Failed to parse menu. You can still add items manually.");
      }
    } finally {
      setParsing(false);
    }
  };

  return (
    <Card className="p-6 border-2 border-dashed">
      <div className="flex flex-col items-center gap-4">
        <div className="rounded-full bg-primary/10 p-4">
          {uploading || parsing ? (
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
          ) : imageUrl ? (
            <CheckCircle2 className="h-8 w-8 text-primary" />
          ) : (
            <Upload className="h-8 w-8 text-primary" />
          )}
        </div>

        <div className="text-center">
          <h3 className="text-lg font-semibold mb-1">
            {uploading ? "Uploading..." : parsing ? "Parsing menu with AI..." : "Upload Menu Image"}
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            {parsing 
              ? "Our AI is extracting sections, items, and prices from your menu..."
              : "Upload a photo of your menu and we'll automatically extract all items"}
          </p>
        </div>

        {!imageUrl && (
          <div>
            <input
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              disabled={uploading || parsing}
              className="hidden"
              id="menu-image-upload"
            />
            <label htmlFor="menu-image-upload">
              <Button asChild disabled={uploading || parsing}>
                <span>
                  {uploading ? "Uploading..." : "Choose Image"}
                </span>
              </Button>
            </label>
          </div>
        )}

        {imageUrl && !parsing && (
          <div className="text-center">
            <img src={imageUrl} alt="Uploaded menu" className="max-w-full h-auto max-h-64 rounded-lg mb-3" />
            <label htmlFor="menu-image-upload-retry">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                disabled={uploading || parsing}
                className="hidden"
                id="menu-image-upload-retry"
              />
              <Button variant="outline" size="sm" asChild>
                <span>Upload Different Image</span>
              </Button>
            </label>
          </div>
        )}
      </div>
    </Card>
  );
};
