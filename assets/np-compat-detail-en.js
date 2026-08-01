/** English copy for fertilizer-compatibility DETAIL_KEYS templates. */
(function (root) {
  'use strict';
  root.NP_COMPAT_DETAIL_EN = {
    ca_phosphate_mkp: {
      title: '🔴 Not compatible',
      que: 'Formation of calcium phosphate (Ca₃(PO₄)₂) → poorly soluble precipitate.',
      impacto: ['↓ Ca availability', '↓ P availability', 'risk of emitter / line clogging'],
      factor: 'Concentration and local mix pH.',
      cond: ['❌ Not in the same stock solution with orthophosphate phosphates.', '⚠️ Risk even near neutral pH if concentration is high.'],
      accion: ['Separate into tank A / B', 'Inject separately', 'Dilute well before in-line mixing if the design allows']
    },
    ca_sulfate: {
      title: '🔴 Not compatible',
      que: 'Gypsum formation (CaSO₄·2H₂O) when mixing Ca²⁺ with SO₄²⁻ in a concentrated medium.',
      impacto: ['Turbidity', 'precipitate', 'clogging'],
      factor: 'Solubility product; worse in stock solution.',
      cond: ['Especially critical with ammonium sulfate, SOP or magnesium sulfate versus calcium nitrate.'],
      accion: ['Separate tanks', 'Order: dissolve first the one that precipitates less per your protocol', 'Never concentrate both in the same carboy']
    },
    ca_acid_phosphoric: {
      title: '🔴 Not compatible',
      que: 'Acid–base + phosphate reaction: Ca–P precipitates and local heat risk.',
      impacto: ['Precipitates', 'mix instability'],
      factor: 'Acid and calcium concentration.',
      cond: ['Do not mix concentrated phosphoric acid with calcium nitrate in the same small volume.'],
      accion: ['Acid in one tank, calcium in another', 'Strong dilution before reaching the line']
    },
    ca_acid_sulfuric: {
      title: '🔴 Not compatible',
      que: 'Sulfate + calcium → gypsum; also heat from acid dilution.',
      impacto: ['Precipitate', 'plastic component damage if local heat occurs'],
      factor: 'Concentration.',
      cond: ['Avoid concentrated co-dissolution.'],
      accion: ['Separate tanks', 'Safety: always acid into water, never the reverse']
    },
    metal_sulfate_phosphate: {
      title: '🔴 Not compatible',
      que: 'Micronutrient sulfates with MAP/MKP can form insoluble Fe/Zn/Mn/Cu phosphates.',
      impacto: ['Loss of micro and P', 'turbidity'],
      factor: 'pH and concentration.',
      cond: ['Very common in stock solution.'],
      accion: ['Chelated micros in another tank', 'or MAP/MKP separate from metal sulfates']
    },
    chelate_phosphate: {
      title: '🟡 Caution',
      que: 'Orthophosphates compete with chelates (especially Fe); exchange and efficacy loss can occur.',
      impacto: ['↓ available chelated Fe', 'slow tank interactions'],
      factor: 'Contact time and concentration.',
      cond: ['More delicate in concentrated stock solution.'],
      accion: ['Fe chelate in tank B', 'phosphates in A', 'mix only once diluted in-line']
    },
    kno3_sulfate_salting: {
      title: '🟡 Caution',
      que: 'K/NO₃ combinations with sulfates can reduce joint solubility (“salting out”).',
      impacto: ['Cold crystallization', 'sediments'],
      factor: 'Temperature and total salt concentration.',
      cond: ['Watch especially cold stock solution.'],
      accion: ['Reduce concentration', 'separate tanks', 'agitate / keep stable temperature']
    },
    strong_acids: {
      title: '🟡 Caution',
      que: 'Mixing strong acids together or with salts without a protocol can generate heat, splashes and decomposition.',
      impacto: ['Physicochemical risk', 'corrosion'],
      factor: 'Order and dilution.',
      cond: ['Each acid usually goes in a separate preparation stage.'],
      accion: ['Do not mix concentrates', 'PPE', 'water first']
    },
    default_c: {
      title: '🟢 Compatible (typical)',
      que: 'Under usual dilute working-solution conditions no severe precipitate is expected; always check the manufacturer sheet.',
      impacto: ['—'],
      factor: 'Final concentration and water quality.',
      cond: ['Validate in your installation.'],
      accion: ['Jar / small stock test before scaling']
    },
    default_r: {
      title: '🟡 Caution',
      que: 'Interaction or solubility limit per table and experience.',
      impacto: ['Possible turbidity or reduced efficacy'],
      factor: 'Concentration, pH, temperature.',
      cond: ['Monitor stock solution.'],
      accion: ['Dilute more', 'separate tanks', 'consult a technician']
    },
    default_i: {
      title: '🔴 Not compatible',
      que: 'High risk of precipitate or clogging under typical fertigation conditions.',
      impacto: ['Clogging', 'nutrient loss'],
      factor: 'Concentration.',
      cond: ['Avoid concentrated co-dissolution.'],
      accion: ['Separate A/B', 'separate injection']
    },
    same: {
      title: '🟢 Same product',
      que: 'No interaction between two lots of the same fertilizer in this matrix.',
      impacto: ['—'],
      factor: '—',
      cond: ['—'],
      accion: ['—']
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
