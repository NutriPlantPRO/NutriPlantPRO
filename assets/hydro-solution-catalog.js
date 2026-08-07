(function (root) {
  'use strict';

  const macro = (N_NO3, N_NH4, P, S, K, Ca, Mg) => ({ N_NO3, N_NH4, P, S, K, Ca, Mg, Cl: 0 });
  const micro = (Fe, Mn, Zn, B, Cu, Mo) => ({ Fe, Mn, Zn, B, Cu, Mo });

  const builtIn = [
    { id: 'steiner-100', name: 'Steiner 100%', source: 'Steiner', meq: macro(12, 0, 1, 7, 7, 9, 4), ppm: micro(1.33, 0.62, 0.11, 0.05, 0.02, 0.04) },
    { id: 'hoagland-arnon-i', name: 'Hoagland & Arnon I', source: 'Hoagland & Arnon', meq: macro(15, 0, 1, 4, 6, 10, 4), ppm: micro(1, 0.5, 0.05, 0.5, 0.02, 0.048) },
    { id: 'hoagland-arnon-ii', name: 'Hoagland & Arnon II', source: 'Hoagland & Arnon', meq: macro(14, 1, 1, 4, 6, 8, 4), ppm: micro(1, 0.5, 0.05, 0.5, 0.02, 0.011) },
    { id: 'long-ashton-hewitt', name: 'Long Ashton – Hewitt', source: 'Long Ashton – Hewitt', meq: macro(12, 0, 1.32, 3, 4, 8, 3), ppm: micro(2.8, 0.55, 0.065, 0.54, 0.064, 0.048) },
    { id: 'knop', name: 'Knop', source: 'Knop', meq: macro(14.66, 0, 1.84, 2.03, 4.31, 12.19, 2.03), ppm: micro(0, 0, 0, 0, 0, 0) }
  ];

  function normalize(item) {
    if (!item || typeof item !== 'object') return null;
    return {
      id: String(item.id || ('custom_' + Date.now())),
      name: String(item.name || item.title || 'Solución sin nombre'),
      source: item.source || 'Personalizada',
      meq: Object.assign(macro(0, 0, 0, 0, 0, 0, 0), item.meq || {}),
      ppm: Object.assign(micro(0, 0, 0, 0, 0, 0), item.ppm || {})
    };
  }

  root.NpHydroSolutionCatalog = {
    builtIn: builtIn.map(normalize),
    normalize,
    all(custom) {
      return this.builtIn.concat((Array.isArray(custom) ? custom : []).map(normalize).filter(Boolean));
    },
    apply(solution, target) {
      const recipe = normalize(solution);
      if (!recipe || !target) return null;
      target.name = recipe.name;
      target.solutionId = recipe.id;
      target.meq = Object.assign({}, target.meq || {}, recipe.meq);
      target.ppm = Object.assign({}, target.ppm || {}, recipe.ppm);
      return recipe;
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);

if (typeof module !== 'undefined' && module.exports) {
  module.exports = globalThis.NpHydroSolutionCatalog;
}
