import { useState, useEffect, useRef, useCallback } from "react";
import * as THREE from "three";

const FontLoader = () => {
  useEffect(() => {
    const l = document.createElement("link");
    l.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;600;700&family=Crimson+Text:ital,wght@0,400;0,600;1,400&display=swap";
    l.rel = "stylesheet"; document.head.appendChild(l);
  }, []);
  return null;
};

const S = {
  async get(k, shared=false) { try { const r = await window.storage.get(k,shared); return r?JSON.parse(r.value):null; } catch { return null; } },
  async set(k,v,shared=false) { try { await window.storage.set(k,JSON.stringify(v),shared); return true; } catch { return false; } },
  async del(k,shared=false) { try { await window.storage.delete(k,shared); } catch {} },
};

const genCode = () => Math.random().toString(36).substring(2,8).toUpperCase();
const genId   = () => Math.random().toString(36).substring(2,16);
const fileToB64 = f => new Promise((res,rej)=>{ const r=new FileReader(); r.onload=()=>res(r.result); r.onerror=rej; r.readAsDataURL(f); });
const modVal = v => Math.floor((v-10)/2);
const fmod   = v => { const m=modVal(v); return m>=0?`+${m}`:String(m); };

const RACES   = ["Human","Elf","Dwarf","Halfling","Gnome","Half-Orc","Tiefling","Dragonborn","Half-Elf","Aasimar"];
const CLASSES = ["Barbarian","Bard","Cleric","Druid","Fighter","Monk","Paladin","Ranger","Rogue","Sorcerer","Warlock","Wizard"];
const BKGS    = ["Acolyte","Charlatan","Criminal","Entertainer","Folk Hero","Guild Artisan","Hermit","Noble","Outlander","Sage","Sailor","Soldier"];
const ALIGNS  = ["Lawful Good","Neutral Good","Chaotic Good","Lawful Neutral","True Neutral","Chaotic Neutral","Lawful Evil","Neutral Evil","Chaotic Evil"];
const STATS   = ["STR","DEX","CON","INT","WIS","CHA"];
const HP_MAP  = {Barbarian:12,Fighter:10,Paladin:10,Ranger:10,Cleric:8,Druid:8,Monk:8,Rogue:8,Warlock:8,Bard:8,Sorcerer:6,Wizard:6};
const COST    = {8:0,9:1,10:2,11:3,12:4,13:5,14:7,15:9};

const g = {
  bg:"#080402",card:"#0f0a05ee",cardB:"#160e08",gold:"#c9a84c",goldD:"#a0875a",goldF:"#c9a84c18",
  pur:"#9b72cf",purF:"#9b72cf18",red:"#c0392b",grn:"#27ae60",txt:"#e8d5b0",txtD:"#a0875a",
  bdr:"#c9a84c28",bdrG:"#c9a84c66",fD:"'Cinzel', serif",fB:"'Crimson Text', serif",fT:"'Cinzel Decorative', serif",
};

const Btn = ({children,onClick,accent,small,full,disabled,style={}})=>{
  const a=accent||g.gold;
  return <button onClick={onClick} disabled={disabled} style={{background:`${a}18`,border:`1px solid ${a}${disabled?"22":"88"}`,color:disabled?`${a}44`:a,borderRadius:8,padding:small?"5px 14px":"9px 22px",fontFamily:g.fD,fontSize:small?10:12,letterSpacing:2,cursor:disabled?"not-allowed":"pointer",width:full?"100%":"auto",transition:"all .2s",...style}}>{children}</button>;
};
const Label = ({children,style={}})=><div style={{color:g.goldD,fontFamily:g.fD,fontSize:9,letterSpacing:3,textTransform:"uppercase",marginBottom:5,...style}}>{children}</div>;
const Card  = ({children,style={},accent})=><div style={{background:g.card,border:`1px solid ${accent||g.bdr}`,borderRadius:12,padding:16,...style}}>{children}</div>;
const Sel   = ({label,val,opts,onCh})=>(
  <div>
    <Label>{label}</Label>
    <select value={val} onChange={e=>onCh(e.target.value)} style={{background:g.cardB,border:`1px solid ${g.bdr}`,color:g.txt,borderRadius:7,padding:"7px 10px",fontFamily:g.fB,fontSize:13,width:"100%",cursor:"pointer"}}>
      {opts.map(o=><option key={o} value={o}>{o}</option>)}
    </select>
  </div>
);

/* ─── 3D DICE ─────────────────────────────────────────────────── */
function Dice3D({ sides=20, accent=g.gold, rolling, size=120 }) {
  const mountRef = useRef(null);
  const rollRef  = useRef(null);
  useEffect(()=>{
    if(!mountRef.current) return;
    const scene=new THREE.Scene();
    const camera=new THREE.PerspectiveCamera(50,1,.1,100);
    camera.position.z=4.8;
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setSize(size,size); renderer.setPixelRatio(Math.min(devicePixelRatio,2));
    mountRef.current.appendChild(renderer.domElement);
    scene.add(new THREE.AmbientLight(0xffffff,.4));
    const p1=new THREE.PointLight(0xc9a84c,2.5,10); p1.position.set(3,4,3); scene.add(p1);
    const p2=new THREE.PointLight(0x9b72cf,1.2,10); p2.position.set(-3,-2,2); scene.add(p2);
    const geoFor=n=>{
      if(n===4) return new THREE.TetrahedronGeometry(1.25);
      if(n===6) return new THREE.BoxGeometry(1.65,1.65,1.65);
      if(n===8) return new THREE.OctahedronGeometry(1.3);
      if(n===12)return new THREE.DodecahedronGeometry(1.2);
      return new THREE.IcosahedronGeometry(1.3,0);
    };
    const geo=geoFor(sides);
    const ac=parseInt(accent.replace('#',''),16);
    const mat=new THREE.MeshPhongMaterial({color:0x100c08,emissive:0x060310,specular:ac,shininess:120});
    const mesh=new THREE.Mesh(geo,mat);
    const edges=new THREE.LineSegments(new THREE.EdgesGeometry(geo),new THREE.LineBasicMaterial({color:ac,transparent:true,opacity:.85}));
    const grp=new THREE.Group(); grp.add(mesh,edges); scene.add(grp);
    let isRolling=false,t=0;
    rollRef.current=()=>{isRolling=true;t=0;};
    let raf; const animate=()=>{
      raf=requestAnimationFrame(animate);
      if(isRolling){t+=.055;grp.rotation.x+=.18*Math.cos(t*1.8);grp.rotation.y+=.22*Math.sin(t*.9);grp.rotation.z+=.14*Math.sin(t*1.3);grp.scale.setScalar(1+.07*Math.sin(t*4));if(t>Math.PI*2.8){isRolling=false;grp.scale.setScalar(1);}}
      else{grp.rotation.y+=.006;grp.rotation.x+=.003;}
      renderer.render(scene,camera);
    }; animate();
    return ()=>{cancelAnimationFrame(raf);if(mountRef.current?.contains(renderer.domElement))mountRef.current.removeChild(renderer.domElement);renderer.dispose();};
  },[sides,size]);
  useEffect(()=>{if(rolling)rollRef.current?.();},[rolling]);
  return <div ref={mountRef} style={{width:size,height:size}}/>;
}

