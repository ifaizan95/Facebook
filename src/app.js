import * as store from "./store.js";
import { navigate, parseLocation, subscribe as onRoute } from "./router.js";
import { closeOverlays, showMenu, showToast } from "./ui.js";
import { APP_NAME, debounce, el, formatCount } from "./utils.js";
import {
  renderAuth,
  renderEvents,
  renderFriends,
  renderGroups,
  renderHome,
  renderMarketplace,
  renderMessages,
  renderNews,
  renderNotifications,
  renderProfile,
  renderSearch,
  renderSettings,
  renderWatch,
} from "./views.js";

const root = () => document.getElementById("app");
let layoutReady = false;
let lastPath = "";

function applyTheme() {
  const settings = store.getSettings();
  document.documentElement.dataset.theme = settings.theme || "light";
  document.documentElement.classList.toggle("compact", Boolean(settings.compactMode));
}

function renderRouteView(location) {
  const { route, id, query } = location;
  switch (route) {
    case "profile":
      return renderProfile(id || store.currentUser().id);
    case "friends":
      return renderFriends();
    case "messages":
      return renderMessages(id);
    case "notifications":
      return renderNotifications();
    case "search":
      return renderSearch(query.q || "");
    case "settings":
      return renderSettings();
    case "news":
      return renderNews();
    case "groups":
      return renderGroups(id);
    case "marketplace":
      return renderMarketplace();
    case "watch":
      return renderWatch();
    case "events":
      return renderEvents();
    case "home":
    default:
      return renderHome();
  }
}

function navItem(href, img, label, extraClass = "") {
  const location = parseLocation();
  const active = `/${location.route}` === href || (href === "/" && (location.route === "home" || !location.route));
  return el("a", {
    href,
    class: `nav-icon ${extraClass} ${active ? "is-active" : ""}`,
    "data-link": "true",
    "aria-label": label,
    title: label,
  }, [el("img", { src: img, alt: "" }), el("span", { class: "nav-icon-label" }, [label])]);
}

function sidebarLink(href, img, label) {
  const location = parseLocation();
  const active = href === "/"
    ? location.route === "home" || location.path === "/"
    : location.path === href || location.path.startsWith(`${href}/`);
  return el("a", { href, class: `side-link ${active ? "is-active" : ""}`, "data-link": "true" }, [
    img ? el("img", { src: img, alt: "" }) : null,
    el("span", {}, [label]),
  ]);
}

function updateBadges() {
  const unreadN = store.unreadNotifications().length;
  const unreadM = store.unreadMessages();
  document.querySelectorAll("[data-badge='notifications']").forEach((node) => {
    node.hidden = unreadN === 0;
    node.textContent = formatCount(unreadN);
  });
  document.querySelectorAll("[data-badge='messages']").forEach((node) => {
    node.hidden = unreadM === 0;
    node.textContent = formatCount(unreadM);
  });
}

