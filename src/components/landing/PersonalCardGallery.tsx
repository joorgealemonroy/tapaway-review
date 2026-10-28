import { useState } from "react";
import { PERSONAL_CARD_PHOTOS } from "@/data/personalCardPhotos";

export function PersonalCardGallery() {
  const [selected, setSelected] = useState(0);
  const current = PERSONAL_CARD_PHOTOS[selected % PERSONAL_CARD_PHOTOS.length];
  return (
    <div className="sf-card-gallery">
      <figure key={current.src}>
        <img
          src={current.src}
          srcSet={current.srcSet}
          sizes="(max-width: 650px) 250px, (max-width: 900px) 290px, 360px"
          width="1024"
          height="1536"
          alt={current.alt}
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <figcaption>{current.caption}</figcaption>
      </figure>
      {PERSONAL_CARD_PHOTOS.length > 1 && (
        <div className="sf-gallery-controls" aria-label="Choose a card photo">
          {PERSONAL_CARD_PHOTOS.map((p, i) => (
            <button
              key={p.src}
              aria-label={`Show ${p.caption}`}
              aria-pressed={selected === i}
              onClick={() => setSelected(i)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
