import { ChevronRight } from "lucide-react";
import { getPlatformConfig } from "@/lib/platformLinks";
import type { HubPreviewData } from "@/types/cardShowcase";

interface HomepageHubPreviewProps {
  preview: HubPreviewData;
  businessName: string;
}

export default function HomepageHubPreview({ preview, businessName }: HomepageHubPreviewProps) {
  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-hub-preview text-hub-preview-foreground" aria-label={`${businessName} hub preview`}>
      <div className="flex min-h-0 flex-1 flex-col px-[9%] pt-[15%]">
        <div className="flex min-h-[34%] flex-col items-center justify-end text-center">
          {preview.logoUrl ? (
            <img
              src={preview.logoUrl}
              alt={`${preview.name} logo`}
              className="max-h-[52%] w-[48%] object-contain"
              loading="eager"
              decoding="async"
            />
          ) : (
            <div className="grid aspect-square w-[34%] place-items-center rounded-full bg-primary/10 text-[clamp(18px,8cqw,34px)] font-bold text-primary">
              {preview.name.slice(0, 1)}
            </div>
          )}
        </div>

        <div className="mt-[5%] text-center">
          <p className="line-clamp-2 text-[clamp(9px,4.4cqw,17px)] font-bold leading-tight">{preview.name}</p>
          {preview.description && <p className="mx-auto mt-[2%] line-clamp-2 max-w-[94%] text-[clamp(6px,2.7cqw,11px)] leading-snug text-hub-preview-muted">{preview.description}</p>}
        </div>

        <div className="mt-[7%] flex flex-col gap-[3.2%]">
          {preview.actions.slice(0, 4).map((action) => {
            const platform = getPlatformConfig(action.type);
            const Icon = platform?.icon;
            return (
              <div
                key={action.id}
                aria-hidden="true"
                className="flex min-h-[clamp(28px,14cqw,54px)] items-center rounded-[clamp(7px,3.5cqw,14px)] border border-hub-preview-border bg-hub-preview px-[5%] shadow-hub-preview"
              >
                <span className="grid aspect-square w-[11%] shrink-0 place-items-center rounded-full bg-primary/10 text-primary">
                  {Icon && <Icon className="h-[56%] w-[56%]" aria-hidden="true" />}
                </span>
                <span className="min-w-0 flex-1 px-[4%] text-left text-[clamp(6px,3cqw,12px)] font-semibold leading-tight text-hub-preview-foreground">
                  {action.label}
                </span>
                <ChevronRight className="h-[9%] min-h-2.5 w-[9%] min-w-2.5 text-hub-preview-muted" aria-hidden="true" />
              </div>
            );
          })}
        </div>
      </div>

      <div className="pb-[7%] pt-[4%] text-center text-[clamp(5px,2.4cqw,10px)] font-medium text-hub-preview-muted">
        Powered by <span className="font-bold text-primary">TapAway</span>
      </div>
    </div>
  );
}