function renderChrome() {
  const me = store.currentUser();
  const settings = store.getSettings();
  const state = store.getState();
  applyTheme();

  const searchInput = el("input", {
    type: "search",
    placeholder: "Search Connect",
    "aria-label": "Search Connect",
    value: parseLocation().route === "search" ? (parseLocation().query.q || "") : "",
  });
  const goSearch = debounce((value) => {
    navigate(value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : "/search");
  }, 280);
  searchInput.addEventListener("input", () => goSearch(searchInput.value));
  searchInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      goSearch.cancel();
      navigate(searchInput.value.trim() ? `/search?q=${encodeURIComponent(searchInput.value.trim())}` : "/search");
    }
    if (event.key === "Escape") {
      searchInput.value = "";
      searchInput.blur();
    }
  });

  const profileBtn = el("button", {
    class: "nav-user-icon online",
    type: "button",
    "aria-label": "Account menu",
    "aria-haspopup": "menu",
    "aria-expanded": "false",
  }, [el("img", { src: me.avatar, alt: "" })]);
  profileBtn.addEventListener("click", (event) => {
    event.stopPropagation();
    showMenu(profileBtn, [
      { label: "View profile", icon: me.avatar, onClick: () => navigate(`/profile/${me.id}`) },
      { label: "Settings", icon: "/facebook/setting.png", onClick: () => navigate("/settings") },
      { label: "Display", icon: "/facebook/display.png", onClick: () => store.updateSettings({ theme: store.getSettings().theme === "dark" ? "light" : "dark" }) },
      { label: "Help", icon: "/facebook/help.png", onClick: () => showToast("This demo stores data in your browser only.") },
      { separator: true },
      { label: "Log out", icon: "/facebook/logout.png", onClick: () => { store.logout(); navigate("/login", { replace: true }); } },
    ]);
  });

  const notifBtn = el("a", { href: "/notifications", class: "round-btn", "data-link": "true", "aria-label": "Notifications" }, [
    el("img", { src: "/facebook/notification.png", alt: "" }),
    el("span", { class: "badge", dataset: { badge: "notifications" } }),
  ]);
  const inboxBtn = el("a", { href: "/messages", class: "round-btn", "data-link": "true", "aria-label": "Messages" }, [
    el("img", { src: "/facebook/inbox.png", alt: "" }),
    el("span", { class: "badge", dataset: { badge: "messages" } }),
  ]);

  const nav = el("nav", { class: "topbar", "aria-label": "Primary" }, [
    el("div", { class: "nav-left" }, [
      el("a", { href: "/", class: "brand", "data-link": "true", "aria-label": `${APP_NAME} home` }, [
        el("span", { class: "brand-mark", "aria-hidden": "true" }, ["C"]),
        el("span", { class: "brand-name" }, [APP_NAME]),
      ]),
      el("div", { class: "search-box" }, [
        el("img", { src: "/facebook/search.png", alt: "" }),
        searchInput,
      ]),
    ]),
    el("div", { class: "nav-center" }, [
      navItem("/", "/facebook/news.png", "Home"),
      navItem("/friends", "/facebook/friends.png", "Friends"),
      navItem("/watch", "/facebook/watch.png", "Watch"),
      navItem("/marketplace", "/facebook/marketplace.png", "Marketplace"),
    ]),
    el("div", { class: "nav-right" }, [
      inboxBtn,
      notifBtn,
      profileBtn,
    ]),
  ]);

  const extraLinks = el("div", { class: "see-more-links hidden" }, [
    sidebarLink("/settings", "/facebook/setting.png", "Settings"),
    sidebarLink("/events", "/facebook/location.png", "Events"),
    sidebarLink("/notifications", "/facebook/notification.png", "Notifications"),
    sidebarLink("/messages", "/facebook/inbox.png", "Messages"),
  ]);
  const seeMore = el("button", { class: "side-link see-more", type: "button" }, [
    el("img", { src: "/facebook/see-more.png", alt: "" }),
    el("span", {}, ["See more"]),
  ]);
  seeMore.addEventListener("click", () => {
    extraLinks.classList.toggle("hidden");
    seeMore.querySelector("span").textContent = extraLinks.classList.contains("hidden") ? "See more" : "See less";
  });

  const left = el("aside", { class: "left-sidebar", "aria-label": "Shortcuts" }, [
    el("div", { class: "imp-links" }, [
      el("a", { href: `/profile/${me.id}`, class: "side-link", "data-link": "true" }, [
        el("img", { src: me.avatar, alt: "" }),
        el("span", {}, [me.name]),
      ]),
      sidebarLink("/", "/facebook/news.png", "Latest News"),
      sidebarLink("/friends", "/facebook/friends.png", "Friends"),
      sidebarLink("/groups", "/facebook/group.png", "Groups"),
      sidebarLink("/marketplace", "/facebook/marketplace.png", "Marketplace"),
      sidebarLink("/watch", "/facebook/watch.png", "Watch"),
      extraLinks,
      seeMore,
    ]),
    el("div", { class: "shortcut-links" }, [
      el("p", {}, ["Shortcut links"]),
      ...state.groups.map((group) =>
        el("a", { href: `/groups/${group.id}`, "data-link": "true" }, [
          el("img", { src: group.image, alt: "" }),
          group.name,
        ])
      ),
    ]),
  ]);

  const events = state.events.map((event) =>
    el("div", { class: "event" }, [
      el("div", { class: "left-event" }, [el("h4", {}, [event.day]), el("span", {}, [event.month])]),
      el("div", { class: "right-event" }, [
        el("h4", {}, [event.title]),
        el("p", {}, [event.place]),
        el("a", { href: "/events", "data-link": "true" }, ["See more"]),
      ]),
    ])
  );

  const contacts = settings.hideChat
    ? el("p", { class: "muted" }, ["Contacts are hidden."])
    : el("div", { class: "shortcut-links contacts" }, store.myConversations().map((convo) => {
      const other = store.getUser(convo.participantIds.find((id) => id !== me.id));
      return el("a", { href: `/messages/${convo.id}`, "data-link": "true" }, [
        el("img", { src: other?.avatar, alt: "" }),
        other?.name || "Friend",
      ]);
    }));

  const ad = settings.hideAd ? null : el("div", { class: "ad-block" }, [
    el("div", { class: "sidebar-title" }, [
      el("h3", {}, ["Advertisement"]),
      el("button", { class: "text-link", type: "button", onclick: () => store.updateSettings({ hideAd: true }) }, ["Close"]),
    ]),
    el("button", { class: "ad-hit", type: "button", onclick: () => navigate("/marketplace") }, [
      el("img", { src: "/facebook/advertisement.png", class: "sidebar-ads", alt: "Marketplace advertisement" }),
    ]),
  ]);

  const right = el("aside", { class: "right-sidebar", "aria-label": "Events and contacts" }, [
    el("div", { class: "sidebar-title" }, [
      el("h3", {}, ["Events"]),
      el("a", { href: "/events", "data-link": "true" }, ["See all"]),
    ]),
    ...events,
    ad,
    el("div", { class: "sidebar-title" }, [
      el("h3", {}, ["Contacts"]),
      el("button", {
        class: "text-link",
        type: "button",
        onclick: () => store.updateSettings({ hideChat: !settings.hideChat }),
      }, [settings.hideChat ? "Show Chat" : "Hide Chat"]),
    ]),
    contacts,
  ]);

  const mobileNav = el("nav", { class: "mobile-nav", "aria-label": "Mobile" }, [
    navItem("/", "/facebook/news.png", "Home"),
    navItem("/friends", "/facebook/friends.png", "Friends"),
    el("a", { href: "/messages", class: `nav-icon ${parseLocation().route === "messages" ? "is-active" : ""}`, "data-link": "true", "aria-label": "Messages" }, [
      el("img", { src: "/facebook/inbox.png", alt: "" }),
      el("span", { class: "nav-icon-label" }, ["Chats"]),
      el("span", { class: "badge", dataset: { badge: "messages" } }),
    ]),
    el("a", { href: "/notifications", class: `nav-icon ${parseLocation().route === "notifications" ? "is-active" : ""}`, "data-link": "true", "aria-label": "Notifications" }, [
      el("img", { src: "/facebook/notification.png", alt: "" }),
      el("span", { class: "nav-icon-label" }, ["Alerts"]),
      el("span", { class: "badge", dataset: { badge: "notifications" } }),
    ]),
    navItem("/settings", "/facebook/setting.png", "Menu"),
  ]);

  return { nav, left, right, mobileNav };
}

