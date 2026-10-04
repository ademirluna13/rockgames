import { faFacebook, faPlaystation, faWhatsapp, faXbox, faYoutube } from "@fortawesome/free-brands-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-common-types";
import type { CSSProperties } from "react";

export type Brand = "PlayStation" | "Xbox" | "Nintendo" | "Nintendo Switch" | "Nintendo Switch 2" | "Facebook" | "WhatsApp" | "YouTube";
const icons: Partial<Record<Brand, IconDefinition>> = {
  PlayStation: faPlaystation,
  Xbox: faXbox,
  Facebook: faFacebook,
  WhatsApp: faWhatsapp,
  YouTube: faYoutube,
};

export default function BrandIcon({ name, className = "", style }: { name: Brand; className?: string; style?: CSSProperties }) {
  const icon = icons[name];
  if (!icon) return <img className={`brand-icon ${className}`} style={style} src="/assets/nintendo-switch-mark.svg" alt="" aria-hidden="true" />;
  const [width, height, , , paths] = icon.icon;
  return <svg className={`brand-icon ${className}`} style={style} viewBox={`0 0 ${width} ${height}`} fill="currentColor" aria-hidden="true" focusable="false">{(Array.isArray(paths) ? paths : [paths]).map((path, index) => <path key={index} d={path} />)}</svg>;
}
