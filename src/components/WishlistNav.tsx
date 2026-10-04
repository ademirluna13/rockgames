import { useEffect, useState } from "react";

export default function WishlistNav() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const sync = (ids?: string[]) => {
      if (ids) { setCount(ids.length); return; }
      try {
        const saved = JSON.parse(localStorage.getItem("rockgames:selected") || "[]");
        setCount(Array.isArray(saved) ? saved.filter((id) => typeof id === "string").length : 0);
      } catch { setCount(0); }
    };
    const onSelection = (event: Event) => sync((event as CustomEvent<string[]>).detail);
    const onStorage = () => sync();
    window.addEventListener("rockgames:selection", onSelection);
    window.addEventListener("storage", onStorage);
    sync();
    return () => { window.removeEventListener("rockgames:selection", onSelection); window.removeEventListener("storage", onStorage); };
  }, []);

  const openWishlist = () => {
    if (document.querySelector(".catalog-section")) window.dispatchEvent(new Event("rockgames:openWishlist"));
    else window.location.assign("/catalogo?abrir-mis-juegos=1");
  };

  return <button className="header-action wishlist-nav" type="button" onClick={openWishlist} aria-label={`Abrir Mis juegos, ${count} ${count === 1 ? "juego" : "juegos"}`}>
    <span>Mis juegos</span><b>{count}</b><i aria-hidden="true">↗</i>
  </button>;
}
