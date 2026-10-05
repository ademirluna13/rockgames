import { useEffect, useRef, useState, type CSSProperties, type FocusEvent, type MouseEvent } from "react";
import gsap from "gsap";
import type { CatalogCard, CatalogVariant } from "../lib/data";
import { withCatalogVariant } from "../lib/data/view-models";
import { platformBrand, themeForPlatform } from "../lib/platforms";
import BrandIcon from "./BrandIcon";
import type { Brand } from "./BrandIcon";
import { accountTypeLabel } from "../lib/account-type";

type Props = {
  game: CatalogCard;
  selectedIds: string[];
  money: (amount: number) => string;
  onToggle: (id: string) => void;
  featured?: boolean;
};

export default function ProductPoster({ game, selectedIds, money, onToggle, featured = false }: Props) {
  const detailRef = useRef<HTMLDivElement>(null);
  const [activeVariantId, setActiveVariantId] = useState(game.variantId ?? game.variants[0]?.id ?? "");
  useEffect(() => setActiveVariantId(game.variantId ?? game.variants[0]?.id ?? ""), [game.variantId]);
  const activeVariant = game.variants.find((variant) => variant.id === activeVariantId) ?? game.variants[0];
  const current = activeVariant ? withCatalogVariant(game, activeVariant) : game;
  const selected = activeVariant ? selectedIds.includes(activeVariant.selectionId) : selectedIds.includes(game.selectionId);
  const discount = current.oldPrice && current.oldPrice > current.price ? Math.round((1 - current.price / current.oldPrice) * 100) : 0;
  const theme = themeForPlatform(current.platform);
  const style = { "--card-accent": theme.border, "--card-glow": theme.glow, "--card-badge": theme.badge } as CSSProperties;

  const reveal = (show: boolean) => {
    const detail = detailRef.current;
    if (!detail || window.matchMedia("(hover: none), (prefers-reduced-motion: reduce)").matches) return;
    gsap.killTweensOf(detail);
    gsap.to(detail, { height: show ? "auto" : 0, autoAlpha: show ? 1 : 0, y: show ? 0 : 14, duration: show ? .42 : .26, ease: "power3.out" });
  };
  const onBlur = (event: FocusEvent<HTMLElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget as Node | null)) reveal(false);
  };

  return <article
    className={`featured-card catalog-poster ${featured ? "poster-featured" : ""}`}
    data-platform={theme.slug}
    style={style}
    onMouseEnter={(_event: MouseEvent<HTMLElement>) => reveal(true)}
    onMouseLeave={() => reveal(false)}
    onFocusCapture={() => reveal(true)}
    onBlurCapture={onBlur}
  >
    <img className="featured-image" src={game.cover} alt="" loading="lazy" decoding="async" />
    <span className="poster-trace" aria-hidden="true" />
      <div className="featured-top"><span className="featured-platform" aria-label={current.platform} title={current.platform}><BrandIcon name={platformBrand(current.platform) as Brand} /></span><span>{current.oldPrice && current.oldPrice > current.price ? "Oferta" : current.tag}</span></div>
    <div className="featured-content">
      <h3>{game.title}</h3>
      <div className="poster-extra" ref={detailRef}><p>{game.description}</p><small>{game.genre}</small></div>
      {game.variants.length > 1 ? <label className="poster-variant-select"><span>Elige modalidad</span><select value={activeVariant?.id ?? ""} onChange={(event) => setActiveVariantId(event.target.value)} aria-label={`Elegir consola, edición y tipo de cuenta de ${game.title}`}>{game.variants.map((variant: CatalogVariant) => <option key={variant.id} value={variant.id}>{variant.platform}{variant.versionLabel ? ` · ${variant.versionLabel}` : ""} · {accountTypeLabel(variant.accountType)} · {money(variant.price)}</option>)}</select></label> : activeVariant?.accountType && <p className="poster-account-type">{activeVariant.platform} · {accountTypeLabel(activeVariant.accountType)}</p>}
      <div className="featured-bottom">
        <div className="featured-price">
          {discount > 0 && <span className="discount-label">−{discount}%</span>}
          <span className="price-row">{current.oldPrice && <s>{money(current.oldPrice)}</s>}<strong>{game.variants.length > 1 && current.price === Math.min(...game.variants.map((variant) => variant.price)) ? "Desde " : ""}{money(current.price)}</strong></span>
        </div>
        <button type="button" className={selected ? "selected" : ""} aria-pressed={selected} onClick={() => onToggle(activeVariant?.selectionId ?? game.selectionId)} aria-label={`${selected ? "Quitar" : "Guardar"} ${game.title} ${selected ? "de" : "en"} Mis juegos`}>
          <span>{selected ? "Guardado" : "Guardar"}</span><span aria-hidden="true">{selected ? "✓" : "+"}</span>
        </button>
      </div>
    </div>
  </article>;
}
