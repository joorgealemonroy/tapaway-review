import { Check, Loader2, AlertTriangle, Undo2, RefreshCw, PencilLine } from "lucide-react";
import { Button } from "@/components/ui/button";

export type AutosaveStatus = "idle" | "editing" | "saving" | "saved" | "error";

interface Props {
  status: AutosaveStatus;
  onUndo?: () => void;
  onRetry?: () => void;
  canUndo?: boolean;
}

export const AutosaveStatusBar = ({ status, onUndo, onRetry, canUndo }: Props) => {
  if (status === "idle") return null;

  const config = (() => {
    switch (status) {
      case "editing":
        return {
          icon: <PencilLine className="h-3.5 w-3.5" />,
          label: "Editing…",
          tone: "bg-muted text-muted-foreground",
        };
      case "saving":
        return {
          icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
          label: "Saving…",
          tone: "bg-muted text-muted-foreground",
        };
      case "saved":
        return {
          icon: <Check className="h-3.5 w-3.5" />,
          label: "Saved",
          tone: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400",
        };
      case "error":
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: "Save failed",
          tone: "bg-destructive/15 text-destructive",
        };
    }
  })();

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-40 xl:left-auto xl:right-4 xl:translate-x-0 animate-in fade-in slide-in-from-bottom-2 duration-200 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2 bg-card border shadow-lg rounded-full pl-3 pr-1 py-1">
        <div className={`flex items-center gap-1.5 text-xs font-medium rounded-full px-2 py-1 ${config.tone}`}>
          {config.icon}
          <span>{config.label}</span>
        </div>

        {status === "saved" && canUndo && onUndo && (
          <Button
            size="sm"
            variant="ghost"
            className="min-h-[44px] px-3 text-xs"
            onClick={onUndo}
          >
            <Undo2 className="h-3.5 w-3.5 mr-1" />
            Undo
          </Button>
        )}

        {status === "error" && onRetry && (
          <Button
            size="sm"
            variant="ghost"
            className="min-h-[44px] px-3 text-xs"
            onClick={onRetry}
          >
            <RefreshCw className="h-3.5 w-3.5 mr-1" />
            Retry
          </Button>
        )}
      </div>
    </div>
  );
};
