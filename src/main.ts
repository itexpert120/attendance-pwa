import { mount } from "svelte";
import "./app.css";
import App from "./App.svelte";
import { initKeyboard } from "./lib/keyboard";
import { initRipple } from "./lib/ripple";
import { initTheme } from "./lib/theme";

initTheme();
initKeyboard();
initRipple();

const app = mount(App, {
  target: document.getElementById("app")!,
});

export default app;
