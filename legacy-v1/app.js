// Cambia el número a formato internacional sin +, espacios ni guiones cuando esté listo.
const WHATSAPP_NUMBER = "";
// Configura aquí el ID G-XXXXXXXXXX para activar Google Analytics 4.
const GA_MEASUREMENT_ID = "";
const currency = new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN", maximumFractionDigits: 0 });

function trackEvent(name, params = {}) {
  if (typeof window.gtag === "function") window.gtag("event", name, params);
}

if (/^G-[A-Z0-9]+$/.test(GA_MEASUREMENT_ID)) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  const analyticsScript = document.createElement("script");
  analyticsScript.async = true;
  analyticsScript.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
  document.head.append(analyticsScript);
}

// Catálogo demostrativo: sustituir títulos, precios y disponibilidad por el inventario real.
const games = [
  { id: "elden-ring", title: "Elden Ring", platform: "PlayStation", genre: "Acción · RPG", price: 899, oldPrice: 1199, tag: "FAVORITO", mark: "ER", art: "elden" },
  { id: "spider-man", title: "Marvel's Spider-Man 2", platform: "PlayStation", genre: "Acción · Aventura", price: 1099, oldPrice: 0, tag: "NUEVO", mark: "SM", art: "spider" },
  { id: "zelda", title: "Tears of the Kingdom", platform: "Nintendo Switch", genre: "Aventura · RPG", price: 999, oldPrice: 0, tag: "DESTACADO", mark: "ゼ", art: "zelda" },
  { id: "halo", title: "Halo Infinite", platform: "Xbox", genre: "Acción · Shooter", price: 749, oldPrice: 899, tag: "OFERTA", mark: "H∞", art: "halo" },
  { id: "astro", title: "Astro Bot", platform: "PlayStation", genre: "Plataformas", price: 899, oldPrice: 0, tag: "FAVORITO", mark: "AB", art: "astro" },
  { id: "mario", title: "Super Mario Bros. Wonder", platform: "Nintendo Switch", genre: "Plataformas", price: 949, oldPrice: 1099, tag: "OFERTA", mark: "M!", art: "mario" },
  { id: "forza", title: "Forza Horizon 5", platform: "Xbox", genre: "Carreras · Mundo abierto", price: 799, oldPrice: 0, tag: "DESTACADO", mark: "FH", art: "halo" },
  { id: "god-of-war", title: "God of War Ragnarök", platform: "PlayStation", genre: "Acción · Aventura", price: 999, oldPrice: 0, tag: "FAVORITO", mark: "GΩ", art: "spider" }
];

const state = { platform: "all", query: "", cart: new Set() };
const grid = document.querySelector("#game-grid");
const drawer = document.querySelector("#cart-drawer");
const backdrop = document.querySelector("#cart-backdrop");

function renderGames() {
  const visible = games.filter(game => (state.platform === "all" || game.platform === state.platform) && `${game.title} ${game.platform} ${game.genre}`.toLowerCase().includes(state.query.toLowerCase()));
  grid.innerHTML = visible.map(game => `
    <article class="game-card">
      <div class="game-art art-${game.art}"><span class="game-art-label">${game.tag}</span><span class="game-monogram" aria-hidden="true">${game.mark}</span><span class="platform-pill">${game.platform.toUpperCase()}</span></div>
      <div class="game-info"><span class="game-genre">${game.genre}</span><h3>${game.title}</h3><div class="game-meta"><span class="game-price">${game.oldPrice ? `<s>${currency.format(game.oldPrice)}</s> ` : ""}${currency.format(game.price)}</span><button class="add-game ${state.cart.has(game.id) ? "added" : ""}" data-add="${game.id}" aria-label="${state.cart.has(game.id) ? "Quitar" : "Agregar"} ${game.title}">${state.cart.has(game.id) ? "✓" : "+"}</button></div></div>
    </article>`).join("");
  document.querySelector("#empty-state").hidden = visible.length > 0;
  document.querySelectorAll("[data-count]").forEach(el => { el.textContent = el.dataset.count === "all" ? games.length : games.filter(g => g.platform === el.dataset.count).length; });
  document.querySelector(".all-games").hidden = state.platform === "all" && state.query === "";
}

