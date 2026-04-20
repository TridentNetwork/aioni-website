const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const isDev = process.env.NODE_ENV !== 'production';

let lrPort = 35729;

if (isDev) {
  const livereload = require('livereload');
  const lrServer = livereload.createServer({
    port: lrPort,
    exts: ['html', 'css', 'js', 'svg', 'png', 'jpg'],
    delay: 200,
  });
  lrServer.watch(path.join(__dirname));
}

// Serve static assets (skip index.html — handled by route below)
app.use(express.static(path.join(__dirname), { index: false }));

app.get('/', (req, res) => {
  if (isDev) {
    const fs = require('fs');
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    const lrScript = `<script src="http://localhost:${lrPort}/livereload.js?snipver=1"></script>`;
    html = html.replace('</body>', lrScript + '\n</body>');
    res.type('html').send(html);
  } else {
    res.sendFile(path.join(__dirname, 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`Aioni site running at http://localhost:${PORT}`);
  if (isDev) console.log('Live reload enabled — browser will auto-refresh on file changes');
});
