import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, Sparkles, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useAdminHubs } from "@/hooks/useAdminWorkspace";
import {
  adminDestinations,
  adminFunction,
  hubEditPath,
} from "@/lib/admin/workspace";
export default function AdminFinder({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState(""),
    [busy, setBusy] = useState(false),
    [answer, setAnswer] = useState<string[]>([]),
    [error, setError] = useState("");
  const generation = useRef(0);
  const navigate = useNavigate();
  const hubs = useAdminHubs();
  useEffect(() => {
    generation.current++;
    setAnswer([]);
    setError("");
    setBusy(false);
  }, [query, open]);
  const results = useMemo(() => {
    const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
    return [
      ...(hubs.data || [])
        .filter(
          (h) =>
            q &&
            `${h.name}${h.slug}`
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "")
              .includes(q),
        )
        .slice(0, 6)
        .map((h) => ({
          id: h.id,
          label: h.name,
          description: `tapaway.co/${h.slug || "draft"}`,
          path: hubEditPath(h),
        })),
      ...adminDestinations.filter(
        (d) =>
          !q ||
          `${d.label}${d.keywords}`
            .toLowerCase()
            .replace(/[^a-z0-9]/g, "")
            .includes(q) ||
          answer.includes(d.id),
      ),
    ].slice(0, 10);
  }, [query, hubs.data, answer]);
  const ask = async () => {
    if (!query.trim() || busy) return;
    const run = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const res = await adminFunction<{ destinations: string[] }>(
        "admin-navigator",
        { query },
      );
      if (run === generation.current) {
        setAnswer(res.destinations);
        if (!res.destinations.length)
          setError("Try a hub name or choose an area below.");
      }
    } catch {
      if (run === generation.current)
        setError(
          "AI is taking a break. Search by hub name or choose an area below.",
        );
    } finally {
      if (run === generation.current) setBusy(false);
    }
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="aw-finder">
        <DialogHeader>
          <DialogTitle>Where would you like to go?</DialogTitle>
          <DialogDescription>
            Search hubs instantly, or ask AI to find the right tool.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (results.length === 1) {
              navigate(results[0].path);
              onClose();
            } else void ask();
          }}
        >
          <div className="aw-searchbox">
            <Search size={20} />
            <input
              aria-label="Find a hub or tool"
              autoFocus
              value={query}
              maxLength={300}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Try “Sugarbloom” or “where do I print cards?”"
            />
          </div>
          <button
            type="button"
            className="aw-ai-button"
            disabled={busy || !query.trim()}
            onClick={ask}
          >
            {busy ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}{" "}
            Ask AI to find it
          </button>
        </form>
        {error && (
          <p role="status" className="aw-muted">
            {error}
          </p>
        )}
        <div className="aw-find-results">
          {results.map((d) => (
            <button
              key={d.id}
              onClick={() => {
                navigate(d.path);
                onClose();
              }}
            >
              <span>
                <strong>{d.label}</strong>
                <small>{d.description}</small>
              </span>
              <ArrowUpRight size={18} />
            </button>
          ))}
          {results.length === 0 && (
            <p className="aw-muted">
              No exact match. Ask AI, or try another name.
            </p>
          )}
        </div>
        <p className="aw-caption">
          The assistant finds pages. It never changes accounts or sends
          messages.
        </p>
      </DialogContent>
    </Dialog>
  );
}
