import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Eye, ArrowLeft } from "lucide-react";

interface AdminViewBannerProps {
  name: string;
  backTo: string;
}

export const AdminViewBanner = ({ name, backTo }: AdminViewBannerProps) => {
  const navigate = useNavigate();

  return (
    <div className="sticky top-0 z-[60] bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Eye className="h-4 w-4" />
        <span>Viewing as {name}</span>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="bg-amber-600/20 border-amber-700 text-amber-950 hover:bg-amber-600/40 h-7 text-xs"
        onClick={() => navigate(backTo)}
      >
        <ArrowLeft className="h-3 w-3 mr-1" />
        Back to Admin
      </Button>
    </div>
  );
};
