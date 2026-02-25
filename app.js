// Lista inicial (puedes editarla). AW en g/mol, z = |valencia|
const PRESETS = [
    { name: "Calcio (Ca²⁺)", aw: 40.078, z: 2 },
    { name: "Magnesio (Mg²⁺)", aw: 24.305, z: 2 },
    { name: "Potasio (K⁺)", aw: 39.0983, z: 1 },
    { name: "Sodio (Na⁺)", aw: 22.9898, z: 1 },
    { name: "Zinc (Zn²⁺)", aw: 65.38, z: 2 },       // EW ≈ 32.69
    { name: "Manganeso (Mn²⁺)", aw: 54.938, z: 2 },
    { name: "Hierro (Fe²⁺)", aw: 55.845, z: 2 },
    { name: "Hierro (Fe³⁺)", aw: 55.845, z: 3 },
    { name: "Fósforo (P como H₂PO₄⁻)", aw: 31.0, z: 1 },  // preferencia del usuario
    { name: "Azufre (S como SO₄²⁻)", aw: 32.065, z: 2 },
    { name: "Boro (como BO₃³⁻)", aw: 58.81, z: 3 }, // molecular si así lo deseas
    { name: "Personalizado…", aw: 40.0, z: 1 }
  ];
  
  const ionSel = document.getElementById("ion");
  const awInput = document.getElementById("aw");
  const zInput  = document.getElementById("val");
  const eqwOut  = document.getElementById("eqw");
  const meq = document.getElementById("meq");
  const mmol = document.getElementById("mmol");
  const ppm = document.getElementById("ppm");
  const btnClear = document.getElementById("btnClear");
  
  // Cargar opciones
  PRESETS.forEach((p, i) => {
    const opt = document.createElement("option");
    opt.value = i;
    opt.textContent = p.name;
    ionSel.appendChild(opt);
  });
  
  // Utilidad: redondeo consistente
  const round = (x) => Number.parseFloat(x).toFixed(4);
  
  // Actualiza equivalente mg/meq
  function updateEqw() {
    const aw = Number(awInput.value);
    const z  = Math.max(1, Math.abs(Number(zInput.value)));
    eqwOut.value = round(aw / z);  // mg/meq numéricamente igual a AW/z
  }
  
  // Cargar preset seleccionado
  ionSel.addEventListener("change", () => {
    const p = PRESETS[Number(ionSel.value)];
    awInput.value = p.aw;
    zInput.value  = p.z;
    updateEqw();
    clearValues();
  });
  
  // Recalcular eqw al modificar aw o z
  [awInput, zInput].forEach(el => el.addEventListener("input", updateEqw));
  
  // Conversión desde un campo “activo”
  let active = null;
  [meq, mmol, ppm].forEach(el => {
    el.addEventListener("input", (e) => {
      active = e.target.id;
      convert();
    });
  });
  
  function clearValues() {
    meq.value = "";
    mmol.value = "";
    ppm.value = "";
  }
  
  btnClear.addEventListener("click", clearValues);
  
  // Lógica de conversión
  function convert() {
    const aw = Number(awInput.value);
    const z  = Math.max(1, Math.abs(Number(zInput.value)));
  
    if (!aw || !z) return;
  
    if (active === "meq") {
      const v = Number(meq.value);
      if (isNaN(v)) return;
      mmol.value = (v / z) ? round(v / z) : "";
      ppm.value  = (v * (aw / z)) ? round(v * (aw / z)) : "";
    }
  
    if (active === "mmol") {
      const v = Number(mmol.value);
      if (isNaN(v)) return;
      meq.value = (v * z) ? round(v * z) : "";
      ppm.value = (v * aw) ? round(v * aw) : "";
    }
  
    if (active === "ppm") {
      const v = Number(ppm.value);
      if (isNaN(v)) return;
      mmol.value = aw ? round(v / aw) : "";
      meq.value  = (aw && z) ? round((v * z) / aw) : "";
    }
  }
  
  // Inicializar con Calcio
  ionSel.value = 0;
  ionSel.dispatchEvent(new Event("change"));
  