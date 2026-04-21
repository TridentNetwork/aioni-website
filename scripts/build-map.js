const fs = require('fs');
const path = require('path');

// Mercator projection calibrated to SimpleMaps PH SVG (viewBox 0 0 1000 1000)
// Calibration points verified to 0.0 error:
//   lat=5.479, lon=117.438 -> cx=266.9, cy=910.2
//   lat=12.066, lon=122.269 -> cx=525.9, cy=552.7
//   lat=20.299, lon=126.135 -> cx=733.1, cy=92.6
const A_X = 53.6047;
const B_X = -6028.33;
const A_Y = -3071.7814;
const B_Y = 1204.39;

function mercY(latDeg) {
  const latRad = (latDeg * Math.PI) / 180;
  return Math.log(Math.tan(Math.PI / 4 + latRad / 2));
}

function toSvg(lat, lon) {
  return {
    x: Math.round((A_X * lon + B_X) * 10) / 10,
    y: Math.round((A_Y * mercY(lat) + B_Y) * 10) / 10
  };
}

function generatePins(cities, color, includeAnimation) {
  let svg = '\n <!-- Coverage pins (auto-generated from data/coverage.json) -->\n <g id="coverage-pins">\n';

  for (const city of cities) {
    if (city.skipPin) continue;
    const { x, y } = toSvg(city.lat, city.lon);
    const r = city.hq ? 8 : 5;

    if (true) {
      // Pulse ring
      svg += `  <circle cx="${x}" cy="${y}" r="${r + 6}" fill="none" stroke="${color}" stroke-width="1.5" opacity="0.4">\n`;
      svg += `    <animate attributeName="r" from="${r + 4}" to="${r + 14}" dur="2s" repeatCount="indefinite"/>\n`;
      svg += `    <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>\n`;
      svg += `  </circle>\n`;
    }

    // Solid dot
    svg += `  <circle cx="${x}" cy="${y}" r="${r}" fill="${color}"/>\n`;

    // Label
    if (city.label) {
      const isDark = includeAnimation;
      const labelColor = isDark ? '#8a99ae' : '#111827';
      const strokeAttr = isDark ? '' : ' stroke="none"';
      if (city.hq) {
        svg += `  <text x="${x + 12}" y="${y - 4}" font-family="monospace" font-size="11" font-weight="700" fill="${color}"${strokeAttr}>${city.label}</text>\n`;
        svg += `  <text x="${x + 12}" y="${y + 9}" font-family="monospace" font-size="9" fill="${labelColor}"${strokeAttr}>HQ · AS153174</text>\n`;
      } else {
        if (x < 500) {
          svg += `  <text x="${x - 8}" y="${y - 8}" font-family="monospace" font-size="9" fill="${labelColor}"${strokeAttr} text-anchor="end">${city.label}</text>\n`;
        } else {
          svg += `  <text x="${x + 8}" y="${y - 8}" font-family="monospace" font-size="9" fill="${labelColor}"${strokeAttr}>${city.label}</text>\n`;
        }
      }
    }
  }

  svg += ' </g>\n';
  return svg;
}

function buildMap(variant) {
  const coverageData = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'coverage.json'), 'utf8'));
  const baseSvgPath = path.join(__dirname, '..', 'assets', 'images', 'ph-map-base.svg');

  if (!fs.existsSync(baseSvgPath)) {
    console.error('Base map not found at', baseSvgPath);
    console.log('Run: cp assets/images/ph-map.svg assets/images/ph-map-base.svg (without pins)');
    process.exit(1);
  }

  let svg = fs.readFileSync(baseSvgPath, 'utf8');

  const isDark = variant === 'dark';
  const color = isDark ? '#22c55e' : '#16a34a';

  if (!isDark) {
    // Restyle for light mode
    svg = svg.replace(/fill="#1e2836"/g, 'fill="#dce3ed"');
    svg = svg.replace(/stroke="#2a3748"/g, 'stroke="#d0d8e4"');
  }

  // Crop viewBox
  svg = svg.replace(/viewbox="0 0 1000 1000"/i, 'viewBox="230 50 550 890"');
  svg = svg.replace(/height="1000"/, 'height="890"');
  svg = svg.replace(/width="1000"/, 'width="550"');

  // Insert pins before </svg>
  const pins = generatePins(coverageData.cities, color, isDark);
  svg = svg.replace('</svg>', pins + '</svg>');

  const outName = isDark ? 'ph-map.svg' : 'ph-map-light.svg';
  const outPath = path.join(__dirname, '..', 'assets', 'images', outName);
  fs.writeFileSync(outPath, svg);
  console.log(`Built ${outName} with ${coverageData.cities.length} pins`);
}

// Build both variants
buildMap('dark');
buildMap('light');
console.log('Done. Maps generated from data/coverage.json');
