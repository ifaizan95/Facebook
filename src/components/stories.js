import * as store from "../store.js";
import { el, fileToDataUrl, timeAgo, trapFocus } from "../utils.js";
import { showToast } from "../ui.js";

const STORY_MS = 5000;

export function groupedStories() {
  const me = store.currentUser();
  const map = new Map();
  store.getState().stories
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .forEach((story) => {
      if (!map.has(story.userId)) map.set(story.userId, []);
      map.get(story.userId).push(story);
    });
  const groups = [...map.entries()].map(([userId, items]) => ({
    userId,
    user: store.getUser(userId),
    items,
    viewed: items.every((item) => item.viewers.includes(me.id)),
  }));
  groups.sort((a, b) => {
    if (a.userId === me.id) return -1;
    if (b.userId === me.id) return 1;
    if (a.viewed !== b.viewed) return a.viewed ? 1 : -1;
    return b.items[0].createdAt - a.items[0].createdAt;
  });
  return groups;
}

export function renderStoryGallery() {
  const me = store.currentUser();
  const groups = groupedStories();
  const mine = groups.find((group) => group.userId === me.id);
  const gallery = el("div", { class: "story-gallery", "aria-label": "Stories" });
  const file = el("input", { type: "file", accept: "image/*", class: "sr-only" });
  file.addEventListener("change", async () => {
    const chosen = file.files?.[0];
    file.value = "";
    if (!chosen) return;
    try {
      const image = await fileToDataUrl(chosen, 1080, 0.8);
      store.createStory(image);
      showToast("Your story is up for this session.");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  const addCard = el("div", {
    class: "story story1 add-story",
    style: { backgroundImage: `url(${mine?.items[0]?.image || me.cover || me.avatar})` },
  });
  const openOwn = el("button", {
    class: "story-open",
    type: "button",
    "aria-label": mine?.items?.length ? "View your story" : "Add story",
  }, [
    el("img", { src: mine?.items?.length ? me.avatar : "/facebook/upload.png", alt: "" }),
    el("p", {}, [mine?.items?.length ? "Your story" : "Add Story"]),
  ]);
  openOwn.addEventListener("click", () => {
    if (mine?.items?.length) openStoryViewer(groups, groups.indexOf(mine));
    else file.click();
  });
  const plus = el("button", {
    class: "story-plus",
    type: "button",
    "aria-label": "Add a new story",
  }, ["+"]);
  plus.addEventListener("click", (event) => {
    event.stopPropagation();
    file.click();
  });
  addCard.append(openOwn, plus);
  gallery.append(addCard, file);

  groups.filter((group) => group.userId !== me.id || group.items.length).forEach((group, index) => {
    if (group.userId === me.id) return;
    const card = el("button", {
      class: `story story${(index % 5) + 1} ${group.viewed ? "viewed" : ""}`,
      type: "button",
      "aria-label": `${group.user.name}'s story`,
      style: { backgroundImage: `url(${group.items[0].image})` },
    }, [
      el("img", { src: group.user.avatar, alt: "" }),
      el("p", {}, [group.user.name.split(" ")[0]]),
    ]);
    card.addEventListener("click", () => openStoryViewer(groups, groups.indexOf(group)));
    gallery.append(card);
  });

  if (mine?.items?.length) {
    addCard.classList.add("has-story");
  }

  return gallery;
}

export function openStoryViewer(groups, startIndex = 0) {
  const me = store.currentUser();
  let groupIndex = startIndex;
  let itemIndex = 0;
  let timer;
  let started = Date.now();
  let remaining = STORY_MS;
  let paused = false;

  const overlay = el("div", { class: "story-overlay overlay", role: "dialog", "aria-modal": "true", "aria-label": "Story viewer" });
  const frame = el("div", { class: "story-frame" });
  const release = trapFocus(frame);

  const close = () => {
    clearInterval(timer);
    release?.();
    overlay.remove();
    document.removeEventListener("keydown", onKey);
  };

  const progress = el("div", { class: "story-progress" });
  const img = el("img", { class: "story-media", alt: "Story" });
  const name = el("div", { class: "story-user" });
  const closeBtn = el("button", { class: "icon-btn story-close", type: "button", "aria-label": "Close story" }, ["×"]);
  closeBtn.addEventListener("click", close);

  const renderCurrent = () => {
    const group = groups[groupIndex];
    if (!group) return close();
    const item = group.items[itemIndex];
    store.viewStory(item.id);
    img.src = item.image;
    name.replaceChildren(
      el("img", { src: group.user.avatar, alt: "" }),
      el("div", {}, [
        el("strong", {}, [group.user.id === me.id ? "Your story" : group.user.name]),
        el("span", {}, [timeAgo(item.createdAt)]),
      ])
    );
    progress.replaceChildren(...group.items.map((story, index) => {
      const bar = el("div", { class: `bar ${index < itemIndex ? "done" : ""}` }, [el("span")]);
      if (index === itemIndex) bar.classList.add("active");
      return bar;
    }));
    started = Date.now();
    remaining = STORY_MS;
    tick();
  };

  const next = () => {
    const group = groups[groupIndex];
    if (itemIndex < group.items.length - 1) itemIndex += 1;
    else if (groupIndex < groups.length - 1) {
      groupIndex += 1;
      itemIndex = 0;
    } else return close();
    renderCurrent();
  };

  const prev = () => {
    if (itemIndex > 0) itemIndex -= 1;
    else if (groupIndex > 0) {
      groupIndex -= 1;
      itemIndex = groups[groupIndex].items.length - 1;
    }
    renderCurrent();
  };

  const tick = () => {
    clearInterval(timer);
    const active = progress.querySelector(".bar.active span");
    timer = setInterval(() => {
      if (paused) return;
      const elapsed = Date.now() - started;
      const ratio = Math.min(1, elapsed / remaining);
      if (active) active.style.width = `${ratio * 100}%`;
      if (ratio >= 1) next();
    }, 40);
  };

  function onKey(event) {
    if (event.key === "Escape") close();
    if (event.key === "ArrowRight") next();
    if (event.key === "ArrowLeft") prev();
    if (event.key === " ") {
      event.preventDefault();
      paused = !paused;
      if (!paused) {
        remaining -= Date.now() - started;
        started = Date.now();
      }
    }
  }

  const left = el("button", { class: "story-hit left", type: "button", "aria-label": "Previous story" });
  const right = el("button", { class: "story-hit right", type: "button", "aria-label": "Next story" });
  left.addEventListener("click", prev);
  right.addEventListener("click", next);
  frame.addEventListener("pointerdown", () => { paused = true; });
  frame.addEventListener("pointerup", () => {
    paused = false;
    remaining -= Date.now() - started;
    started = Date.now();
  });

  frame.append(progress, el("div", { class: "story-top" }, [name, closeBtn]), img, left, right);
  overlay.append(frame);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", onKey);
  document.body.append(overlay);
  renderCurrent();
}