/* ─── PARTICLES ───────────────────────────────────────────────── */
function Particles() {
  const ref=useRef(null);
  useEffect(()=>{
    if(!ref.current) return;
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(70,innerWidth/innerHeight,.1,100);
    camera.position.z=6;
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:false});
    renderer.setSize(innerWidth,innerHeight);renderer.setClearColor(0,0);
    ref.current.appendChild(renderer.domElement);
    const cnt=200,pos=new Float32Array(cnt*3);
    for(let i=0;i<cnt;i++){pos[i*3]=(Math.random()-.5)*24;pos[i*3+1]=(Math.random()-.5)*24;pos[i*3+2]=(Math.random()-.5)*10;}
    const geo=new THREE.BufferGeometry(); geo.setAttribute('position',new THREE.BufferAttribute(pos,3));
    const pts=new THREE.Points(geo,new THREE.PointsMaterial({color:0xc9a84c,size:.05,transparent:true,opacity:.3}));
    scene.add(pts);
    let t=0,raf; const animate=()=>{raf=requestAnimationFrame(animate);t+=.0008;pts.rotation.y=t;pts.rotation.x=t*.4;renderer.render(scene,camera);}; animate();
    const onR=()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);};
    window.addEventListener('resize',onR);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener('resize',onR);if(ref.current?.contains(renderer.domElement))ref.current.removeChild(renderer.domElement);renderer.dispose();};
  },[]);
  return <div ref={ref} style={{position:'fixed',inset:0,pointerEvents:'none',zIndex:0}}/>;
}

/* ─── DICE PANEL ──────────────────────────────────────────────── */
function DicePanel({ label, accent=g.gold }) {
  const [sel,setSel]=useState(20);
  const [result,setResult]=useState(null);
  const [rolling,setRolling]=useState(false);
  const [hist,setHist]=useState([]);
  const roll=()=>{
    if(rolling) return; setRolling(true); setResult(null);
    let c=0; const iv=setInterval(()=>{setResult(Math.ceil(Math.random()*sel));c++;if(c>14){clearInterval(iv);const v=Math.ceil(Math.random()*sel);setResult(v);setHist(h=>[{s:sel,v,t:Date.now()},...h].slice(0,6));setRolling(false);}},55);
  };
  const isCrit=sel===20&&result===20, isFail=sel===20&&result===1;
  return (
    <Card accent={`${accent}30`} style={{display:'flex',flexDirection:'column',gap:10}}>
      <Label>{label}</Label>
      <div style={{display:'flex',gap:5,flexWrap:'wrap'}}>
        {[4,6,8,10,12,20,100].map(d=>(
          <button key={d} onClick={()=>setSel(d)} style={{background:sel===d?`${accent}30`:'transparent',border:`1px solid ${accent}${sel===d?'99':'33'}`,color:sel===d?accent:g.goldD,borderRadius:6,padding:'3px 8px',fontSize:10,fontFamily:g.fD,cursor:'pointer'}}>d{d}</button>
        ))}
      </div>
      <div style={{display:'flex',gap:14,alignItems:'center'}}>
        <div onClick={roll} style={{cursor:'pointer',filter:rolling?`drop-shadow(0 0 14px ${accent})`:isCrit?`drop-shadow(0 0 18px ${g.grn})`:isFail?`drop-shadow(0 0 18px ${g.red})`:'none',transition:'filter .3s',position:'relative'}}>
          <Dice3D sides={sel} accent={accent} rolling={rolling} size={100}/>
          {result!=null&&<div style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center',pointerEvents:'none'}}>
            <div style={{fontSize:isCrit||isFail?26:30,fontFamily:g.fD,fontWeight:700,color:isCrit?g.grn:isFail?g.red:accent,textShadow:`0 0 16px ${isCrit?g.grn:isFail?g.red:accent}`}}>{result}</div>
          </div>}
        </div>
        <div style={{flex:1}}>
          {isCrit&&<div style={{color:g.grn,fontFamily:g.fD,fontSize:10,letterSpacing:2,marginBottom:4}}>★ CRITICAL ★</div>}
          {isFail&&<div style={{color:g.red,fontFamily:g.fD,fontSize:10,letterSpacing:2,marginBottom:4}}>✕ FUMBLE ✕</div>}
          <div style={{color:g.txtD,fontSize:12,fontFamily:g.fB,marginBottom:6}}>Click die to roll d{sel}</div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
            {hist.map(h=><span key={h.t} style={{color:`${accent}88`,fontSize:10,fontFamily:'monospace',background:'#ffffff08',padding:'2px 5px',borderRadius:3}}>d{h.s}:{h.v}</span>)}
          </div>
        </div>
      </div>
    </Card>
  );
}

