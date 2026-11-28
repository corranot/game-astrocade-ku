// PROTOTYPE - NOT FOR PRODUCTION
// No-clip check: node prototypes/photo-safari/noclip.js prototypes/photo-safari <outDir> [spots.json]
// SELF=1 runs only the per-animation self-intersection part (about 6 s). MODE=before skips the sweeps.
// 1) Pip walks at every solid from 8 sides (only where the approach is walkable): deepest overlap per solid
// 2) animals live for 45 s: overlap with solids and with each other
// 3) Pip's own parts per animation: mitts vs head/parka/camera/each other, sleeves vs parka, camera and strap vs head/parka
// 4) showcase frames: Pip walked into a few props from the back camera
const http=require('http'),fs=require('fs'),path=require('path');const {chromium}=require('playwright');
const dir=path.resolve(process.argv[2]),out=process.argv[3],spotsF=process.argv[4];fs.mkdirSync(out,{recursive:true});
const before=process.env.MODE==='before';
const types={'.js':'text/javascript','.html':'text/html','.json':'application/json'};
const srv=http.createServer((q,s)=>{const u=q.url.split('?')[0],f=path.join(dir,u==='/'?'index.html':u);fs.readFile(f,(e,d)=>{if(e){s.writeHead(404);return s.end();}s.writeHead(200,{'content-type':types[path.extname(f)]||'text/plain'});s.end(d);});}).listen(0);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
  const p=await b.newPage({viewport:{width:360,height:640},deviceScaleFactor:1,hasTouch:true});
  const errs=[];p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error')errs.push(m.text());});
  await p.goto(`http://localhost:${srv.address().port}/?local&tod=day`);
  await p.waitForFunction(()=>window.__game&&window.__game.loaded&&__game.H.ready&&__game.H.c.group.parent,null,{timeout:60000});
  await p.evaluate(async()=>{const G=__game;G.pause();G.skipFtue();G.buildAll();G.W.buildGround&&0;G.S.open=3;for(let i=0;i<3;i++)G.openArea&&G.openArea(i);G.step(30);window.L=await import('/logic.js');});
  let spots=spotsF&&fs.existsSync(spotsF)?JSON.parse(fs.readFileSync(spotsF)):null;
  const R={};
  const SELF=!!process.env.SELF,ONLYSPOTS=!!process.env.SPOTS;
  if(!before&&!SELF&&!ONLYSPOTS){
    // 1) hero sweep
    R.hero=await p.evaluate(async()=>{const G=__game,L=window.L,cfg=G.S&&null,hr=0.5,sol=G.W.solids;const res=[];let worst=0,tested=0,frames=0;
      const walk=(x,z)=>L.walkable(G.__cfg||window.__cfgc,3,x,z);
      for(let i=0;i<sol.length;i++){const s=sol[i],sx=Array.isArray(s)?s[0]:s.x,sz=Array.isArray(s)?s[1]:s.z,br=Array.isArray(s)?s[2]:Math.hypot(s.hx,s.hz);let deep=0,any=false;
        for(let k=0;k<8;k++){const a=k/8*Math.PI*2+0.2,d0=br+hr+1.6,fx=sx-Math.sin(a)*d0,fz=sz-Math.cos(a)*d0,tx=sx+Math.sin(a)*d0+Math.cos(a)*0.25,tz=sz+Math.cos(a)*d0-Math.sin(a)*0.25;
          if(!L.walkable(G.cfg,3,fx,fz))continue;
          if(L.overlapDepth(sol,fx,fz,hr)>0)continue;
          // the game's own movement step (L.slide with W.solids at the hero's top speed), 60 steps a second
          let x=fx,z=fz;const st=G.cfg.hero.speed/60;for(let f=0;f<Math.ceil(d0*2/st)+20;f++){const dx=tx-x,dz=tz-z,d=Math.hypot(dx,dz);if(d<0.3)break;[x,z]=L.slide(G.cfg,3,x,z,dx/d*st,dz/d*st,sol,hr);frames++;const dd=L.overlapDepth(sol,x,z,hr);if(dd>deep)deep=dd;}
          any=true;}
        if(any){tested++;if(deep>worst)worst=deep;if(deep>0.01)res.push({i,s,deep:+deep.toFixed(3)});}
        if(i%20===0)await new Promise(r=>setTimeout(r,0));}
      return {solids:sol.length,tested,frames,worst:+worst.toFixed(4),bad:res.slice(0,20),nBad:res.length};});
    console.log('hero',JSON.stringify(R.hero));
    // 2) animals for 90 s of game time (hero parked far away at the start so they roam)
    R.animals=await p.evaluate(async()=>{const G=__game,L=window.L,sol=G.W.solids;G.tp(0,8);let wS=0,wA=0,who='',pair='';
      for(let f=0;f<2700;f++){G.step(1);if(f%10)continue;const vis=G.animals.filter(a=>a.parts.group.visible);
        for(const a of vis){if(a.sp.perch||a.sp.shy||a.sp.type==='whale')continue;const d=L.overlapDepth(sol,a.x,a.z,a.parts.radius);if(d>wS){wS=d;who=a.id;}}
        for(let i=0;i<vis.length;i++)for(let j=i+1;j<vis.length;j++){const A=vis[i],B=vis[j];const o=A.parts.radius+B.parts.radius-Math.hypot(A.x-B.x,A.z-B.z);if(o>wA){wA=o;pair=A.id+'/'+B.id;}}
        if(f%300===0){await new Promise(r=>setTimeout(r,0));G.tp(...[[0,8],[0,-40],[0,-90],[0,-150],[-10,-20],[12,-60]][(f/300)%6|0]);}}
      return {solidWorst:+wS.toFixed(3),solidWho:who,animalWorst:+wA.toFixed(3),pair};});
    console.log('animals',JSON.stringify(R.animals));
  }
  // 3) Pip self-intersection per animation
  if(SELF||ONLYSPOTS)await p.evaluate(()=>{window.__NS=8;});
  R.self=await p.evaluate(async()=>{const G=__game,H=G.H,c=H.c,CH=await import('/chibi.js');let PIP=null;try{PIP=await import('/pip.js');}catch(e){}
    const V=(x,y,z)=>new THREE.Vector3(x,y,z),COAT=[[0,0.52],[0.225,0.525],[0.245,0.57],[0.24,0.65],[0.228,0.75],[0.214,0.85],[0.206,0.94],[0.205,1.0],[0.192,1.045],[0.16,1.085],[0.115,1.115],[0,1.125]];
    const coatR=(y)=>{for(let i=0;i<COAT.length-1;i++)if(y>=COAT[i][1]&&y<=COAT[i+1][1])return COAT[i][0]+(COAT[i+1][0]-COAT[i][0])*(y-COAT[i][1])/(COAT[i+1][1]-COAT[i][1]);return 0;};
    const names=c.skeleton.bones.map(b=>b.name),bi=(n)=>names.indexOf(n);
    const torsoB=['pelvis','spine1','spine2','spine3'];
    // depth (m) of a mesh-space point inside the parka, found by un-posing it with the nearest torso bone
    const minv=new THREE.Matrix4(),tmp=new THREE.Matrix4();
    const coatDepth=(pm)=>{let best=-1;for(const n of torsoB){const b=c.bones[n];tmp.copy(minv).multiply(b.matrixWorld).invert();const loc=pm.clone().applyMatrix4(tmp);const bind=c.skeleton.boneInverses[bi(n)].clone().invert();const r=loc.applyMatrix4(bind);
        const yp=r.y/0.8,bandOk=n==='pelvis'?yp<0.66:n==='spine1'?yp>=0.6&&yp<0.78:n==='spine2'?yp>=0.72&&yp<0.92:yp>=0.86;if(!bandOk)continue;const R0=coatR(yp);if(R0<=0)continue;const q=Math.hypot(r.x/R0,r.z/(0.84*R0));const d=(1-q)*R0;if(d>best)best=d;}return best;};
    const headDepth=(pm)=>{const hb=c.bones.head;tmp.copy(minv).multiply(hb.matrixWorld).invert();const l=pm.clone().applyMatrix4(tmp);l.y-=0.2;const k=1.08;const q=Math.hypot(l.x/(0.3*k),l.y/(0.29*k),l.z/(0.275*k));return (1-q)*0.29*k*hb.scale.x;};
    const ell=[];for(let i=0;i<10;i++)for(let j=1;j<6;j++){const th=i/10*Math.PI*2,ph=j/6*Math.PI;ell.push([Math.sin(ph)*Math.cos(th),Math.cos(ph),Math.sin(ph)*Math.sin(th)]);}
    const toMesh=(obj,v)=>v.applyMatrix4(obj.matrixWorld).applyMatrix4(minv);
    const mitt=(h)=>ell.map(([x,y,z])=>toMesh(c.bones[h],V(x*0.056,y*0.082-0.066,z*0.07-0.004)));
    const sleeve=(s)=>{const pts=[];for(const n of ['forearm','forearmTwist'])for(let t=0;t<=1;t+=0.25)pts.push(toMesh(c.bones[n+s],V(0,-0.075*t,0)));return pts;};
    const camPts=()=>{const pts=[];for(const x of [-0.15,0,0.15])for(const y of [-0.1,0,0.1])for(const z of [-0.065,0.065])pts.push(toMesh(H.cam,V(x,y,z)));pts.push(toMesh(H.cam,V(0,-0.01,0.116)));return pts;};
    const inCam=(pm)=>{const l=pm.clone().applyMatrix4(minv.clone().invert()).applyMatrix4(H.cam.matrixWorld.clone().invert());return Math.min(0.15-Math.abs(l.x),0.1-Math.abs(l.y),0.065-Math.abs(l.z));};
    const strapPts=()=>{if(!PIP||!PIP.strapPoints||!H.strap)return [];const pts=[];for(const side of PIP.strapPoints(H))for(let i=0;i<2;i++)for(let t=0.1;t<=0.91;t+=0.2){const a=side[i],b2=side[i+1];pts.push(toMesh(c.bones.spine3,V(a[0]+(b2[0]-a[0])*t,a[1]+(b2[1]-a[1])*t,a[2]+(b2[2]-a[2])*t)));}return pts;};
    const poses=[['rest',{vf:0,idle:null}],['walk',{vf:0,idle:null,walk:1}],['raise25',{vf:0.25,idle:null}],['raise50',{vf:0.5,idle:null}],['raise54',{vf:0.54,idle:null}],
      ...[0.15,0.3,0.5,0.7,0.85].map(q=>['warm'+q,{vf:0,idle:{k:'warm',p:q}}]),...[0.2,0.35,0.5,0.65].map(q=>['stamp'+q,{vf:0,idle:{k:'stamp',p:q}}]),...[0.2,0.5,0.8].map(q=>['peek'+q,{vf:0,idle:{k:'peek',p:q}}]),['wave',{vf:0,idle:null,wave:1}],['walkwave',{vf:0,idle:null,walk:1,wave:1}]];
    const out={};
    const NS=window.__NS||40;for(const [n,pz] of poses){G.pose(pz);G.step(20);const m={mittHead:9,mittCoat:-9,sleeveCoat:-9,mittCam:-9,mitts:9,camCoat:-9,camHead:-9,strapHead:-9,strapCoat:-9};
      for(let f=0;f<NS;f++){G.step(40/NS|0);c.group.updateMatrixWorld(true);minv.copy(c.mesh.matrixWorld).invert();
        
        const ml=mitt('handL'),mr=mitt('handR');for(const q of [...ml,...mr]){m.mittHead=Math.min(m.mittHead,-headDepth(q));m.mittCoat=Math.max(m.mittCoat,coatDepth(q));m.mittCam=Math.max(m.mittCam,inCam(q));}
        for(const q of [...sleeve('L'),...sleeve('R')])m.sleeveCoat=Math.max(m.sleeveCoat,coatDepth(q)+0.05);
        m.mitts=Math.min(m.mitts,toMesh(c.bones.handL,V(0,-0.066,0)).distanceTo(toMesh(c.bones.handR,V(0,-0.066,0))));
        for(const q of camPts()){m.camCoat=Math.max(m.camCoat,coatDepth(q));m.camHead=Math.max(m.camHead,headDepth(q));}
        for(const q of strapPts()){m.strapHead=Math.max(m.strapHead,headDepth(q));m.strapCoat=Math.max(m.strapCoat,coatDepth(q));}}
      for(const k in m)m[k]=+m[k].toFixed(3);out[n]=m;}
    G.pose(null);return out;});
  // limits: a positive depth is a penetration; small touches allowed (puffy fabric, mitts holding the camera)
  const lim={mittCoat:0.012,sleeveCoat:0.03,mittCam:0.025,camCoat:0.005,camHead:0.005,strapHead:0.003,strapCoat:0.006};
  const fails=[];for(const [n,m] of Object.entries(R.self)){for(const [k,v] of Object.entries(lim))if(m[k]>v)fails.push(`${n}.${k}=${m[k]}`);if(m.mittHead<-0.005)fails.push(`${n}.mittHead=${m.mittHead}`);if(m.mitts<0.12)fails.push(`${n}.mitts=${m.mitts}`);}
  console.log('self',JSON.stringify(R.self));console.log('selfFails',fails.length,fails.join(' '));
  // 4) showcase frames
  if(SELF)spots=[];
  if(!spots&&!before){spots=await p.evaluate(()=>{const G=__game,L=window.L,sol=G.W.solids,hr=0.5;const want=[];const pick=(test,label)=>{for(const s of sol){if(!test(s))continue;const sx=Array.isArray(s)?s[0]:s.x,sz=Array.isArray(s)?s[1]:s.z,br=Array.isArray(s)?s[2]:Math.hypot(s.hx,s.hz);
      for(let k0=0;k0<8;k0++){const k=(k0+4)%8,a=k/8*Math.PI*2,d0=br+hr+3,fx=sx-Math.sin(a)*d0,fz=sz-Math.cos(a)*d0;if(!L.walkable(G.cfg,3,fx,fz))continue;G.tp(fx,fz);if(L.overlapDepth(sol,fx,fz,hr)>0||Math.hypot(G.hero.x-fx,G.hero.z-fz)>0.01)continue;want.push({label,from:[fx,fz],to:[sx+Math.sin(a)*1,sz+Math.cos(a)*1],c:[sx,sz]});return;}}};
      pick(s=>Array.isArray(s)&&Math.abs(s[2]-0.3)<0.01,'lantern');pick(s=>Array.isArray(s)&&s[2]===0.75,'snowman');pick(s=>!Array.isArray(s)&&s.h,'cabin');pick(s=>Array.isArray(s)&&s[2]>1.2&&s[3]===0,'pine');pick(s=>Array.isArray(s)&&s[2]===0.8&&s[3]===undefined,'bush');pick(s=>!Array.isArray(s)&&Math.abs(s.hx-0.85)<0.01,'board');return want;});
    if(spotsF)fs.writeFileSync(spotsF,JSON.stringify(spots));}
  for(const s of spots||[]){await p.evaluate((s)=>{const G=__game;G.tp(...s.from);G.walkTo(...s.to);G.step(150);G.walkTo(...s.to);G.step(2);},s);await p.waitForTimeout(100);
    const hx=await p.evaluate((s)=>{const G=__game;return [+G.hero.x.toFixed(2),+G.hero.z.toFixed(2)];},s);console.log('spot',s.label,JSON.stringify(s.c),'hero',JSON.stringify(hx));
    await p.screenshot({path:`${out}/${before?'before':'after'}-${s.label}.jpg`,quality:84});}
  fs.writeFileSync(`${out}/${before?'before':SELF?'self':'after'}.json`,JSON.stringify(R,null,1));
  console.log('errors',errs.length,errs.slice(0,3).join(' | '));
  await b.close();srv.close();})();
