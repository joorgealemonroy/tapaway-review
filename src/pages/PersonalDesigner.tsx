import { track } from "@/lib/analytics";
import { useEffect, useRef, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  ImagePlus,
  Plus,
  Undo2,
} from "lucide-react";
import { LandingNav } from "@/components/landing/LandingNav";
import {
  HelpLink,
  StorefrontFooter,
} from "@/components/landing/StorefrontSections";
import { DesignerControls } from "@/components/card-designer/DesignerControls";
import { CardDestinations } from "@/components/card-designer/CardDestinations";
import { CardCanvas } from "@/components/card-designer/CardCanvas";
import {
  cardSize,
  reorientCard,
  DESIGN_TEMPLATES,
  cardDestination,
  checkDesign,
  loadCardDraft,
  newDraft,
  readDesignImage,
  saveCardDraft,
  templateCard,
  type CardDraft,
  type Layer,
} from "@/lib/cardDesign";
import { createCardPdf, downloadCardPdf } from "@/lib/cardPrint";
import { usePersonalCardCatalog } from "@/lib/personalCardCatalog";
import { callFunction } from "@/lib/paymentFirst";
import "@/components/card-designer/designer.css";

export default function PersonalDesigner() {
  const [params] = useSearchParams();
  const [draft, setDraft] = useState<CardDraft>(() =>
    newDraft(params.get("template") || "network"),
  );
  const [ready, setReady] = useState(false),
    [saveStatus, setSaveStatus] = useState("");
  const [card, setCard] = useState(0),
    [side, setSide] = useState<"front" | "back">("front");
  const [selected, setSelected] = useState<string | null>(null);
  const [category, setCategory] = useState("Networking");
  const [stage, setStage] = useState<"design" | "review">("design");
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState(false),
    [guides, setGuides] = useState(true);
  const history = useRef<CardDraft[]>([]),
    dragBefore = useRef<CardDraft | null>(null);
  const upload = useRef<HTMLInputElement>(null);
  const { catalog, loading, retry } = usePersonalCardCatalog();
  const current = draft.cards[card],
    face = current[side];
  const dimensions = cardSize(current);
  const issues = checkDesign(draft),
    errors = issues.filter((x) => x.level === "error");
  const visibleIssues =
    stage === "review"
      ? issues
      : issues.filter(
          (x) =>
            !x.message.includes("add a valid destination") &&
            !x.message.includes("Add the name"),
        );
  useEffect(() => {
    let active = true;
    loadCardDraft()
      .then((saved) => {
        if (active && saved) setDraft(saved);
      })
      .catch(() => {
        if (active)
          setSaveStatus("Keep this page open; local saving is unavailable.");
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    if (!ready) return;
    setConfirmed(false);
    const timer = window.setTimeout(() => {
      saveCardDraft(draft)
        .then(() => setSaveStatus("Saved on this device"))
        .catch(() =>
          setSaveStatus("Couldn't save on this device. Keep this page open."),
        );
    }, 500);
    return () => clearTimeout(timer);
  }, [draft, ready]);
  const change = (next: CardDraft, record = true) => {
    if (record) {
      history.current = [...history.current.slice(-11), draft];
    }
    setDraft(next);
    setError("");
  };
  const updateLayer = (patch: Partial<Layer>) =>
    change({
      ...draft,
      cards: draft.cards.map((c, i) =>
        i !== card
          ? c
          : {
              ...c,
              [side]: {
                ...c[side],
                layers: c[side].layers.map((l) =>
                  l.id === selected ? { ...l, ...patch } : l,
                ),
              },
            },
      ) as CardDraft["cards"],
    });
  const updateCard = (patch: Partial<CardDraft["cards"][number]>) =>
    change({
      ...draft,
      cards: draft.cards.map((c, i) =>
        i === card ? { ...c, ...patch } : c,
      ) as CardDraft["cards"],
    });
  const addLayer = (newLayer: Layer) => {
    if (face.layers.length >= 24) {
      setError("Keep each side to 24 elements or fewer.");
      return;
    }
    updateCard({ [side]: { ...face, layers: [...face.layers, newLayer] } });
    setSelected(newLayer.id);
  };
  const transform = (
    id: string,
    patch: Partial<Layer> | Partial<typeof current.qr>,
    commit: boolean,
  ) => {
    if (!dragBefore.current) dragBefore.current = draft;
    if (commit) {
      history.current = [...history.current.slice(-11), dragBefore.current];
      dragBefore.current = null;
    }
    change(
      {
        ...draft,
        cards: draft.cards.map((c, i) =>
          i !== card
            ? c
            : id === "__qr"
              ? { ...c, qr: { ...c.qr, ...patch } }
              : {
                  ...c,
                  [side]: {
                    ...c[side],
                    layers: c[side].layers.map((l) =>
                      l.id === id ? { ...l, ...patch } : l,
                    ),
                  },
                },
        ) as CardDraft["cards"],
      },
      false,
    );
  };
  const move = (id: string, x: number, y: number, commit: boolean) =>
    transform(id, { x, y }, commit);
  const resize = (id: string, scale: number, commit: boolean) => {
    if (id === "__qr") {
      transform(
        id,
        {
          size: Math.max(
            22,
            Math.min(
              dimensions.width - current.qr.x - 3,
              dimensions.height - current.qr.y - 3,
              current.qr.size * scale,
            ),
          ),
        },
        commit,
      );
      return;
    }
    const element = face.layers.find((l) => l.id === id);
    if (!element) return;
    transform(
      id,
      element.kind === "text"
        ? { size: Math.max(2.5, Math.min(30, element.size * scale)) }
        : {
            width: Math.max(2, element.width * scale),
            height: Math.max(2, element.height * scale),
          },
      commit,
    );
  };
  const exportPdf = async () => {
    setBusy(true);
    setError("");
    try {
      downloadCardPdf(await createCardPdf(draft));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't export this design.");
    } finally {
      setBusy(false);
    }
  };
  const checkout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !confirmed ||
      errors.length ||
      busy ||
      !catalog?.available ||
      (draft.hosted && !catalog.hubAvailable)
    )
      return;
    setBusy(true);
    setError("");
    try {
      const bytes = await createCardPdf(draft);
      let binary = "";
      for (let i = 0; i < bytes.length; i += 16384)
        binary += String.fromCharCode(...bytes.subarray(i, i + 16384));
      const pdf = btoa(binary);
      if (JSON.stringify(draft).length + pdf.length > 18000000)
        throw new Error(
          "Your design is too large to send. Use fewer or smaller image files, keeping print quality at 300 dpi.",
        );
      const { ok, data } = await callFunction<{ url?: string; error?: string }>(
        "personal-card-order",
        { action: "create", draft, pdf, returnOrigin: location.origin },
      );
      if (!ok || !data.url)
        throw new Error(
          data.error ||
            "We couldn't open checkout. Your design is saved; please try again.",
        );
      await saveCardDraft(draft).catch(() => {});
      track("stripe_checkout_started", {
        hubKind: "site",
        props: { audience: "personal", hosted: draft.hosted },
      });
      window.location.assign(data.url);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Checkout is unavailable. Please try again.",
      );
      setBusy(false);
    }
  };
  return (
    <div className="storefront cd-page">
      <Helmet>
        <title>Design your two custom cards | TapAway</title>
        <meta
          name="description"
          content="Design both sides of two NFC and QR cards. $39 once, free US shipping. Optional personal hub hosting."
        />
      </Helmet>
      <LandingNav />
      <main className="sf-container cd-main" id="main-content">
        <Link className="sf-text-link" to="/personal">
          <ArrowLeft className="h-4 w-4" />
          Personal cards
        </Link>
        <div className="cd-heading">
          <div>
            <p className="sf-eyebrow">Two cards. Entirely you.</p>
            <h1>
              {stage === "design" ? "Make your connection." : "One last look."}
            </h1>
            <p>
              {stage === "design"
                ? "Start with a template or make something from scratch. Design both sides of both cards."
                : "Check your artwork and links, then enter shipping and payment once."}
            </p>
          </div>
          <div className="cd-price">
            <strong>$39</strong>
            <span>two cards · free US shipping</span>
            <small>One-time purchase</small>
          </div>
        </div>
        {params.has("canceled") && (
          <p className="sf-status">
            Checkout wasn't completed. Your design is here so you can keep
            editing.
          </p>
        )}
        {!ready ? (
          <p role="status">Loading your design…</p>
        ) : (
          <fieldset disabled={busy} className="cd-workspace">
            {stage === "design" ? (
              <>
                <section
                  className="cd-template-picker"
                  aria-label="Design templates"
                >
                  <div className="cd-template-heading">
                    <h2>Pick a vibe. Make it yours.</h2>
                    <p>Every word, color, and photo is yours to change.</p>
                  </div>
                  <div
                    className="cd-template-categories"
                    aria-label="Template categories"
                  >
                    {[...new Set(DESIGN_TEMPLATES.map((t) => t.category))].map(
                      (value) => (
                        <button
                          key={value}
                          aria-pressed={category === value}
                          onClick={() => setCategory(value)}
                        >
                          {value}
                        </button>
                      ),
                    )}
                  </div>
                  <div className="cd-template-list">
                    {DESIGN_TEMPLATES.filter(
                      (t) => t.category === category,
                    ).map((t) => {
                      const sample = templateCard(
                        t.id,
                        current.orientation || "landscape",
                      );
                      return (
                        <button
                          key={t.id}
                          aria-label={`Use ${t.name} template`}
                          onClick={() => {
                            updateCard({
                              ...sample,
                              destination: current.destination,
                            });
                            setSelected(null);
                          }}
                        >
                          <div className="cd-template-proof">
                            <CardCanvas
                              draft={{ ...draft, cards: [sample, sample] }}
                              card={0}
                              side="front"
                            />
                          </div>
                          <strong>{t.name}</strong>
                          <small>{t.category}</small>
                        </button>
                      );
                    })}
                  </div>
                </section>
                <div className="cd-editor-grid">
                  <section className="cd-stage">
                    <div className="cd-toolbar">
                      <div className="cd-tabs">
                        {[0, 1].map((i) => (
                          <button
                            key={i}
                            aria-pressed={card === i}
                            onClick={() => {
                              setCard(i);
                              setSelected(null);
                            }}
                          >
                            Card {i + 1}
                          </button>
                        ))}
                      </div>
                      <div className="cd-tabs">
                        {(["front", "back"] as const).map((value) => (
                          <button
                            key={value}
                            aria-pressed={side === value}
                            onClick={() => {
                              setSide(value);
                              setSelected(value === "back" ? "__qr" : null);
                            }}
                          >
                            {value === "front" ? "Front" : "Back"}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div
                      className="cd-orientation"
                      role="group"
                      aria-label="Card orientation"
                    >
                      {(["landscape", "portrait"] as const).map((value) => (
                        <button
                          key={value}
                          aria-pressed={
                            (current.orientation || "landscape") === value
                          }
                          onClick={() => {
                            updateCard(reorientCard(current, value));
                            setSelected(null);
                          }}
                        >
                          <span className={`cd-orientation-icon ${value}`} />
                          {value === "landscape" ? "Sideways" : "Standing up"}
                        </button>
                      ))}
                      <span>Same card. Your point of view.</span>
                    </div>
                    <div className="cd-canvas-wrap">
                      <CardCanvas
                        draft={draft}
                        card={card}
                        side={side}
                        guides={guides}
                        selected={selected}
                        onSelect={setSelected}
                        onMove={move}
                        onResize={resize}
                      />
                    </div>
                    <p className="cd-canvas-help">
                      Click to edit, drag to move, grab a corner to resize.
                      Center snapping helps you line things up. Dashed guides
                      won't print.
                    </p>
                    <div className="cd-toolbar">
                      <label className="cd-inline">
                        <input
                          type="checkbox"
                          checked={guides}
                          onChange={(e) => setGuides(e.target.checked)}
                        />
                        Show safe area
                      </label>
                      <button
                        className="sf-text-link"
                        disabled={!history.current.length}
                        onClick={() => {
                          const previous = history.current.pop();
                          if (previous) {
                            setDraft(previous);
                            setSelected(null);
                          }
                        }}
                      >
                        <Undo2 className="h-4 w-4" />
                        Undo
                      </button>
                      <span className="cd-save" role="status">
                        {saveStatus}
                      </span>
                    </div>
                    <div className="cd-add-tools">
                      <button
                        className="sf-button secondary"
                        onClick={() =>
                          addLayer({
                            id: crypto.randomUUID(),
                            kind: "text",
                            text: "Your text here",
                            x: 7,
                            y: 8,
                            size: 4,
                            font: "sans",
                            color: "#111111",
                            bold: true,
                          })
                        }
                      >
                        <Plus />
                        Add text
                      </button>
                      <button
                        className="sf-button secondary"
                        onClick={() => upload.current?.click()}
                      >
                        <ImagePlus />
                        Add an image
                      </button>
                      <input
                        ref={upload}
                        type="file"
                        className="sr-only"
                        accept="image/png,image/jpeg,image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            addLayer(await readDesignImage(file));
                          } catch (err) {
                            setError(
                              err instanceof Error
                                ? err.message
                                : "Couldn't open that image.",
                            );
                          }
                          e.target.value = "";
                        }}
                      />
                    </div>
                    <p className="sf-price-note">
                      Your phone opens the destination below by tap or QR. The
                      QR on the back updates automatically.
                    </p>
                  </section>
                  <DesignerControls
                    card={current}
                    side={side}
                    selected={selected}
                    onSelect={setSelected}
                    updateLayer={updateLayer}
                    updateCard={updateCard}
                    otherCard={card === 0 ? 2 : 1}
                    copySide={() => {
                      const target = card === 0 ? 1 : 0;
                      const fitted = reorientCard(
                        current,
                        draft.cards[target].orientation || "landscape",
                      );
                      change({
                        ...draft,
                        cards: draft.cards.map((c, i) =>
                          i === target
                            ? {
                                ...c,
                                [side]: structuredClone(fitted[side]),
                                ...(side === "back"
                                  ? { qr: { ...fitted.qr } }
                                  : {}),
                              }
                            : c,
                        ) as CardDraft["cards"],
                      });
                    }}
                  />
                </div>
                <div className="cd-inspiration-bar">
                  <span>A little extra personality?</span>
                  {[
                    "✦",
                    "♡",
                    "☺",
                    "BOO!",
                    "Good vibes.",
                    "Your next favorite person.",
                  ].map((text) => (
                    <button
                      key={text}
                      onClick={() =>
                        addLayer({
                          id: crypto.randomUUID(),
                          kind: "text",
                          x: 7,
                          y: 10,
                          text,
                          size: text.length < 5 ? 6 : 3.2,
                          color:
                            face.background === "#ffffff"
                              ? "#182b23"
                              : "#b13947",
                          font: "sans",
                          bold: true,
                        })
                      }
                    >
                      {text}
                    </button>
                  ))}
                </div>
                <CardDestinations draft={draft} onChange={change} />
              </>
            ) : (
              <section className="cd-review">
                <button
                  className="sf-text-link"
                  onClick={() => setStage("design")}
                >
                  <ArrowLeft className="h-4 w-4" />
                  Keep editing
                </button>
                <div className="cd-proof-grid">
                  {draft.cards.flatMap((_, i) =>
                    (["front", "back"] as const).map((face) => (
                      <article key={`${i}-${face}`}>
                        <h2>
                          Card {i + 1} · {face}
                        </h2>
                        <CardCanvas draft={draft} card={i} side={face} />
                        <p>
                          {face === "back"
                            ? draft.hosted
                              ? "Opens your TapAway hub"
                              : cardDestination(draft, i)
                            : "Your custom artwork"}
                        </p>
                      </article>
                    )),
                  )}
                </div>
              </section>
            )}
            {visibleIssues.length > 0 && (
              <section className="cd-preflight" aria-label="Artwork checks">
                <h2>
                  {errors.length
                    ? "A few things to fix before printing"
                    : "A quick print check"}
                </h2>
                <ul>
                  {visibleIssues.map((issue) => (
                    <li key={issue.message} className={issue.level}>
                      {issue.level === "error" ? "Fix: " : "Note: "}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {error && (
              <p role="alert" className="sf-status">
                {error}
              </p>
            )}
            {stage === "design" ? (
              <div className="cd-bottom">
                <p>
                  <strong>Two custom cards · $39</strong>
                  <span>
                    Free US shipping
                    {draft.hosted
                      ? " · Optional hosting +$5/month"
                      : " · No subscription needed"}
                  </span>
                </p>
                <button
                  className="sf-button"
                  onClick={() => {
                    setStage("review");
                    setSelected(null);
                    window.scrollTo({ top: 0, behavior: "smooth" });
                  }}
                >
                  Review my cards <ArrowRight />
                </button>
              </div>
            ) : (
              <form className="cd-checkout" onSubmit={checkout}>
                <div>
                  <h2>Ready to make them real?</h2>
                  <p>
                    We check your artwork before printing. Screen colors may
                    look slightly different on a printed card.
                  </p>
                  <button
                    type="button"
                    className="sf-text-link"
                    disabled={errors.length > 0 || busy}
                    onClick={exportPdf}
                  >
                    <Download className="h-4 w-4" />
                    Download print PDF
                  </button>
                  <label className="cd-confirm">
                    <input
                      type="checkbox"
                      checked={confirmed}
                      onChange={(e) => setConfirmed(e.target.checked)}
                      required
                    />
                    I've checked both cards, spelling, destination links, and
                    the print notes above. I have permission to use my uploaded
                    artwork.
                  </label>
                </div>
                <aside>
                  <div className="co-row">
                    <span>2 custom cards</span>
                    <strong>$39 once</strong>
                  </div>
                  <div className="co-row">
                    <span>US shipping</span>
                    <strong>Free</strong>
                  </div>
                  {draft.hosted && (
                    <div className="co-row">
                      <span>Personal hub</span>
                      <strong>$5/month</strong>
                    </div>
                  )}
                  <div className="co-row co-total">
                    <span>Due today</span>
                    <strong>{draft.hosted ? "$44" : "$39"}</strong>
                  </div>
                  {draft.hosted && (
                    <p className="sf-price-note">
                      Then $5/month until canceled. Your cards are a one-time
                      purchase.
                    </p>
                  )}
                  {loading ? (
                    <p role="status">Checking checkout availability…</p>
                  ) : (
                    (!catalog?.available ||
                      (draft.hosted && !catalog.hubAvailable)) && (
                      <p className="sf-status">
                        Checkout is temporarily unavailable. Your design is
                        saved on this device.{" "}
                        <button type="button" onClick={retry}>
                          Try again
                        </button>{" "}
                        or <Link to="/support#question">ask our team</Link>.
                      </p>
                    )
                  )}
                  <button
                    className="sf-button"
                    type="submit"
                    disabled={
                      busy ||
                      !confirmed ||
                      errors.length > 0 ||
                      !catalog?.available ||
                      (draft.hosted && !catalog.hubAvailable)
                    }
                  >
                    {busy ? "Preparing your order…" : "Buy my two cards"}
                    <Check />
                  </button>
                  <p className="sf-price-note">
                    Secure Stripe checkout. By ordering you agree to our{" "}
                    <Link to="/terms">Terms</Link>,{" "}
                    <Link to="/privacy">Privacy Policy</Link> and{" "}
                    <Link to="/refund">Refund Policy</Link>.
                  </p>
                </aside>
              </form>
            )}
          </fieldset>
        )}
      </main>
      <StorefrontFooter />
      <HelpLink />
    </div>
  );
}
