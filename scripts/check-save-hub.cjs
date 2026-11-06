const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.join(__dirname,'..');
const compile=p=>ts.transpileModule(fs.readFileSync(path.join(root,p),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const helpers={};vm.runInNewContext(compile('src/lib/hubSave.ts'),{exports:helpers,encodeURIComponent});
const {hubSaveDevice,isEmbeddedBrowser,publicHubUrl}=helpers;
assert.equal(hubSaveDevice('Mozilla iPhone'),'iphone');assert.equal(hubSaveDevice('Mozilla Macintosh',5),'iphone');assert.equal(hubSaveDevice('Mozilla Macintosh',0),'desktop');assert.equal(hubSaveDevice('Mozilla Android'),'android');assert.equal(isEmbeddedBrowser('Instagram'),true);
assert.equal(publicHubUrl('lasislasfontana'),'https://tapaway.co/lasislasfontana');assert.equal(publicHubUrl('name?token=private'),'https://tapaway.co/name%3Ftoken%3Dprivate');
function fixture({ua='iPhone',standalone=false,clipboardFails=false}={}) {
 let index=0,slots=[],effects=[],copied=[];
 const react={useState(initial){const i=index++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v];},useEffect(fn){index++;effects.push(fn);}};
 const jsx=(type,props)=>({type,props:props||{}}),generic=new Proxy({},{get:(_,k)=>String(k)});
 const icon={attrs:{href:'/apple-touch-icon.png',sizes:'180x180'},getAttribute(k){return this.attrs[k]??null;},setAttribute(k,v){this.attrs[k]=v;},removeAttribute(k){delete this.attrs[k];},set href(v){this.attrs.href=v;}};
 const ex={};vm.runInNewContext(compile('src/components/hub/SaveHub.tsx'),{exports:ex,require:n=>n==='react'?react:n==='react/jsx-runtime'?{jsx,jsxs:jsx}:n==='@/lib/hubSave'?helpers:generic,navigator:{userAgent:ua,maxTouchPoints:0,clipboard:{async writeText(v){if(clipboardFails)throw Error('denied');copied.push(v);}}},window:{matchMedia:()=>({matches:standalone,addEventListener(){},removeEventListener(){}})},document:{querySelector:()=>icon}});
 const render=()=>{index=0;effects=[];return ex.SaveHub({slug:'lasislasfontana',name:'Las Islas',logo:'https://example.com/logo.png'});};
 const initial=render(),cleanup=effects.map(fn=>fn());return {render,initial,copied,icon,cleanup};
}
function nodes(tree){if(!tree)return[];if(Array.isArray(tree))return tree.flatMap(nodes);if(typeof tree!=='object')return[];return [tree,...nodes(tree.props.children)];}
function text(tree){if(tree==null||tree===false)return'';if(Array.isArray(tree))return tree.map(text).join(' ');if(typeof tree!=='object')return String(tree);return text(tree.props.children);}
(async()=>{
 const f=fixture();let t=f.render();assert.match(text(t),/Tap Safari’s Share button/);assert.doesNotMatch(text(t),/Open Chrome’s menu/);
 nodes(t).find(n=>n.props['aria-label']==='Save this hub to your phone').props.onClick();t=f.render();assert.equal(nodes(t).find(n=>n.type==='Dialog').props.open,true);
 nodes(t).find(n=>n.type==='button'&&text(n)==='Android').props.onClick();t=f.render();assert.match(text(t),/Open Chrome’s menu/);assert.doesNotMatch(text(t),/Tap Safari’s Share button/);
 await nodes(t).find(n=>n.props.className==='hub-save-copy').props.onClick();t=f.render();assert.deepEqual(f.copied,['https://tapaway.co/lasislasfontana']);assert.match(text(t),/Link copied/);assert.doesNotMatch(text(t),/Successfully installed/);
 assert.equal(f.icon.attrs.href,'https://example.com/logo.png');f.cleanup.forEach(fn=>fn?.());assert.equal(f.icon.attrs.href,'/apple-touch-icon.png');
 const failed=fixture({clipboardFails:true});await nodes(failed.render()).find(n=>n.props.className==='hub-save-copy').props.onClick();assert.match(text(failed.render()),/Press and hold this link/);assert.doesNotMatch(text(failed.render()),/Link copied/);
 assert.equal(nodes(fixture({standalone:true}).render()).some(n=>n.props['aria-label']==='Save this hub to your phone'),false);
 assert.match(text(fixture({ua:'iPhone Instagram'}).render()),/First open this page in\s+Safari/);
 assert.match(text(fixture({ua:'Desktop'}).render()),/Scan with your phone/);
 console.log('PASS phone detection, iPad detection, in-app guidance, platform switch, exact hub link, clipboard failure, standalone hiding and icon cleanup. No provider writes.');
})().catch(e=>{console.error(e);process.exit(1);});
