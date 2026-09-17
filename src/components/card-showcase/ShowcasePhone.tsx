import HomepageHubPreview from "./HomepageHubPreview";
import type { CardDesign } from "@/types/cardShowcase";
import phoneFrameAsset from "@/assets/tapaway-phone-frame.png.asset.json";

interface ShowcasePhoneProps {
  design: CardDesign;
}

export default function ShowcasePhone({ design }: ShowcasePhoneProps) {
  if (!design.hubPreview || !design.hubUrl) return null;

  return (
    <a
      href={design.hubUrl}
      aria-label={`View ${design.businessName} live hub from hub preview`}
      className="showcase-phone group relative block shrink-0"
      target="_blank"
      rel="noreferrer"
    >
      <div className="relative h-full w-full">
        <div className="showcase-phone-screen absolute bottom-[2.7%] left-[7.5%] right-[7.5%] top-[2.6%] overflow-hidden bg-hub-preview [container-type:inline-size]">
          <HomepageHubPreview preview={design.hubPreview} businessName={design.businessName} />
        </div>
        <img src={phoneFrameAsset.url} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-10 h-full w-full select-none" />
      </div>
    </a>
  );
}