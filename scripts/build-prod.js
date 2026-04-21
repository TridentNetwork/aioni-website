const fs = require('fs');
const path = require('path');
const { minify: minifyHTML } = require('html-minifier-terser');
const CleanCSS = require('clean-css');
const { minify: minifyJS } = require('terser');

const rootDir = path.join(__dirname, '..');
const distDir = path.join(rootDir, 'dist');

function mkdirp(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadData(name) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, 'data', name + '.json'), 'utf8'));
}

// ---- Template builders (same logic as server.js) ----

function buildCoverageList(coverage) {
  let html = '';
  coverage.cities.forEach((city, i) => {
    const hidden = i >= coverage.visibleCount ? ' class="cov-hidden"' : '';
    const note = city.note ? ` &middot; ${city.note}` : '';
    html += `          <li${hidden}>
            <span><span class="cov-dot"></span><span class="city">${city.name}</span></span>
            <span class="region">${city.region}${note}</span>
          </li>\n`;
  });
  return html;
}

function buildIxpTable(network) {
  let html = '';
  const showSpeed = network.showSpeed !== false;
  const visibleCount = network.ixpVisibleCount || 4;
  network.exchanges.forEach((ix, i) => {
    const hidden = i >= visibleCount ? ' ixp-hidden' : '';
    const speedCol = showSpeed ? `<span class="ixp-speed">${ix.speed}</span>` : '';
    html += `          <div class="ixp-row${hidden}">
            <span class="ixp-name">${ix.name}</span>
            ${speedCol}
            <span class="ixp-status"><span class="status-dot"></span>${ix.status}</span>
          </div>\n`;
  });
  return html;
}

function buildPeerLogos(network) {
  let html = '';
  network.contentPeers.forEach(peer => {
    const name = peer.name || peer;
    const src = network.contentPeerLogos[name] || '';
    html += `            <img src="${src}" alt="${name}" title="${name}"/>\n`;
  });
  return html;
}

function buildTeam(team) {
  let html = '';
  team.members.forEach(m => {
    html += `      <div class="team-card">
        <div class="team-avatar">
          <img src="${m.avatar}" alt="${m.name}" />
        </div>
        <div class="team-name">${m.name}</div>
        <div class="team-role">${m.role}</div>
      </div>\n`;
  });
  return html;
}

function buildTestimonials(testimonials) {
  let html = '';
  testimonials.quotes.forEach(q => {
    html += `      <div class="testimonial">
        <p class="testimonial-quote">${q.text}</p>
        <div class="testimonial-name"><span>//</span> ${q.name}</div>
      </div>\n`;
  });
  return html;
}

function buildServices(services) {
  let html = '';
  services.services.forEach(s => {
    const wide = s.wide ? ' style="grid-column: span 3;"' : '';
    const maxW = s.wide ? ' style="max-width: 680px;"' : '';
    html += `      <div class="service-card"${wide}>
        <div class="service-icon">{{ICON_${s.icon}}}</div>
        <div class="service-title">${s.title}</div>
        <p class="service-desc"${maxW}>${s.description}</p>
        <svg class="service-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M7 17L17 7M17 7H9M17 7v8"/></svg>
      </div>\n`;
  });
  return html;
}

function buildContactItems(contact) {
  return `        <div class="contact-item">
          <span class="c-label">General</span>
          <a href="mailto:${contact.general}">${contact.general}</a>
        </div>
        <div class="contact-item">
          <span class="c-label">NOC &middot; 24/7</span>
          <a href="mailto:${contact.noc}">${contact.noc}</a>
        </div>
        <div class="contact-item">
          <span class="c-label">Peering</span>
          <a href="mailto:${contact.peering}">${contact.peering}</a>
        </div>
        <div class="contact-item">
          <span class="c-label">Phone</span>
          <a href="tel:${contact.phone.replace(/\s/g, '')}">${contact.phone}</a>
        </div>
        <div class="contact-item">
          <span class="c-label">Address</span>
          <span class="contact-addr">${contact.address.line1}<br/>${contact.address.city}, ${contact.address.zip}, ${contact.address.country}</span>
        </div>\n`;
}

