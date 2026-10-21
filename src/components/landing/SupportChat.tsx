import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { MessageCircle, Send, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { callFunction } from "@/lib/paymentFirst";
type Message = { role: "user" | "assistant"; content: string };
function visitorId() {
  try {
    const saved = localStorage.getItem("tapaway-help-visitor");
    if (saved && /^[a-f0-9-]{36}$/i.test(saved)) return saved;
    const id = crypto.randomUUID();
    localStorage.setItem("tapaway-help-visitor", id);
    return id;
  } catch {
    return crypto.randomUUID();
  }
}
export function SupportChat({ inline = false }: { inline?: boolean }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"ai" | "team">("ai");
  const [visitor] = useState(visitorId);
  const [messages, setMessages] = useState<Message[]>([]);
  const [remaining, setRemaining] = useState(5);
  const [question, setQuestion] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => {
    scroll.current?.scrollTo({
      top: scroll.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (busy || !question.trim()) return;
    setBusy(true);
    setError("");
    const message = question.trim();
    try {
      const result = await callFunction<{
        answer?: string;
        remaining?: number;
        error?: string;
        sent?: boolean;
      }>("storefront-support", {
        mode,
        visitor,
        message,
        name,
        email,
        website,
        history: messages,
      });
      if (typeof result.data.remaining === "number")
        setRemaining(result.data.remaining);
      if (!result.ok)
        throw new Error(
          result.data.error ||
            "Please try again or send a message to our team.",
        );
      if (mode === "team" && result.data.sent) {
        setSent(true);
        setQuestion("");
      } else if (result.data.answer) {
        setMessages((prev) => [
          ...prev,
          { role: "user", content: message },
          { role: "assistant", content: result.data.answer! },
        ]);
        setQuestion("");
      }
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Something went wrong. Email tap@tapaway.co.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <button className={inline ? "sf-button" : "sf-help"} onClick={() => setOpen(true)}>
        <MessageCircle />
        {inline ? "Ask the AI helper" : "Have a question?"}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="storefront sf-chat"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            document.getElementById("support-question")?.focus();
          }}
        >
          <div className="sf-chat-header">
            <div>
              <DialogTitle>Let's make it easy.</DialogTitle>
              <DialogDescription>
                Quick answers, or a message to our team.
              </DialogDescription>
            </div>
            <button aria-label="Close help" onClick={() => setOpen(false)}>
              <X />
            </button>
          </div>
          <div className="sf-chat-tabs">
            <button
              disabled={busy}
              aria-pressed={mode === "ai"}
              onClick={() => {
                setMode("ai");
                setError("");
              }}
            >
              AI help
            </button>
            <button
              disabled={busy}
              aria-pressed={mode === "team"}
              onClick={() => {
                setMode("team");
                setError("");
              }}
            >
              Talk to our team
            </button>
          </div>
          {mode === "ai" ? (
            <>
              <div
                className="sf-chat-messages"
                ref={scroll}
                role="log"
                aria-label="AI conversation"
              >
                <p className="sf-chat-message assistant">
                  Hi! I'm TapAway's AI assistant. Ask me about the cards, hubs,
                  or getting started. You can message our team anytime.
                </p>
                {messages.map((m, i) => (
                  <p key={i} className={`sf-chat-message ${m.role}`}>
                    {m.content}
                  </p>
                ))}
                {busy && <p role="status">Thinking…</p>}
              </div>
              {messages.length === 0 && <div className="sf-chat-suggestions" aria-label="Question ideas">
                {["What is an NFC card?", "Do I need a subscription?", "Can I use my Linktree?"].map(prompt => <button key={prompt} disabled={busy} onClick={() => {
                  setQuestion(prompt);
                  document.getElementById("support-question")?.focus();
                }}>{prompt}</button>)}
              </div>}
              <p className="sf-chat-meta">
                {remaining} of 5 AI questions available today. AI can make
                mistakes.
              </p>
              {remaining === 0 && (
                <button className="sf-button" onClick={() => setMode("team")}>
                  Send more questions to our team
                </button>
              )}
            </>
          ) : (
            <p className="sf-chat-meta">
              A real person will reply by email. You don't need to use the bot
              first. Your chat history will be included to save you repeating
              yourself.
            </p>
          )}
          {sent && mode === "team" ? (
            <div role="status" className="sf-status">
              Message received. We'll reply to {email}.
            </div>
          ) : (
            <form onSubmit={submit} className="sf-chat-form">
              {mode === "team" && (
                <>
                  <label>
                    Your name
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      maxLength={120}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Email for our reply
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={254}
                      autoComplete="email"
                    />
                  </label>
                </>
              )}
              <input
                className="sf-honeypot"
                name="website"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                tabIndex={-1}
                aria-hidden="true"
                autoComplete="off"
              />
              <label htmlFor="support-question">
                {mode === "ai" ? "Your question" : "How can we help?"}
              </label>
              <textarea
                id="support-question"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                required
                maxLength={mode === "ai" ? 1000 : 2000}
                rows={3}
                disabled={busy || (mode === "ai" && remaining === 0)}
                placeholder="Ask anything about TapAway…"
              />
              {error && (
                <p className="sf-chat-error" role="alert">
                  {error}
                </p>
              )}
              <button
                className="sf-button"
                disabled={busy || (mode === "ai" && remaining === 0)}
              >
                {busy
                  ? "Sending…"
                  : mode === "ai"
                    ? "Ask AI"
                    : "Send to our team"}
                <Send />
              </button>
            </form>
          )}
          <p className="sf-chat-meta">
            Please leave out passwords and payment details.{" "}
            <Link to="/support" onClick={() => setOpen(false)}>Help center</Link> ·{" "}
            <a href="mailto:tap@tapaway.co">Email us</a>
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
}
