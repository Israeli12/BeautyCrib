/**
 * Beauty Crib logo preparation.
 *
 *   node tools/logo.js
 *
 * Traces the supplied raster logo files into clean SVGs (wordmark, monogram,
 * full lockup) and writes transparent PNG fallbacks plus favicon sizes.
 * Source files in the project root are never modified.
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const potrace = require('potrace');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'website', 'assets', 'img', 'logo');
fs.mkdirSync(OUT, { recursive: true });

const SOURCES = {
  // The wordmark file clips the bottom of the monogram along its top edge, so that band is cropped off.
  wordmark: { file: 'Beauty Cib-words.jpeg', crop: { left: 0, top: 40, width: 1226, height: 371 } },
  lockup: { file: 'Beauty Cib.jpg.jpeg', crop: null },
  monogram: { file: 'Beauty Cib.jpg.jpeg', crop: { left: 0, top: 0, width: 1226, height: 1255 } }
};

function traceToSvg(buffer, options) {
  return new Promise((resolve, reject) => {
    potrace.trace(buffer, options, (err, svg) => (err ? reject(err) : resolve(svg)));
  });
}

/** Black artwork on a transparent ground, tightly trimmed. */
async function flatten(file, crop) {
  let pipeline = sharp(path.join(ROOT, file));
  if (crop) pipeline = pipeline.extract(crop);
  const { data, info } = await pipeline.grayscale().normalise().raw().toBuffer({ resolveWithObject: true });
  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0; i < data.length; i++) {
    const v = data[i];
    // Anything darker than mid grey becomes solid black; lighter pixels fade out.
    const alpha = v > 200 ? 0 : v < 120 ? 255 : Math.round(((200 - v) / 80) * 255);
    rgba[i * 4] = 0;
    rgba[i * 4 + 1] = 0;
    rgba[i * 4 + 2] = 0;
    rgba[i * 4 + 3] = alpha;
  }
  return sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer()
    .then((buf) => sharp(buf).trim({ threshold: 5 }).png().toBuffer());
}

/** potrace emits a white background rect and black fill; strip both so CSS colour wins. */
function tidySvg(svg) {
  return svg
    .replace(/<rect[^>]*\/>\s*/g, '')
    .replace(/fill="#?[0-9a-fA-F]{3,6}"/g, 'fill="currentColor"')
    .replace(/<svg /, '<svg fill="currentColor" ');
}

(async () => {
  for (const [name, { file, crop }] of Object.entries(SOURCES)) {
    const png = await flatten(file, crop);
    const meta = await sharp(png).metadata();

    // Transparent PNG fallback at a generous retina size.
    await sharp(png).resize({ width: Math.min(meta.width, 1400), withoutEnlargement: true })
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT, `${name}.png`));

    // Trace to SVG from a high-contrast black-on-white version.
    const forTrace = await sharp(png)
      .flatten({ background: '#ffffff' })
      .grayscale()
      .threshold(170)
      .png()
      .toBuffer();
    const svg = tidySvg(await traceToSvg(forTrace, { threshold: 170, turdSize: 4, optTolerance: 0.25, color: '#000000', background: '#ffffff' }));
    fs.writeFileSync(path.join(OUT, `${name}.svg`), svg);

    const svgKb = (Buffer.byteLength(svg) / 1024).toFixed(1);
    console.log(`${name}: ${meta.width}x${meta.height}  svg ${svgKb} KB`);
  }

  // Favicons from the monogram, padded onto a white square.
  const mono = await flatten(SOURCES.monogram.file, SOURCES.monogram.crop);
  for (const size of [32, 180, 512]) {
    const inner = Math.round(size * 0.78);
    await sharp({ create: { width: size, height: size, channels: 4, background: '#ffffff' } })
      .composite([{ input: await sharp(mono).resize({ height: inner, withoutEnlargement: false }).png().toBuffer(), gravity: 'centre' }])
      .png()
      .toFile(path.join(OUT, `favicon-${size}.png`));
  }
  console.log('favicons: 32, 180, 512');
})();
