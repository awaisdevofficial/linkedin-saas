const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

// LinkedIn blue #0A66C2
const R = 0x0a, G = 0x66, B = 0xc2, A = 255;

function createIcon(size) {
  const png = new PNG({ width: size, height: size });
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (size * y + x) << 2;
      png.data[idx] = R;
      png.data[idx + 1] = G;
      png.data[idx + 2] = B;
      png.data[idx + 3] = A;
    }
  }
  return png;
}

const dir = __dirname;
[16, 48, 128].forEach((size) => {
  const png = createIcon(size);
  png.pack().pipe(fs.createWriteStream(path.join(dir, `icon${size}.png`)));
});

console.log('Created icon16.png, icon48.png, icon128.png');
