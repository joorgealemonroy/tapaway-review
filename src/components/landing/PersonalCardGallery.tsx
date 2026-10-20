import { useState } from "react";
import { MiniCard } from "./StorefrontSections";
import { PERSONAL_CARD_PHOTOS } from "@/data/personalCardPhotos";
import { useCardShowcase } from "@/hooks/useCardShowcase";
export function PersonalCardGallery() {
  const { designs } = useCardShowcase();
  const [selected, setSelected] = useState(0);
  const existing = designs
    .filter(
      (d) =>
        d.hubKind === "personal" &&
        ["julian", "denzel"].includes(d.hubSlug || ""),
    )
    .map((d) => ({
      src: d.frontImageUrl,
      alt: `${d.businessName}'s custom TapAway card artwork`,
      caption: `${d.businessName}'s card design`,
    }));
  const photos = PERSONAL_CARD_PHOTOS.length ? PERSONAL_CARD_PHOTOS : existing;
  if (!photos.length)
    return (
      <div>
        <div
          className="sf-personal-stage"
          aria-label="Personal card design previews"
        >
          <MiniCard name="Good energy only." tone="pink" />
          <MiniCard name="Nice to meet you." tone="yellow" />
        </div>
        <p className="sf-price-note text-center">
          Design previews. Make both cards your own.
        </p>
      </div>
    );
  const current = photos[selected % photos.length];
  return (
    <div className="sf-card-gallery">
      <figure key={current.src}>
        <img src={current.src} alt={current.alt} />
        <figcaption>{current.caption}</figcaption>
      </figure>
      <div className="sf-gallery-controls" aria-label="Choose a card photo">
        {photos.map((p, i) => (
          <button
            key={p.src}
            aria-label={`Show ${p.caption}`}
            aria-pressed={selected % photos.length === i}
            onClick={() => setSelected(i)}
          />
        ))}
      </div>
    </div>
  );
}