function mountLayout() {
  const app = root();
  const { nav, left, right, mobileNav } = renderChrome();
  const main = el("main", { id: "main-content", class: "main-content", tabindex: "-1" });
  const container = el("div", { class: "container" }, [left, main, right]);
  app.replaceChildren(
    el("a", { class: "skip-link", href: "#main-content" }, ["Skip to feed"]),
    nav,
    container,
    mobileNav
  );
  layoutReady = true;
}

function renderView(location = parseLocation()) {
  const main = document.getElementById("main-content");
  if (!main) return;
  const scrollY = window.scrollY;
  const samePage = lastPath === location.path + location.query.q;
  main.replaceChildren(renderRouteView(location));
  lastPath = location.path + (location.query.q || "");
  if (samePage) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
  updateBadges();
}

export function renderApp(meta = {}) {
  const state = store.getState();
  const location = parseLocation();
  document.title = APP_NAME;

  if (!state.session) {
    layoutReady = false;
    const mode = location.route === "signup" ? "signup" : "login";
    if (!["login", "signup"].includes(location.route)) {
      navigate("/login", { replace: true });
    }
    root().replaceChildren(renderAuth(mode));
    return;
  }

  if (location.route === "login" || location.route === "signup") {
    navigate("/", { replace: true });
    return;
  }

  if (!layoutReady) mountLayout();
  else {
    const { nav, left, right, mobileNav } = renderChrome();
    const app = root();
    app.querySelector("nav.topbar")?.replaceWith(nav);
    app.querySelector(".left-sidebar")?.replaceWith(left);
    app.querySelector(".right-sidebar")?.replaceWith(right);
    app.querySelector(".mobile-nav")?.replaceWith(mobileNav);
  }

  document.querySelector(".container")?.classList.toggle("wide-view", location.route === "messages");

  if (!meta.silent) renderView(location);
  else updateBadges();
}

export function mount() {
  applyTheme();
  store.subscribe((_state, meta) => renderApp(meta));
  onRoute(() => renderApp());
  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeOverlays();
    if (event.key === "/" && event.target === document.body) {
      event.preventDefault();
      document.querySelector(".search-box input")?.focus();
    }
  });
  renderApp();
}
