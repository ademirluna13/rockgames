import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { FeaturedCard } from "../lib/data";
import { platformBrand, themeForPlatform } from "../lib/platforms";
import BrandIcon from "./BrandIcon";
import type { Brand } from "./BrandIcon";
import { accountTypeLabel } from "../lib/account-type";

gsap.registerPlugin(ScrollTrigger);

type Props = {
  games: FeaturedCard[];
  selected: string[];
  money: (amount: number) => string;
  onToggle: (id: string) => void;
};

export default function FeaturedShowcase({ games, selected, money, onToggle }: Props) {
  const [active, setActive] = useState(0);
  const sectionRef = useRef<HTMLDivElement>(null);
  const pointerStart = useRef<number | null>(null);
  const ignoreClick = useRef(false);
  const firstSlide = useRef(true);
  const pausedUntil = useRef(0);
  const [inView, setInView] = useState(false);
  const [tabVisible, setTabVisible] = useState(true);
  const [reducedMotion, setReducedMotion] = useState(false);
  const count = games.length;
  const move = (step: number) => setActive((current) => (current + step + count) % count);
  const interact = () => { pausedUntil.current = Date.now() + 7500; };
  const navigate = (step: number) => { interact(); move(step); };

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: .3 });
    observer.observe(section);
    const onVisibility = () => setTabVisible(!document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(preference.matches);
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => {
    if (!inView || !tabVisible || reducedMotion || count < 2) return;
    const interval = window.setInterval(() => {
      const hovered = window.matchMedia("(hover: hover)").matches && sectionRef.current?.matches(":hover");
      if (!hovered && Date.now() >= pausedUntil.current) move(1);
    }, 3200);
    return () => window.clearInterval(interval);
  }, [inView, tabVisible, reducedMotion, count]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      gsap.fromTo(".showcase-stage", { clipPath: "inset(8% 0 8% 0 round 28px)", autoAlpha: .7 }, {
        clipPath: "inset(0% 0 0% 0 round 0px)", autoAlpha: 1, duration: 1.1, ease: "power3.out",
        scrollTrigger: { trigger: section, start: "top 82%", once: true },
      });
      gsap.fromTo(".showcase-slide.is-active .showcase-copy > *", { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: .7, stagger: .09, ease: "power3.out", scrollTrigger: { trigger: section, start: "top 78%", once: true } });
      gsap.fromTo(".showcase-slide img", { yPercent: -3 }, { yPercent: 3, ease: "none", scrollTrigger: { trigger: section, start: "top bottom", end: "bottom top", scrub: .7 } });
    }, section);
    return () => context.revert();
  }, []);

  useEffect(() => {
    if (firstSlide.current) { firstSlide.current = false; return; }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slide = sectionRef.current?.querySelector<HTMLElement>(".showcase-slide.is-active");
    if (!slide) return;
    const copy = slide.querySelectorAll<HTMLElement>(".showcase-copy > *");
    gsap.fromTo(copy, { autoAlpha: 0, y: 22 }, { autoAlpha: 1, y: 0, duration: .55, stagger: .07, ease: "power3.out", clearProps: "opacity,visibility,transform" });
  }, [active]);

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (pointerStart.current === null) return;
    const distance = event.clientX - pointerStart.current;
    pointerStart.current = null;
    if (Math.abs(distance) > 55) { ignoreClick.current = true; navigate(distance < 0 ? 1 : -1); }
  };

  if (!count) return null;

  return <div className="showcase" id="destacados" ref={sectionRef} onPointerLeave={(event) => { if (event.pointerType === "mouse") interact(); }} onFocusCapture={interact}>
    <div className="showcase-head">
      <div className="featured-heading"><p className="section-kicker">Selección ROCK</p><h2>En portada<span>.</span></h2></div>
      <div className="showcase-nav"><span>{String(active + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}</span><button type="button" onClick={() => navigate(-1)} aria-label="Portada anterior">←</button><button type="button" onClick={() => navigate(1)} aria-label="Siguiente portada">→</button></div>
    </div>
    <div className="showcase-stage" onPointerDown={(event) => { interact(); pointerStart.current = (event.target as HTMLElement).closest("button") ? null : event.clientX; ignoreClick.current = false; }} onPointerUp={onPointerUp} onPointerCancel={() => { pointerStart.current = null; }}>
      {games.map((game, index) => {
        const offset = (index - active + count) % count;
        const position = offset === 0 ? "is-active" : offset === 1 ? "is-next" : "is-prev";
        const discount = game.oldPrice && game.oldPrice > game.price ? Math.round((1 - game.price / game.oldPrice) * 100) : 0;
        const theme = themeForPlatform(game.platform);
        return <article key={game.id} className={`showcase-slide ${position}`} style={{ "--slide-accent": theme.accent, "--slide-glow": theme.glow } as CSSProperties} aria-hidden={position !== "is-active"} onClick={() => { if (ignoreClick.current) { ignoreClick.current = false; return; } if (position !== "is-active") { interact(); setActive(index); } }}>
          <img src={game.cover} alt="" loading={position === "is-active" ? "eager" : "lazy"} decoding="async" />
          <div className="showcase-shade" aria-hidden="true" />
          <div className="showcase-top"><span className="showcase-platform" aria-label={game.platform} title={game.platform}><BrandIcon name={platformBrand(game.platform) as Brand} /></span><span>{game.tag}</span></div>
          <div className="showcase-copy"><p className="showcase-overline">{game.genre}{game.accountType ? ` · ${accountTypeLabel(game.accountType)}` : ""}</p><h3>{game.title}</h3><p className="showcase-description">{game.description}</p><div className="showcase-bottom"><div className="showcase-price">{discount > 0 && <span>−{discount}%</span>}{game.oldPrice && <s>{money(game.oldPrice)}</s>}<strong>{game.variants.length > 1 && game.price === Math.min(...game.variants.filter((variant) => variant.available).map((variant) => variant.price)) ? "Desde " : ""}{money(game.price)}</strong></div><button type="button" aria-pressed={selected.includes(game.selectionId)} onClick={() => onToggle(game.selectionId)} aria-label={`${selected.includes(game.selectionId) ? "Quitar" : "Guardar"} ${game.title} ${selected.includes(game.selectionId) ? "de" : "en"} Mis juegos`}>{selected.includes(game.selectionId) ? "Guardado ✓" : "Guardar en Mis juegos ↗"}</button></div></div>
          {position !== "is-active" && <span className="showcase-preview-label" aria-hidden="true">Ver portada ↗</span>}
        </article>;
      })}
    </div>
    <div className="showcase-progress" aria-label="Elegir portada">{games.map((game, index) => <button key={game.id} type="button" className={active === index ? "active" : ""} onClick={() => { interact(); setActive(index); }} aria-label={`Mostrar ${game.title}`} aria-current={active === index ? "true" : undefined}><span /></button>)}</div>
    <p className="featured-note">Precio y disponibilidad sujetos a confirmación.</p>
  </div>;
}
