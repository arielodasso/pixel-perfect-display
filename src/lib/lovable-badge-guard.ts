/**
 * Guard runtime que elimina el badge "Edit with Lovable" y cualquier overlay
 * de la plataforma que se inyecte dentro de la página (editor preview).
 *
 * El badge suele inyectarse en el preview como un elemento flotante fijo.
 * Este módulo lo desmonta apenas aparece y bloquea su re-inserción.
 * Es seguro en producción: si no existe ningún elemento, no hace nada.
 */

const BADGE_SELECTORS = [
  "[data-lovable-badge]",
  "[data-lovable-editor]",
  ".lop-button",
  ".lovable-editor-launcher",
  "#lovable-badge",
] as const;

function isLovableBadge(element: Element): boolean {
  const tag = element.tagName.toLowerCase();
  if (tag !== "div" && tag !== "button" && tag !== "aside" && tag !== "a") return false;

  const text = (element.textContent ?? "").toLowerCase();
  if (text.includes("edit with lovable") || text.includes("editar con lovable")) return true;
  if (text.includes("lovable")) {
    const aria = element.getAttribute("aria-label") ?? "";
    return aria.toLowerCase().includes("edit") || aria.toLowerCase().includes("editar");
  }
  return false;
}

/** Devuelve los elementos con estilo fixed/sticky inyectados por Lovable. */
function findBadges(root: ParentNode): Element[] {
  const matches: Element[] = [];
  try {
    root.querySelectorAll(BADGE_SELECTORS.join(",")).forEach((el) => matches.push(el));
  } catch {
    /* selectores inválidos no deberían ocurrir */
  }
  return matches.filter(isLovableBadge);
}

export function enableLovableBadgeGuard() {
  if (typeof document === "undefined") return;
  const styleId = "sigma-lovable-guard";
  if (!document.getElementById(styleId)) {
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      [data-lovable-badge],
      .lop-button,
      .lovable-editor-launcher,
      #lovable-badge { display: none !important; visibility: hidden !important; }
    `;
    document.head.appendChild(style);
  }

  const remove = () => {
    findBadges(document).forEach((el) => el.remove());
  };

  remove();
  const observer = new MutationObserver(() => remove());
  observer.observe(document.documentElement, { childList: true, subtree: true });
  window.addEventListener("load", remove, { once: true });
}
