import fs from 'fs';
import path from 'path';

const dir = 'd:/Studix - Copy/app/src/components/ui';

function toPascalCase(str) {
  return str.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
}

const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

let fixedCount = 0;

files.forEach(file => {
  const filePath = path.join(dir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  let original = content;

  // Fix import * from "@radix-ui/react-foo-bar"
  // -> import * as FooBarPrimitive from "@radix-ui/react-foo-bar"
  content = content.replace(/import\s+\*\s+from\s+["']@radix-ui\/react-([^"']+)["']/g, (match, pkg) => {
    const pcal = toPascalCase(pkg);
    return `import * as ${pcal}Primitive from "@radix-ui/react-${pkg}"`;
  });

  // Fix function destructured props with generic TS types
  // e.g. }: React.ComponentProps<...>) {
  content = content.replace(/\}:(?:[^\)]+)\)\s*\{/g, '}) {');

  // Fix generic forwardRef<Ref, Props>
  // e.g. React.forwardRef<HTMLButtonElement, ButtonProps>(
  content = content.replace(/React\.forwardRef<[^>]+>\(/g, 'React.forwardRef(');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf-8');
    fixedCount++;
  }
});

console.log(`Fixed ${fixedCount} files in components/ui.`);
