// Turns the single-file build into a page fragment for a claude.ai artifact,
// which supplies its own <!doctype>, <html>, <head> and <body>.
import { readFileSync, writeFileSync } from 'node:fs';
const html = readFileSync('dist-single/index.html', 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/)[1]
  .replace(/<meta charset[^>]*>/i, '')
  .replace(/<meta name="viewport"[^>]*>/i, '');
const body = html.match(/<body>([\s\S]*?)<\/body>/)[1];
writeFileSync('dist-single/artifact.html', head.trim() + '\n' + body.trim() + '\n');
console.log('dist-single/artifact.html', (head.length + body.length) / 1024 | 0, 'KB');