function setCart(open) {
  drawer.classList.toggle("open", open);
  drawer.setAttribute("aria-hidden", String(!open));
  backdrop.classList.toggle("open", open);
  document.body.classList.toggle("cart-open", open);
  if (open) document.querySelector(".close-cart").focus();
}

function renderCart() {
  const items = games.filter(game => state.cart.has(game.id));
  const count = items.length;
  const total = items.reduce((sum, game) => sum + game.price, 0);
  document.querySelector("#cart-count").textContent = count;
  document.querySelector("#floating-count").textContent = count;
  document.querySelector("#cart-total").textContent = currency.format(total);
  document.querySelector("#cart-empty").hidden = count > 0;
  document.querySelector("#cart-footer").hidden = count === 0;
  document.querySelector("#cart-items").innerHTML = items.map(game => `<article class="cart-item"><span class="cart-thumb art-${game.art}">${game.mark}</span><div><h3>${game.title}</h3><p>${game.platform}</p></div><span class="cart-item-price">${currency.format(game.price)}<button class="remove-item" data-remove="${game.id}" aria-label="Quitar ${game.title}">×</button></span></article>`).join("");
  const text = `Hola ROCK GAMES, me interesan estos juegos:\n${items.map(game => `• ${game.title} (${game.platform}) — ${currency.format(game.price)}`).join("\n")}\nTotal estimado: ${currency.format(total)}\n¿Me confirmas disponibilidad y cómo comprar?`;
  const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`;
  document.querySelector("#whatsapp-order").href = waUrl;
  document.querySelector("#contact-whatsapp").href = WHATSAPP_NUMBER ? `https://wa.me/${WHATSAPP_NUMBER}?text=Hola%20ROCK%20GAMES%2C%20busco%20un%20juego%20en%20especial.` : "https://wa.me/?text=Hola%20ROCK%20GAMES%2C%20busco%20un%20juego%20en%20especial.";
  document.querySelector("#floating-cart").classList.toggle("visible", count > 0);
}

document.addEventListener("click", event => {
  const filter = event.target.closest("[data-platform]");
  if (filter) { state.platform = filter.dataset.platform; trackEvent("filter_catalog", { platform: state.platform }); document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.toggle("active", tab === filter)); renderGames(); }
  const add = event.target.closest("[data-add]");
  if (add) { const id = add.dataset.add; state.cart.has(id) ? state.cart.delete(id) : (state.cart.add(id), trackEvent("add_to_list", { item_id: id, platform: games.find(game => game.id === id).platform })); renderGames(); renderCart(); }
  const remove = event.target.closest("[data-remove]");
  if (remove) { state.cart.delete(remove.dataset.remove); renderGames(); renderCart(); }
  if (event.target.closest("#floating-cart")) setCart(true);
  if (event.target.closest("#whatsapp-order")) trackEvent("begin_checkout", { item_count: state.cart.size });
  if (event.target.closest(".close-cart") || event.target.closest(".close-cart-action") || event.target === backdrop) setCart(false);
  if (event.target.closest(".all-games")) { state.platform = "all"; state.query = ""; document.querySelector("#game-search").value = ""; document.querySelectorAll(".filter-tab").forEach(tab => tab.classList.toggle("active", tab.dataset.platform === "all")); renderGames(); }
});

document.querySelector("#game-search").addEventListener("input", event => { state.query = event.target.value.trim(); renderGames(); });
document.querySelector(".menu-button").addEventListener("click", event => { const open = document.querySelector(".main-nav").classList.toggle("open"); event.currentTarget.setAttribute("aria-expanded", String(open)); });
document.querySelectorAll(".main-nav a").forEach(link => link.addEventListener("click", () => { document.querySelector(".main-nav").classList.remove("open"); document.querySelector(".menu-button").setAttribute("aria-expanded", "false"); }));
document.addEventListener("keydown", event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); document.querySelector("#game-search").focus(); } if (event.key === "Escape") setCart(false); });
document.querySelector("#year").textContent = new Date().getFullYear();

if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add("in-view"); observer.unobserve(entry.target); } }), { threshold: .12 });
  document.querySelectorAll(".reveal").forEach(el => observer.observe(el));
} else document.querySelectorAll(".reveal").forEach(el => el.classList.add("in-view"));

renderGames();
renderCart();
