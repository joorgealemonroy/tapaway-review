import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

// These values identify public clients; none authorizes privileged operations.
export const PUBLIC_ENV_NAMES = Object.freeze([
  'VITE_SUPABASE_URL', 'VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY', 'VITE_SUPABASE_PROJECT_ID',
  'VITE_GOOGLE_MAPS_API_KEY', 'VITE_GOOGLE_MAPS_MAP_ID', 'VITE_STRIPE_PUBLISHABLE_KEY',
]);
const publicNames = new Set(PUBLIC_ENV_NAMES);
const secretName = /(?:SECRET|TOKEN|PASSWORD|PRIVATE_KEY|CONNECTION_STRING|DATABASE_URL|API_KEY|MIGRATION_URL|SERVICE_ROLE)/i;
const fixture = /(?:fixture|example|placeholder|your[_ -]|replace[_ -]|test[_-]only|qa[_-]only|redacted|dummy|fake)/i;
const rules = [
  ['private-key', /-----BEGIN (?:[A-Z0-9 ]* )?PRIVATE KEY-----/g],
  ['stripe-private-key', /\b(?:sk|rk)_(?:live|test)_[A-Za-z0-9]{16,}\b/g],
  ['stripe-webhook-secret', /\bwhsec_[A-Za-z0-9]{16,}\b/g],
  ['supabase-secret-key', /\bsb_secret_[A-Za-z0-9_-]{16,}\b/g],
  ['openai-secret-key', /\bsk-(?:proj-|svcacct-)?[A-Za-z0-9_-]{30,}\b/g],
  ['anthropic-secret-key', /\bsk-ant-[A-Za-z0-9_-]{20,}\b/g],
  ['resend-secret-key', /\bre_[A-Za-z0-9]{20,}\b/g],
  ['github-token', /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\b/g],
  ['aws-access-key', /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g],
  ['slack-token', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['google-oauth-token', /\bya29\.[A-Za-z0-9_-]{25,}\b/g],
  ['credentialed-connection-url', /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|rediss?|amqps?):\/\/[^\s"'<>:@]+:[^\s"'<>@]+@[^\s"'<>]+/gi],
  ['credentialed-http-url', /https?:\/\/[^\s"'<>:@/]+:[^\s"'<>@/]+@[^\s"'<>]+/gi],
];
const jwtPattern = /\beyJ[A-Za-z0-9_-]+\.eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g;
function jwtPayload(value) { try { return JSON.parse(Buffer.from(value.split('.')[1], 'base64url')); } catch { return null; } }
function add(findings, file, kind, text, offset = 0) {
  const line = text.slice(0, offset).split('\n').length;
  if (!findings.some(f => f.file === file && f.kind === kind && f.line === line)) findings.push({ file, line, kind });
}
export function scanText(text, file, { allowFixtures = false, knownSecrets = [] } = {}) {
  const findings = [];
  for (const [kind, re] of rules) {
    re.lastIndex = 0;
    for (const match of text.matchAll(re)) {
      if (allowFixtures && fixture.test(match[0])) continue;
      add(findings, file, kind, text, match.index);
    }
  }
  for (const match of text.matchAll(jwtPattern)) {
    const payload = jwtPayload(match[0]);
    // A signed anon key is intentionally public. All other embedded JWTs fail.
    if (payload?.role === 'anon' && !payload.sub && !payload.email) continue;
    if (allowFixtures && fixture.test(match[0])) continue;
    add(findings, file, 'embedded-private-or-user-jwt', text, match.index);
  }
  // Catch hard-coded credentials without a vendor prefix, including passwords.
  const assignment = /\b(?:[a-z_]*(?:password|passwd|secret|api_?key|access_?token|refresh_?token|auth_?token|private_?key|service_?role_?key|token_?hash|database_?url|connection_?string))\s*["']?\s*[:=]\s*(["'`])([^\r\n"'`]{8,})\1/gi;
  for (const m of text.matchAll(assignment)) {
    const value = m[2];
    if (allowFixtures && fixture.test(value)) continue;
    if (value.includes('${') || ['access_token', 'refresh_token'].includes(value)) continue;
    if (jwtPayload(value)?.role === 'anon' || /^sb_publishable_|^pk_(?:live|test)_/.test(value)) continue;
    add(findings, file, 'literal-credential-assignment', text, m.index);
  }
  for (const { name, value } of knownSecrets) {
    if (!value || value.length < 12) continue;
    const variants = new Set([value, JSON.stringify(value).slice(1,-1), encodeURIComponent(value), Buffer.from(value).toString('base64')]);
    for (const v of variants) { const pos = text.indexOf(v); if (pos >= 0) { add(findings, file, `embedded-server-value:${name}`, text, pos); break; } }
  }
  return findings;
}
export function collectKnownSecrets(env) {
  return Object.entries(env).filter(([name,value]) => !publicNames.has(name) && secretName.test(name) && typeof value === 'string' && value.length >= 12).map(([name,value]) => ({name,value}));
}
export function validatePublicEnv(env) {
  const findings = [];
  for (const [name,value] of Object.entries(env)) {
    if (!name.startsWith('VITE_') || value === '') continue;
    if (!publicNames.has(name)) { findings.push({ file: 'build environment', line: 1, kind: `unapproved-public-variable:${name}` }); continue; }
    findings.push(...scanText(value, name));
    if (['VITE_SUPABASE_PUBLISHABLE_KEY', 'VITE_SUPABASE_ANON_KEY'].includes(name) && !(/^sb_publishable_[A-Za-z0-9_-]+$/.test(value) || jwtPayload(value)?.role === 'anon')) findings.push({file:name,line:1,kind:'expected-public-anon-or-publishable-key'});
    if (name === 'VITE_STRIPE_PUBLISHABLE_KEY' && !/^pk_(?:live|test)_[A-Za-z0-9]+$/.test(value)) findings.push({file:name,line:1,kind:'expected-stripe-publishable-key'});
    if (name === 'VITE_SUPABASE_URL') { try { const u = new URL(value); if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash) throw 0; } catch { findings.push({file:name,line:1,kind:'invalid-public-api-origin'}); } }
  }
  const googleBrowser = env.VITE_GOOGLE_MAPS_API_KEY;
  if (googleBrowser && Object.entries(env).some(([k,v]) => !publicNames.has(k) && /GOOGLE.*(?:KEY|SECRET)/.test(k) && v === googleBrowser)) findings.push({file:'build environment',line:1,kind:'google-browser-key-reuses-server-credential'});
  return findings;
}
function walk(directory) {
  return fs.readdirSync(directory, {withFileTypes:true}).flatMap(entry => {
    const name = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Symlinks are not allowed in release artifacts: ${name}`);
    return entry.isDirectory() ? walk(name) : [name];
  });
}
export function scanArtifacts(directory, env = process.env) {
  const findings = [], files = walk(directory), knownSecrets = collectKnownSecrets(env);
  for (const file of files) {
    const rel = path.relative(directory,file), text = fs.readFileSync(file).toString('utf8');
    if (/(?:\.map$|(?:^|\/)\.env(?:\.|$)|(?:^|\/)\.git\/|\.(?:pem|key|p12|pfx)$)/i.test(rel)) add(findings, rel, 'private-file-or-source-map', text);
    if (/(?:\/\/[#@]|\/\*[#@])\s*sourceMappingURL\s*=/.test(text)) add(findings,rel,'source-map-reference',text);
    findings.push(...scanText(text, rel, { knownSecrets }));
  }
  return { files: files.length, findings };
}
export function scanSources(root = process.cwd()) {
  const tracked = execFileSync('git',['ls-files','--cached','--others','--exclude-standard','-z'], {cwd:root}).toString().split('\0').filter(Boolean);
  const findings = []; let count = 0;
  for (const rel of new Set(tracked)) {
    const file = path.join(root,rel); if (!fs.existsSync(file) || !fs.statSync(file).isFile()) continue;
    const text = fs.readFileSync(file).toString('utf8'); count++;
    const exampleEnv = /(?:^|\/)\.env\.example$/.test(rel);
    findings.push(...scanText(text,rel,{ allowFixtures: rel.startsWith('scripts/') || exampleEnv }));
    if (/\.(?:pem|key|p12|pfx)$/i.test(rel)) add(findings,rel,'committed-private-key-file',text);
    if (/(?:^|\/)\.env(?:\.|$)/.test(rel) && !exampleEnv) {
      for (const m of text.matchAll(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z_0-9]*)\s*=\s*(.*)$/gm)) {
        if (!publicNames.has(m[1])) add(findings,rel,`unapproved-committed-environment-variable:${m[1]}`,text,m.index);
      }
    }
    if (/^(?:src|shared)\//.test(rel)) {
      if (/(?:from\s*|import\s*\()\s*["'][^"']*(?:supabase\/functions|drizzle\/|security\/|scripts\/)/.test(text)) add(findings,rel,'client-imports-server-module',text);
      if (/Deno\.env|process\.env|import\.meta\.env\s*(?:\[|[,;)}])/.test(text)) add(findings,rel,'unbounded-client-environment-access',text);
      for (const m of text.matchAll(/import\.meta\.env\.([A-Z_][A-Z_0-9]*)/g)) if (!['DEV','PROD','MODE','BASE_URL','SSR'].includes(m[1]) && !publicNames.has(m[1])) add(findings,rel,'client-reads-unapproved-variable',text,m.index);
    }
  }
  return {files:count,findings};
}
export function failOnFindings(report) {
  if (report.findings.length) throw new Error('Release security check failed:\n' + report.findings.map(f => `${f.file}:${f.line} ${f.kind}`).join('\n'));
}
export function clientBuildGuard(env) {
  let config;
  return {
    name: 'tapaway-client-security',
    configResolved(resolved) {
      config = resolved;
      failOnFindings({ findings: validatePublicEnv(env) });
      if (resolved.build.sourcemap !== false) throw new Error('Production source maps must remain disabled.');
      if (resolved.define && Object.keys(resolved.define).some(k => k === 'process.env' || k === 'import.meta.env')) throw new Error('Whole environment injection is forbidden.');
    },
    generateBundle(_options,bundle) {
      for (const chunk of Object.values(bundle)) if (chunk.type === 'chunk') {
        for (const id of Object.keys(chunk.modules)) if (/(?:\/supabase\/functions\/|\/drizzle\/|\/scripts\/|\/security\/)/.test(id)) throw new Error('A server-only module entered the client build.');
      }
    },
    closeBundle() {
      if (config.command !== 'build') return;
      const report = scanArtifacts(path.resolve(config.root,config.build.outDir),env);
      failOnFindings(report);
      console.log(`Release security check passed: ${report.files} artifacts; no detected secrets or source maps.`);
    },
  };
}