function buildTopology(network) {
  const ixps = network.exchanges;
  const peers = network.contentPeers;
  const dcs = network.facilities;

  const cornerPositions = [
    { x: 80, y: 80, labelY: 68 },
    { x: 320, y: 80, labelY: 68 },
    { x: 80, y: 320, labelY: 340 },
    { x: 320, y: 320, labelY: 340 },
  ];
  const sidePositions = [
    { x: 200, y: 40, labelX: 200, labelY: 30, anchor: 'middle' },
    { x: 360, y: 200, labelX: 370, labelY: 195, anchor: 'start' },
    { x: 200, y: 360, labelX: 200, labelY: 378, anchor: 'middle' },
    { x: 40, y: 200, labelX: 30, labelY: 195, anchor: 'end' },
  ];
  const dcSpacing = 25;
  const dcPositions = dcs.map((dc, i) => ({
    x: 200 + (i - (dcs.length - 1) / 2) * (dcSpacing * 2),
    y: 200,
    name: dc.shortName
  }));

  let svg = `        <svg viewBox="0 0 400 400" xmlns="http://www.w3.org/2000/svg">
          <defs><radialGradient id="coreGlow" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#c4364e" stop-opacity="0.4"/><stop offset="100%" stop-color="#c4364e" stop-opacity="0"/></radialGradient></defs>
          <circle cx="200" cy="200" r="170" fill="none" stroke="#1e2836" stroke-width="1" stroke-dasharray="2 4"/>
          <circle cx="200" cy="200" r="110" fill="none" stroke="#1e2836" stroke-width="1"/>
          <circle cx="200" cy="200" r="60" fill="url(#coreGlow)"/>\n`;

  if (dcPositions.length > 1) {
    svg += `          <line x1="${dcPositions[0].x}" y1="200" x2="${dcPositions[dcPositions.length - 1].x}" y2="200" stroke="#c4364e" stroke-width="2" opacity="0.8"/>\n`;
  }

  ixps.forEach((ix, i) => {
    if (i >= cornerPositions.length) return;
    const pos = cornerPositions[i];
    const dc = dcPositions[i % 2 === 0 ? 0 : dcPositions.length - 1];
    svg += `          <line x1="${dc.x}" y1="${dc.y}" x2="${pos.x}" y2="${pos.y}" stroke="#c4364e" stroke-width="1" class="flow" opacity="0.5"/>\n`;
  });

  peers.forEach((p, i) => {
    if (i >= sidePositions.length) return;
    const pos = sidePositions[i];
    const dc = dcPositions[i % 2 === 0 ? 0 : Math.min(i, dcPositions.length - 1)];
    const startX = pos.y === 200 ? dc.x : 200;
    const startY = pos.x === 200 ? (pos.y < 200 ? 190 : 210) : 200;
    svg += `          <line x1="${startX}" y1="${startY}" x2="${pos.x}" y2="${pos.y}" stroke="#c4364e" stroke-width="1" class="flow" opacity="0.4"/>\n`;
  });

  svg += `          <g fill="#131a24" stroke="#2a3748" stroke-width="1">\n`;
  ixps.forEach((ix, i) => { if (i < cornerPositions.length) svg += `            <circle cx="${cornerPositions[i].x}" cy="${cornerPositions[i].y}" r="6"/>\n`; });
  svg += `          </g>\n`;
  svg += `          <g font-family="JetBrains Mono, monospace" font-size="8" fill="#8a99ae" letter-spacing="0.5">\n`;
  ixps.forEach((ix, i) => { if (i < cornerPositions.length) svg += `            <text x="${cornerPositions[i].x}" y="${cornerPositions[i].labelY}" text-anchor="middle">${ix.name.replace(/ Manila/i, '').replace(/ Internet Exchange/i, '')}</text>\n`; });
  svg += `          </g>\n`;

  svg += `          <g fill="#131a24" stroke="#2a3748" stroke-width="1">\n`;
  peers.forEach((p, i) => { if (i < sidePositions.length) svg += `            <circle cx="${sidePositions[i].x}" cy="${sidePositions[i].y}" r="5"/>\n`; });
  svg += `          </g>\n`;
  svg += `          <g font-family="JetBrains Mono, monospace" font-size="7" fill="#4b5a72" letter-spacing="0.3">\n`;
  peers.forEach((p, i) => { if (i < sidePositions.length) { const s = sidePositions[i]; svg += `            <text x="${s.labelX}" y="${s.labelY}" text-anchor="${s.anchor}">${p.topoLabel || p.name || p}</text>\n`; } });
  svg += `          </g>\n`;

  dcPositions.forEach(dc => {
    svg += `          <circle cx="${dc.x}" cy="${dc.y}" r="16" fill="#c4364e"/>\n`;
    svg += `          <circle cx="${dc.x}" cy="${dc.y}" r="16" fill="none" stroke="#c4364e" class="ping"/>\n`;
    svg += `          <text x="${dc.x}" y="203" text-anchor="middle" font-family="JetBrains Mono" font-size="6" font-weight="600" fill="#0a0e14">${dc.name}</text>\n`;
  });

  if (dcPositions.length > 1) svg += `          <text x="200" y="185" text-anchor="middle" font-family="JetBrains Mono" font-size="6" fill="#8a99ae">DCI</text>\n`;
  svg += `        </svg>`;

  const sub = dcs.map(d => d.name).join(' + ') + ` · ${network.peeringPolicy} peering policy · ${network.ipVersion}`;
  return { svg, sub };
}

// ---- Render HTML from template + data ----

