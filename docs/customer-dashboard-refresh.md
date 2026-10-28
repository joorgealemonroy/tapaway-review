# Customer dashboard review

Review-only frontend changes. No publication, customer messages, charges, billing mutations or backend deployments in this pass.

- Fulfillment demo queue uses explicit light text/surfaces, a private authenticated preview of the saved hub, and a review gate before approval. Failed previews remain blocked. The existing approval/commission handler is unchanged.
- Personal print queue text and borders are readable on the warm light surface.
- Customer dashboards have section explanations and an inline Ask TapAway helper. Reviewed local guidance routes to allowlisted tabs; broader product questions reuse the existing five-question AI endpoint. It does not fetch private account data, edit hubs or send messages. Human email support remains available.
- Modern customer dashboard has larger touch targets, readable tab cards and responsive desktop navigation. Legacy business dashboard receives the helper and light-only appearance.
- Personal and restaurant public hubs no longer use dark mode. Legacy dark/custom gradient page backgrounds render on a readable warm light surface without rewriting stored customer branding. Preview uses the same light background resolver.
- Design offers seven light palettes. New logos upload whole, render using the existing uncropped logo header, use versioned image objects, and offer restoration of the previous logo during the editing session. Cover images still use the crop preview/confirmation flow. Existing stored artwork is not deleted.
- Nine SMS drafts cover reviews, restaurants, cafes, appointments, auto services, returning customers and holidays. Selection fills the existing composer and brings it into view, without sending. Existing audience, limits and send confirmation remain in place.

Validation: TypeScript and production build pass. Five nontransactional browser scenarios pass: mobile design/helper/SMS; private preview approval gate; admin mobile widths; business Card Club regression; personal billing regression. External requests are mocked or blocked. Screenshots inspected at mobile and desktop sizes. Actual SMS delivery and live authenticated production approval were deliberately not exercised.

Limits: AI may be unavailable or reach its existing quota, with a visible fallback. It does not know customer-specific payment/order status. Logo restoration is available in the current editing session; the original stored file remains intact. The private preview uses the existing preview renderer rather than exposing unpublished hubs through public URLs.