/* ─── CHARACTER CREATOR ───────────────────────────────────────── */
function CharCreator({ initial, onSave, onClose }) {
  const blank={name:'',race:RACES[0],cls:CLASSES[0],level:1,bg:BKGS[0],align:ALIGNS[0],stats:{STR:10,DEX:10,CON:10,INT:10,WIS:10,CHA:10},notes:'',iconData:null,sheetData:null};
  const [c,setC]=useState(initial||blank);
  const iconRef=useRef(); const sheetRef=useRef();
  const pointsSpent=STATS.reduce((a,s)=>a+(COST[c.stats[s]]??0),0);
  const pointsLeft=27-pointsSpent;
  const hpDie=HP_MAP[c.cls]||8;
  const maxHp=hpDie+modVal(c.stats.CON);
  const set=(k,v)=>setC(p=>({...p,[k]:v}));
  const setStat=(s,v)=>{v=Math.max(8,Math.min(15,v));const next={...c.stats,[s]:v};if(STATS.reduce((a,k)=>a+(COST[next[k]]??0),0)<=27)setC(p=>({...p,stats:next}));};
  const handleIcon=async e=>{const f=e.target.files[0];if(f)set('iconData',await fileToB64(f));};
  const handleSheet=async e=>{const f=e.target.files[0];if(f)set('sheetData',await fileToB64(f));};

  return (
    <div style={{position:'fixed',inset:0,background:'#000000cc',zIndex:200,overflowY:'auto',backdropFilter:'blur(5px)',display:'flex',justifyContent:'center',padding:'20px 0'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(160deg,${g.cardB} 0%,#0a0703 100%)`,border:`1px solid ${g.bdrG}`,borderRadius:18,padding:28,width:'min(720px,94vw)',boxShadow:`0 0 60px ${g.gold}22,0 30px 80px #000000aa`,fontFamily:g.fB,color:g.txt,alignSelf:'flex-start'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:22}}>
          <div style={{fontFamily:g.fT,fontSize:22,color:g.gold,letterSpacing:2}}>⚔ Character Creator</div>
          <Btn small onClick={onClose}>✕ Close</Btn>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:20}}>
          {/* LEFT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Card>
              <Label>Character Icon</Label>
              <div style={{display:'flex',gap:14,alignItems:'center'}}>
                <div onClick={()=>iconRef.current?.click()} style={{width:80,height:80,borderRadius:10,border:`2px dashed ${c.iconData?g.bdrG:`${g.goldD}55`}`,background:c.iconData?'transparent':g.goldF,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0,transition:'border .2s'}}>
                  {c.iconData?<img src={c.iconData} alt="icon" style={{width:'100%',height:'100%',objectFit:'cover'}}/>:<div style={{textAlign:'center',color:g.goldD,fontSize:10,fontFamily:g.fD,letterSpacing:1}}>Upload<br/>Icon</div>}
                </div>
                <div>
                  <div style={{color:g.txtD,fontSize:12,marginBottom:8,lineHeight:1.5}}>Upload any image as your character's avatar — shown to all players.</div>
                  <div style={{display:'flex',gap:6}}>
                    <Btn small onClick={()=>iconRef.current?.click()}>📁 Choose</Btn>
                    {c.iconData&&<Btn small accent={g.red} onClick={()=>set('iconData',null)}>✕</Btn>}
                  </div>
                </div>
              </div>
              <input ref={iconRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleIcon}/>
            </Card>
            <div>
              <Label>Character Name</Label>
              <input value={c.name} onChange={e=>set('name',e.target.value)} placeholder="Enter name..." style={{background:g.cardB,border:`1px solid ${c.name?g.bdrG:g.bdr}`,color:g.txt,borderRadius:7,padding:'9px 12px',fontFamily:g.fB,fontSize:15,width:'100%',outline:'none',boxSizing:'border-box',transition:'border .2s'}}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <Sel label="Race" val={c.race} opts={RACES} onCh={v=>set('race',v)}/>
              <Sel label="Class" val={c.cls} opts={CLASSES} onCh={v=>set('cls',v)}/>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div>
                <Label>Level</Label>
                <input type="number" min={1} max={20} value={c.level} onChange={e=>set('level',+e.target.value)} style={{background:g.cardB,border:`1px solid ${g.bdr}`,color:g.txt,borderRadius:7,padding:'8px 10px',fontFamily:g.fD,fontSize:14,width:'100%',outline:'none',boxSizing:'border-box'}}/>
              </div>
              <div>
                <Label>Max HP</Label>
                <div style={{background:g.cardB,border:`1px solid ${g.red}55`,color:g.red,borderRadius:7,padding:'8px 10px',fontFamily:g.fD,fontSize:18,textAlign:'center'}}>{maxHp}</div>
              </div>
            </div>
            <Sel label="Background" val={c.bg} opts={BKGS} onCh={v=>set('bg',v)}/>
            <Sel label="Alignment"  val={c.align} opts={ALIGNS} onCh={v=>set('align',v)}/>
            <div>
              <Label>Notes / Backstory</Label>
              <textarea value={c.notes} onChange={e=>set('notes',e.target.value)} rows={4} placeholder="Your character's story..." style={{background:g.cardB,border:`1px solid ${g.bdr}`,color:g.txt,borderRadius:7,padding:'9px 12px',fontFamily:g.fB,fontSize:13,width:'100%',outline:'none',resize:'vertical',boxSizing:'border-box'}}/>
            </div>
          </div>
          {/* RIGHT */}
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <Card accent={pointsLeft<0?`${g.red}55`:pointsLeft===0?`${g.grn}55`:undefined}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10}}>
                <Label style={{marginBottom:0}}>Ability Scores — Point Buy</Label>
                <span style={{fontFamily:g.fD,fontSize:10,color:pointsLeft<0?g.red:pointsLeft===0?g.grn:g.gold}}>{pointsLeft} pts left</span>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                {STATS.map(s=>(
                  <div key={s} style={{background:'#ffffff08',borderRadius:8,padding:'10px 12px',border:'1px solid #ffffff0a'}}>
                    <div style={{color:g.goldD,fontFamily:g.fD,fontSize:9,letterSpacing:2,marginBottom:4}}>{s}</div>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <button onClick={()=>setStat(s,c.stats[s]-1)} style={{background:'#ffffff10',border:`1px solid ${g.bdr}`,color:g.gold,borderRadius:5,width:22,height:22,cursor:'pointer',fontSize:14,lineHeight:1,flexShrink:0}}>-</button>
                      <div style={{flex:1,textAlign:'center'}}>
                        <div style={{color:g.txt,fontFamily:g.fD,fontSize:18,fontWeight:700}}>{c.stats[s]}</div>
                        <div style={{color:g.goldD,fontSize:10}}>{fmod(c.stats[s])}</div>
                      </div>
                      <button onClick={()=>setStat(s,c.stats[s]+1)} style={{background:'#ffffff10',border:`1px solid ${g.bdr}`,color:g.gold,borderRadius:5,width:22,height:22,cursor:'pointer',fontSize:14,lineHeight:1,flexShrink:0}}>+</button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
              {[['AC','10'],['Speed','30 ft'],['Initiative',fmod(c.stats.DEX)],['Proficiency',`+${Math.ceil(1+c.level/4)}`],['Passive Perc',`${10+modVal(c.stats.WIS)}`],['Hit Die',`d${hpDie}`]].map(([k,v])=>(
                <div key={k} style={{background:g.goldF,border:`1px solid ${g.bdr}`,borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
                  <div style={{color:g.goldD,fontFamily:g.fD,fontSize:8,letterSpacing:1}}>{k}</div>
                  <div style={{color:g.gold,fontFamily:g.fD,fontSize:16,fontWeight:700,marginTop:2}}>{v}</div>
                </div>
              ))}
            </div>
            <Card>
              <Label>Character Sheet Upload (Optional)</Label>
              <div style={{color:g.txtD,fontSize:12,marginBottom:10,lineHeight:1.5}}>Upload your own sheet (PDF or image). This will be visible to you and the DM.</div>
              {c.sheetData?(
                <div>
                  <div style={{background:g.goldF,border:`1px solid ${g.bdrG}`,borderRadius:8,padding:'10px 14px',display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
                    <span style={{color:g.gold,fontFamily:g.fD,fontSize:11}}>📄 Sheet uploaded</span>
                    <Btn small accent={g.red} onClick={()=>set('sheetData',null)}>✕ Remove</Btn>
                  </div>
                  {c.sheetData.startsWith('data:image')&&<img src={c.sheetData} alt="sheet" style={{width:'100%',borderRadius:8,border:`1px solid ${g.bdr}`}}/>}
                </div>
              ):(
                <Btn full onClick={()=>sheetRef.current?.click()}>📁 Upload Sheet (PDF or Image)</Btn>
              )}
              <input ref={sheetRef} type="file" accept="image/*,application/pdf" style={{display:'none'}} onChange={handleSheet}/>
            </Card>
            <Btn full accent={c.name?g.grn:g.goldD} disabled={!c.name} onClick={()=>onSave({...c,maxHp,hp:maxHp})} style={{padding:'13px 0',fontSize:13,letterSpacing:3}}>
              {c.name?`⚔ SAVE — ${c.name}`:'Enter a name to save'}
            </Btn>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── CHAR SHEET MODAL ────────────────────────────────────────── */
function CharSheetModal({ char, onClose }) {
  if(!char) return null;
  return (
    <div style={{position:'fixed',inset:0,background:'#000000cc',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',backdropFilter:'blur(5px)'}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:`linear-gradient(160deg,${g.cardB},#0a0703)`,border:`1px solid ${g.bdrG}`,borderRadius:16,padding:28,width:'min(440px,92vw)',maxHeight:'88vh',overflowY:'auto',boxShadow:`0 0 40px ${g.gold}22,0 20px 60px #000000bb`}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18}}>
          <div style={{display:'flex',gap:14,alignItems:'center'}}>
            {char.iconData?<img src={char.iconData} alt="icon" style={{width:60,height:60,borderRadius:10,objectFit:'cover',border:`2px solid ${g.bdrG}`}}/>
              :<div style={{width:60,height:60,borderRadius:10,background:g.goldF,border:`2px solid ${g.bdr}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:28}}>⚔️</div>}
            <div>
              <div style={{fontFamily:g.fT,fontSize:20,color:g.gold}}>{char.name||'Unnamed'}</div>
              <div style={{color:g.txtD,fontSize:13}}>{char.race} {char.cls} — Lv.{char.level}</div>
              <div style={{color:g.txtD,fontSize:11}}>{char.bg} · {char.align}</div>
            </div>
          </div>
          <Btn small onClick={onClose}>✕</Btn>
        </div>
        <div style={{marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
            <Label style={{marginBottom:0}}>Hit Points</Label>
            <span style={{color:g.red,fontFamily:g.fD,fontSize:11}}>{char.hp}/{char.maxHp}</span>
          </div>
          <div style={{height:8,background:'#ffffff11',borderRadius:4,overflow:'hidden'}}>
            <div style={{width:`${(char.hp/char.maxHp)*100}%`,height:'100%',background:char.hp/char.maxHp>.5?g.grn:char.hp/char.maxHp>.25?'#f39c12':g.red,borderRadius:4}}/>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:14}}>
          {STATS.map(s=>(
            <div key={s} style={{background:g.goldF,border:`1px solid ${g.bdr}`,borderRadius:8,padding:'8px 6px',textAlign:'center'}}>
              <div style={{color:g.goldD,fontFamily:g.fD,fontSize:9,letterSpacing:2}}>{s}</div>
              <div style={{color:g.txt,fontFamily:g.fD,fontSize:20,fontWeight:700}}>{char.stats?.[s]||10}</div>
              <div style={{color:g.gold,fontSize:11}}>{fmod(char.stats?.[s]||10)}</div>
            </div>
          ))}
        </div>
        {char.sheetData&&(
          <div style={{marginBottom:14}}>
            <Label>Character Sheet</Label>
            {char.sheetData.startsWith('data:image')?<img src={char.sheetData} alt="sheet" style={{width:'100%',borderRadius:8,border:`1px solid ${g.bdr}`}}/>
              :<div style={{background:g.goldF,border:`1px solid ${g.bdrG}`,borderRadius:8,padding:'12px 16px',textAlign:'center',color:g.gold,fontFamily:g.fD,fontSize:11}}>📄 PDF Character Sheet attached</div>}
          </div>
        )}
        {char.notes&&<div><Label>Notes</Label><div style={{color:g.txtD,fontSize:14,fontFamily:g.fB,lineHeight:1.6,background:'#ffffff06',borderRadius:8,padding:10}}>{char.notes}</div></div>}
      </div>
    </div>
  );
}

/* ─── MAP PANEL ───────────────────────────────────────────────── */
function MapPanel({ mapData, onUpload, canUpload }) {
  const fileRef=useRef(); const [zoom,setZoom]=useState(false);
  const handleFile=async e=>{const f=e.target.files[0];if(f){const b=await fileToB64(f);onUpload(b);}};
  return (
    <Card style={{position:'relative'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:8}}>
        <Label style={{marginBottom:0}}>World Map</Label>
        <div style={{display:'flex',gap:6}}>
          {mapData&&<Btn small onClick={()=>setZoom(z=>!z)}>{zoom?'↙ Collapse':'↗ Expand'}</Btn>}
          {canUpload&&<Btn small accent={g.pur} onClick={()=>fileRef.current?.click()}>📁 Upload Map</Btn>}
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleFile}/>
      {mapData?(
        <>
          <img src={mapData} alt="map" style={{width:'100%',borderRadius:8,border:`1px solid ${g.bdr}`,display:'block',maxHeight:220,objectFit:'contain',cursor:'pointer'}} onClick={()=>setZoom(z=>!z)}/>
          {zoom&&<div style={{position:'fixed',inset:0,background:'#000000ee',zIndex:250,display:'flex',alignItems:'center',justifyContent:'center',padding:20}} onClick={()=>setZoom(false)}>
            <img src={mapData} alt="map" style={{maxWidth:'90vw',maxHeight:'88vh',borderRadius:12,border:`2px solid ${g.bdrG}`,boxShadow:`0 0 60px ${g.gold}33`}}/>
            <button onClick={()=>setZoom(false)} style={{position:'absolute',top:20,right:20,background:g.cardB,border:`1px solid ${g.bdrG}`,color:g.gold,borderRadius:8,padding:'8px 16px',cursor:'pointer',fontFamily:g.fD,fontSize:12}}>✕ Close</button>
          </div>}
        </>
      ):(
        <div style={{height:170,background:g.goldF,border:`2px dashed ${g.bdr}`,borderRadius:8,display:'flex',flexDirection:'column',gap:8,alignItems:'center',justifyContent:'center'}}>
          <svg width="60" height="48" viewBox="0 0 300 220"><rect width="300" height="220" fill="#3d2b1a" rx="6"/><path d="M20,40 Q60,20 100,35 Q130,25 160,45 Q190,30 220,50 Q240,40 260,60 Q270,90 250,110 Q230,130 200,120 Q170,140 150,125 Q120,145 100,130 Q70,150 50,130 Q20,120 15,90 Z" fill="#4a3520" opacity=".8"/><circle cx="130" cy="100" r="5" fill="#c9a84c" opacity=".9"/></svg>
          <div style={{color:g.goldD,fontFamily:g.fD,fontSize:10,letterSpacing:2}}>{canUpload?'Upload a map image':'No map uploaded yet'}</div>
        </div>
      )}
    </Card>
  );
}

/* ─── PLAYER CARD ─────────────────────────────────────────────── */
function PCard({ player, active, onClick, compact }) {
  const c=player.character;
  const hpPct=c?(c.hp/c.maxHp)*100:100;
  return (
    <div onClick={onClick} style={{background:`linear-gradient(135deg,${active?`${g.pur}18`:g.cardB} 0%,#0a0703 100%)`,border:`1.5px solid ${active?g.pur:g.bdr}`,borderRadius:10,padding:compact?'8px 10px':'12px 14px',cursor:onClick?'pointer':'default',transition:'all .2s',position:'relative',boxShadow:active?`0 0 18px ${g.pur}44`:undefined}}>
      {active&&<div style={{position:'absolute',top:-5,left:'50%',transform:'translateX(-50%)',width:10,height:10,background:g.grn,borderRadius:'50%',boxShadow:`0 0 10px ${g.grn}`,border:`2px solid ${g.bg}`}}/>}
      <div style={{display:'flex',gap:8,alignItems:'center'}}>
        {c?.iconData?<img src={c.iconData} alt="icon" style={{width:compact?28:36,height:compact?28:36,borderRadius:6,objectFit:'cover',border:`1px solid ${g.bdr}`,flexShrink:0}}/>
          :<div style={{width:compact?28:36,height:compact?28:36,borderRadius:6,background:g.goldF,border:`1px solid ${g.bdr}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:compact?12:16,flexShrink:0}}>⚔️</div>}
        <div style={{flex:1,minWidth:0}}>
          <div style={{color:g.gold,fontFamily:g.fD,fontSize:compact?9:11,fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{player.name}</div>
          {c&&<div style={{color:g.txtD,fontSize:9,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{c.race} {c.cls}</div>}
          {c&&<div style={{marginTop:4,height:3,background:'#ffffff11',borderRadius:2,overflow:'hidden'}}>
            <div style={{width:`${hpPct}%`,height:'100%',background:hpPct>50?g.grn:hpPct>25?'#f39c12':g.red,borderRadius:2}}/>
          </div>}
          {c&&!compact&&<div style={{color:g.red,fontSize:8,fontFamily:'monospace',marginTop:2}}>{c.hp}/{c.maxHp} HP</div>}
        </div>
      </div>
    </div>
  );
}

/* ─── HOME SCREEN ─────────────────────────────────────────────── */
function HomeScreen({ onCreateLobby, onJoinLobby }) {
  const [tab,setTab]=useState('create');
  const [code,setCode]=useState('');
  const [name,setName]=useState('');
  const [err,setErr]=useState('');
  const [busy,setBusy]=useState(false);

  const handleCreate=async()=>{
    if(!name.trim()){setErr('Enter your DM name.');return;} setErr('');
    const lobbyCode=genCode(), id=genId();
    const lobby={code:lobbyCode,dmId:id,dmName:name.trim(),players:[],status:'waiting',mapData:null,createdAt:Date.now()};
    await S.set(`lobby:${lobbyCode}`,lobby,true);
    await S.set('mySession',{id,code:lobbyCode,isDM:true,name:name.trim()});
    onCreateLobby(lobbyCode,id,name.trim(),lobby);
  };

  const handleJoin=async()=>{
    const c=code.trim().toUpperCase(), n=name.trim();
    if(!c||!n){setErr('Enter both your name and the lobby code.');return;} setErr(''); setBusy(true);
    const lobby=await S.get(`lobby:${c}`,true);
    if(!lobby){setErr('Lobby not found — double-check the code.');setBusy(false);return;}
    if(lobby.status==='playing'){setErr('This game has already started.');setBusy(false);return;}
    onJoinLobby(c,n,lobby); setBusy(false);
  };

  return (
    <div style={{minHeight:'100vh',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',padding:24,position:'relative',zIndex:1}}>
      <div style={{textAlign:'center',marginBottom:52}}>
        <div style={{fontFamily:g.fT,fontSize:52,color:g.gold,textShadow:`0 0 50px ${g.gold}88,0 0 100px ${g.gold}22`,lineHeight:1}}>⚔</div>
        <div style={{fontFamily:g.fT,fontSize:30,color:g.gold,letterSpacing:5,marginTop:10,textShadow:`0 0 30px ${g.gold}44`,lineHeight:1.3}}>TABLETOP<br/>COMPANION</div>
        <div style={{color:g.txtD,fontFamily:g.fD,fontSize:10,letterSpacing:5,marginTop:12}}>DIGITAL D&D SESSION MANAGER</div>
      </div>

      <div style={{width:'min(520px,92vw)'}}>
        <div style={{display:'flex',marginBottom:0,border:`1px solid ${g.bdr}`,borderRadius:'12px 12px 0 0',overflow:'hidden'}}>
          {[['create','🗡 Host a Game'],['join','🚪 Join a Game']].map(([t,l])=>(
            <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'14px 0',background:tab===t?`${g.gold}18`:'transparent',border:'none',borderBottom:tab===t?`2px solid ${g.gold}`:`2px solid transparent`,color:tab===t?g.gold:g.txtD,fontFamily:g.fD,fontSize:12,letterSpacing:2,cursor:'pointer',transition:'all .2s'}}>{l}</button>
          ))}
        </div>
        <Card accent={`${g.bdrG}`} style={{borderRadius:'0 0 12px 12px',borderTop:'none',padding:24,display:'flex',flexDirection:'column',gap:14}}>
          {tab==='create'?(
            <>
              <div style={{color:g.txtD,fontSize:14,fontFamily:g.fB,lineHeight:1.6}}>Start a session as the Dungeon Master. A lobby code will be generated — share it with your players.</div>
              <div>
                <Label>Your DM Name</Label>
                <input value={name} onChange={e=>setName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&handleCreate()} placeholder="e.g. DungeonMaster Dave" style={{background:g.cardB,border:`1px solid ${name?g.bdrG:g.bdr}`,color:g.txt,borderRadius:7,padding:'11px 14px',fontFamily:g.fB,fontSize:15,width:'100%',outline:'none',boxSizing:'border-box',transition:'border .2s'}}/>
              </div>
              <Btn full accent={g.gold} onClick={handleCreate} style={{padding:'13px 0',fontSize:13,letterSpacing:3}}>⚔ CREATE LOBBY</Btn>
            </>
          ):(
            <>
              <div style={{color:g.txtD,fontSize:14,fontFamily:g.fB,lineHeight:1.6}}>Enter the 6-letter code your DM shared with you.</div>
              <div>
                <Label>Your Player Name</Label>
                <input value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. Seraphel" style={{background:g.cardB,border:`1px solid ${name?g.bdrG:g.bdr}`,color:g.txt,borderRadius:7,padding:'11px 14px',fontFamily:g.fB,fontSize:15,width:'100%',outline:'none',boxSizing:'border-box',transition:'border .2s',marginBottom:12}}/>
                <Label>Lobby Code</Label>
                <input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&handleJoin()} placeholder="XXXXXX" maxLength={6} style={{background:g.cardB,border:`1px solid ${code.length===6?g.bdrG:g.bdr}`,color:g.gold,borderRadius:7,padding:'11px 14px',fontFamily:g.fT,fontSize:28,letterSpacing:10,width:'100%',outline:'none',boxSizing:'border-box',textAlign:'center',transition:'border .2s'}}/>
              </div>
              <Btn full accent={g.pur} onClick={handleJoin} disabled={busy} style={{padding:'13px 0',fontSize:13,letterSpacing:3}}>{busy?'Searching…':'🚪 JOIN LOBBY'}</Btn>
            </>
          )}
          {err&&<div style={{color:g.red,fontFamily:g.fD,fontSize:10,letterSpacing:1,textAlign:'center'}}>{err}</div>}
        </Card>
      </div>
      <div style={{marginTop:36,color:`${g.goldD}44`,fontFamily:g.fD,fontSize:9,letterSpacing:3,textAlign:'center'}}>LOBBY DATA PERSISTS ACROSS BROWSER TABS VIA SHARED STORAGE</div>
    </div>
  );
}

/* ─── LOBBY SCREEN ────────────────────────────────────────────── */
function LobbyScreen({ session, onStartGame, onBack }) {
  const [lobby,setLobby]=useState(null);
  const [copied,setCopied]=useState(false);
  const [showCreator,setShowCreator]=useState(false);
  const [myChar,setMyChar]=useState(null);

  const fetchLobby=useCallback(async()=>{
    const l=await S.get(`lobby:${session.code}`,true);
    if(l){ setLobby(l); if(l.status==='playing'&&!session.isDM) onStartGame(l); }
  },[session.code]);

  useEffect(()=>{ fetchLobby(); const iv=setInterval(fetchLobby,3000); return ()=>clearInterval(iv); },[fetchLobby]);

  const saveChar=async(char)=>{
    setMyChar(char); setShowCreator(false);
    const l=await S.get(`lobby:${session.code}`,true); if(!l) return;
    const players=l.players.map(p=>p.id===session.id?{...p,character:char}:p);
    await S.set(`lobby:${session.code}`,{...l,players},true);
    fetchLobby();
  };

  const startGame=async()=>{
    const l=await S.get(`lobby:${session.code}`,true);
    await S.set(`lobby:${session.code}`,{...l,status:'playing'},true);
    onStartGame(l);
  };

  const copyCode=()=>{ try{navigator.clipboard?.writeText(session.code);}catch{} setCopied(true); setTimeout(()=>setCopied(false),2000); };
  const players=lobby?.players||[];

  return (
    <div style={{minHeight:'100vh',padding:24,position:'relative',zIndex:1,maxWidth:820,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:28}}>
        <div>
          <div style={{fontFamily:g.fT,fontSize:24,color:g.gold,letterSpacing:2}}>⚔ Lobby</div>
          <div style={{color:g.txtD,fontFamily:g.fD,fontSize:10,letterSpacing:3,marginTop:2}}>{session.isDM?'DUNGEON MASTER':'PLAYER'} — {session.name}</div>
        </div>
        <Btn small accent={g.red} onClick={onBack}>← Leave</Btn>
      </div>

      {/* Code banner */}
      <Card accent={`${g.gold}88`} style={{marginBottom:20,textAlign:'center',padding:'20px 24px'}}>
        <Label style={{textAlign:'center',marginBottom:10}}>Session Code — Share With Your Players</Label>
        <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:18}}>
          <div style={{fontFamily:g.fT,fontSize:48,color:g.gold,letterSpacing:14,padding:'10px 28px',background:g.goldF,border:`1px solid ${g.bdrG}`,borderRadius:12,textShadow:`0 0 30px ${g.gold}66`}}>{session.code}</div>
          <Btn onClick={copyCode} accent={copied?g.grn:g.gold} style={{padding:'10px 20px'}}>{copied?'✓ Copied!':'📋 Copy'}</Btn>
        </div>
        <div style={{color:g.txtD,fontSize:12,fontFamily:g.fB,marginTop:10}}>Players go to the home screen, select "Join a Game" and enter this code.</div>
      </Card>

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:16}}>
        {/* Players */}
        <Card>
          <Label>Players ({players.length}){session.isDM&&<span style={{color:g.gold,fontFamily:g.fD,marginLeft:8}}>· DM: {lobby?.dmName||session.name}</span>}</Label>
          {players.length===0?(
            <div style={{color:g.txtD,fontFamily:g.fB,fontSize:13,textAlign:'center',padding:'24px 0',opacity:.7}}>Waiting for players to join…</div>
          ):players.map(p=>(
            <div key={p.id} style={{display:'flex',gap:10,alignItems:'center',padding:'8px 10px',borderRadius:8,border:`1px solid ${g.bdr}`,marginBottom:8,background:'#ffffff04'}}>
              {p.character?.iconData?<img src={p.character.iconData} alt="icon" style={{width:32,height:32,borderRadius:6,objectFit:'cover'}}/>
                :<div style={{width:32,height:32,borderRadius:6,background:g.goldF,display:'flex',alignItems:'center',justifyContent:'center'}}>👤</div>}
              <div>
                <div style={{color:g.gold,fontFamily:g.fD,fontSize:11}}>{p.name}</div>
                {p.character?<div style={{color:g.grn,fontSize:10,fontFamily:g.fD}}>✓ {p.character.race} {p.character.cls} Lv.{p.character.level}</div>
                  :<div style={{color:g.txtD,fontSize:10}}>No character yet</div>}
              </div>
            </div>
          ))}
        </Card>

        {/* My character */}
        <Card>
          <Label>My Character</Label>
          {myChar?(
            <div>
              <div style={{display:'flex',gap:10,alignItems:'center',padding:'10px 12px',borderRadius:8,background:g.goldF,border:`1px solid ${g.bdrG}`,marginBottom:12}}>
                {myChar.iconData?<img src={myChar.iconData} alt="icon" style={{width:44,height:44,borderRadius:8,objectFit:'cover'}}/>
                  :<div style={{width:44,height:44,borderRadius:8,background:'#ffffff11',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22}}>⚔️</div>}
                <div>
                  <div style={{color:g.gold,fontFamily:g.fD,fontSize:13}}>{myChar.name}</div>
                  <div style={{color:g.txtD,fontSize:11}}>{myChar.race} {myChar.cls} Lv.{myChar.level}</div>
                  <div style={{color:g.red,fontSize:10,fontFamily:'monospace'}}>{myChar.hp}/{myChar.maxHp} HP</div>
                </div>
              </div>
              <Btn full small onClick={()=>setShowCreator(true)} accent={g.pur}>✏ Edit Character</Btn>
            </div>
          ):(
            <div>
              <div style={{color:g.txtD,fontFamily:g.fB,fontSize:13,marginBottom:14,lineHeight:1.6}}>Build your character before the session starts, or skip and join without one.</div>
              <Btn full onClick={()=>setShowCreator(true)} accent={g.pur}>⚔ Open Character Creator</Btn>
            </div>
          )}
        </Card>
      </div>

      {session.isDM&&(
        <div style={{textAlign:'center',marginTop:8}}>
          <Btn accent={g.grn} style={{padding:'15px 56px',fontSize:14,letterSpacing:4}} onClick={startGame}>⚔ BEGIN SESSION ⚔</Btn>
          <div style={{color:`${g.txtD}99`,fontFamily:g.fD,fontSize:9,marginTop:8,letterSpacing:2}}>Players who haven't joined yet can still join after the session starts.</div>
        </div>
      )}
      {!session.isDM&&lobby?.status==='playing'&&(
        <div style={{textAlign:'center',marginTop:8}}>
          <div style={{color:g.grn,fontFamily:g.fD,fontSize:13,letterSpacing:2,marginBottom:12}}>✦ THE DM HAS STARTED THE SESSION ✦</div>
          <Btn accent={g.grn} style={{padding:'15px 56px',fontSize:14,letterSpacing:4}} onClick={()=>onStartGame(lobby)}>🚪 ENTER THE GAME</Btn>
        </div>
      )}
      {showCreator&&<CharCreator initial={myChar} onSave={saveChar} onClose={()=>setShowCreator(false)}/>}
    </div>
  );
}

/* ─── GAME SCREEN ─────────────────────────────────────────────── */
function GameScreen({ session, initialLobby, onLeave }) {
  const [lobby,setLobby]=useState(initialLobby);
  const [activeId,setActiveId]=useState(null);
  const [viewSheet,setViewSheet]=useState(null);
  const [showCreator,setShowCreator]=useState(false);
  const myCharInit=initialLobby?.players?.find(p=>p.id===session.id)?.character||null;
  const [myChar,setMyChar]=useState(myCharInit);

  const fetchLobby=useCallback(async()=>{const l=await S.get(`lobby:${session.code}`,true);if(l)setLobby(l);},[session.code]);
  useEffect(()=>{const iv=setInterval(fetchLobby,3000);return()=>clearInterval(iv);},[fetchLobby]);

  const uploadMap=async(data)=>{const l=await S.get(`lobby:${session.code}`,true);await S.set(`lobby:${session.code}`,{...l,mapData:data},true);fetchLobby();};
  const saveChar=async(char)=>{
    setMyChar(char);setShowCreator(false);
    const l=await S.get(`lobby:${session.code}`,true);
    const players=(l?.players||[]).map(p=>p.id===session.id?{...p,character:char}:p);
    await S.set(`lobby:${session.code}`,{...l,players},true);fetchLobby();
  };

  const allPlayers=lobby?.players||[];
  const me=allPlayers.find(p=>p.id===session.id);

  return (
    <div style={{minHeight:'100vh',padding:16,position:'relative',zIndex:1}}>
      {/* Top bar */}
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14,flexWrap:'wrap',gap:8}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{fontFamily:g.fT,fontSize:18,color:g.gold,letterSpacing:2}}>⚔ {lobby?.code}</div>
          <div style={{color:session.isDM?g.gold:g.pur,fontFamily:g.fD,fontSize:9,letterSpacing:2,border:`1px solid ${session.isDM?g.bdrG:`${g.pur}66`}`,borderRadius:20,padding:'3px 12px'}}>{session.isDM?'🗡 DM':'🧙 PLAYER'}: {session.name}</div>
        </div>
        <div style={{display:'flex',gap:8}}>
          {!session.isDM&&<Btn small accent={g.pur} onClick={()=>setShowCreator(true)}>⚔ My Character</Btn>}
          <Btn small accent={g.red} onClick={onLeave}>← Leave</Btn>
        </div>
      </div>

      {/* Player row */}
      {allPlayers.length>0&&(
        <div style={{display:'grid',gridTemplateColumns:`repeat(${Math.min(allPlayers.length,6)},1fr)${session.isDM?' 80px':''}`,gap:8,marginBottom:14,alignItems:'end'}}>
          {allPlayers.map(p=>(
            <PCard key={p.id} player={p} active={activeId===p.id} compact
              onClick={()=>{setActiveId(p.id);if(p.character)setViewSheet(p.character);}}/>
          ))}
          {session.isDM&&(
            <div style={{display:'flex',flexDirection:'column',gap:4}}>
              <Label style={{fontSize:8,marginBottom:2}}>Turn</Label>
              {allPlayers.map(p=>(
                <button key={p.id} onClick={()=>setActiveId(id=>id===p.id?null:p.id)} style={{background:activeId===p.id?`${g.grn}22`:'transparent',border:`1px solid ${activeId===p.id?g.grn:`${g.grn}22`}`,color:activeId===p.id?g.grn:g.txtD,borderRadius:5,padding:'3px 6px',cursor:'pointer',fontFamily:g.fD,fontSize:7,letterSpacing:1,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                  {activeId===p.id?'● ACTIVE':p.name.slice(0,6)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Turn banner */}
      {activeId&&!session.isDM&&(
        activeId===session.id
          ?<div style={{textAlign:'center',background:`${g.grn}18`,border:`1px solid ${g.grn}`,borderRadius:10,padding:'10px',color:g.grn,fontFamily:g.fD,fontSize:13,letterSpacing:2,marginBottom:14,boxShadow:`0 0 20px ${g.grn}33`}}>⚔ IT IS YOUR TURN ⚔</div>
          :<div style={{textAlign:'center',background:'#ffffff06',border:`1px solid ${g.bdr}`,borderRadius:10,padding:'8px',color:g.txtD,fontFamily:g.fD,fontSize:10,letterSpacing:1,marginBottom:14}}>
            {allPlayers.find(p=>p.id===activeId)?.name||'Someone'} is taking their turn…
          </div>
      )}

      {/* Empty lobby note */}
      {allPlayers.length===0&&session.isDM&&(
        <Card style={{textAlign:'center',marginBottom:14,padding:'14px 20px'}}>
          <div style={{color:g.txtD,fontFamily:g.fB,fontSize:13}}>No players yet. Share code <strong style={{color:g.gold,fontFamily:g.fD,letterSpacing:2}}>{session.code}</strong> for players to join.</div>
        </Card>
      )}

      {/* Main grid */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          <MapPanel mapData={lobby?.mapData} onUpload={uploadMap} canUpload={session.isDM}/>
          <DicePanel label={session.isDM?'DM Dice Roll':'My Dice Roll'} accent={session.isDM?g.gold:g.pur}/>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {session.isDM&&<DicePanel label="Player Dice Roll (Visible)" accent={g.pur}/>}
          {!session.isDM&&(
            me?.character?(
              <Card>
                <Label>My Character</Label>
                <PCard player={me} onClick={()=>setViewSheet(me.character)}/>
                <div style={{color:g.goldD,fontSize:10,fontFamily:g.fD,textAlign:'center',marginTop:8,letterSpacing:1}}>Click to view full sheet</div>
              </Card>
            ):(
              <Card style={{textAlign:'center'}}>
                <div style={{color:g.txtD,fontFamily:g.fB,fontSize:13,marginBottom:12,lineHeight:1.5}}>You haven't created a character yet. You can do so at any time.</div>
                <Btn onClick={()=>setShowCreator(true)} accent={g.pur}>⚔ Create Character</Btn>
              </Card>
            )
          )}
          {session.isDM&&(
            <Card>
              <Label>Character Sheets (DM View)</Label>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {allPlayers.filter(p=>p.character).length===0
                  ?<div style={{color:g.txtD,fontFamily:g.fB,fontSize:12,textAlign:'center',padding:'10px 0',opacity:.7}}>Players haven't submitted characters yet.</div>
                  :allPlayers.filter(p=>p.character).map(p=>(
                    <button key={p.id} onClick={()=>setViewSheet(p.character)} style={{background:'#ffffff06',border:`1px solid ${g.bdr}`,color:g.txt,borderRadius:8,padding:'8px 12px',cursor:'pointer',display:'flex',gap:10,alignItems:'center',textAlign:'left',transition:'border .2s'}}>
                      {p.character.iconData?<img src={p.character.iconData} alt="" style={{width:30,height:30,borderRadius:5,objectFit:'cover'}}/>:<span style={{fontSize:18}}>⚔️</span>}
                      <div>
                        <div style={{color:g.gold,fontFamily:g.fD,fontSize:11}}>{p.character.name}</div>
                        <div style={{color:g.txtD,fontSize:10}}>{p.name} · {p.character.cls} Lv.{p.character.level}</div>
                      </div>
                    </button>
                  ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {viewSheet&&<CharSheetModal char={viewSheet} onClose={()=>setViewSheet(null)}/>}
      {showCreator&&<CharCreator initial={myChar} onSave={saveChar} onClose={()=>setShowCreator(false)}/>}
    </div>
  );
}

/* ─── APP ─────────────────────────────────────────────────────── */
export default function App() {
  const [screen,setScreen]=useState('home');
  const [session,setSession]=useState(null);
  const [lobby,setLobby]=useState(null);

  useEffect(()=>{
    S.get('mySession').then(async sess=>{
      if(!sess) return;
      const l=await S.get(`lobby:${sess.code}`,true);
      if(!l) return;
      setSession(sess); setLobby(l);
      setScreen(l.status==='playing'?'game':'lobby');
    });
  },[]);

  const handleCreate=(code,id,name,l)=>{ setSession({id,code,isDM:true,name}); setLobby(l); setScreen('lobby'); };
  const handleJoin=async(code,name,lobbyData)=>{
    const id=genId();
    const sess={id,code,isDM:false,name};
    const updated={...lobbyData,players:[...lobbyData.players,{id,name,character:null,joinedAt:Date.now()}]};
    await S.set(`lobby:${code}`,updated,true);
    await S.set('mySession',sess);
    setSession(sess); setLobby(updated); setScreen('lobby');
  };
  const handleStart=l=>{ setLobby(l); setScreen('game'); };
  const handleLeave=async()=>{
    if(session&&!session.isDM){
      const l=await S.get(`lobby:${session.code}`,true);
      if(l){ const players=l.players.filter(p=>p.id!==session.id); await S.set(`lobby:${session.code}`,{...l,players},true); }
    }
    await S.del('mySession');
    setSession(null); setLobby(null); setScreen('home');
  };

  return (
    <div style={{minHeight:'100vh',background:g.bg,backgroundImage:`radial-gradient(ellipse at 15% 15%,#1a0f0812 0%,transparent 45%),radial-gradient(ellipse at 85% 85%,#0d0a1812 0%,transparent 45%),repeating-linear-gradient(0deg,transparent,transparent 50px,#c9a84c04 50px,#c9a84c04 51px),repeating-linear-gradient(90deg,transparent,transparent 50px,#c9a84c04 50px,#c9a84c04 51px)`,color:g.txt,fontFamily:g.fB,overflowX:'hidden'}}>
      <FontLoader/>
      <Particles/>
      {screen==='home'  &&<HomeScreen onCreateLobby={handleCreate} onJoinLobby={handleJoin}/>}
      {screen==='lobby' &&session&&<LobbyScreen session={session} onStartGame={handleStart} onBack={handleLeave}/>}
      {screen==='game'  &&session&&lobby&&<GameScreen session={session} initialLobby={lobby} onLeave={handleLeave}/>}
      <style>{`*{box-sizing:border-box}body{margin:0}input,select,textarea{color-scheme:dark}input::placeholder,textarea::placeholder{color:#a0875a44}select option{background:#120c06;color:#e8d5b0}button:hover:not(:disabled){filter:brightness(1.3)}::-webkit-scrollbar{width:5px}::-webkit-scrollbar-track{background:#080402}::-webkit-scrollbar-thumb{background:#c9a84c44;border-radius:3px}`}</style>
    </div>
  );
}
