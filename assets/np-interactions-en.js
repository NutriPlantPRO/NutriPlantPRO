/** English copy for nutrient interactions, arrival, mobility and pH tools. */
(function (root) {
  'use strict';
  root.NP_INTERACTIONS_EN = {
    spec: {
      no3: {
        name: 'Nitrate',
        functional: ['Protein synthesis (with NH₄⁺)', 'Anionic balance', 'Link to cation uptake'],
        shortTip: 'Blue synergies = frequent joint management (e.g. KNO₃, ammoniacal N + nitrate, Mo in the NO₃⁻ chain). Excess Cl⁻ can compete for transport (red).'
      },
      nh4: {
        name: 'Ammonium',
        functional: ['Direct assimilation (less carbon than NO₃⁻)', 'Effect on rhizosphere and local pH'],
        shortTip: 'High NH₄⁺ can compete for transport sites with K⁺, Ca²⁺ and Mg²⁺ and alter cation balance.'
      },
      h2po4: {
        name: 'Phosphate (acid/alkaline forms depending on pH)',
        functional: ['Energy (ATP/ADP)', 'Nucleic acids', 'Root strategy'],
        shortTip: 'High P in soil/solution is often linked to relative antagonism of micronutrients (Zn, Fe, Cu, Mn) and with Ca²⁺ (precipitation / phosphate fixation in calcareous or high-Ca soils); check ratios and pH.'
      },
      k: {
        name: 'Potassium',
        functional: ['Osmotic regulation', 'Sugar transport', 'Stomatal opening and closing'],
        shortTip: 'High K can pressure Mg and Ca uptake or balance, especially when the cation ratio is unbalanced.'
      },
      ca: {
        name: 'Calcium',
        functional: ['Cell wall', 'Membranes', 'Signal transmission'],
        shortTip: 'Excess P can reduce available Ca²⁺ by precipitation/fixation; other cations or low transpiration also affect delivery to fruit and young tissues.'
      },
      mg: {
        name: 'Magnesium',
        functional: ['Center of chlorophyll', 'Enzyme activation'],
        shortTip: 'Relative excess of K, Ca or NH₄ can affect Mg balance.'
      },
      so4: {
        name: 'Sulfate',
        functional: ['Sulfur amino acids', 'Stress and defenses'],
        shortTip: 'Excess sulfate can affect molybdate uptake under some conditions (anion competition).'
      },
      fe: {
        name: 'Iron (speciation depending on pH and oxygen)',
        functional: ['Chloroplasts', 'Redox enzymes'],
        shortTip: 'High P, excess Zn or Cu, and Mn under acidic conditions often worsen available Fe; high pH and carbonates also. Mo supports the N chain when NO₃⁻ is present.'
      },
      mn: {
        name: 'Manganese',
        functional: ['Photosynthesis (photosystem)', 'Enzyme activation'],
        shortTip: 'Interacts with pH and sometimes with Fe, Cu and P; with Cu and Zn, competition usually prevails over uptake synergy.'
      },
      zn: {
        name: 'Zinc',
        functional: ['Auxins', 'enzymes', 'membrane integrity'],
        shortTip: 'High P, excess Fe or Cu, and Mn in acid soils can induce relatively low Zn; check soil and leaf P:Zn ratio.'
      },
      cu: {
        name: 'Copper',
        functional: ['Lignification', 'photosynthesis'],
        shortTip: 'Excess Zn or interference with Fe/P can modify Cu balance; with Mn there is usually more competition than synergy.'
      },
      b: {
        name: 'Boron (speciation depending on pH)',
        functional: ['Cell wall', 'Cell division', 'Pollination'],
        shortTip: 'High Ca can reduce available B; B is sensitive to moisture and leaching.'
      },
      moo4: {
        name: 'Molybdate',
        functional: ['Nitrate reductase', 'N fixation', 'Fe cofactors in the N chain'],
        shortTip: 'Excess SO₄²⁻ can compete with MoO₄²⁻. The link with Fe is functional (N enzymes), not direct uptake synergy.'
      },
      cl: {
        name: 'Chloride',
        functional: ['Ionic balance', 'photosynthesis (PSII)', 'osmotic adaptation'],
        shortTip: 'Cl⁻ and NO₃⁻ compete under some conditions (red). With K⁺ and NH₄⁺ it is often managed in common salts (KCl, NH₄Cl).'
      }
    },

    arrival: {
      no3: {
        name: 'Nitrate',
        dom: 'Mass flow',
        mean: 'Moves well with water toward roots when there is active transpiration.',
        dep: 'Transpiration, soil moisture, root distribution.',
        risk: 'Leaching if supply exceeds demand and the system is permeable.'
      },
      nh4: {
        name: 'Ammonium',
        dom: 'Diffusion + mass flow (depending on retention)',
        mean: 'Much remains exchangeable; in solution it is usually less mobile than nitrate: arrival mixes diffusion and mass flow depending on CEC, nitrification and solution recharge.',
        dep: 'CEC, moisture, temperature, nitrification, cation competition.',
        risk: 'Ammonium toxicity if it accumulates; competition with K⁺, Ca²⁺, Mg²⁺.'
      },
      h2po4: {
        name: 'Phosphate',
        dom: 'Diffusion',
        mean: 'Moves slowly toward the root; “availability” in analysis is not always the same as delivery to the rhizosphere.',
        dep: 'Moisture, active root, pH, Ca, Fe, Al and temperature.',
        risk: 'There may be P in the soil, but not necessarily entering at the rate the plant demands.'
      },
      k: {
        name: 'Potassium',
        dom: 'Diffusion (strong) + mass flow',
        mean: 'Under high demand a lower-concentration zone often forms near the root; in many systems effective arrival is explained more by diffusion from exchangeable potassium (and solution content) than by transpired water volume alone.',
        dep: 'CEC, soil K⁺ buffers, moisture, root density, transpirative demand.',
        risk: 'Imbalance with other cations; leaching in sandy soils.'
      },
      ca: {
        name: 'Calcium',
        dom: 'Mass flow + root interception',
        mean: 'Depends heavily on water movement, transpiration and active root.',
        dep: 'Moisture, EC, VPD, active root and tissue demand.',
        risk: 'There may be Ca in soil but poor delivery to fruit or young tissues (low “conductivity” toward apices and fruit).'
      },
      mg: {
        name: 'Magnesium',
        dom: 'Mass flow + diffusion',
        mean: 'Less dominant than Ca in pure mass flow; important diffusion contribution.',
        dep: 'CEC, moisture, competition with K⁺/NH₄⁺/Ca²⁺.',
        risk: 'Relative deficiency under high-K fertilization.'
      },
      so4: {
        name: 'Sulfate',
        dom: 'Mass flow + diffusion',
        mean: 'Mobile anion in solution; lower retention than phosphate in many soils.',
        dep: 'Moisture, leaching, foliar or water sulfur supply.',
        risk: 'Leaching; interaction with MoO₄²⁻ under excess sulfate.'
      },
      fe: {
        name: 'Iron (speciation)',
        dom: 'Diffusion + rhizosphere',
        mean: 'In solution Fe is usually very dilute, so drag with transpiration contributes little versus diffusion and the rhizosphere (pH, chelates, redox, solids).',
        dep: 'pH, carbonates, redox, competition (Cu, Mn, Zn), rhizosphere.',
        risk: 'Iron chlorosis at high pH even when total Fe is high.'
      },
      mn: {
        name: 'Manganese',
        dom: 'Diffusion + mass flow (depending on pH)',
        mean: 'Very sensitive to pH and redox.',
        dep: 'Low pH increases available Mn (watch toxicity).',
        risk: 'Toxicity in acid soils; deficiency in alkaline ones.'
      },
      zn: {
        name: 'Zinc',
        dom: 'Mainly diffusion',
        mean: 'Low mobility in soil; diffusion toward the rhizosphere.',
        dep: 'pH, P, carbonates, organic matter.',
        risk: 'Relative deficiency with high P.'
      },
      cu: {
        name: 'Copper',
        dom: 'Diffusion',
        mean: 'Uptake linked to complexing organic matter and pH.',
        dep: 'pH, OM, antagonisms with Zn/Fe.',
        risk: 'Toxicity from accumulated copper fungicides; deficiency in highly calcareous soils.'
      },
      b: {
        name: 'Boron',
        dom: 'Diffusion + mass flow (depending on species and transpiration)',
        mean: 'Movement to the root by diffusion of boric acid; mass flow with transpiration in xylem.',
        dep: 'Moisture, texture, leaching, Ca, pH.',
        risk: 'Deficiency bands from lack of moisture; toxicity in excess.'
      },
      moo4: {
        name: 'Molybdate',
        dom: 'Mass flow + diffusion',
        mean: 'Anion in competition with sulfate.',
        dep: 'SO₄²⁻, pH, organic matter.',
        risk: 'Deficiency in acid soils (Mo less available) depending on mineralogy (general rules).'
      },
      cl: {
        name: 'Chloride',
        dom: 'Mass flow',
        mean: 'Highly mobile in solution with water.',
        dep: 'Supply (water/fertilizer), runoff, NO₃⁻.',
        risk: 'Varietal sensitivity to Cl⁻; competition with NO₃⁻ in some contexts.'
      }
    },

    mobility: {
      N: {
        mob: 'High',
        where: 'Old leaves',
        sym: 'General chlorosis / yellowing, sometimes with paler lower leaves',
        tip: 'Early deficiency usually shows on older leaves when N is mobilized to new tissues.',
        functions: [
          {
            text: 'Synthesis of proteins, enzymes and nitrogenous metabolites',
            detail: 'N enters amino acids and nitrogenous bases; low intake limits mitosis, bud break and filling-tissue formation.'
          },
          {
            text: 'Chlorophyll and photosynthesis',
            detail: 'Chlorophyll contains N in its ring; when lacking, foliage pales and photosynthetic yield falls before highly specific signs appear.'
          },
          {
            text: 'Vegetative growth, branching and leaf area',
            detail: 'New shoots and leaves act as an active sink; N is mobilized from older tissue, hence the classic deficiency pattern.'
          },
          {
            text: 'Link to hormones and abiotic-stress response',
            detail: 'Modulates cytokinin routes and responses to shade, salinity or water restriction; it is not only “volume”, but also physiological plasticity.'
          }
        ]
      },
      P: {
        mob: 'High',
        where: 'Old leaves',
        sym: 'Darker foliage tones, purples in veins or stems in some crops; reduced growth',
        tip: 'Cold, P-fixing soils or extreme pH can worsen symptoms even when soil analysis is “medium”.',
        functions: [
          {
            text: 'Energy (ATP/ADP) and phosphate transfer',
            detail: 'Without ATP there is no electrogenic transport, biosynthesis or gradient maintenance; metabolism “slows” as a block.'
          },
          {
            text: 'Nucleic acids (DNA/RNA) and cell division',
            detail: 'DNA/RNA are polyphosphates; meristems, flowers and seeds are exposed because cellular demand grows quickly in those zones.'
          },
          {
            text: 'Root development, flowering and seed/fruit formation',
            detail: 'Root architecture and the flowering→pollination→filling sequence need continuous P pulses at key stages.'
          },
          {
            text: 'Metabolic regulation and phosphorylated compounds',
            detail: 'Many signals and regulators transit through phosphorylated states; deficiency shows slow growth and impoverished metabolism.'
          }
        ]
      },
      K: {
        mob: 'High',
        where: 'Old leaves',
        sym: 'Marginal chlorosis or darkening; edge necrosis (“scorch”) in advanced cases',
        tip: 'Can be confused with Mg; check leaf K/Mg/Ca and marginal vs interveinal symptoms.',
        functions: [
          {
            text: 'Osmotic regulation and stomatal opening/closing',
            detail: 'K⁺ accompanies guard cells; controls transpiration, CO₂ entry and foliage cooling under heat or water stress.'
          },
          {
            text: 'Sugar mobilization and osmotic load in fruit',
            detail: 'Movement of photoassimilates to fruit is often related to osmotic gradients where K is a protagonist.'
          },
          {
            text: 'Quality (color, flavor, firmness) and stress tolerance',
            detail: 'Affects pigmentation, firmness and tissue water balance; deficiencies show relative quality losses even when the “classic” symptom is still mild.'
          },
          {
            text: 'Enzyme activation and ionic balance with other cations',
            detail: 'Coexists in the root solution with Ca²⁺, Mg²⁺ and NH₄⁺; leaf K/Mg/Ca balance clarifies better than an isolated soil figure.'
          }
        ]
      },
      Mg: {
        mob: 'High',
        where: 'Old leaves',
        sym: 'Interveinal chlorosis on mature blades, veins often greener',
        tip: 'Relative excess of K, Ca or NH₄ can alter Mg balance even when overall analysis seems sufficient.',
        functions: [
          {
            text: 'Central atom of the chlorophyll molecule',
            detail: 'Without stable Mg there is no functional Mg-porphyrin ring; interveinal chlorosis on mature blades is a frequent signal when it is mobilized from older tissue.'
          },
          {
            text: 'Photosynthesis and key enzymes (e.g. activators)',
            detail: 'Acts as a cofactor in energy-transfer reactions; “turns down” photochemical routes if availability is low.'
          },
          {
            text: 'Carbon metabolism and light response',
            detail: 'Integrated photosynthetic yield depends on chloroplast–cytoplasm coupling; insufficient Mg reduces effective use of useful light.'
          },
          {
            text: 'Lipid synthesis and membrane stability',
            detail: 'Participates in membrane lipids and phospholipids; not every Mg symptom is limited to the classic interveinal pattern after long deficiencies.'
          }
        ]
      },
      Mo: {
        mob: 'High (plant Mo matrix can vary)',
        where: 'Old leaves (sometimes confused with N deficiency)',
        sym: 'General yellowing or mottling; in legumes it can link to nitrate-use efficiency',
        tip: 'Interpret with species, form of N supplied and foliar symptoms; it is not a single “classic” across all cards.',
        functions: [
          {
            text: 'Cofactor of nitrate reductase and N-metabolism enzymes',
            detail: 'NO₃⁻ → NO₂⁻ reduction stops if Mo is lacking; the symptom can look like “N shortage” while nitrate is present in solution or soil.'
          },
          {
            text: 'Biological N fixation in legumes (nodules)',
            detail: 'Nitrogenase in many symbiotic systems requires the Fe–Mo center; without it nodules exist but effective supply falls.'
          },
          {
            text: 'Nucleic-acid and sulfur metabolism (specific contexts)',
            detail: 'In nitrogen-assimilation routes there are links with sulfur compounds; helps contextualize symptoms with the species N/S program.'
          }
        ]
      },
      S: {
        mob: 'Intermediate / low depending on crop and stage',
        where: 'Young leaves',
        sym: 'More uniform chlorosis on new tissue; in some species it may associate with reddish tones',
        tip: 'In hydroponics or inert media it can show on young leaves before other “classic” patterns.',
        functions: [
          {
            text: 'Disulfide bridges in proteins (structure and enzymes)',
            detail: 'Stabilizes protein folding in chloroplasts and tissues; deficiency affects structures that renew in new leaves.'
          },
          {
            text: 'Defense compounds and sulfur secondary metabolites',
            detail: 'Glucosinolates, alliins or other S compounds participate in defense against pests/pathogens and in aromatic quality.'
          },
          {
            text: 'Photosynthesis (protein components of the photosynthetic apparatus)',
            detail: 'Several photosystem proteins contain cysteine; after prolonged deficiency more homogeneous paleness intensifies on young tissues.'
          }
        ]
      },
      Fe: {
        mob: 'Low',
        where: 'Young leaves',
        sym: 'Interveinal chlorosis with greener veins (typical pattern, depending on species)',
        tip: 'High pH, bicarbonates or root-zone cold can induce iron chlorosis with high “total” Fe in soil.',
        functions: [
          {
            text: 'Chloroplast synthesis and maintenance (indirect effect on chlorophyll)',
            detail: 'Fe intervenes in chlorophyll biosynthesis machinery inside the chloroplast; symptoms express during lamina expansion.'
          },
          {
            text: 'Electron-transport chain in photosynthesis and respiration',
            detail: 'Cytochrome complexes depend on Fe; before marked necrosis, lower efficiency and “light” chloroplasts appear.'
          },
          {
            text: 'Redox enzymes and nitrogen metabolism',
            detail: 'Nitrogen assimilation/reduction routines load iron–sulfur systems; chlorosis can overlap with heavily nitrate-based programs.'
          }
        ]
      },
      Mn: {
        mob: 'Low',
        where: 'Young leaves',
        sym: 'Mottling, interveinal chlorosis; “bird’s-eye” spots in some cases',
        tip: 'Symptoms can resemble Fe; leaf age and symptom pattern help guide diagnosis.',
        functions: [
          {
            text: 'Photosynthesis (photosystem and photoprotection)',
            detail: 'The water-splitting complex carries an Mn center; photooxidation rises when the enzymatic equipment is not well assembled.'
          },
          {
            text: 'Enzyme activation and oxygen metabolism',
            detail: 'Mn²⁺ activates dozens of hydrolases and decarboxylases; it affects local lignification and orderly lamina development.'
          },
          {
            text: 'Oxidative defense (stress context)',
            detail: 'In plants under high-light stress/electron overflow, Mn partially balances excess radicals when available in young leaves.'
          }
        ]
      },
      Zn: {
        mob: 'Low',
        where: 'Young leaves',
        sym: 'Smaller leaves, chlorosis, “stiff” or cardboard-like leaves in sensitive crops',
        tip: 'High P, cold or root restriction often worsen foliar expression.',
        functions: [
          {
            text: 'Auxins and foliar morphogenesis',
            detail: 'Regulates effective auxin levels in apices; deficiency shows as small rosette leaves (“stunting”) before other late signs.'
          },
          {
            text: 'Enzyme cofactor (carbohydrates, proteins, defense)',
            detail: 'Carbonic anhydrase, carboxypeptidases or other Zn-dependent dehydrogenases couple photosynthesis and photoassimilate use.'
          },
          {
            text: 'Membrane integrity and meristematic growth',
            detail: 'The apical meristem is sensitive because rapid division spends synthetic routes that use zinc at several enzymatic points.'
          }
        ]
      },
      Cu: {
        mob: 'Low',
        where: 'Young leaves',
        sym: 'Deformation, chlorosis; apices may necrose in severe cases',
        tip: 'Watch accumulation from copper fungicides in intensive programs.',
        functions: [
          {
            text: 'Lignification and cell wall',
            detail: 'Copper-dependent laccases or oxidases harden vessels and sclerenchyma; deficiencies produce “soft” or curved blades.'
          },
          {
            text: 'Photosynthesis (plastocyanin) and oxidative metabolism',
            detail: 'Plastocyanin carries electrons between photosystems; a bottleneck there has a rapid effect on new chloroplasts.'
          },
          {
            text: 'Pollen and fertility (depending on crop)',
            detail: 'Fertile pollen needs enzymatic integrity and adequate pollen wall; Cu deficiency appears earlier in strongly generative programs.'
          }
        ]
      },
      Ca: {
        mob: 'Low (little redistributed in phloem)',
        where: 'Young tissues, meristems, growing points and fruits',
        sym: 'Marginal necrosis on new leaves, deformation, blossom-end rot or other fruit necroses',
        tip: 'There may be adequate soil Ca and still fail in fruit/meristem due to poor distribution or low local transpiration.',
        functions: [
          {
            text: 'Cell wall (pectins) and tissue stability',
            detail: 'Ca²⁺ ion bridges between pectins give firmness; young tissues with low transpirational flow are typical failure foci.'
          },
          {
            text: 'Membranes and signaling (calmodulin, stimulus response)',
            detail: 'Calmodulin transduces cytosolic Ca signals; this ties responses to brief drought or wounding with membrane-dependent integrity.'
          },
          {
            text: 'Integrity of fruit and expanding tissues',
            detail: 'Fast-filling fruits (tomato, peppers, some berries) show BER or other necroses even if soil reports “adequate” Ca.'
          }
        ]
      },
      B: {
        mob: 'Low in most crops (exception: “boron-mobile” via polyols in some)',
        where: 'Shoots, buds, meristems, flowers and fruits',
        sym: 'Death of growing points, deformation, irregular flowering or fruit set',
        tip: 'In apple, pear (rosaceae), avocado (sensitive in dense floral waves) and crops delicate in pollination/fruit set, effective B behavior often differs from olive or grape; validate symptoms and leaf/water–soil analysis by crop.',
        functions: [
          {
            text: 'Cell wall and membrane stability',
            detail: 'B intervenes in the pectin network and in links that order the new wall; deformed shoots or “thickened” blades suggest less orderly tissue assembly.'
          },
          {
            text: 'Pollination (pollen tube) and flower retention',
            detail: 'The pollen tube must traverse the style in an orderly way and needs synthetic continuity; floral abortion or poorly viable pollen can appear before marked necrosis.'
          },
          {
            text: 'Sugar transport and expanding meristems',
            detail: 'Associated with photoassimilate mobilization toward growing points; meristems and new flowers quickly reveal a transport–metabolic bottleneck.'
          },
          {
            text: 'Fruit quality and lignification (depending on stage/crop)',
            detail: 'In avocado, deficit often relates to deformed fruit, irregular lignification or aborted fruitlets in tense flowering waves; also in other sensitive crops under high load.'
          }
        ]
      }
    },

    ph: {
      N: {
        name: 'Nitrogen',
        tag: 'OM, mineralization and N management',
        intro: 'The N the plant “sees” integrates organic sources (mineralization), applications and losses; it is not a single number fixed by pH alone.',
        bullets: [
          'At <strong>very acid pH</strong>, OM mineralization and useful microbial activity often decline.',
          'At <strong>intermediate pH</strong> there is often greater microbial activity and organic-N recycling.',
          'At <strong>high pH</strong>, poor urea / ammonia management can favor <strong>NH₃ volatilization</strong>.',
          '<strong>NO₃⁻</strong> is highly mobile: it can <strong>leach</strong> with excess water in the profile.'
        ]
      },
      P: {
        name: 'Phosphorus',
        tag: 'Chemical fixation in soil',
        intro: '“Available” P falls sharply when fixed to Fe/Al oxides (acid) or precipitated with Ca (calcareous). That is why the curve is a “hump” centered on moderate pH (texture and OM reshape it).',
        bullets: [
          '<strong>Acid</strong> soils: strong adsorption to <strong>Fe/Al</strong>; P may be “in the analysis” but little in solution.',
          '<strong>Calcareous / high-pH</strong> soils: precipitation with <strong>Ca</strong>, low-solubility phosphates.',
          'Illustrative optimum ~ <strong>6.0–6.8</strong> (not a universal rule: clay, OM and ionic balance change everything).'
        ]
      },
      K: {
        name: 'Potassium',
        tag: 'Effective CEC and cation balance',
        intro: 'K⁺ exchanges on surfaces; as pH rises, effective CEC often increases on variable-charge soils and improves the exchangeable “pool”, except for blocks from salinity or compaction.',
        bullets: [
          'At <strong>low pH</strong> there is sometimes lower saturation versus Al³⁺/H⁺ and lower exchangeable base.',
          'As <strong>pH rises</strong> (to a point) <strong>CEC</strong> often increases on variable colloids → more cationic retention.',
          'In <strong>saline soils / very high K</strong> the problem may be ionic balance, not “lack of pH”.'
        ]
      },
      S: {
        name: 'Sulfur',
        tag: 'Sulfate and organic OM',
        intro: 'Available S relates to mineralization of sulfated organic matter and to SO₄²⁻ in solution; at high pH the anion can be more mobile and leach.',
        bullets: [
          '<strong>OM</strong>: main organic reservoir; mineralization depends on biota and moisture.',
          '<strong>High pH / heavy irrigation</strong>: risk of <strong>SO₄²⁻ leaching</strong> in sandy profiles.',
          'Do not confuse with deficiencies from <strong>insufficient supply</strong> in highly depleted soils.'
        ]
      },
      Ca: {
        name: 'Calcium',
        tag: 'CEC, bases and balance',
        intro: 'Ca²⁺ is part of the adsorbed complex; it often rises with base saturation toward neutral pH, but “available Ca” also depends on carbonates, SO₄, Na and ionic strength.',
        bullets: [
          'Under <strong>strong acidification</strong> there can be more toxic Al/Mn and root pressure even if total Ca looks medium.',
          'In <strong>calcareous</strong> soils there is much “total” Ca but there can be interference from other ions or low activity in the rhizosphere.',
          '<strong>BER / tip burn</strong> is sometimes plant transport, not only “soil pH”.'
        ]
      },
      Mg: {
        name: 'Magnesium',
        tag: 'CEC and cation competition',
        intro: 'Mg²⁺ competes with K⁺, NH₄⁺ and Ca²⁺ for adsorption and transport sites. The curve shape is indicative: sandy soils and leaching can “flatten” what the drawing suggests.',
        bullets: [
          '<strong>Excess K</strong> can push relative Mg deficiency even with “medium” soil Mg.',
          '<strong>Ca/Mg</strong> patterns in the complex are key in many regions.',
          'At <strong>extreme pH</strong> the problem can be toxicity (Al) more than chemically low Mg.'
        ]
      },
      Fe: {
        name: 'Iron',
        tag: 'Oxide/hydroxide precipitation',
        intro: 'Available Fe falls sharply as pH rises due to precipitation and hydrolysis; that is why iron chlorosis is common in calcareous soils or with bicarbonates in irrigation water.',
        bullets: [
          'The plant mainly takes <strong>Fe²⁺</strong> / chelates, not soil “total Fe”.',
          'At <strong>high pH</strong>, supplying <strong>chelates</strong> or reducing antagonism (HCO₃⁻) is classic management.',
          '<strong>Foliar</strong> is a useful resource but the underlying problem is usually rhizosphere chemistry.'
        ]
      },
      Mn: {
        name: 'Manganese',
        tag: 'Redox and pH',
        intro: 'Mn becomes more available in acid soils; it can be toxic; in alkaline conditions it falls and resembles iron deficiencies on young leaves.',
        bullets: [
          'At <strong>low pH</strong> watch <strong>toxicity</strong> more than deficiency.',
          'At <strong>high pH</strong> it can compete with Fe in the symptom picture (fine discrimination with analysis).',
          'Rhizosphere oxygenation (waterlogging) changes the Mn game via <strong>redox</strong>.'
        ]
      },
      B: {
        name: 'Boron',
        tag: 'Speciation and leaching',
        intro: 'Boric acid / borate changes with pH; intermediate ranges often have better balance; in alkaline conditions and with irrigation it can leach or behave “oddly” on clays.',
        bullets: [
          'Narrow management window: between <strong>deficiency and toxicity</strong> there is little margin in many crops.',
          '<strong>High pH + strong leaching</strong> can lower B even if the soil “is not extreme”.',
          'Variety and <strong>boron mobility</strong> change the plant symptom.'
        ]
      },
      Cu: {
        name: 'Copper',
        tag: 'Adsorption and complexation',
        intro: 'Cu and other positively charged micros adsorb more strongly as pH rises (more negative surfaces, precipitation). In acid conditions there is often more in solution with toxicity risk from accumulation if copper fungicides are used.',
        bullets: [
          '<strong>Organic</strong> soils or high-OM soils can strongly complex Cu.',
          'Excess <strong>P</strong> or ionic interactions can change availability readings.',
          'Toxicity from <strong>copper fungicides</strong> in intensive programs.'
        ]
      },
      Zn: {
        name: 'Zinc',
        tag: 'Adsorption and pH',
        intro: 'Like Fe/Mn/Cu, Zn is usually more soluble in acid conditions and falls as alkalinity rises; carbonates and high phosphates worsen “functional availability”.',
        bullets: [
          '<strong>High P</strong> can induce relative Zn deficiency even if the map shows a general shape.',
          'Cold roots / compaction reduce uptake even when the soil “has Zn”.',
          'Check <strong>clay matrix</strong> vs texture (CEC and adsorption).'
        ]
      },
      Mo: {
        name: 'Molybdenum',
        tag: 'Anionic / MoO₄²⁻ form',
        intro: 'Mo as molybdate behaves as a higher-charge anion at high pH; in very acid soils relative availability can be lower depending on mineralogy and adsorption.',
        bullets: [
          'That is why under <strong>extreme acidity</strong> correcting pH or applying Mo accordingly is sometimes recommended.',
          'Interaction with excess <strong>SO₄²⁻</strong> (anion competition) can appear in practice.',
          'Important for <strong>nitrate reductase</strong> and legumes (fixation).'
        ]
      },
      Cl: {
        name: 'Chlorine',
        tag: 'Highly mobile anion',
        intro: 'Cl⁻ is an anion that competes in solution; its “curve” illustrates qualitative availability more than a universal limit — in water quality and fertilization excess can come before deficiency.',
        bullets: [
          '<strong>High mobility</strong> with water flow; it can accumulate or wash depending on balance.',
          'Varietal sensitivity to Cl⁻ in certain crops.',
          'Integrate with <strong>irrigation-water</strong> analysis and the nutrient program.'
        ]
      },
      Al: {
        name: 'Aluminum (toxicity)',
        tag: 'Toxicity · not a nutrient',
        intro: '“Available” here is a risk signal: Al³⁺ is toxic to roots at very low pH. As pH rises it precipitates as hydroxide and falls in solution (it is not a fertilizer).',
        bullets: [
          'Strongly associated with <strong>pH < ~5.5</strong> and high exchangeable aluminum.',
          'Precipitation as <strong>Al(OH)₃</strong> when neutralizing.',
          'Mitigate with lime/dolomite/gypsum per diagnosis; always validate with analysis and crop.'
        ]
      }
    },

    labels: {
      lead: 'Teaching tool: (1) ion interactions, (2) pathways to the root, (3) mobility and plant symptoms, and (4) relative availability vs soil pH (indicative). Real behavior depends on crop, soil, texture, OM, water and management.',
      leadHtml: 'Teaching tool: (1) ion interactions, (2) pathways to the root, (3) mobility and plant symptoms, and (4) relative availability vs soil pH (indicative).<br>Real behavior depends on crop, soil, texture, OM, water and management.',
      title: 'Nutrient interactions and mobility',
      tab1: '1 · Interaction diagram',
      tab2: '2 · Pathways to the root',
      tab3: '3 · Mobility and symptoms',
      tab4: '4 · Availability and pH',
      panel1Heading: 'Mulder-style diagram (ions and common forms)',
      panel1Hint: 'Tap an icon in the circle: in red, <strong>antagonism/competition</strong> (two-way reference); in blue, <strong>synergy</strong> per the selected ion card.',
      diagramCaption: 'Illustrative interactions (not exhaustive)',
      diagramLegend: 'Red: competition / antagonism · Blue: synergy / joint favoring',
      tapIon: 'Tap an ion in the diagram',
      tapIonBody: 'Press a circle in the diagram to see its card.',
      competeAntagonize: 'Competes / antagonizes with (reference):',
      synergy: 'Synergy / joint favoring (from this ion):',
      sinergia: 'synergy',
      functionalRelations: 'Functional relationships (concepts):',
      shortTip: 'Quick note:',
      datoCorto: 'Quick note',
      viaDominante: 'Dominant pathway:',
      queSignifica: 'What it means:',
      dependeDe: 'Depends on:',
      riesgoComun: 'Common risk:',
      fichaIon: 'Ion card',
      fichaElemento: 'Element card',
      movilidad: 'Mobility:',
      dondePrimero: 'Where it shows first:',
      sintomaComun: 'Common symptom:',
      funcionesPrincipales: 'Main functions',
      tip: 'Tip:',
      flujoMasas: 'Mass flow',
      difusion: 'Diffusion',
      intercepcion: 'Root interception',
      hojasViejas: 'Old leaves (mobile)',
      hojasJovenes: 'Young leaves',
      meristemos: 'Meristems / fruits',
      panel2Heading: 'Pathways to the root',
      panel3Heading: 'Plant mobility and typical symptom zone',
      panel4Heading: 'Nutrient availability and soil pH (H₂O)',
      footer: 'NutriPlant PRO — educational material. Antagonisms and percentages are general references; validate with analysis, symptoms and local advice.'
    }
  };
})(typeof window !== 'undefined' ? window : globalThis);
