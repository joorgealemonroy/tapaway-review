import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { ArrowUpFromLine, Check, Copy, MoreHorizontal, MoreVertical, Plus, Smartphone } from "lucide-react";
import QRCode from "react-qr-code";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { hubSaveDevice, isEmbeddedBrowser, publicHubUrl, type HubSaveDevice } from "@/lib/hubSave";
import "./save-hub.css";

interface SaveHubProps { slug: string; name: string; logo?: string | null; }

/** Home-screen shortcuts work without an account, an app download or a cached hub. */
export function SaveHub({ slug, name, logo }: SaveHubProps) {
  const [open, setOpen] = useState(false);
  const [device, setDevice] = useState<HubSaveDevice>(() => hubSaveDevice(navigator.userAgent, navigator.maxTouchPoints));
  const [copied, setCopied] = useState(false);
  const [copyFailed, setCopyFailed] = useState(false);
  const [standalone, setStandalone] = useState(false);
  const embedded = isEmbeddedBrowser(navigator.userAgent) || (device === "iphone" && /CriOS|FxiOS|EdgiOS|OPiOS/.test(navigator.userAgent));
  const url = publicHubUrl(slug);
  const title = name.trim() || slug;

  useEffect(() => {
    const display = window.matchMedia("(display-mode: standalone)");
    const update = () => setStandalone(display.matches || (navigator as Navigator & { standalone?: boolean }).standalone === true);
    update();
    display.addEventListener("change", update);
    // Reuse the existing icon so Safari never chooses a competing generic icon.
    const icon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
    const oldHref = icon?.getAttribute("href");
    const oldSizes = icon?.getAttribute("sizes");
    if (icon && logo) { icon.href = logo; icon.removeAttribute("sizes"); }
    return () => {
      display.removeEventListener("change", update);
      if (icon && oldHref !== null && oldHref !== undefined) icon.setAttribute("href", oldHref);
      if (icon && oldSizes !== null && oldSizes !== undefined) icon.setAttribute("sizes", oldSizes);
    };
  }, [logo]);

  const copyLink = async () => {
    try { await navigator.clipboard.writeText(url); setCopied(true); setCopyFailed(false); }
    catch { setCopyFailed(true); }
  };

  return <>
    <Helmet>
      <meta name="apple-mobile-web-app-capable" content="yes" />
      <meta name="apple-mobile-web-app-title" content={title} />
      <meta name="apple-mobile-web-app-status-bar-style" content="default" />
      <meta name="mobile-web-app-capable" content="yes" />
    </Helmet>
    {!standalone && <button className="hub-save-trigger" onClick={() => { setCopied(false); setCopyFailed(false); setOpen(true); }} aria-label="Save this hub to your phone">
      <Smartphone size={16} aria-hidden="true" />
      <span>Save to Home Screen</span>
    </button>}
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="hub-save-dialog">
        <div className="hub-save-preview">
          {logo ? <img src={logo} alt="" /> : <Smartphone size={30} aria-hidden="true" />}
          <span>{title}</span>
        </div>
        <DialogTitle className="hub-save-title">Save this hub to your phone</DialogTitle>
        <DialogDescription className="hub-save-description">Add a shortcut to your Home Screen and come back with one tap. Free, with no account or App Store download.</DialogDescription>
        {device === "desktop" && <div className="hub-save-qr"><QRCode value={url} size={112} /><p>Scan with your phone’s camera, then tap <strong>Save to Home Screen</strong> at the bottom of the hub.</p></div>}
        <div className="hub-save-device" aria-label="Choose your phone">
          <button aria-pressed={device === "iphone"} onClick={() => setDevice("iphone")}>iPhone / iPad</button>
          <button aria-pressed={device === "android"} onClick={() => setDevice("android")}>Android</button>
        </div>
        {embedded && <p className="hub-save-browser-note">First open this page in {device === "android" ? "Chrome" : "Safari"} using this browser’s <MoreHorizontal size={16} aria-label="More" /> menu. Or copy the link below and paste it into {device === "android" ? "Chrome" : "Safari"}.</p>}
        {device === "iphone" && <ol className="hub-save-steps">
          <li><span>1</span><div><strong>Tap Safari’s Share button <ArrowUpFromLine size={18} aria-hidden="true" /></strong><p>It’s in the browser toolbar. If hidden, open the <MoreHorizontal size={17} aria-label="More" /> menu first.</p></div></li>
          <li><span>2</span><div><strong>Choose “Add to Home Screen” <Plus size={17} aria-hidden="true" /></strong><p>Scroll down in the Share menu to find it. If missing, tap “Edit Actions” to add it.</p></div></li>
          <li><span>3</span><div><strong>Tap “Add” to finish</strong><p>Keep “Open as Web App” on if shown. The hub’s icon will appear on your Home Screen.</p></div></li>
        </ol>}
        {device === "android" && <ol className="hub-save-steps">
          <li><span>1</span><div><strong>Open Chrome’s menu <MoreVertical size={18} aria-hidden="true" /></strong><p>Tap the three dots beside the address bar.</p></div></li>
          <li><span>2</span><div><strong>Tap “Add to Home screen”</strong><p>Your browser may call it “Install app” or offer “Create shortcut.”</p></div></li>
          <li><span>3</span><div><strong>Confirm “Add” or “Install”</strong><p>Next time, tap the hub’s icon on your Home Screen to open it.</p></div></li>
        </ol>}
        <button className="hub-save-copy" onClick={copyLink}>{copied ? <Check size={17} /> : <Copy size={17} />}{copied ? "Link copied" : "Copy hub link"}</button>
        {copyFailed && <label className="hub-save-manual">Press and hold this link to copy it:<input readOnly value={url} onFocus={e => e.currentTarget.select()} /></label>}
        <p className="hub-save-footnote">Your phone asks you to confirm the shortcut. Internet is needed to open the hub.</p>
      </DialogContent>
    </Dialog>
  </>;
}
