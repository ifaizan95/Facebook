import { el, trapFocus } from "./utils.js";

let toastTimer;

export function showToast(message, type = "info") {
  let stack = document.querySelector(".toast-stack");
  if (!stack) {
    stack = el("div", { class: "toast-stack", "aria-live": "polite" });
    document.body.append(stack);
  }
  const toast = el("div", { class: `toast toast-${type}`, role: "status" }, [message]);
  stack.append(toast);
  requestAnimationFrame(() => toast.classList.add("show"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
    setTimeout(() => toast.remove(), 220);
  }, 2800);
}

export function closeOverlays() {
  document.querySelectorAll(".overlay, .dropdown-panel.open, .account-menu.open").forEach((node) => {
    if (node.classList.contains("overlay")) node.remove();
    else node.classList.remove("open");
  });
}

export function showModal({ title, content, actions = [], labelledBy = "modal-title" }) {
  closeOverlays();
  const overlay = el("div", { class: "overlay", role: "presentation" });
  const dialog = el("div", {
    class: "modal",
    role: "dialog",
    "aria-modal": "true",
    "aria-labelledby": labelledBy,
  });
  const close = () => {
    overlay.remove();
    release?.();
  };
  const release = trapFocus(dialog);
  dialog.append(
    el("div", { class: "modal-header" }, [
      el("h2", { id: labelledBy, class: "modal-title" }, [title]),
      el("button", { class: "icon-btn", type: "button", "aria-label": "Close dialog", onclick: close }, ["×"]),
    ]),
    el("div", { class: "modal-body" }, [content]),
  );
  if (actions.length) {
    dialog.append(el("div", { class: "modal-actions" }, actions.map((action) => {
      const button = el("button", {
        class: `btn ${action.primary ? "btn-primary" : "btn-ghost"}`,
        type: "button",
      }, [action.label]);
      button.addEventListener("click", async () => {
        await action.onClick?.(close);
        if (action.close !== false) close();
      });
      return button;
    })));
  }
  overlay.append(dialog);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  document.addEventListener("keydown", function onKey(event) {
    if (event.key === "Escape") {
      close();
      document.removeEventListener("keydown", onKey);
    }
  });
  document.body.append(overlay);
  dialog.querySelector("button, input, textarea, [tabindex]")?.focus();
  return close;
}

export function confirmDialog(message, { confirmLabel = "Confirm", title = "Please confirm" } = {}) {
  return new Promise((resolve) => {
    showModal({
      title,
      content: el("p", { class: "modal-copy" }, [message]),
      actions: [
        { label: "Cancel", onClick: () => resolve(false) },
        { label: confirmLabel, primary: true, onClick: () => resolve(true) },
      ],
    });
  });
}

export function showMenu(anchor, items) {
  document.querySelectorAll(".dropdown-panel.open").forEach((node) => node.classList.remove("open"));
  let panel = anchor.parentElement.querySelector(".dropdown-panel");
  if (!panel) {
    panel = el("div", { class: "dropdown-panel", role: "menu" });
    anchor.parentElement.append(panel);
  }
  panel.replaceChildren(...items.map((item) => {
    if (item.separator) return el("div", { class: "menu-sep", role: "separator" });
    const button = el("button", {
      class: "menu-item",
      type: "button",
      role: "menuitem",
    }, [
      item.icon ? el("img", { src: item.icon, alt: "" }) : null,
      el("span", {}, [item.label]),
    ]);
    button.addEventListener("click", () => {
      panel.classList.remove("open");
      item.onClick?.();
    });
    return button;
  }));
  const isOpen = panel.classList.toggle("open");
  anchor.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) {
    const onDoc = (event) => {
      if (!anchor.parentElement.contains(event.target)) {
        panel.classList.remove("open");
        anchor.setAttribute("aria-expanded", "false");
        document.removeEventListener("click", onDoc);
      }
    };
    setTimeout(() => document.addEventListener("click", onDoc));
  }
}
