import { useState, useEffect, useRef } from "react";

// ── Fonts ─────────────────────────────────────────────────────────────────────
const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&display=swap";
document.head.appendChild(fontLink);

const C = {
  bg: "#F7F6F3",
  surface: "#FFFFFF",
  border: "#E8E4DC",
  borderLight: "#F0EDE8",
  text: "#1A1814",
  textMid: "#6B6560",
  textLight: "#A09890",
  accent: "#1A1814",
  highlight: "#F5C842",
  highlightBg: "rgba(245,200,66,0.12)",
  green: "#2D7D52",
  red: "#B91C1C",
};

const gs = document.createElement("style");
gs.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: ${C.bg}; font-family: 'DM Sans', sans-serif; color: ${C.text}; -webkit-font-smoothing: antialiased; }
  ::selection { background: ${C.highlight}; }
  ::-webkit-scrollbar { width: 5px; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 99px; }
  input, textarea, button { font-family: inherit; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes blink { 0%,100%{opacity:.2} 50%{opacity:1} }
  .card:hover { border-color: #C8C4BC !important; box-shadow: 0 6px 20px rgba(0,0,0,0.07) !important; transform: translateY(-2px); }
  .row:hover { background: ${C.bg} !important; }
  .pill:hover { background: ${C.text} !important; color: #fff !important; }
  .ghost:hover { background: ${C.bg} !important; }
  .navbtn:hover { color: ${C.text} !important; }
`;
document.head.appendChild(gs);

// ── Helpers ───────────────────────────────────────────────────────────────────
const AUTH_KEY = "dv_auth", DOCS_KEY = "dv_docs", CHAT_KEY = "dv_chat", SIX_MO = 15552000000;
function loadAuth() { try { const p=JSON.parse(localStorage.getItem(AUTH_KEY)||"null"); if(!p||Date.now()-p.t>SIX_MO){localStorage.removeItem(AUTH_KEY);return null;} return p; } catch{return null;} }
function saveAuth(u) { localStorage.setItem(AUTH_KEY,JSON.stringify({...u,t:Date.now()})); }
function loadDocs() { try{return JSON.parse(localStorage.getItem(DOCS_KEY)||"[]");}catch{return[];} }
function saveDocs(d) { localStorage.setItem(DOCS_KEY,JSON.stringify(d)); }
function loadChat() { try{return JSON.parse(localStorage.getItem(CHAT_KEY)||"[]");}catch{return[];} }
function saveChat(m) { localStorage.setItem(CHAT_KEY,JSON.stringify(m)); }
function readB64(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=j;x.readAsDataURL(f);})}
function readTxt(f){return new Promise((r,j)=>{const x=new FileReader();x.onload=()=>r(x.result);x.onerror=j;x.readAsText(f);})}
function dl(content,name,mime="text/plain"){const b=new Blob([content],{type:mime});const u=URL.createObjectURL(b);const a=document.createElement("a");a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
function isText(n){return["txt","csv","json","md","html","css","js","ts"].includes(ext(n));}
function isImg(n){return["png","jpg","jpeg","gif","webp","svg"].includes(ext(n));}
function ext(n){return(n||"").split(".").pop().toLowerCase();}
function fmtSz(b){return b<1024?b+"B":b<1048576?(b/1024).toFixed(1)+"KB":(b/1048576).toFixed(1)+"MB";}
function fmtDt(s){return new Date(s).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});}
function inits(n){return(n||"?").split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);}

const EXT_COLOR = {xlsx:"#1D7145",xls:"#1D7145",csv:"#1D7145",docx:"#2B5BAD",doc:"#2B5BAD",pdf:"#DC2626",pptx:"#D04B23",ppt:"#D04B23",txt:"#555",md:"#555",json:"#B45309",png:"#7C3AED",jpg:"#7C3AED",jpeg:"#7C3AED",gif:"#7C3AED",};
const EXT_LABEL = {xlsx:"Excel",xls:"Excel",csv:"CSV",docx:"Word",doc:"Word",pdf:"PDF",pptx:"PPT",ppt:"PPT",txt:"Text",md:"Markdown",json:"JSON",png:"Image",jpg:"Image",jpeg:"Image",gif:"GIF",webp:"Image",};

async function callClaude(messages, system) {
  const r = await fetch("https://api.anthropic.com/v1/messages",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,system,messages})});
  const d = await r.json();
  if(d.error) throw new Error(d.error.message);
  return d.content.map(b=>b.text||"").join("");
}

// ── Input component ───────────────────────────────────────────────────────────
function Input({label,type="text",value,onChange,placeholder,onEnter,autoFocus}) {
  const [focused,setFocused] = useState(false);
  return (
    <div style={{marginBottom:20}}>
      {label&&<label style={{display:"block",fontSize:11,fontWeight:600,color:C.textMid,marginBottom:8,letterSpacing:0.8,textTransform:"uppercase"}}>{label}</label>}
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} autoFocus={autoFocus}
        onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
        onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()}
        style={{width:"100%",padding:"13px 16px",background:C.surface,border:`1.5px solid ${focused?C.text:C.border}`,borderRadius:10,fontSize:14,color:C.text,outline:"none",transition:"border-color .15s"}}
      />
    </div>
  );
}

// ── SIGN IN ───────────────────────────────────────────────────────────────────
function SignIn({onAuth}) {
  const [mode,setMode] = useState("login");
  const [name,setName] = useState("");
  const [email,setEmail] = useState("");
  const [pw,setPw] = useState("");
  const [err,setErr] = useState("");

  function getUsers(){try{return JSON.parse(localStorage.getItem("dv_users")||"{}");}catch{return{};}}
  function submit(){
    setErr("");
    if(!email||!pw){setErr("Please fill in all fields.");return;}
    const users=getUsers();
    if(mode==="signup"){
      if(!name){setErr("Name is required.");return;}
      if(users[email]){setErr("An account with this email already exists.");return;}
      const user={name,email,createdAt:new Date().toISOString()};
      users[email]={...user,pw};localStorage.setItem("dv_users",JSON.stringify(users));
      saveAuth(user);onAuth(user);
    } else {
      const f=users[email];
      if(!f||f.pw!==pw){setErr("Incorrect email or password.");return;}
      saveAuth({name:f.name,email:f.email,createdAt:f.createdAt});onAuth({name:f.name,email:f.email,createdAt:f.createdAt});
    }
  }

  return (
    <div style={{minHeight:"100vh",background:C.bg,display:"flex"}}>
      {/* Left dark panel */}
      <div style={{flex:"0 0 440px",background:C.text,display:"flex",flexDirection:"column",justifyContent:"space-between",padding:"56px 60px"}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}>
          <div style={{width:32,height:32,background:"rgba(255,255,255,0.1)",border:"1px solid rgba(255,255,255,0.15)",borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>🗂</div>
          <span style={{color:"#fff",fontFamily:"'Instrument Serif', serif",fontSize:22,letterSpacing:"-0.5px"}}>DocVault</span>
        </div>
        <div>
          <p style={{color:"rgba(255,255,255,0.35)",fontSize:11,letterSpacing:1.5,textTransform:"uppercase",marginBottom:28}}>What's inside</p>
          {[
            ["Upload anything","Excel, Word, PDF, images — all formats supported"],
            ["Ask your AI","Search across all files with plain English"],
            ["Edit with language","Tell AI what to change — it handles the rest"],
            ["Always available","Your workspace synced, secure, and fast"],
          ].map(([title,desc],i)=>(
            <div key={i} style={{marginBottom:24,animation:`fadeUp 0.5s ${i*0.07+0.1}s both`}}>
              <div style={{color:"rgba(255,255,255,0.8)",fontSize:14,fontWeight:500,marginBottom:3}}>{title}</div>
              <div style={{color:"rgba(255,255,255,0.35)",fontSize:13,lineHeight:1.5}}>{desc}</div>
            </div>
          ))}
        </div>
        <p style={{color:"rgba(255,255,255,0.2)",fontSize:12}}>Sessions last 6 months · All data encrypted locally</p>
      </div>

      {/* Right form */}
      <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",padding:48}}>
        <div style={{width:"100%",maxWidth:380,animation:"fadeUp 0.45s ease both"}}>
          <h1 style={{fontFamily:"'Instrument Serif', serif",fontSize:40,fontWeight:400,color:C.text,letterSpacing:"-1.5px",lineHeight:1.1,marginBottom:8}}>
            {mode==="login"?"Welcome back.":"Get started."}
          </h1>
          <p style={{color:C.textLight,fontSize:14,marginBottom:40,lineHeight:1.6}}>
            {mode==="login"?"Sign in to your document workspace.":"Create your account — it only takes a moment."}
          </p>

          {mode==="signup"&&<Input label="Full name" value={name} onChange={setName} placeholder="Jane Smith" autoFocus />}
          <Input label="Email" type="email" value={email} onChange={setEmail} placeholder="you@email.com" autoFocus={mode==="login"} />
          <Input label="Password" type="password" value={pw} onChange={setPw} placeholder="••••••••" onEnter={submit} />

          {err&&<p style={{color:C.red,fontSize:13,marginBottom:16,marginTop:-10}}>{err}</p>}

          <button onClick={submit} style={{width:"100%",padding:"14px",background:C.text,color:"#fff",border:"none",borderRadius:10,fontSize:15,fontWeight:500,cursor:"pointer",marginBottom:20,letterSpacing:"-0.2px",transition:"opacity .15s"}}
            onMouseEnter={e=>e.currentTarget.style.opacity=".82"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
            {mode==="login"?"Sign in →":"Create account →"}
          </button>

          <p style={{textAlign:"center",fontSize:13,color:C.textLight}}>
            {mode==="login"?"No account yet? ":"Already have one? "}
            <button onClick={()=>{setMode(m=>m==="login"?"signup":"login");setErr("");}}
              style={{background:"none",border:"none",color:C.text,fontWeight:500,cursor:"pointer",fontSize:13,textDecoration:"underline",padding:0}}>
              {mode==="login"?"Sign up":"Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── DOC VIEWER ────────────────────────────────────────────────────────────────
function DocViewer({doc,onClose,onSave,highlights=[]}) {
  const [content,setContent] = useState(doc.textContent||"");
  const [saved,setSaved] = useState(false);
  const [focused,setFocused] = useState(false);

  function save(){onSave({...doc,textContent:content,updatedAt:new Date().toISOString()});setSaved(true);setTimeout(()=>setSaved(false),2000);}
  function hlHtml(){
    let html=content.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
    highlights.forEach(h=>{
      const esc=h.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
      html=html.replace(new RegExp(esc,"gi"),m=>`<mark>${m}</mark>`);
    });
    return html;
  }

  const e = ext(doc.name);
  const color = EXT_COLOR[e]||C.textMid;
  const label = EXT_LABEL[e]||e.toUpperCase();

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(26,24,20,0.55)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",backdropFilter:"blur(6px)",animation:"fadeIn 0.2s ease"}}>
      <div style={{background:C.surface,borderRadius:18,width:"min(880px,95vw)",maxHeight:"92vh",display:"flex",flexDirection:"column",boxShadow:"0 40px 100px rgba(0,0,0,0.2)",overflow:"hidden"}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 28px",borderBottom:`1px solid ${C.borderLight}`}}>
          <div style={{display:"flex",alignItems:"center",gap:14}}>
            <span style={{background:color+"18",border:`1px solid ${color}30`,borderRadius:7,padding:"5px 10px",fontSize:11,fontWeight:700,color,letterSpacing:0.5}}>{label}</span>
            <div>
              <div style={{fontSize:15,fontWeight:500,color:C.text}}>{doc.name}</div>
              <div style={{fontSize:12,color:C.textLight,marginTop:2}}>Uploaded {fmtDt(doc.uploadedAt)}{doc.updatedAt&&` · Edited ${fmtDt(doc.updatedAt)}`} · {fmtSz(doc.size)}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8}}>
            {isText(doc.name)&&<button onClick={save} style={{padding:"8px 18px",background:saved?C.green:C.text,color:"#fff",border:"none",borderRadius:8,fontSize:13,fontWeight:500,cursor:"pointer",transition:"background .2s"}}>{saved?"✓ Saved":"Save"}</button>}
            <button onClick={()=>dl(content,doc.name)} className="ghost" style={{padding:"8px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:13,color:C.textMid,cursor:"pointer"}}>Download</button>
            <button onClick={onClose} className="ghost" style={{padding:"8px 12px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,fontSize:16,color:C.textLight,cursor:"pointer"}}>✕</button>
          </div>
        </div>
        <div style={{flex:1,overflow:"auto",padding:28}}>
          {isImg(doc.name)?(
            <img src={doc.dataUrl} alt={doc.name} style={{maxWidth:"100%",borderRadius:10}} />
          ):isText(doc.name)?(
            highlights.length>0?(
              <pre dangerouslySetInnerHTML={{__html:hlHtml()}} style={{background:C.bg,borderRadius:10,padding:24,fontSize:13.5,lineHeight:1.8,whiteSpace:"pre-wrap",fontFamily:"'Courier New',monospace",color:C.text,minHeight:300}} />
            ):(
              <textarea value={content} onChange={e=>setContent(e.target.value)}
                onFocus={()=>setFocused(true)} onBlur={()=>setFocused(false)}
                style={{width:"100%",minHeight:380,background:C.bg,border:`1.5px solid ${focused?C.text:C.border}`,borderRadius:10,padding:24,fontSize:13.5,lineHeight:1.8,resize:"vertical",outline:"none",fontFamily:"'Courier New',monospace",color:C.text,transition:"border-color .15s"}} />
            )
          ):(
            <div style={{textAlign:"center",padding:"72px 24px"}}>
              <div style={{fontSize:52,marginBottom:16}}>{["xlsx","xls","csv"].includes(e)?"📊":["docx","doc"].includes(e)?"📝":e==="pdf"?"📄":"📁"}</div>
              <p style={{color:C.textMid,fontSize:14,lineHeight:1.7,marginBottom:28}}>Preview isn't available for this file type.<br/>Download it to open in the appropriate application.</p>
              <button onClick={()=>dl("",doc.name)} style={{padding:"11px 28px",background:C.text,color:"#fff",border:"none",borderRadius:9,fontSize:14,cursor:"pointer"}}>Download {doc.name}</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DOCS PAGE ─────────────────────────────────────────────────────────────────
function DocsPage({docs,setDocs,highlightedDocId,highlightTerms}) {
  const [viewDoc,setViewDoc] = useState(null);
  const [search,setSearch] = useState("");
  const [dragging,setDragging] = useState(false);
  const [layout,setLayout] = useState("grid");
  const [searchFocused,setSearchFocused] = useState(false);
  const fileRef = useRef();

  const filtered = docs.filter(d=>d.name.toLowerCase().includes(search.toLowerCase()));

  async function handleFiles(files) {
    const newDocs=[];
    for(const f of Array.from(files)){
      const dataUrl=await readB64(f);
      const textContent=isText(f.name)?await readTxt(f):"";
      newDocs.push({id:`doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,name:f.name,size:f.size,type:f.type,uploadedAt:new Date().toISOString(),dataUrl,textContent});
    }
    const u=[...docs,...newDocs]; setDocs(u); saveDocs(u);
  }
  function del(id){const u=docs.filter(d=>d.id!==id);setDocs(u);saveDocs(u);}
  function saveDoc(updated){const u=docs.map(d=>d.id===updated.id?updated:d);setDocs(u);saveDocs(u);setViewDoc(updated);}

  return (
    <div style={{flex:1,overflow:"auto"}}>
      <div style={{maxWidth:1120,margin:"0 auto",padding:"56px 56px 80px"}}>
        {/* Header */}
        <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:52}}>
          <div>
            <h1 style={{fontFamily:"'Instrument Serif', serif",fontSize:46,fontWeight:400,color:C.text,letterSpacing:"-2px",lineHeight:1}}>Your documents</h1>
            <p style={{color:C.textLight,fontSize:15,marginTop:12}}>{docs.length} file{docs.length!==1?"s":""} · {fmtSz(docs.reduce((a,d)=>a+d.size,0))} total</p>
          </div>
          <div style={{display:"flex",gap:10,alignItems:"center"}}>
            <div style={{display:"flex",border:`1px solid ${C.border}`,borderRadius:9,overflow:"hidden",background:C.surface}}>
              {[["grid","⊞"],["list","☰"]].map(([v,ic])=>(
                <button key={v} onClick={()=>setLayout(v)} style={{padding:"9px 14px",background:layout===v?C.text:"transparent",color:layout===v?"#fff":C.textLight,border:"none",cursor:"pointer",fontSize:15,transition:"all .15s"}}>{ic}</button>
              ))}
            </div>
            <button onClick={()=>fileRef.current.click()} style={{padding:"11px 22px",background:C.text,color:"#fff",border:"none",borderRadius:10,fontSize:14,fontWeight:500,cursor:"pointer",display:"flex",alignItems:"center",gap:6,letterSpacing:"-0.2px"}}
              onMouseEnter={e=>e.currentTarget.style.opacity=".82"} onMouseLeave={e=>e.currentTarget.style.opacity="1"}>
              <span style={{fontSize:18,lineHeight:1,marginTop:-1}}>+</span> Upload
            </button>
            <input ref={fileRef} type="file" multiple style={{display:"none"}} onChange={e=>handleFiles(e.target.files)} />
          </div>
        </div>

        {/* Search */}
        <div style={{position:"relative",marginBottom:32}}>
          <span style={{position:"absolute",left:18,top:"50%",transform:"translateY(-50%)",color:C.textLight,fontSize:17,pointerEvents:"none"}}>⌕</span>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by name…"
            onFocus={()=>setSearchFocused(true)} onBlur={()=>setSearchFocused(false)}
            style={{width:"100%",padding:"14px 18px 14px 48px",background:C.surface,border:`1.5px solid ${searchFocused?C.text:C.border}`,borderRadius:12,fontSize:14,color:C.text,outline:"none",transition:"border-color .15s"}}
          />
        </div>

        {/* Drop zone */}
        <div onDragOver={e=>{e.preventDefault();setDragging(true);}} onDragLeave={()=>setDragging(false)}
          onDrop={e=>{e.preventDefault();setDragging(false);handleFiles(e.dataTransfer.files);}} onClick={()=>fileRef.current.click()}
          style={{border:`2px dashed ${dragging?C.text:C.border}`,borderRadius:14,padding:"40px 0",textAlign:"center",marginBottom:44,cursor:"pointer",background:dragging?"rgba(26,24,20,0.03)":"transparent",transition:"all .2s"}}>
          <div style={{fontSize:24,marginBottom:10,color:C.textLight}}>↑</div>
          <p style={{fontSize:14,color:C.textMid}}>Drop files here or <span style={{color:C.text,textDecoration:"underline",fontWeight:500}}>browse your computer</span></p>
          <p style={{fontSize:12,color:C.textLight,marginTop:6}}>Excel, Word, PDF, images, CSV and more</p>
        </div>

        {/* Files */}
        {filtered.length===0?(
          <div style={{textAlign:"center",padding:"80px 0",color:C.textLight}}>
            <div style={{fontSize:44,marginBottom:16,opacity:.25}}>📂</div>
            <p style={{fontSize:15}}>{search?"No files match your search.":"No files yet. Upload to get started."}</p>
          </div>
        ):layout==="grid"?(
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(190px,1fr))",gap:16}}>
            {filtered.map((doc,i)=>{
              const e=ext(doc.name),color=EXT_COLOR[e]||C.textMid,label=EXT_LABEL[e]||e.toUpperCase();
              const isHL=highlightedDocId===doc.id;
              return (
                <div key={doc.id} className="card" onClick={()=>setViewDoc(doc)}
                  style={{background:isHL?`${C.highlight}14`:C.surface,border:`1.5px solid ${isHL?C.highlight:C.border}`,borderRadius:14,padding:"22px 20px 18px",cursor:"pointer",transition:"all .2s",position:"relative",boxShadow:isHL?`0 0 0 3px ${C.highlight}40`:"0 1px 3px rgba(0,0,0,0.04)",animation:`fadeUp 0.35s ${Math.min(i,8)*0.04}s both`}}>
                  {isHL&&<div style={{position:"absolute",top:10,right:10,background:C.highlight,color:C.text,fontSize:9,fontWeight:700,padding:"3px 7px",borderRadius:20,letterSpacing:0.5}}>AI FOUND</div>}
                  <div style={{background:color+"14",border:`1px solid ${color}25`,borderRadius:7,padding:"5px 10px",display:"inline-block",fontSize:10,fontWeight:700,color,letterSpacing:0.5,marginBottom:18}}>{label}</div>
                  <div style={{fontSize:13,fontWeight:500,color:C.text,wordBreak:"break-word",lineHeight:1.45,marginBottom:12}}>{doc.name}</div>
                  <div style={{fontSize:11,color:C.textLight,lineHeight:1.6}}>{fmtSz(doc.size)}<br/>{fmtDt(doc.uploadedAt)}</div>
                  <button onClick={e=>{e.stopPropagation();del(doc.id);}} style={{position:"absolute",bottom:12,right:12,background:"transparent",border:"none",color:C.textLight,cursor:"pointer",fontSize:14,opacity:.3,padding:4,transition:"opacity .15s",lineHeight:1}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.3}>✕</button>
                </div>
              );
            })}
          </div>
        ):(
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,overflow:"hidden"}}>
            <div style={{display:"grid",gridTemplateColumns:"auto 1fr 80px 120px 32px",gap:0,padding:"10px 24px",borderBottom:`1px solid ${C.borderLight}`}}>
              {["Type","Name","Size","Uploaded",""].map((h,i)=><div key={i} style={{fontSize:11,fontWeight:600,color:C.textLight,letterSpacing:0.8,textTransform:"uppercase",textAlign:i>1?"right":"left"}}>{h}</div>)}
            </div>
            {filtered.map((doc,i)=>{
              const e=ext(doc.name),color=EXT_COLOR[e]||C.textMid,label=EXT_LABEL[e]||e.toUpperCase();
              const isHL=highlightedDocId===doc.id;
              return (
                <div key={doc.id} className="row" onClick={()=>setViewDoc(doc)}
                  style={{display:"grid",gridTemplateColumns:"auto 1fr 80px 120px 32px",gap:0,alignItems:"center",padding:"14px 24px",borderBottom:i<filtered.length-1?`1px solid ${C.borderLight}`:"none",cursor:"pointer",background:isHL?`${C.highlight}10`:"transparent",transition:"background .15s"}}>
                  <span style={{background:color+"14",border:`1px solid ${color}25`,borderRadius:6,padding:"4px 9px",fontSize:10,fontWeight:700,color,letterSpacing:0.5,marginRight:16,whiteSpace:"nowrap"}}>{label}</span>
                  <div style={{fontSize:14,fontWeight:500,color:C.text,display:"flex",alignItems:"center",gap:8}}>
                    {doc.name}
                    {isHL&&<span style={{background:C.highlight,color:C.text,fontSize:9,fontWeight:700,padding:"2px 7px",borderRadius:20,letterSpacing:0.5}}>AI FOUND</span>}
                  </div>
                  <div style={{fontSize:12,color:C.textLight,textAlign:"right"}}>{fmtSz(doc.size)}</div>
                  <div style={{fontSize:12,color:C.textLight,textAlign:"right"}}>{fmtDt(doc.uploadedAt)}</div>
                  <button onClick={e=>{e.stopPropagation();del(doc.id);}} style={{background:"transparent",border:"none",color:C.textLight,cursor:"pointer",fontSize:13,opacity:.3,padding:4,transition:"opacity .15s",marginLeft:8}} onMouseEnter={e=>e.currentTarget.style.opacity=1} onMouseLeave={e=>e.currentTarget.style.opacity=.3}>✕</button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {viewDoc&&<DocViewer doc={viewDoc} onClose={()=>setViewDoc(null)} onSave={saveDoc} highlights={highlightedDocId===viewDoc.id?highlightTerms:[]} />}
    </div>
  );
}

// ── CHAT PAGE ─────────────────────────────────────────────────────────────────
function ChatPage({docs,setDocs,user}) {
  const [messages,setMessages] = useState(()=>loadChat());
  const [input,setInput] = useState("");
  const [loading,setLoading] = useState(false);
  const [hlDocId,setHlDocId] = useState(null);
  const [hlTerms,setHlTerms] = useState([]);
  const [pendingDel,setPendingDel] = useState(null);
  const [viewDoc,setViewDoc] = useState(null);
  const [inputFocused,setInputFocused] = useState(false);
  const bottomRef = useRef();
  const inputRef = useRef();

  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth"});},[messages,loading]);

  function buildSystem(){
    const dl=docs.map(d=>({id:d.id,name:d.name,uploadedAt:d.uploadedAt,textPreview:d.textContent?d.textContent.slice(0,3000):"[non-text file — binary content]"}));
    return `You are DocVault AI, an intelligent assistant for ${user.name}'s document workspace.\n\nDocuments:\n${JSON.stringify(dl,null,2)}\n\nYou can read, edit, create, and flag deletions. When answering from a document, cite it specifically and quote the relevant part.\n\nFor actions use exactly:\n<action>{"type":"edit","docId":"...","newContent":"...","highlights":["word1"]}</action>\n<action>{"type":"create","name":"file.txt","content":"...","highlights":[]}</action>\n<action>{"type":"delete_request","docId":"...","docName":"..."}</action>\n\nBe concise, specific, and helpful. Always say which document you're referencing.`;
  }

  async function send(){
    if(!input.trim()||loading) return;
    const userMsg={role:"user",content:input};
    const next=[...messages,userMsg];
    setMessages(next);saveChat(next);setInput("");setLoading(true);
    setHlDocId(null);setHlTerms([]);
    try {
      const raw=await callClaude(next.map(m=>({role:m.role,content:m.content})),buildSystem());
      const am=raw.match(/<action>([\s\S]*?)<\/action>/);
      let display=raw.replace(/<action>[\s\S]*?<\/action>/g,"").trim();
      let action=null;
      if(am){try{action=JSON.parse(am[1]);}catch{}}
      if(action){
        if(action.type==="edit"&&action.docId){
          const t=docs.find(d=>d.id===action.docId);
          if(t){const u={...t,textContent:action.newContent,updatedAt:new Date().toISOString()};const nd=docs.map(d=>d.id===u.id?u:d);setDocs(nd);saveDocs(nd);setHlDocId(action.docId);setHlTerms(action.highlights||[]);display+=`\n\n✅ Edited **${t.name}**`;setTimeout(()=>setViewDoc(u),350);}
        } else if(action.type==="create"){
          const nd2={id:`doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,name:action.name,size:action.content.length,type:"text/plain",uploadedAt:new Date().toISOString(),textContent:action.content,dataUrl:""};
          const nd=[...docs,nd2];setDocs(nd);saveDocs(nd);setHlDocId(nd2.id);setHlTerms(action.highlights||[]);display+=`\n\n✅ Created **${action.name}**`;setTimeout(()=>setViewDoc(nd2),350);
        } else if(action.type==="delete_request"){
          setPendingDel({id:action.docId,name:action.docName});display+=`\n\n⚠️ Ready to delete **${action.docName}** — confirm below.`;
        }
      } else {
        docs.forEach(d=>{if(raw.toLowerCase().includes(d.name.toLowerCase()))setHlDocId(d.id);});
      }
      const final=[...next,{role:"assistant",content:display||raw}];setMessages(final);saveChat(final);
    } catch(e){
      const final=[...next,{role:"assistant",content:`Something went wrong: ${e.message}`}];setMessages(final);saveChat(final);
    }
    setLoading(false);
  }

  function confirmDel(yes){
    if(yes&&pendingDel){const nd=docs.filter(d=>d.id!==pendingDel.id);setDocs(nd);saveDocs(nd);const m={role:"assistant",content:`🗑 Deleted **${pendingDel.name}**.`};const u=[...messages,m];setMessages(u);saveChat(u);}
    else{const m={role:"assistant",content:`Kept **${pendingDel?.name}** — no changes made.`};const u=[...messages,m];setMessages(u);saveChat(u);}
    setPendingDel(null);
  }

  function md(t){return t.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>").replace(/\n/g,"<br/>");}

  const chips=["How much did I spend on this event?","Did John buy the property on 123 Main Street?","How much do I owe John Doe?","Summarize all my documents","Create a new document called Notes.txt"];

  return (
    <div style={{display:"flex",height:"100%",overflow:"hidden"}}>
      <div style={{flex:1,display:"flex",flexDirection:"column",overflow:"hidden",maxWidth:860,margin:"0 auto",width:"100%"}}>
        {/* Header */}
        <div style={{padding:"36px 56px 28px",flexShrink:0}}>
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between"}}>
            <div>
              <h1 style={{fontFamily:"'Instrument Serif', serif",fontSize:46,fontWeight:400,color:C.text,letterSpacing:"-2px",lineHeight:1}}>AI Assistant</h1>
              <p style={{fontSize:14,color:C.textLight,marginTop:10}}>{docs.length} document{docs.length!==1?"s":""} available to search and edit</p>
            </div>
            {hlDocId&&(
              <div style={{display:"flex",alignItems:"center",gap:10,background:C.highlightBg,border:`1.5px solid ${C.highlight}`,borderRadius:12,padding:"12px 18px",animation:"fadeUp 0.25s ease both"}}>
                <span style={{fontSize:13,color:C.text,fontWeight:500}}>📎 {docs.find(d=>d.id===hlDocId)?.name}</span>
                <button onClick={()=>setViewDoc(docs.find(d=>d.id===hlDocId))} style={{padding:"5px 12px",background:C.highlight,color:C.text,border:"none",borderRadius:6,cursor:"pointer",fontSize:12,fontWeight:600}}>View →</button>
              </div>
            )}
          </div>
        </div>

        {/* Messages */}
        <div style={{flex:1,overflow:"auto",padding:"0 56px"}}>
          {messages.length===0&&(
            <div style={{paddingTop:8,paddingBottom:32}}>
              <p style={{color:C.textLight,fontSize:14,marginBottom:20}}>Try asking:</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
                {chips.map((c,i)=>(
                  <button key={i} onClick={()=>{setInput(c);inputRef.current?.focus();}} className="pill"
                    style={{padding:"9px 16px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,color:C.textMid,cursor:"pointer",fontSize:13,transition:"all .15s"}}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m.role==="user"?"flex-end":"flex-start",marginBottom:18,animation:"fadeUp 0.25s ease both"}}>
              {m.role==="assistant"&&(
                <div style={{width:28,height:28,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0,marginRight:12,marginTop:4}}>✦</div>
              )}
              <div style={{maxWidth:"72%",padding:"13px 18px",borderRadius:m.role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px",background:m.role==="user"?C.text:C.surface,border:m.role==="assistant"?`1px solid ${C.border}`:"none",color:m.role==="user"?"#fff":C.text,fontSize:14,lineHeight:1.7,boxShadow:m.role==="assistant"?"0 1px 3px rgba(0,0,0,0.04)":"none"}}
                dangerouslySetInnerHTML={{__html:md(m.content)}} />
            </div>
          ))}

          {loading&&(
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
              <div style={{width:28,height:28,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,flexShrink:0}}>✦</div>
              <div style={{padding:"14px 20px",background:C.surface,border:`1px solid ${C.border}`,borderRadius:"16px 16px 16px 4px",display:"flex",gap:5,alignItems:"center"}}>
                {[0,1,2].map(n=><div key={n} style={{width:6,height:6,borderRadius:"50%",background:C.border,animation:`blink 1.2s ${n*0.2}s ease-in-out infinite`}} />)}
              </div>
            </div>
          )}

          {pendingDel&&(
            <div style={{background:"#FEF2F2",border:"1px solid #FECACA",borderRadius:14,padding:"20px 24px",marginBottom:20,animation:"fadeUp 0.25s ease both"}}>
              <p style={{color:C.red,fontSize:14,marginBottom:14,fontWeight:500}}>Delete <strong>{pendingDel.name}</strong>? This can't be undone.</p>
              <div style={{display:"flex",gap:10}}>
                <button onClick={()=>confirmDel(true)} style={{padding:"9px 20px",background:C.red,color:"#fff",border:"none",borderRadius:8,cursor:"pointer",fontWeight:500,fontSize:13}}>Yes, delete it</button>
                <button onClick={()=>confirmDel(false)} className="ghost" style={{padding:"9px 20px",background:"transparent",color:C.text,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",fontSize:13}}>Keep it</button>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div style={{padding:"20px 56px 40px",flexShrink:0}}>
          <div style={{display:"flex",gap:10,background:C.surface,border:`1.5px solid ${inputFocused?C.text:C.border}`,borderRadius:14,padding:"10px 10px 10px 20px",transition:"border-color .15s"}}>
            <input ref={inputRef} value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&!e.shiftKey&&send()}
              onFocus={()=>setInputFocused(true)} onBlur={()=>setInputFocused(false)}
              placeholder="Ask about your documents, request edits, or create new files…"
              style={{flex:1,border:"none",outline:"none",fontSize:14,color:C.text,background:"transparent"}}
            />
            <button onClick={send} disabled={loading||!input.trim()} style={{padding:"10px 22px",background:loading||!input.trim()?C.border:C.text,color:loading||!input.trim()?C.textLight:"#fff",border:"none",borderRadius:10,cursor:loading||!input.trim()?"not-allowed":"pointer",fontSize:14,fontWeight:500,transition:"all .2s",letterSpacing:"-0.2px"}}>
              Send
            </button>
          </div>
          <p style={{fontSize:11,color:C.textLight,marginTop:10,textAlign:"center"}}>AI can read, edit, and create your text documents · Binary files (Word, Excel, PDF) require download to edit</p>
        </div>
      </div>

      {viewDoc&&<DocViewer doc={viewDoc} onClose={()=>setViewDoc(null)} onSave={updated=>{const nd=docs.map(d=>d.id===updated.id?updated:d);setDocs(nd);saveDocs(nd);setViewDoc(updated);}} highlights={hlDocId===viewDoc.id?hlTerms:[]} />}
    </div>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const [user,setUser] = useState(()=>loadAuth());
  const [page,setPage] = useState("docs");
  const [docs,setDocs] = useState(()=>loadDocs());

  if(!user) return <SignIn onAuth={u=>{setUser(u);}} />;

  return (
    <div style={{height:"100vh",display:"flex",flexDirection:"column",background:C.bg}}>
      {/* Nav */}
      <nav style={{background:C.surface,borderBottom:`1px solid ${C.borderLight}`,display:"flex",alignItems:"center",padding:"0 48px",height:62,flexShrink:0}}>
        <div style={{display:"flex",alignItems:"center",gap:9,marginRight:40}}>
          <div style={{width:28,height:28,background:C.text,borderRadius:7,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>🗂</div>
          <span style={{fontFamily:"'Instrument Serif', serif",fontSize:20,color:C.text,letterSpacing:"-0.5px"}}>DocVault</span>
        </div>
        <div style={{display:"flex",gap:2}}>
          {[["docs","Documents"],["chat","AI Assistant"]].map(([id,label])=>(
            <button key={id} onClick={()=>setPage(id)} className="navbtn"
              style={{padding:"7px 16px",background:page===id?C.bg:"transparent",color:page===id?C.text:C.textLight,border:page===id?`1px solid ${C.border}`:"1px solid transparent",borderRadius:8,cursor:"pointer",fontSize:14,fontWeight:page===id?500:400,transition:"all .15s"}}>
              {label}
            </button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:14}}>
          <button onClick={()=>dl(JSON.stringify({user,docs,chatHistory:loadChat(),exportedAt:new Date().toISOString()},null,2),"docvault_backup.json","application/json")} className="ghost"
            style={{padding:"7px 16px",background:"transparent",border:`1px solid ${C.border}`,borderRadius:8,color:C.textMid,cursor:"pointer",fontSize:13}}>
            Export data
          </button>
          <div style={{width:1,height:24,background:C.border}} />
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <div style={{width:32,height:32,borderRadius:"50%",background:C.text,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:600,letterSpacing:0.5}}>{inits(user.name)}</div>
            <div>
              <div style={{fontSize:13,fontWeight:500,color:C.text,lineHeight:1.2}}>{user.name}</div>
              <button onClick={()=>{localStorage.removeItem(AUTH_KEY);setUser(null);}} style={{background:"none",border:"none",color:C.textLight,cursor:"pointer",fontSize:11,padding:0}}>Sign out</button>
            </div>
          </div>
        </div>
      </nav>

      <div style={{flex:1,overflow:"hidden",display:"flex",flexDirection:"column"}}>
        {page==="docs"
          ?<DocsPage docs={docs} setDocs={setDocs} highlightedDocId={null} highlightTerms={[]} />
          :<ChatPage docs={docs} setDocs={setDocs} user={user} />
        }
      </div>
    </div>
  );
}
