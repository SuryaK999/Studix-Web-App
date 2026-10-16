import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, 'src');

function collectFiles(dir, exts) {
  let results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results = results.concat(collectFiles(full, exts));
    else if (exts.some(ext => entry.name.endsWith(ext))) results.push(full);
  }
  return results;
}

const jsFiles = collectFiles(srcDir, ['.js', '.jsx']);
let modified = 0;

for (const filePath of jsFiles) {
  const original = fs.readFileSync(filePath, 'utf-8');
  let cleaned = original;

  // 1. Fix import * from "react"
  cleaned = cleaned.replace(/import\s+\*\s+from\s+["']react["']/g, 'import * as React from "react"');
  
  // 2. Fix other import * from "..." (like recharts) -> import * as Name from "..."
  // This is tricky, better to just fix recharts explicitly if there are any
  cleaned = cleaned.replace(/import\s+\*\s+from\s+["']recharts["']/g, 'import * as RechartsPrimitive from "recharts"');

  // 3. Remove `type VariantProps` from imports
  cleaned = cleaned.replace(/,\s*type\s+VariantProps\b/g, '');
  cleaned = cleaned.replace(/type\s+VariantProps\s*,?/g, '');
  
  // 4. Clean up any empty braces: import { } from ...
  cleaned = cleaned.replace(/import\s*\{\s*\}\s*from\s+["'][^"']+["'];?\n?/g, '');

  if (cleaned !== original) {
    fs.writeFileSync(filePath, cleaned, 'utf-8');
    modified++;
  }
}

console.log(`Fixed ${modified} files.`);
