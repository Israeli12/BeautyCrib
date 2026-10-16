// Fits each intake photograph onto a 1500x1875 white canvas, the 4:5 the store
// already uses. These are studio shots on a plain background, so "contain" on
// white keeps the product whole and the join invisible.
const sharp = require(require.resolve('sharp', { paths: [process.cwd() + '/tools'] }));
const fs = require('fs'), path = require('path');
const files = require('./new-index.json');
const specs = ['a','b','c','d'].flatMap((k) => JSON.parse(fs.readFileSync(path.join(__dirname, 'intake-' + k + '.json'), 'utf8')));
const slugify = (s) => s.toLowerCase().replace(/\+/g,' plus ').replace(/&/g,' and ').replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'');
const OUT = path.join(__dirname, 'intake-img');
fs.mkdirSync(OUT, { recursive: true });
(async () => {
  let n = 0;
  for (const s of specs) {
    const slug = slugify((s.b ? s.b + ' ' : '') + s.n);
    for (let i = 0; i < s.idx.length; i++) {
      const src = path.join('Products', 'new products', files[s.idx[i]]);
      const dest = path.join(OUT, `${slug}-${i + 1}.jpg`);
      if (fs.existsSync(dest)) { n++; continue; }
      await sharp(src)
        .resize(1500, 1875, { fit: 'contain', background: { r: 255, g: 255, b: 255 } })
        .jpeg({ quality: 82, progressive: true, mozjpeg: true })
        .toFile(dest);
      n++;
    }
  }
  console.log(n + ' images written to ' + OUT);
})();
