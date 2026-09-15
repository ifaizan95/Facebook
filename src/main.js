import "../facebook.css";
import { initStore } from "./store.js";
import { initRouter } from "./router.js";
import { mount } from "./app.js";

async function boot() {
  const app = document.getElementById("app");
  try {
    await initStore();
    initRouter();
    mount();
  } catch (error) {
    console.error(error);
    app.replaceChildren();
    const message = document.createElement("div");
    message.className = "boot-error";
    message.innerHTML = "<h1>Connect failed to start</h1><p>Try refreshing. If this continues, clear site data for this demo.</p>";
    app.append(message);
  }
}

boot();
