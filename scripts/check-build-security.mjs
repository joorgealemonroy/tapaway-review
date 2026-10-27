import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { build } from 'vite';
import { scanText, scanSources, scanArtifacts, validatePublicEnv, collectKnownSecrets, clientBuildGuard } from '../security/build-guard.mjs';
const temp = fs.mkdtempSync(path.join(os.tmpdir(),'tapaway-security-'));
let checks = 0;
const pass = async (name,run) => { await run(); checks++; console.log(`PASS ${name}`); };
const token = payload => [Buffer.from('{"alg":"HS256"}').toString('base64url'),Buffer.from(JSON.stringify(payload)).toString('base64url'),'fixture_signature'].join('.');
try {
  await pass('Provider secrets, private keys and credentialed database URLs are detected without logging values', () => {
    const examples = ['sk_'+'live_'+ 'a'.repeat(32),'whsec_'+'a'.repeat(30),'sb_'+'secret_'+'a'.repeat(30),'sk-'+'proj-'+'a'.repeat(40),'re_'+'a'.repeat(30),'ghp_'+'a'.repeat(40),['-----BEGIN','PRIVATE KEY-----'].join(' '),'postgresql://'+'fixture-user:fixture-password@db.invalid/app'];
    for (const value of examples) { const findings=scanText(value,'sample.js'); assert.ok(findings.length); assert.ok(!JSON.stringify(findings).includes(value)); }
  });
  await pass('Public anonymous keys are permitted while embedded user and service JWTs fail', () => {
    assert.equal(scanText(token({role:'anon'}),'sample.js').length,0);
    for (const role of ['authenticated','service_role']) assert.ok(scanText(token({role,sub:'fixture-user'}),'sample.js').length);
  });
  await pass('Unknown public environment variables and private keys mislabeled as public are blocked', () => {
    assert.ok(validatePublicEnv({VITE_SERVER_PASSWORD:'fixture-value'}).length);
    assert.ok(validatePublicEnv({VITE_SUPABASE_PUBLISHABLE_KEY:token({role:'service_role'})}).length);
    assert.ok(validatePublicEnv({VITE_STRIPE_PUBLISHABLE_KEY:'sk_'+'live_'+'a'.repeat(32)}).length);
    assert.equal(validatePublicEnv({VITE_SUPABASE_PUBLISHABLE_KEY:token({role:'anon'}),VITE_SUPABASE_URL:'https://project.supabase.co'}).length,0);
  });
  await pass('Browser Google keys cannot reuse a server Google credential', () => {
    assert.ok(validatePublicEnv({VITE_GOOGLE_MAPS_API_KEY:'fixture-google',GOOGLE_PLACES_API_KEY_SERVER:'fixture-google'}).some(x=>x.kind==='google-browser-key-reuses-server-credential'));
  });
  await pass('Exact server secrets and common encoded representations are detected', () => {
    const value='sensitive-'+crypto.randomUUID();
    const knownSecrets=collectKnownSecrets({SERVER_API_KEY:value,VITE_GOOGLE_MAPS_API_KEY:'fixture-public-map-key'});
    assert.equal(knownSecrets.length,1);
    for(const encoded of [value,JSON.stringify(value).slice(1,-1),encodeURIComponent(value),Buffer.from(value).toString('base64')]) assert.ok(scanText(encoded,'sample.js',{knownSecrets}).length);
  });
  await pass('Fixture-like words cannot hide production credentials or known environment secrets', () => {
    for (const name of ['DB_PASSWORD','adminPassword','service_role_key','CLIENT_SECRET']) {
      assert.ok(scanText(`${name}: "fixture-${crypto.randomUUID()}"`,'production.js').length);
    }
    const value=`fixture-${crypto.randomUUID()}`;
    const knownSecrets=collectKnownSecrets({SERVER_PASSWORD:value});
    assert.equal(knownSecrets.length,1);
    assert.ok(scanText(value,'production.js',{knownSecrets}).length);
  });
  await pass('Source scans include asset bytes, nested environment files and private file extensions', () => {
    const root=path.join(temp,'source');fs.mkdirSync(root);
    execFileSync('git',['init','--quiet',root]);
    fs.mkdirSync(path.join(root,'public'));fs.mkdirSync(path.join(root,'nested'));
    fs.writeFileSync(path.join(root,'public','asset.bin'),Buffer.concat([Buffer.from([0,255,1]),Buffer.from('sk_'+'live_'+'a'.repeat(32))]));
    fs.writeFileSync(path.join(root,'nested','.env.production'),'DATABASE_PASSWORD=some_unquoted_value\n');
    fs.writeFileSync(path.join(root,'nested','certificate.p12'),Buffer.from([0,1,2,3]));
    const report=scanSources(root);
    assert.equal(report.files,3);
    assert.ok(report.findings.some(x=>x.file==='public/asset.bin' && x.kind==='stripe-private-key'));
    assert.ok(report.findings.some(x=>x.kind==='unapproved-committed-environment-variable:DATABASE_PASSWORD'));
    assert.ok(report.findings.some(x=>x.kind==='committed-private-key-file'));
  });
  await pass('Copied private files and hidden or inline source maps are rejected', () => {
    const out=path.join(temp,'artifacts');fs.mkdirSync(out);
    fs.writeFileSync(path.join(out,'hidden.js.map'),'{}');fs.writeFileSync(path.join(out,'.env'),'placeholder');
    fs.writeFileSync(path.join(out,'main.js'),'console.log(1);\n//# sourceMappingURL=data:application/json;base64,e30=');
    const result=scanArtifacts(out,{});assert.equal(result.files,3);assert.ok(result.findings.some(x=>x.kind==='source-map-reference'));assert.equal(result.findings.filter(x=>x.kind==='private-file-or-source-map').length,2);
  });
  await pass('The build plugin rejects server imports and overridden sourcemap settings', () => {
    const plugin=clientBuildGuard({});
    assert.throws(()=>plugin.configResolved({build:{sourcemap:true}}),/source maps/);
    assert.throws(()=>plugin.generateBundle({}, {main:{type:'chunk',modules:{'/repo/supabase/functions/private/index.ts':{}}}}),/server-only/);
  });
  await pass('A real Vite build succeeds cleanly and fails when a private key enters its final chunk', async () => {
    const root=path.join(temp,'app');fs.mkdirSync(root);fs.writeFileSync(path.join(root,'index.html'),'<script type="module" src="/main.js"></script>');
    fs.writeFileSync(path.join(root,'main.js'),'document.body.textContent="safe";');
    const options={root,configFile:false,logLevel:'silent',plugins:[clientBuildGuard({})],build:{sourcemap:false}};
    await build(options);
    fs.writeFileSync(path.join(root,'main.js'),`document.body.textContent=${JSON.stringify('sk_'+'live_'+'a'.repeat(32))};`);
    await assert.rejects(()=>build({...options,plugins:[clientBuildGuard({})]}),/stripe-private-key/);
  });
  console.log(`${checks} release security checks passed. No external services used.`);
} finally { fs.rmSync(temp,{recursive:true,force:true}); }
