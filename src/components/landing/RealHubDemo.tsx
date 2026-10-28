import { useEffect, useRef, useState } from "react";
import { ArrowUpRight } from "lucide-react";

const CUSTOMER_HUBS = [
  {
    category: "Restaurant",
    name: "Tutti Mangia Italian Chophouse",
    slug: "tuttimangiaitalianchophouse",
    copy: "A real restaurant hub. Explore the links its team shares with guests.",
  },
  {
    category: "Cakery & coffee",
    name: "Sugar Bloom Cakery",
    slug: "sugarbloomcakery",
    copy: "From the counter to a customer's phone. See Sugar Bloom's actual hub.",
  },
  {
    category: "Barber studio",
    name: "Space Studios",
    slug: "spacestudios",
    copy: "A hub for the next appointment, the next follow, and the next connection.",
  },
  {
    category: "Car wraps",
    name: "Reborn Wraps",
    slug: "rebornwraps",
    copy: "See how a real automotive business brings its online presence together.",
  },
  {
    category: "Julian",
    name: "Julian",
    slug: "julian",
    copy: "A personal hub can bring your work, socials, and contact links together.",
  },
  {
    category: "Denzel",
    name: "Denzel",
    slug: "denzel",
    copy: "Your own look. Your own links. This is Denzel's actual TapAway hub.",
  },
];

export function RealHubDemo({ personal = false }: { personal?: boolean }) {
  const hubs = personal ? CUSTOMER_HUBS.slice(4) : CUSTOMER_HUBS;
  const [selected, setSelected] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [scale, setScale] = useState(0.69);
  const screen = useRef<HTMLDivElement>(null);
  const hub = hubs[selected];
  useEffect(() => {
    const node = screen.current;
    if (!node) return;
    const observer = new ResizeObserver(([entry]) =>
      setScale(entry.contentRect.width / 393),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className="sf-section sf-demo"
      id="examples"
      aria-labelledby="demo-title"
    >
      <div className="sf-container sf-demo-grid">
        <div>
          <p className="sf-eyebrow">Try the experience</p>
          <h2 id="demo-title" className="sf-title">
            Real people.
            <br />
            Real TapAway hubs.
          </h2>
          <p className="sf-copy mt-5">
            This is what opens when someone taps a card or scans its QR code.
            Choose a hub, then explore it on the phone.
          </p>
          <div className="sf-demo-options" aria-label="Choose a customer hub">
            {hubs.map((item, i) => (
              <button
                key={item.slug}
                aria-pressed={i === selected}
                onClick={() => {
                  setLoaded(false);
                  setSelected(i);
                }}
              >
                {item.category}
              </button>
            ))}
          </div>
          <div className="sf-demo-note" aria-live="polite">
            <h3>{hub.name}</h3>
            <p>{hub.copy}</p>
          </div>
          <a
            className="sf-text-link"
            href={`https://tapaway.co/${hub.slug}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open {hub.name}'s hub <ArrowUpRight className="h-4 w-4" />
          </a>
          <p className="sf-price-note mt-4">
            Live customer content. Links work just like they do on a phone. You
            can also open the hub in a new tab.
          </p>
        </div>
        <div className="sf-device-stage">
          <div
            className="sf-iphone"
            aria-label={`iPhone 16 shaped preview of ${hub.name}'s hub`}
          >
            <span className="sf-iphone-side left" aria-hidden="true" />
            <span className="sf-iphone-side right" aria-hidden="true" />
            <div className="sf-iphone-screen" ref={screen}>
              {!loaded && (
                <div className="sf-iphone-loading" role="status">
                  Opening {hub.name}…
                </div>
              )}
              <iframe
                key={hub.slug}
                src={`https://tapaway.co/${hub.slug}`}
                title={`${hub.name} live TapAway hub`}
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms"
                onLoad={() => setLoaded(true)}
                style={{
                  width: 393,
                  height: 852,
                  transform: `scale(${scale})`,
                  opacity: loaded ? 1 : 0,
                }}
              />
              <div className="sf-dynamic-island" aria-hidden="true">
                <span />
              </div>
              <div className="sf-home-indicator" aria-hidden="true" />
            </div>
          </div>
          <p className="sf-price-note text-center mt-5">
            Tap or scan. No app needed.
          </p>
        </div>
      </div>
    </section>
  );
}
