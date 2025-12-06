import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface AvLogoUploadProps {
  restaurantId: string;
  currentLogoUrl: string | null;
  onUpdate: () => void;
}

export const AvLogoUpload = ({ restaurantId, currentLogoUrl, onUpdate }: AvLogoUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const handleRemoveLogo = async () => {
    try {
      setRemoving(true);
      
      const { error } = await supabase
        .from('restaurants')
        .update({ logo_url: null })
        .eq('id', restaurantId);

      if (error) throw error;

      toast.success('Logo removed successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(`Failed to remove logo: ${error.message}`);
    } finally {
      setRemoving(false);
    }
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${restaurantId}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('restaurant-logos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('restaurant-logos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ logo_url: publicUrl })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      toast.success('Logo updated successfully');
      onUpdate();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label>Current Logo</Label>
        {currentLogoUrl ? (
          <div className="mt-2 space-y-2">
            <img src={currentLogoUrl} alt="Logo" className="w-32 h-32 object-cover rounded-lg" />
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleRemoveLogo}
              disabled={removing}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              {removing ? 'Removing...' : 'Remove Logo'}
            </Button>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground mt-2">No logo uploaded</p>
        )}
      </div>
      
      <div>
        <Label htmlFor="logo-upload">Upload New Logo</Label>
        <div className="flex gap-2 mt-2">
          <Input
            id="logo-upload"
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
          <Button disabled={uploading} size="icon">
            <Upload className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};