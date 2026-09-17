import HomepageHubPreview from "./HomepageHubPreview";
import type { CardDesign } from "@/types/cardShowcase";

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
      <div className="showcase-phone-rim relative h-full w-full overflow-hidden">
        <div className="showcase-phone-bezel absolute inset-[0.4%] overflow-hidden bg-phone-bezel">
          <div className="showcase-phone-screen absolute inset-[2%] overflow-hidden bg-hub-preview [container-type:inline-size]">
            <HomepageHubPreview preview={design.hubPreview} businessName={design.businessName} />
          </div>
          <span className="showcase-phone-notch absolute left-1/2 top-[1.4%] z-10 -translate-x-1/2 bg-phone-bezel" aria-hidden="true" />
        </div>
      </div>
    </a>
  );
}