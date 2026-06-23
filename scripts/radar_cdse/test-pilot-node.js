/** Quick local test for radar pilot pipeline */
const { findBestSentinel2Scene } = require('../../netlify/functions/lib/radar-pilot-stac');
const { renderNdviNdmiPngs } = require('../../netlify/functions/lib/radar-pilot-render');

const polygon = [
  [19.4326, -99.1332],
  [19.4336, -99.1312],
  [19.4316, -99.1312]
];

(async () => {
  console.log('Searching scene...');
  const scene = await findBestSentinel2Scene(polygon, { lookbackDays: 120 });
  console.log('Scene:', scene.itemId, scene.datetime, scene.cloudCover);
  const rendered = await renderNdviNdmiPngs(
    { bandUrls: scene.bandUrls, bbox4326: scene.bbox },
    { maxDim: 512 }
  );
  console.log('OK PNG bytes NDVI:', rendered.ndviPng.length, 'NDMI:', rendered.ndmiPng.length);
})().catch((e) => {
  console.error('FAIL', e);
  process.exit(1);
});
