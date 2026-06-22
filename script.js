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
  });
}

function updateReveal() {
  if (motionQuery.matches) {
    setStaticReveal();
    return;
  }

  const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
  const enterStart = viewportHeight * 0.92;
  const enterEnd = viewportHeight * 0.28;
  const exitStart = viewportHeight * 0.1;
  const exitEnd = viewportHeight * 0.44;

  revealItems.forEach((item) => {
    const rect = item.getBoundingClientRect();
    const enterProgress = clamp((enterStart - rect.top) / (enterStart - enterEnd));
    const exitProgress = clamp((rect.bottom - exitStart) / (exitEnd - exitStart));
    const opacity = Math.min(enterProgress, exitProgress);
    const y = (1 - enterProgress) * 54 - (1 - exitProgress) * 34;

    item.style.setProperty("--reveal-opacity", opacity.toFixed(3));
    item.style.setProperty("--reveal-y", `${y.toFixed(1)}px`);
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
