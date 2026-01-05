import { Eye, Check, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface UnsavedChangesBarProps {
  hasPendingChanges: boolean;
  onPreview: () => void;
  onSave: () => void;
  onDiscard: () => void;
  saving?: boolean;
}

export const UnsavedChangesBar = ({
  hasPendingChanges,
  onPreview,
  onSave,
  onDiscard,
  saving = false,
}: UnsavedChangesBarProps) => {
  if (!hasPendingChanges) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 xl:left-auto xl:right-4 xl:bottom-4 xl:max-w-md animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-card border-t xl:border xl:rounded-xl shadow-lg p-4 mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium text-foreground">
            You have unsaved changes
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onPreview}
              className="flex-1 sm:flex-none h-10"
            >
              <Eye className="h-4 w-4 mr-1.5" />
              Preview
            </Button>
            <Button
              size="sm"
              onClick={onSave}
              disabled={saving}
              className="flex-1 sm:flex-none h-10"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
              ) : (
                <Check className="h-4 w-4 mr-1.5" />
              )}
              Save
            </Button>
            <button
              onClick={onDiscard}
              disabled={saving}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Discard changes"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
