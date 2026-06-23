/** Quick local test for radar pilot pipeline */
const { findSentinel2ScenesForComposite } = require('../../netlify/functions/lib/radar-pilot-stac');
const { renderNdviNdmiCompositePngs } = require('../../netlify/functions/lib/radar-pilot-render');

const polygon = [
  [19.7175, -103.4343],
  [19.7185, -103.4323],
  [19.7165, -103.4323]
];

(async () => {
  console.log('Searching scenes (30d composite)...');
  const bundle = await findSentinel2ScenesForComposite(polygon, {});
  console.log('Scenes:', bundle.sceneCount, bundle.dateStart, '–', bundle.dateEnd);
  const rendered = await renderNdviNdmiCompositePngs(
    { scenes: bundle.scenes, bbox4326: bundle.bbox, polygon },
    { maxDim: 512 }
  );
  console.log('OK PNG bytes NDVI:', rendered.ndviPng.length, 'NDMI:', rendered.ndmiPng.length);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
