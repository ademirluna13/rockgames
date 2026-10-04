import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { CatalogCard, FeaturedCard, HomePortal, RecommendationMoodView } from "../lib/data";
import type { Genre, PlatformFamily } from "../lib/data/contracts";
import { withCatalogVariant } from "../lib/data/view-models";
import { platformNames, platformTheme, type PlatformFilter } from "../lib/platforms";
import FeaturedShowcase from "./FeaturedShowcase";
import ProductPoster from "./ProductPoster";
import GameFinder from "./GameFinder";
import BrandIcon from "./BrandIcon";

type Props = { games: CatalogCard[]; featuredGames?: FeaturedCard[]; portals?: HomePortal[]; platformFamilies: PlatformFamily[]; genres: Genre[]; currency: string; whatsappNumber: string; recommendationMoods?: RecommendationMoodView[]; mode?: "home" | "full" };
const normalize = (text: string) => text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-MX").replace(/[^a-z0-9]+/g, " ").trim();
gsap.registerPlugin(ScrollTrigger);

export default function Catalog({ games, featuredGames, portals = [], platformFamilies, genres: genreRecords, currency, whatsappNumber, recommendationMoods = [], mode = "full" }: Props) {
  const [platform, setPlatform] = useState<PlatformFilter>("Todos");
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState("Todos los géneros");
  const [status, setStatus] = useState("Todos");
  const [selected, setSelected] = useState<string[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const firstRender = useRef(true);
  const money = useMemo(() => new Intl.NumberFormat("es-MX", { style: "currency", currency, maximumFractionDigits: 0 }), [currency]);
  const formatMoney = (amount: number) => money.format(amount);

  useEffect(() => {
    if (mode !== "full") return;
    const requested = new URLSearchParams(window.location.search).get("plataforma");
    if (requested?.startsWith("Nintendo")) setPlatform("Nintendo");
    else if (requested && platformNames.includes(requested as PlatformFilter)) setPlatform(requested as PlatformFilter);
    const requestedGame = new URLSearchParams(window.location.search).get("buscar");
    if (requestedGame) setQuery(requestedGame);
    const openWishlist = new URLSearchParams(window.location.search).get("abrir-mis-juegos");
    if (openWishlist === "1") {
      setDrawerOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete("abrir-mis-juegos");
      window.history.replaceState({}, "", url);
    }
  }, [mode]);
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("rockgames:selected") || "[]");
      if (Array.isArray(saved)) setSelected(saved.filter((id) => typeof id === "string"));
    } catch { /* El catálogo funciona aunque el navegador bloquee almacenamiento. */ }
    setHydrated(true);
  }, []);
  useEffect(() => {
    if (!hydrated) return;
    try { localStorage.setItem("rockgames:selected", JSON.stringify(selected)); } catch { /* opcional */ }
    window.dispatchEvent(new CustomEvent("rockgames:selection", { detail: selected }));
  }, [selected, hydrated]);
  useEffect(() => {
    const openWishlist = () => setDrawerOpen(true);
    window.addEventListener("rockgames:openWishlist", openWishlist);
    return () => window.removeEventListener("rockgames:openWishlist", openWishlist);
  }, []);
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setDrawerOpen(false); };
    window.addEventListener("keydown", onKey);
    document.body.classList.add("drawer-open");
    return () => { window.removeEventListener("keydown", onKey); document.body.classList.remove("drawer-open"); };
  }, [drawerOpen]);

  const genres = ["Todos los géneros", ...genreRecords.filter((item) => item.isActive).map((item) => item.name)];
  const platformOptions = ["Todos" as const, ...platformFamilies.filter((family) => family.isActive).map((family) => family.name as PlatformFilter)];
  const visible = games.flatMap((game) => {
    if (genre !== "Todos los géneros" && !game.genres.includes(genre)) return [];
    const matchingVariants = game.variants.filter((variant) => variant.available
      && (platform === "Todos" || variant.platformFamilySlug === platform.toLocaleLowerCase("es-MX"))
      && (status === "Todos" || (status === "Ofertas" ? !!variant.oldPrice && variant.oldPrice > variant.price : status === "Nuevos" ? variant.tag === "Nuevo" : !!variant.isBestseller))
      && normalize(`${game.title} ${game.genres.join(" ")} ${variant.platform} ${game.tags.join(" ")} ${variant.versionLabel ?? ""}`).includes(normalize(query)));
    const preferred = matchingVariants.find((variant) => variant.id === game.variantId) ?? matchingVariants[0];
    return preferred ? [{ ...withCatalogVariant(game, preferred), variants: matchingVariants }] : [];
  });
  const visibleKey = visible.map((game) => `${game.id}:${game.variantId}`).join("|");
  const [displayedGames, setDisplayedGames] = useState(() => visible);
  const chosen = games.flatMap((game) => game.variants.filter((variant) => selected.includes(variant.selectionId) && variant.available).map((variant) => withCatalogVariant(game, variant)));
  const featured = featuredGames ?? games.filter((game): game is FeaturedCard => game.available && game.featured);
  const message = `Hola ROCK GAMES, me interesan estos juegos:\n${chosen.map((game) => {
    const version = game.variants.find((variant) => variant.id === game.variantId)?.versionLabel;
    return `- ${game.title} — ${game.platform}${version ? ` · ${version}` : ""}`;
  }).join("\n")}\n\n¿Me confirman precio y disponibilidad?`;
  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
  const toggleGame = (selectionId: string) => setSelected((current) => current.includes(selectionId) ? current.filter((value) => value !== selectionId) : [...current, selectionId]);
  const theme = platformTheme[platform];
  const themeStyle = { "--catalog-accent": theme.accent, "--catalog-ambient": theme.ambient } as CSSProperties;

  useEffect(() => {
    if (firstRender.current) { firstRender.current = false; return; }
    const cards = gridRef.current?.querySelectorAll<HTMLElement>(".catalog-poster");
    if (!cards?.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setDisplayedGames(visible); return; }
    gsap.killTweensOf(cards);
    const exit = gsap.to(cards, { autoAlpha: 0, y: 20, scale: .985, duration: .18, stagger: .025, ease: "power2.in", onComplete: () => setDisplayedGames(visible) });
    return () => { exit.kill(); gsap.set(cards, { clearProps: "opacity,visibility,transform" }); };
  }, [visibleKey]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const cards = Array.from(grid.querySelectorAll<HTMLElement>(".catalog-poster"));
    const animation = gsap.fromTo(cards, { autoAlpha: 0, y: 54, scale: .96 }, { autoAlpha: 1, y: 0, scale: 1, duration: .8, stagger: .085, ease: "power3.out", scrollTrigger: { trigger: grid, start: "top 88%", once: true } });
    return () => { animation.scrollTrigger?.kill(); animation.kill(); gsap.set(cards, { clearProps: "opacity,visibility,transform" }); };
  }, [displayedGames]);

  useEffect(() => {
    if (mode !== "home" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const scope = document.querySelector<HTMLElement>(".home-discovery");
    if (!scope) return;
    const context = gsap.context(() => {
      gsap.fromTo(".portal-card", { autoAlpha: 0, y: 45, scale: .965 }, { autoAlpha: 1, y: 0, scale: 1, duration: .8, stagger: .1, ease: "power3.out", scrollTrigger: { trigger: ".portal-grid", start: "top 84%", once: true } });
    }, scope);
    return () => context.revert();
  }, [mode]);

  useEffect(() => {
    const tabs = document.querySelector<HTMLElement>(".catalog-tabs");
    const active = tabs?.querySelector<HTMLElement>("button.active");
    if (!tabs || !active || tabs.scrollWidth <= tabs.clientWidth) return;
    tabs.scrollTo({ left: active.offsetLeft - tabs.offsetLeft - (tabs.clientWidth - active.clientWidth) / 2, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  }, [platform]);

  const choosePlatform = (next: PlatformFilter) => {
    setPlatform(next);
  };

  return <section className={`catalog-section ${mode === "home" ? "home-discovery" : "catalog-explorer"}`} id={mode === "home" ? "plataformas" : "catalogo"} data-platform={theme.slug} style={themeStyle}>
    {mode === "home" ? <>
      <div className="portal-heading"><p className="section-kicker">Tu consola, tus juegos</p><h2>¿Dónde <strong>juegas?</strong></h2><p>Elige una plataforma y encuentra los juegos para ti.</p></div>
      <div className="portal-grid">{portals.map((item) => <a className={`portal-card ${item.collage ? "is-all" : ""}`} key={item.title} href={item.href} style={{ "--portal-accent": item.accent } as CSSProperties}><img src={item.image} alt="" loading="lazy" decoding="async" />{item.collage && <><img className="portal-layer portal-layer-one" src="/assets/featured-war-v1.webp" alt="" loading="lazy" decoding="async" /><img className="portal-layer portal-layer-two" src="/assets/featured-zelda-v1.webp" alt="" loading="lazy" decoding="async" /></>}<span className="portal-shade" /><span className="portal-top">{String(item.count).padStart(2, "0")} juegos</span><span className="portal-copy">{!item.collage && <BrandIcon name={item.title as "PlayStation" | "Xbox" | "Nintendo"} />}<strong>{item.title}</strong><small>{item.copy}</small><span>Ver juegos <i aria-hidden="true">↗</i></span></span></a>)}</div>
      <FeaturedShowcase games={featured} selected={selected} onToggle={toggleGame} money={formatMoney} />
      <GameFinder games={games} moods={recommendationMoods} selected={selected} onToggle={toggleGame} money={formatMoney} />
    </> : <>
    <div className="catalog-heading" id="catalogo-list">
      <div><p className="section-kicker">Catálogo</p><h2><span>Busca tu</span><br /><strong>siguiente juego.</strong></h2></div>
      <p>Filtra por consola o escribe el nombre<br />del juego que buscas.</p>
    </div>
    <div className="catalog-toolbar">
      <div className="catalog-tabs" role="group" aria-label="Filtrar por consola">{platformOptions.map((item) => <button key={item} type="button" className={platform === item ? "active" : ""} aria-pressed={platform === item} onClick={() => choosePlatform(item)}>{item !== "Todos" && <BrandIcon name={item} style={{ color: platformTheme[item].accent }} />}{item} <sup>{games.filter((game) => game.variants.some((variant) => variant.available && (item === "Todos" || variant.platformFamilySlug === platformFamilies.find((family) => family.name === item)?.slug))).length}</sup></button>)}</div>
      <label className="catalog-search"><span aria-hidden="true">⌕</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar juego o género" aria-label="Buscar juegos" /></label>
    </div>
    <div className="catalog-refiners"><label>Género<select value={genre} onChange={(event) => setGenre(event.target.value)}>{genres.map((item) => <option key={item}>{item}</option>)}</select></label><div role="group" aria-label="Filtrar por estado">{["Todos", "Ofertas", "Nuevos", "Más vendidos"].map((item) => <button type="button" key={item} aria-pressed={status === item} onClick={() => setStatus(item)}>{item}</button>)}</div></div>
    <div className="catalog-result-meta"><p>Confirma precio y disponibilidad antes de comprar.</p><span aria-live="polite">{visible.length} {visible.length === 1 ? "juego" : "juegos"}{platform !== "Todos" ? ` · ${platform}` : ""}</span></div>
    <div className="game-grid" ref={gridRef}>{displayedGames.map((game) => <ProductPoster game={game} key={game.id} selectedIds={selected} onToggle={toggleGame} money={formatMoney} />)}</div>
    {displayedGames.length === 0 && <div className="catalog-empty"><span>⌕</span><strong>No encontramos ese juego.</strong><p>Pero podemos ayudarte a buscarlo.</p><a href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hola ROCK GAMES, busco ${query || "un juego"}. ¿Me ayudan a encontrarlo?`)}`} target="_blank" rel="noopener noreferrer">Preguntar por WhatsApp ↗</a></div>}
    <div className="catalog-tail"><span>¿No aparece lo que buscas? Escríbenos y te ayudamos a encontrarlo.</span><a href="/#contacto">Cuéntanos qué buscas ↗</a></div>
    </>}
    {drawerOpen && <div className="cart-shell"><button className="cart-shade" type="button" onClick={() => setDrawerOpen(false)} aria-label="Cerrar Mis juegos" /><aside className="cart-panel" aria-label="Mis juegos"><div><div className="cart-title"><div><p className="section-kicker">Tu selección</p><h2>Mis juegos <em>({chosen.length})</em></h2></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Cerrar Mis juegos">×</button></div><div className="cart-lines">{chosen.length === 0 ? <div className="cart-noitems"><span>＋</span><strong>Aún no guardas juegos</strong><p>Guarda los que te interesan y prepara tu consulta.</p></div> : chosen.map((game) => <div className="cart-line" key={game.selectionId}><img className="cart-art" src={game.cover} alt="" loading="lazy" /><div><strong>{game.title}</strong><small>{game.platform}{game.variants.find((variant) => variant.id === game.variantId)?.versionLabel ? ` · ${game.variants.find((variant) => variant.id === game.variantId)?.versionLabel}` : ""}</small></div><div><b>{money.format(game.price)}</b><button type="button" onClick={() => toggleGame(game.selectionId)} aria-label={`Quitar ${game.title}`}>Quitar ×</button></div></div>)}</div></div>{chosen.length > 0 && <div className="cart-checkout"><p>Te confirmamos precio y disponibilidad antes de pagar.</p><a href={whatsappUrl} target="_blank" rel="noopener noreferrer"><BrandIcon name="WhatsApp" />{whatsappNumber ? "Enviar mi selección por WhatsApp" : "Compartir selección por WhatsApp"}<span>↗</span></a>{!whatsappNumber && <small>El número del negocio aún no está configurado.</small>}</div>}</aside></div>}
  </section>;
}
