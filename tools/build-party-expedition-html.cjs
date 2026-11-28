#!/usr/bin/env node
'use strict';
// Package the same mobile expedition page as a single offline file.
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = process.argv[2];
if (!output) throw new Error('Usage: node tools/build-party-expedition-html.cjs <output.html>');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const mediaTypes = {'.jpg':'image/jpeg', '.webp':'image/webp', '.png':'image/png'};
function inlineScript(_, file) {
  let code = read(file);
  if (file === 'src/arcade-party-art-v43.js') {
    const assets = JSON.parse(code.replace(/^\s*window\.PARTY_ART\s*=\s*/, '').replace(/;\s*$/, ''));
    for (const [key, relative] of Object.entries(assets)) {
      const type = mediaTypes[path.extname(relative)];
      if (!type) throw new Error('Unexpected artwork format ' + relative);
      assets[key] = 'data:' + type + ';base64,' + fs.readFileSync(path.join(root, relative)).toString('base64');
    }
    code = 'window.PARTY_ART = ' + JSON.stringify(assets) + ';';
  }
  return '<script>\n' + code.replace(/<\/script/gi, '<\\/script') + '\n</script>';
}
const html = read('party.html')
  .replace(/<link rel="stylesheet" href="([^"?]+)(?:\?[^"]*)?"\s*\/?>/g, (_, file) => '<style>\n' + read(file) + '\n</style>')
  .replace(/<script src="([^"?]+)(?:\?[^"]*)?"><\/script>/g, inlineScript);
fs.mkdirSync(path.dirname(path.resolve(output)), {recursive:true});
fs.writeFileSync(output, html);
