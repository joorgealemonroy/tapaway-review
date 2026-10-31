import { useCallback, useEffect, useRef, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ExternalLink, Download, Search, RefreshCw, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { filterMenu, type LasIslasMenuSection } from "@/lib/lasIslasMenu";
import sourceMenu from "@/data/lasIslasMenu.json";
import originalMenu from "@/assets/las-islas-menu-mar26.pdf.asset.json";

interface Props { restaurantId: string; name: string; logo: string | null; open: boolean; onOpenChange: (open: boolean) => void }
const historyKey = "tapawayLasIslasMenu";

export function LasIslasMenu({ restaurantId, name, logo, open, onOpenChange }: Props) {
  const [sections, setSections] = useState<LasIslasMenuSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [attempt, setAttempt] = useState(0);
  const generation = useRef(0);
  const scrollArea = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const changeOpen = useRef(onOpenChange);
  changeOpen.current = onOpenChange;
  const route = useRef(window.location.pathname);

  useEffect(() => {
    const request = ++generation.current;
    setLoading(true); setError(false);
    void (async () => {
      try {
        const { data, error: failure } = await supabase.rpc("get_public_restaurant_menu", { _restaurant_id: restaurantId });
        if (request !== generation.current) return;
        if (failure || !Array.isArray(data) || data.length === 0) { setError(true); return; }
        setSections(data.map(section => ({ id: section.id, name: section.name, items: (Array.isArray(section.items) ? section.items : []).flatMap(item => {
          if (!item || typeof item !== "object" || Array.isArray(item) || typeof item.id !== "string" || typeof item.name !== "string") return [];
          return [{ id: item.id, name: item.name, description: typeof item.description === "string" ? item.description : null, price: typeof item.price === "string" ? item.price : null }];
        }) })));
      } catch { if (request === generation.current) setError(true); }
      finally { if (request === generation.current) setLoading(false); }
    })();
    return () => { generation.current++; };
  }, [restaurantId, attempt]);

  useEffect(() => {
    const pop = () => {
      if (window.location.pathname !== route.current) { changeOpen.current(false); return; }
      changeOpen.current(window.history.state?.[historyKey] === restaurantId);
    };
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, [restaurantId]);

  useEffect(() => {
    if (open && window.history.state?.[historyKey] !== restaurantId) {
      window.history.pushState({ ...window.history.state, [historyKey]: restaurantId }, "", window.location.href);
    }
    if (open) { setQuery(""); setCategory("all"); }
  }, [open, restaurantId]);

  const dismiss = useCallback((next: boolean) => {
    if (next) { onOpenChange(true); return; }
    onOpenChange(false);
    if (window.location.pathname === route.current && window.history.state?.[historyKey] === restaurantId) window.history.back();
  }, [onOpenChange, restaurantId]);

  const matches = filterMenu(sections, query);
  const visible = category === "all" || query ? matches : matches.filter(section => section.id === category);
  return <Dialog.Root open={open} onOpenChange={dismiss}>
    <Dialog.Portal>
      <Dialog.Overlay className="las-islas-menu-overlay" />
      <Dialog.Content className="las-islas-menu" aria-describedby={undefined} onOpenAutoFocus={event => { event.preventDefault(); closeButton.current?.focus(); }}>
        <header className="las-islas-menu-header">
          <Button ref={closeButton} variant="ghost" size="icon" className="h-12 w-12 shrink-0" aria-label="Close menu" onClick={() => dismiss(false)}><ArrowLeft className="h-6 w-6" /></Button>
          {logo && <img src={logo} alt="" className="h-12 w-12 shrink-0 rounded-full object-contain" />}
          <div className="min-w-0"><Dialog.Title className="text-lg font-bold leading-tight">{name}</Dialog.Title><p className="text-base text-muted-foreground">Menú</p></div>
        </header>
        <div className="border-b px-4 pb-3">
          <div className="relative"><Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" /><Input ref={searchInput} aria-label="Search menu" placeholder="Buscar · Search menu" value={query} onChange={event => { setQuery(event.target.value); setCategory("all"); scrollArea.current?.scrollTo({ top: 0 }); }} className="h-12 pl-10 pr-12 text-base" />{query && <Button variant="ghost" size="icon" className="absolute right-1 top-1 h-10 w-10" aria-label="Clear search" onClick={() => { setQuery(""); searchInput.current?.focus(); }}><X className="h-5 w-5" /></Button>}</div>
          <div className="mt-3 flex items-center gap-3"><label htmlFor="las-islas-category" className="text-base font-semibold">Categoría</label><select id="las-islas-category" aria-label="Menu category" className="h-12 min-w-0 flex-1 rounded-md border border-input bg-background px-2 text-base" value={category} onChange={event => { setCategory(event.target.value); setQuery(""); scrollArea.current?.scrollTo({ top: 0 }); }}><option value="all">Todo · All categories</option>{sections.map(section => <option key={section.id} value={section.id}>{section.name}</option>)}</select></div>
        </div>
        <div ref={scrollArea} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5" aria-busy={loading}>
          {loading ? <div role="status" className="flex items-center gap-3 py-8 text-base"><Loader2 className="h-6 w-6 animate-spin motion-reduce:animate-none" />Cargando menú…</div> : error ? <div role="alert" className="space-y-4 py-8"><p className="text-base">No pudimos cargar el menú. Please try again.</p><Button className="h-12" onClick={() => setAttempt(value => value + 1)}><RefreshCw className="mr-2 h-5 w-5" />Retry menu</Button></div> : <>
            {visible.length === 0 && <p role="status" className="py-8 text-base">No results · Sin resultados</p>}
            {visible.map(section => <section key={section.id} aria-label={section.name} className="mb-8">
              <h2 className="border-b-2 pb-3 text-xl font-bold">{section.name}</h2>
              {sourceMenu.sections.find(source => source.name === section.name)?.note && <p className="mt-3 text-base leading-relaxed text-muted-foreground">{sourceMenu.sections.find(source => source.name === section.name)?.note}</p>}
              <div className="divide-y">{section.items.map(item => {
                const note = sourceMenu.sections.find(source => source.name === section.name)?.note;
                // Notes live in editable item data for legacy clients, but appear
                // once per category here rather than repeating under every dish.
                const description = note ? item.description?.replace(note, "").trim() : item.description;
                return <article key={item.id} className="py-5"><h3 className="text-lg font-semibold leading-snug">{item.name}</h3>{item.price && <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2">{item.price.split(" · ").map(price => <p key={price} className="text-xl font-bold tabular-nums">{price}</p>)}</div>}{description && <p className="mt-2 text-base leading-relaxed text-muted-foreground">{description}</p>}</article>;
              })}</div>
            </section>)}
            <footer className="space-y-4 border-t pt-5 text-base leading-relaxed"><p>Prices may change at any time. Please refer to in-person menu for the most accurate pricing.</p><p><strong>AVISO IMPORTANTE:</strong> El comer ostras crudas puede causar una enfermedad grave y hasta la muerte en personas con enfermedades del hígado (por ejemplo, cirrosis alcohólica), cáncer u otras enfermedades crónicas que debilitan el sistema inmunológico. Si come ostras crudas y se enferma, busque atención médica inmediatamente. Si cree estar en peligro, consulte a su médico.</p><p><strong>WARNING:</strong> Eating raw oysters/seafood may cause severe illness or death in individuals with liver disease (e.g. alcoholic cirrhosis), cancer or other chronic illness that weakens the immune system. Seek immediate medical attention if you become ill. If you are unsure if you are at risk, consult your physician.</p></footer>
          </>}
          <div className="mt-6 flex flex-wrap gap-3 border-t pt-4"><Button variant="outline" asChild className="min-h-12 h-auto whitespace-normal text-base"><a href={originalMenu.url} target="_blank" rel="noopener noreferrer"><ExternalLink className="mr-2 h-4 w-4 shrink-0" />Open original menu (PDF)</a></Button><Button variant="outline" asChild className="min-h-12 h-auto whitespace-normal text-base"><a href={originalMenu.url} download="Las-Islas-Original-Menu.pdf"><Download className="mr-2 h-4 w-4 shrink-0" />Download original menu</a></Button></div>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>;
}