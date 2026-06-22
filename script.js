const revealItems = Array.from(document.querySelectorAll("[data-reveal]"));
const year = document.querySelector("#year");
const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

if (year) {
  year.textContent = new Date().getFullYear();
}

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function setStaticReveal() {
  revealItems.forEach((item) => {
    item.style.setProperty("--reveal-opacity", "1");
    item.style.setProperty("--reveal-y", "0px");
    item.style.setProperty("--carousel-x", "0px");
    item.style.setProperty("--carousel-z", "0px");
    item.style.setProperty("--carousel-rotate", "0deg");
    item.style.setProperty("--carousel-scale", "1");
  });
}

function updateReveal() {
  if (motionQuery.matches) {
    setStaticReveal();
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
  const isNarrow = viewportWidth < 720;
  const maxRotate = isNarrow ? 22 : 42;
  const minScale = isNarrow ? 0.84 : 0.76;
  const maxScale = isNarrow ? 1.04 : 1.1;

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const centerY = rect.top + rect.height / 2;
    const normalized = clamp((centerY - viewportHeight * 0.5) / (viewportHeight * 0.58), -1.15, 1.15);
    const distance = clamp(Math.abs(normalized), 0, 1);
    const closeness = 1 - distance;
    const opacity = Math.pow(clamp((1 - distance) / 0.84), 1.3);
    const scale = minScale + closeness * (maxScale - minScale);
    const rotation = normalized * -maxRotate;
    const y = normalized * (isNarrow ? 30 : 46);
    const x = 0;
    const z = (closeness - 0.55) * (isNarrow ? 120 : 260);

    item.style.setProperty("--reveal-opacity", opacity.toFixed(3));
    item.style.setProperty("--reveal-y", `${y.toFixed(1)}px`);
    item.style.setProperty("--carousel-x", `${x.toFixed(1)}px`);
    item.style.setProperty("--carousel-z", `${z.toFixed(1)}px`);
    item.style.setProperty("--carousel-rotate", `${rotation.toFixed(2)}deg`);
    item.style.setProperty("--carousel-scale", scale.toFixed(3));
  });
}

let ticking = false;

function requestRevealUpdate() {
  if (ticking) return;

  window.requestAnimationFrame(() => {
    updateReveal();
    ticking = false;
  });
  ticking = true;
}

window.addEventListener("scroll", requestRevealUpdate, { passive: true });
window.addEventListener("resize", requestRevealUpdate);
motionQuery.addEventListener("change", requestRevealUpdate);
updateReveal();
