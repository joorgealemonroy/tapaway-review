/** Owner-supplied product photos. Add future photos here to enable the gallery. */
export const PERSONAL_CARD_PHOTOS = [
  {
    src: "/product-photos/personal-networking-and-meme-cards-1024.webp",
    srcSet: [1024]
      .map(
        (w) =>
          `/product-photos/personal-networking-and-meme-cards-${w}.webp ${w}w`,
      )
      .join(", "),
    alt: "Real TapAway cards: Jorge Monroy networking card and John Pork meme card",
    caption: "One for your connections. One for your sense of humor.",
  },
];
