#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..', 'src');
const exts = ['.tsx', '.jsx', '.ts', '.js'];

function walk(dir) {
  let results = [];
  for (const name of fs.readdirSync(dir)) {
    const file = path.join(dir, name);
    const stat = fs.statSync(file);
    if (stat.isDirectory()) {
      results = results.concat(walk(file));
    } else if (exts.includes(path.extname(file))) {
      results.push(file);
    }
  }
  return results;
}

const files = walk(root);
let problems = [];

const tagPattern = /<(input|textarea|select)([^>]*)>/gi;

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  let m;
  while ((m = tagPattern.exec(content)) !== null) {
    const tag = m[1];
    const attrs = m[2];
    // Ignore input tags with role="presentation" or hidden
    if (/role\s*=/.test(attrs) && /presentation/.test(attrs)) continue;
    if (/type\s*=\s*"hidden"/.test(attrs)) continue;
    const hasId = /\sid\s*=/.test(attrs);
    const hasName = /\sname\s*=/.test(attrs);
    if (!hasId && !hasName) {
      problems.push({ file, tag, snippet: m[0] });
    }
  }
}

if (problems.length === 0) {
  console.log('✅ No missing id/name found in form fields');
  process.exit(0);
}

console.error('⛔ Found form elements without id or name:');
for (const p of problems) {
  console.error(` - ${p.file}: ${p.tag} -> ${p.snippet.trim()}`);
}
process.exit(2);
