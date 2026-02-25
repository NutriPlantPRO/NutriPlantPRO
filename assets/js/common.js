// ====== common.js (NutriPlant Pro) ======
import { np_getCurrentProjectId, np_getProject } from "./storage.js";

export function np_currentProject() {
  const id = np_getCurrentProjectId();
  if (!id) return null;
  return np_getProject(id);
}

// Utilidad para pintar el título del proyecto en el header (si aplica)
export function np_setHeaderProjectTitle(selector = "#np-project-title") {
  const el = document.querySelector(selector);
  if (!el) return;
  const p = np_currentProject();
  el.textContent = p ? p.title : "Sin proyecto seleccionado";
}

// Llamar esto en cada pestaña que requiera un proyecto seleccionado
export function np_requireProject(options = { redirectToInicio: false }) {
  const p = np_currentProject();
  if (!p && options.redirectToInicio) {
    // si quieres, podrías navegar a Inicio:
    // window.location.href = "dashboard.html#inicio";
  }
  return !!p;
}
