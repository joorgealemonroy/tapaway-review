export const PRODUCT_PHOTOS = {
  business: {
    name: "business-cards-in-hands",
    alt: "Hands holding custom TapAway cards for Fish Hook Seafood and Las Islas",
  },
  personal: {
    name: "personal-networking-and-meme-cards",
    alt: "Real TapAway cards: Jorge Monroy networking card and a John Pork meme card",
  },
};
export function ProductPhoto({
  kind,
  hero = false,
}: {
  kind: keyof typeof PRODUCT_PHOTOS;
  hero?: boolean;
}) {
  const photo = PRODUCT_PHOTOS[kind];
  return (
    <img
      src={`/product-photos/${photo.name}-${kind === "personal" ? 1024 : 768}.webp`}
      srcSet={(kind === "personal" ? [1024] : [480, 768, 1024])
        .map((w) => `/product-photos/${photo.name}-${w}.webp ${w}w`)
        .join(", ")}
      sizes={
        hero
          ? "(max-width: 650px) 250px, (max-width: 900px) 290px, 360px"
          : "(max-width: 900px) 210px, 280px"
      }
      width="1024"
      height="1536"
      alt={photo.alt}
      loading="eager"
      decoding="async"
      fetchPriority={hero ? "high" : "auto"}
    />
  );
}