function renderPage() {
  let html = fs.readFileSync(path.join(rootDir, 'index.html'), 'utf8');

  const coverage = loadData('coverage');
  const network = loadData('network');
  const team = loadData('team');
  const testimonials = loadData('testimonials');
  const services = loadData('services');
  const contact = loadData('contact');

  html = html.replace('{{COVERAGE_LIST}}', buildCoverageList(coverage));
  html = html.replace('{{COVERAGE_NOTE}}', coverage.note);
  html = html.replace('{{IXP_TABLE}}', buildIxpTable(network));
  html = html.replace('{{IXP_PORT_HEADER}}', network.showSpeed !== false ? '<span>Port</span>' : '');
  html = html.replace('{{IXP_TABLE_CLASS}}', network.showSpeed !== false ? '' : 'no-speed');
  const ixpVisible = network.ixpVisibleCount || 4;
  html = html.replace('{{IXP_TOGGLE}}', network.exchanges.length > ixpVisible
    ? '<button class="cov-toggle" id="ixpToggle">Show more</button>' : '');
  html = html.replace('{{PEER_LOGOS}}', buildPeerLogos(network));
  const topo = buildTopology(network);
  html = html.replace('{{TOPOLOGY_SVG}}', topo.svg);
  html = html.replace('{{TOPOLOGY_SUB}}', topo.sub);
  html = html.replace('{{TEAM_CARDS}}', buildTeam(team));
  html = html.replace('{{TESTIMONIALS}}', buildTestimonials(testimonials));
  html = html.replace('{{SERVICES}}', buildServices(services));
  html = html.replace('{{CONTACT_ITEMS}}', buildContactItems(contact));
  html = html.replace(/\{\{ASN\}\}/g, network.asn);
  html = html.replace(/\{\{ORG\}\}/g, network.org);
  html = html.replace(/\{\{NOC_EMAIL\}\}/g, contact.noc);

  return html;
}

// ---- Build ----

async function build() {
  console.log('Building production bundle...\n');

  mkdirp(distDir);
  mkdirp(path.join(distDir, 'assets', 'css'));
  mkdirp(path.join(distDir, 'assets', 'js'));
  mkdirp(path.join(distDir, 'assets', 'images', 'logos'));
  mkdirp(path.join(distDir, 'assets', 'images', 'logo-variants'));

  // 1. Minify CSS
  const cssInput = fs.readFileSync(path.join(rootDir, 'assets', 'css', 'styles.css'), 'utf8');
  const cssOutput = new CleanCSS({ level: 2 }).minify(cssInput);
  fs.writeFileSync(path.join(distDir, 'assets', 'css', 'styles.css'), cssOutput.styles);
  console.log(`  CSS:  ${(cssInput.length / 1024).toFixed(1)}KB → ${(cssOutput.styles.length / 1024).toFixed(1)}KB`);

  // 2. Minify JS
  const jsInput = fs.readFileSync(path.join(rootDir, 'assets', 'js', 'main.js'), 'utf8');
  const jsOutput = await minifyJS(jsInput);
  fs.writeFileSync(path.join(distDir, 'assets', 'js', 'main.js'), jsOutput.code);
  console.log(`  JS:   ${(jsInput.length / 1024).toFixed(1)}KB → ${(jsOutput.code.length / 1024).toFixed(1)}KB`);

  // 3. Render and minify HTML
  const html = renderPage();
  const htmlOutput = await minifyHTML(html, {
    collapseWhitespace: true,
    removeComments: true,
    minifyCSS: true,
    minifyJS: true,
    removeRedundantAttributes: true,
    removeEmptyAttributes: true,
  });
  fs.writeFileSync(path.join(distDir, 'index.html'), htmlOutput);
  console.log(`  HTML: ${(html.length / 1024).toFixed(1)}KB → ${(htmlOutput.length / 1024).toFixed(1)}KB`);

  // 4. Copy static assets
  const assetDirs = ['assets/images', 'assets/images/logos', 'assets/images/logo-variants'];
  let copied = 0;
  assetDirs.forEach(dir => {
    const srcDir = path.join(rootDir, dir);
    if (!fs.existsSync(srcDir)) return;
    fs.readdirSync(srcDir).forEach(f => {
      const src = path.join(srcDir, f);
      if (fs.statSync(src).isFile()) {
        const dest = path.join(distDir, dir, f);
        fs.copyFileSync(src, dest);
        copied++;
      }
    });
  });
  console.log(`  Assets: ${copied} files copied`);

  const totalSrc = cssInput.length + jsInput.length + html.length;
  const totalDist = cssOutput.styles.length + jsOutput.code.length + htmlOutput.length;
  console.log(`\n  Total: ${(totalSrc / 1024).toFixed(1)}KB → ${(totalDist / 1024).toFixed(1)}KB (${Math.round((1 - totalDist / totalSrc) * 100)}% smaller)`);
  console.log('\nStatic build complete → dist/');
  console.log('Deploy the dist/ folder to any static host.');
}

build().catch(err => {
  console.error('Build failed:', err);
  process.exit(1);
});
