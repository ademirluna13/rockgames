import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import gsap from "gsap";
import type { CatalogCard, RecommendationMoodView } from "../lib/data";
import { platformBrand, themeForPlatform } from "../lib/platforms";
import BrandIcon from "./BrandIcon";
import type { Brand } from "./BrandIcon";

type Props = { games: CatalogCard[]; moods: RecommendationMoodView[]; selected: string[]; onToggle: (id: string) => void; money: (amount: number) => string };

export default function GameFinder({ games, moods, selected, onToggle, money }: Props) {
  const [active, setActive] = useState(moods[0]?.id ?? "");
  const resultsRef = useRef<HTMLDivElement>(null);
  const recommendations = useMemo(() => {
    const mood = moods.find((item) => item.id === active);
    return mood?.games.filter((game) => game.available).slice(0, 3) ?? [];
  }, [active, games, moods]);

  useEffect(() => {
    const items = resultsRef.current?.querySelectorAll<HTMLElement>(".finder-result");
    if (!items?.length || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const animation = gsap.fromTo(items, { autoAlpha: 0, y: 18, scale: .985 }, { autoAlpha: 1, y: 0, scale: 1, duration: .5, stagger: .07, ease: "power3.out" });
    return () => { animation.kill(); gsap.set(items, { clearProps: "opacity,visibility,transform" }); };
  }, [active]);

  return <section className="game-finder" id="recomendador" aria-labelledby="finder-title">
    <div className="finder-heading"><div><p className="section-kicker">Una recomendación para empezar</p><h2 id="finder-title">¿Qué quieres <strong>jugar hoy?</strong></h2></div><p>Elige un tipo de juego y encuentra algo para ti.</p></div>
    <div className="finder-moods" role="group" aria-label="Tipo de juego">{moods.map((mood) => <button key={mood.id} type="button" aria-pressed={active === mood.id} onClick={() => setActive(mood.id)}>{mood.label}</button>)}</div>
    <div className="finder-results" ref={resultsRef} aria-live="polite">{recommendations.map((game) => <article className="finder-result" key={game.id} style={{ "--finder-accent": themeForPlatform(game.platform).accent } as CSSProperties}><img src={game.cover} alt="" loading="lazy" decoding="async" /><div className="finder-result-shade" /><div className="finder-result-top"><span aria-label={game.platform} title={game.platform}><BrandIcon name={platformBrand(game.platform) as Brand} /></span><span>{game.genre}</span></div><div className="finder-result-bottom"><h3>{game.title}</h3><p>{game.description}</p><div><strong>{money(game.price)}</strong><button type="button" aria-pressed={selected.includes(game.selectionId)} onClick={() => onToggle(game.selectionId)}>{selected.includes(game.selectionId) ? "Guardado ✓" : "Guardar +"}</button></div></div></article>)}</div>
    <div className="finder-tail"><span>Confirmamos precio y disponibilidad antes de comprar.</span><a href="/catalogo">Explorar todo el catálogo ↗</a></div>
  </section>;
}
