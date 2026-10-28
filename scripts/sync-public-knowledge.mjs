import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Edge deployment only includes files under supabase/functions. Keep generated
// copies there, while the browser imports the reviewed public modules directly.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const check = process.argv.includes('--check');
for (const name of ['storefrontKnowledge.ts', 'storefrontOffers.ts']) {
  const source = fs.readFileSync(path.join(root, 'shared', name), 'utf8');
  const target = path.join(root, 'supabase/functions/_shared', name);
  const generated = '// Generated from shared/' + name + '; edit the source and run npm run sync:public-knowledge.\n' + source;
  if (check) {
    if (!fs.existsSync(target) || fs.readFileSync(target, 'utf8') !== generated)
      throw new Error(`Public knowledge mirror is stale: ${name}. Run npm run sync:public-knowledge.`);
  } else fs.writeFileSync(target, generated);
}
console.log(check ? 'Public knowledge deployment copies match their canonical sources.' : 'Public knowledge deployment copies updated.');
