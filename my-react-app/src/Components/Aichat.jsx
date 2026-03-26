// AIChat.jsx
import React, { useState, useRef, useEffect, useCallback } from "react";

function timeStr(d) {
  return new Date(d).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
async function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = () => res(r.result.split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function fileMime(file) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop().toLowerCase();
  return ({ jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",gif:"image/gif",webp:"image/webp",pdf:"application/pdf" })[ext] || "application/octet-stream";
}
const isImg = mt => mt?.startsWith("image/");
const isPDF = mt => mt === "application/pdf";

/* ─── Markdown ─── */
function Markdown({ text }) {
  if (!text) return null;
  const lines = text.split("\n");
  const out=[]; let inCode=false, codeLines=[], listItems=[], key=0;
  const inline = s =>
    s.replace(/\*\*(.*?)\*\*/g,"<strong>$1</strong>")
     .replace(/\*(.*?)\*/g,"<em>$1</em>")
     .replace(/`([^`]+)`/g,'<code class="aic-ic">$1</code>');
  const flushList = () => {
    if (!listItems.length) return;
    out.push(<ul key={key++} className="aic-ul">{listItems.map((li,i)=><li key={i} dangerouslySetInnerHTML={{__html:inline(li)}}/>)}</ul>);
    listItems=[];
  };
  for (const line of lines) {
    if (line.startsWith("```")) {
      if (inCode){flushList();out.push(<pre key={key++} className="aic-pre"><code>{codeLines.join("\n")}</code></pre>);inCode=false;codeLines=[];}
      else{flushList();inCode=true;}
      continue;
    }
    if (inCode){codeLines.push(line);continue;}
    if (/^[-*] /.test(line)){listItems.push(line.slice(2));continue;}
    flushList();
    if (/^#{1,3} /.test(line)){
      const lvl=line.match(/^(#+)/)[1].length;
      out.push(<p key={key++} className={`aic-h${lvl}`} dangerouslySetInnerHTML={{__html:inline(line.replace(/^#+\s/,""))}}/>);
    } else if(line.trim()===""){
      out.push(<div key={key++} style={{height:6}}/>);
    } else {
      out.push(<p key={key++} className="aic-p" dangerouslySetInnerHTML={{__html:inline(line)}}/>);
    }
  }
  flushList();
  return <>{out}</>;
}

function AuroraOrbs(){
  return(
    <div className="aic-orbs" aria-hidden>
      <div className="aic-orb aic-o1"/><div className="aic-orb aic-o2"/>
      <div className="aic-orb aic-o3"/><div className="aic-orb aic-o4"/>
    </div>
  );
}
function Stars(){
  const stars=Array.from({length:50},(_,i)=>({id:i,x:Math.random()*100,y:Math.random()*100,s:Math.random()*1.5+0.4,d:Math.random()*4+2,dl:Math.random()*5}));
  return(
    <div className="aic-stars" aria-hidden>
      {stars.map(st=>(
        <div key={st.id} className="aic-star" style={{left:`${st.x}%`,top:`${st.y}%`,width:st.s,height:st.s,animationDuration:`${st.d}s`,animationDelay:`${st.dl}s`}}/>
      ))}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════ */
export default function AIChat({ token }) {
  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState("");
  const [files,    setFiles]    = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const bottomRef = useRef(null);
  const fileRef   = useRef(null);
  const taRef     = useRef(null);

  useEffect(()=>{ bottomRef.current?.scrollIntoView({behavior:"smooth"}); },[messages,loading]);

  const handleFiles = async(e)=>{
    const picked=Array.from(e.target.files);
    if(!picked.length)return;
    const enriched=await Promise.all(picked.map(async f=>{
      const mt=fileMime(f), b64=await toBase64(f), preview=isImg(mt)?URL.createObjectURL(f):null;
      return{file:f,preview,b64,mt};
    }));
    setFiles(p=>[...p,...enriched].slice(0,5));
    e.target.value="";
  };
  const removeFile=i=>setFiles(p=>p.filter((_,idx)=>idx!==i));

  const resizeTA=()=>{
    if(!taRef.current)return;
    taRef.current.style.height="auto";
    taRef.current.style.height=Math.min(taRef.current.scrollHeight,140)+"px";
  };

  /* Build content for Anthropic */
  const buildContent=(text,atts)=>{
    if(atts.length===0) return text.trim();          // plain string
    const blocks=[];
    atts.forEach(a=>{
      if(isImg(a.mt))      blocks.push({type:"image",   source:{type:"base64",media_type:a.mt,data:a.b64}});
      else if(isPDF(a.mt)) blocks.push({type:"document",source:{type:"base64",media_type:"application/pdf",data:a.b64}});
    });
    blocks.push({type:"text",text:text.trim()||"What is this?"});  // text last
    return blocks;
  };

  /* Send */
  const handleSend=useCallback(async()=>{
    if(!input.trim()&&files.length===0)return;
    setError("");

    const apiContent=buildContent(input,files);
    const userMsg={
      role:"user",
      display:{text:input.trim(), files:files.map(f=>({name:f.file.name,preview:f.preview,mt:f.mt}))},
      apiContent,
      ts:Date.now(),
    };

    const newHistory=[...messages, userMsg];
    setMessages(newHistory);
    setInput(""); setFiles([]);
    if(taRef.current) taRef.current.style.height="auto";
    setLoading(true);

    try{
      const authToken = token || localStorage.getItem("token");

      // ✅ CORRECT URL — server mounts at /api/ai
      const res = await fetch("http://localhost:5000/api/ai/chat",{
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          "Authorization":`Bearer ${authToken}`,
        },
        body: JSON.stringify({
          messages: newHistory.map(m=>({ role:m.role, content:m.apiContent })),
        }),
      });

      // Check if response is JSON before parsing
      const contentType = res.headers.get("content-type")||"";
      if(!contentType.includes("application/json")){
        const raw = await res.text();
        throw new Error(`Server returned non-JSON (${res.status}): ${raw.slice(0,120)}`);
      }

      const data = await res.json();

      if(!res.ok){
        throw new Error(data.message || `Server error ${res.status}`);
      }

      const replyText =
        data.text ||
        (Array.isArray(data.content)
          ? data.content.filter(b=>b.type==="text").map(b=>b.text).join("\n")
          : "");

      if(!replyText.trim()) throw new Error("AI returned an empty response.");

      setMessages(prev=>[...prev,{
        role:"assistant",
        display:{text:replyText, files:[]},
        apiContent:replyText,
        ts:Date.now(),
      }]);
    }catch(e){
      console.error("AIChat error:",e);
      setError(e.message);
    }
    setLoading(false);
    taRef.current?.focus();
  },[input,files,messages,token]);

  const onKey=e=>{ if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();handleSend();} };
  const isEmpty=messages.length===0;
  const CHIPS=[
    {icon:"🖼",text:"Describe an image I share"},
    {icon:"✍️",text:"Write a caption for my post"},
    {icon:"💡",text:"Give me content ideas"},
    {icon:"🌍",text:"Translate something for me"},
    {icon:"😂",text:"Write something funny"},
    {icon:"📄",text:"Summarize a document"},
  ];

  return(
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;700;800&family=DM+Sans:wght@400;500&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        .aic-root{
          --t:#2dd4bf;--v:#a78bfa;--r:#fb7185;
          --bd:rgba(255,255,255,.08);--bd2:rgba(255,255,255,.14);
          --tx:rgba(255,255,255,.90);--mu:rgba(255,255,255,.38);
          --sf:rgba(255,255,255,.04);
          font-family:'DM Sans',sans-serif;
          background:#050510;color:var(--tx);
          height:100dvh;display:flex;flex-direction:column;overflow:hidden;position:relative;
        }

        /* bg */
        .aic-noise{position:fixed;inset:0;z-index:0;pointer-events:none;
          background-image:url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.03'/%3E%3C/svg%3E");
          background-size:200px;}
        .aic-stars{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .aic-star{position:absolute;border-radius:50%;background:#fff;opacity:0;animation:twk ease-in-out infinite;}
        @keyframes twk{0%,100%{opacity:0;transform:scale(.8)}50%{opacity:.6;transform:scale(1.2)}}
        .aic-orbs{position:fixed;inset:0;z-index:0;pointer-events:none;overflow:hidden;}
        .aic-orb{position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;animation:ofl linear infinite;}
        .aic-o1{width:600px;height:600px;background:radial-gradient(circle,rgba(45,212,191,.22),transparent 70%);top:-200px;left:-150px;animation-duration:22s;}
        .aic-o2{width:500px;height:500px;background:radial-gradient(circle,rgba(167,139,250,.20),transparent 70%);bottom:-150px;right:-100px;animation-duration:18s;animation-delay:-8s;}
        .aic-o3{width:350px;height:350px;background:radial-gradient(circle,rgba(251,113,133,.14),transparent 70%);top:40%;left:50%;animation-duration:26s;animation-delay:-14s;}
        .aic-o4{width:280px;height:280px;background:radial-gradient(circle,rgba(251,191,36,.10),transparent 70%);bottom:20%;left:-80px;animation-duration:20s;animation-delay:-4s;}
        @keyframes ofl{0%,100%{transform:translate(0,0) scale(1)}25%{transform:translate(30px,-20px) scale(1.05)}50%{transform:translate(-20px,30px) scale(.96)}75%{transform:translate(15px,15px) scale(1.03)}}

        /* header */
        .aic-head{position:relative;z-index:10;flex-shrink:0;display:flex;align-items:center;gap:16px;padding:16px 24px 14px;border-bottom:1px solid var(--bd);background:rgba(5,5,20,.75);backdrop-filter:blur(20px);}
        .aic-icon{width:46px;height:46px;border-radius:14px;flex-shrink:0;background:linear-gradient(135deg,#0d9488,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:22px;box-shadow:0 0 0 1px rgba(255,255,255,.12),0 6px 20px rgba(45,212,191,.28);animation:iglow 4s ease-in-out infinite;}
        @keyframes iglow{0%,100%{box-shadow:0 0 0 1px rgba(255,255,255,.12),0 6px 20px rgba(45,212,191,.28);}50%{box-shadow:0 0 0 1px rgba(255,255,255,.20),0 8px 30px rgba(45,212,191,.50),0 0 0 5px rgba(45,212,191,.08);}}
        .aic-hname{font-family:'Syne',sans-serif;font-size:17px;font-weight:700;background:linear-gradient(90deg,var(--t),var(--v));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;}
        .aic-hsub{font-size:11.5px;color:var(--mu);margin-top:2px;}
        .aic-dot{display:flex;align-items:center;gap:7px;font-size:12px;color:var(--t);font-weight:500;flex-shrink:0;}
        .aic-dot::before{content:'';width:7px;height:7px;border-radius:50%;background:var(--t);box-shadow:0 0 8px var(--t);animation:dbl 2s ease infinite;}
        @keyframes dbl{0%,100%{opacity:1}50%{opacity:.6}}

        /* messages */
        .aic-msgs{flex:1;overflow-y:auto;position:relative;z-index:5;padding:26px 20px 20px;display:flex;flex-direction:column;gap:18px;}
        .aic-msgs::-webkit-scrollbar{width:3px;}.aic-msgs::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10);border-radius:3px;}

        /* empty */
        .aic-empty{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:20px;gap:18px;animation:fup .6s ease both;}
        @keyframes fup{from{opacity:0;transform:translateY(22px)}to{opacity:1;transform:none}}
        .aic-orb-spin{width:96px;height:96px;border-radius:50%;position:relative;background:conic-gradient(from 0deg,#0d9488,#7c3aed,#fb7185,#0d9488);animation:sp 8s linear infinite;display:flex;align-items:center;justify-content:center;}
        .aic-orb-spin::before{content:'';position:absolute;inset:3px;border-radius:50%;background:#050510;}
        .aic-orb-spin span{position:relative;z-index:1;font-size:40px;animation:sp 8s linear infinite reverse;}
        @keyframes sp{to{transform:rotate(360deg)}}
        .aic-empty h2{font-family:'Syne',sans-serif;font-size:24px;font-weight:800;background:linear-gradient(135deg,#fff 30%,var(--v));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;letter-spacing:-.03em;}
        .aic-empty>p{font-size:13.5px;color:var(--mu);line-height:1.7;max-width:310px;}

        /* chips */
        .aic-chips{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:480px;}
        .aic-chip{display:flex;align-items:center;gap:7px;padding:9px 16px;border-radius:50px;background:var(--sf);border:1px solid var(--bd);color:var(--tx);font-family:'DM Sans',sans-serif;font-size:13px;font-weight:500;cursor:pointer;transition:all .2s;animation:fup .5s ease both;}
        .aic-chip:hover{background:rgba(45,212,191,.10);border-color:rgba(45,212,191,.35);color:var(--t);transform:translateY(-2px);}

        /* rows */
        .aic-row{display:flex;gap:12px;animation:mi .3s cubic-bezier(.34,1.36,.64,1) both;}
        @keyframes mi{from{opacity:0;transform:translateY(12px) scale(.97)}to{opacity:1;transform:none}}
        .aic-row.user{flex-direction:row-reverse;}
        .aic-ava{width:34px;height:34px;border-radius:12px;flex-shrink:0;margin-top:2px;background:linear-gradient(135deg,#0d9488,#7c3aed);display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 4px 14px rgba(45,212,191,.3);}
        .aic-bub{max-width:min(72%,520px);padding:13px 17px;border-radius:18px;font-size:14px;line-height:1.65;position:relative;}
        .aic-row.user .aic-bub{background:linear-gradient(135deg,rgba(45,212,191,.17),rgba(167,139,250,.17));border:1px solid rgba(45,212,191,.25);border-radius:18px 4px 18px 18px;}
        .aic-row.ai .aic-bub{background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:4px 18px 18px 18px;backdrop-filter:blur(12px);}
        .aic-ts{font-size:10.5px;color:var(--mu);margin-top:7px;}

        /* attachments */
        .aic-atts{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px;}
        .aic-aimg{width:118px;height:94px;border-radius:10px;object-fit:cover;border:1px solid var(--bd2);}
        .aic-afile{display:flex;align-items:center;gap:8px;padding:8px 12px;background:rgba(255,255,255,.07);border:1px solid var(--bd);border-radius:10px;font-size:12px;color:var(--mu);}

        /* markdown */
        .aic-p{margin:2px 0;}.aic-h1{font-family:'Syne',sans-serif;font-size:16px;font-weight:700;color:var(--t);margin:12px 0 4px;}.aic-h2{font-family:'Syne',sans-serif;font-size:14.5px;font-weight:700;color:var(--v);margin:10px 0 3px;}.aic-h3{font-size:14px;font-weight:700;margin:8px 0 3px;}
        .aic-ul{padding-left:18px;margin:6px 0;}.aic-ul li{margin-bottom:4px;}
        .aic-pre{background:rgba(0,0,0,.55);border:1px solid rgba(255,255,255,.10);border-radius:10px;padding:12px 14px;overflow-x:auto;font-size:12.5px;line-height:1.6;margin:8px 0;font-family:'Courier New',monospace;color:var(--t);}
        .aic-ic{background:rgba(45,212,191,.12);color:var(--t);padding:1px 6px;border-radius:5px;font-size:.88em;font-family:'Courier New',monospace;}

        /* typing */
        .aic-trow{display:flex;gap:12px;animation:mi .3s ease both;}
        .aic-typing{background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:4px 18px 18px 18px;padding:14px 18px;display:flex;gap:5px;align-items:center;backdrop-filter:blur(12px);}
        .aic-td{width:7px;height:7px;border-radius:50%;animation:td 1.4s ease-in-out infinite;}
        .aic-td:nth-child(1){background:var(--t);box-shadow:0 0 6px var(--t);}
        .aic-td:nth-child(2){background:var(--v);box-shadow:0 0 6px var(--v);animation-delay:.18s;}
        .aic-td:nth-child(3){background:var(--r);box-shadow:0 0 6px var(--r);animation-delay:.36s;}
        @keyframes td{0%,60%,100%{transform:translateY(0);opacity:.5}30%{transform:translateY(-7px);opacity:1}}

        /* error */
        .aic-err{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:12px;background:rgba(251,113,133,.10);border:1px solid rgba(251,113,133,.25);color:var(--r);font-size:13px;font-weight:500;animation:mi .3s ease both;word-break:break-word;}
        .aic-ex{margin-left:auto;background:none;border:none;color:var(--r);cursor:pointer;font-size:15px;flex-shrink:0;}

        /* footer */
        .aic-foot{position:relative;z-index:10;flex-shrink:0;padding:12px 20px 20px;background:rgba(5,5,20,.82);backdrop-filter:blur(20px);border-top:1px solid var(--bd);}
        .aic-fstrip{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;}
        .aic-fi{position:relative;border-radius:10px;overflow:hidden;border:1px solid var(--bd2);background:rgba(255,255,255,.05);}
        .aic-fi img{width:62px;height:62px;object-fit:cover;display:block;}
        .aic-fdoc{width:62px;height:62px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:3px;font-size:22px;}
        .aic-fn{font-size:9px;font-weight:600;color:var(--t);max-width:56px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
        .aic-fx{position:absolute;top:3px;right:3px;width:17px;height:17px;border-radius:50%;border:none;background:rgba(0,0,0,.75);color:#fff;font-size:8px;cursor:pointer;display:flex;align-items:center;justify-content:center;}
        .aic-fx:hover{background:rgba(251,113,133,.85);}
        .aic-card{display:flex;align-items:flex-end;gap:10px;background:rgba(255,255,255,.04);border:1px solid var(--bd);border-radius:20px;padding:6px 6px 6px 16px;transition:border-color .25s,box-shadow .25s;}
        .aic-card:focus-within{border-color:rgba(45,212,191,.42);box-shadow:0 0 0 3px rgba(45,212,191,.07);}
        .aic-ta{flex:1;border:none;outline:none;background:transparent;font-family:'DM Sans',sans-serif;font-size:14.5px;color:var(--tx);resize:none;min-height:40px;max-height:140px;padding:8px 4px;line-height:1.55;}
        .aic-ta::placeholder{color:var(--mu);}
        .aic-ab{width:36px;height:36px;border-radius:50%;border:none;flex-shrink:0;background:rgba(255,255,255,.06);color:var(--mu);font-size:18px;cursor:pointer;margin-bottom:2px;display:flex;align-items:center;justify-content:center;transition:all .2s;}
        .aic-ab:hover{background:rgba(45,212,191,.12);color:var(--t);}
        .aic-sb{width:42px;height:42px;border-radius:14px;border:none;flex-shrink:0;background:linear-gradient(135deg,#0d9488,#7c3aed);color:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 18px rgba(45,212,191,.30);transition:all .2s;margin-bottom:2px;}
        .aic-sb:hover:not(:disabled){transform:translateY(-2px) scale(1.04);box-shadow:0 8px 28px rgba(45,212,191,.45);}
        .aic-sb:disabled{opacity:.3;cursor:not-allowed;box-shadow:none;transform:none;}
        .aic-hint{text-align:center;font-size:11px;color:rgba(255,255,255,.16);margin-top:9px;}
        @media(max-width:600px){.aic-head{padding:13px 16px 11px;}.aic-msgs{padding:16px 14px 14px;}.aic-foot{padding:10px 14px 18px;}.aic-bub{max-width:86%;}}
      `}</style>

      <div className="aic-root">
        <div className="aic-noise"/><Stars/><AuroraOrbs/>

        {/* Header */}
        <header className="aic-head">
          <div className="aic-icon">✦</div>
          <div style={{flex:1,minWidth:0}}>
            <div className="aic-hname">Vibe AI</div>
            <div className="aic-hsub">Powered by Claude · Text, images &amp; documents</div>
          </div>
          <div className="aic-dot">Online</div>
        </header>

        {/* Messages */}
        <main className="aic-msgs">
          {isEmpty?(
            <div className="aic-empty">
              <div className="aic-orb-spin"><span>✦</span></div>
              <h2>Hello, I'm Vibe AI</h2>
              <p>Ask me anything — share a photo, paste a document, or just start chatting.</p>
              <div className="aic-chips">
                {CHIPS.map((c,i)=>(
                  <button key={i} className="aic-chip" style={{animationDelay:`${i*0.05+0.05}s`}}
                    onClick={()=>{setInput(c.text);taRef.current?.focus();}}>
                    <span>{c.icon}</span>{c.text}
                  </button>
                ))}
              </div>
            </div>
          ):(
            messages.map((msg,i)=>(
              <div key={i} className={`aic-row ${msg.role==="user"?"user":"ai"}`}>
                {msg.role==="assistant"&&<div className="aic-ava">✦</div>}
                <div className="aic-bub">
                  {msg.role==="user"&&msg.display.files?.length>0&&(
                    <div className="aic-atts">
                      {msg.display.files.map((f,fi)=>
                        f.preview
                          ?<img key={fi} src={f.preview} alt={f.name} className="aic-aimg"/>
                          :<div key={fi} className="aic-afile">📄 {f.name.slice(0,22)}</div>
                      )}
                    </div>
                  )}
                  {msg.role==="user"?<div>{msg.display.text}</div>:<Markdown text={msg.display.text}/>}
                  <div className="aic-ts">{timeStr(msg.ts)}</div>
                </div>
              </div>
            ))
          )}

          {loading&&(
            <div className="aic-trow">
              <div className="aic-ava">✦</div>
              <div className="aic-typing"><div className="aic-td"/><div className="aic-td"/><div className="aic-td"/></div>
            </div>
          )}

          {error&&(
            <div className="aic-err">
              ⚠️ {error}
              <button className="aic-ex" onClick={()=>setError("")}>✕</button>
            </div>
          )}
          <div ref={bottomRef}/>
        </main>

        {/* Input */}
        <footer className="aic-foot">
          {files.length>0&&(
            <div className="aic-fstrip">
              {files.map((f,i)=>(
                <div key={i} className="aic-fi">
                  {f.preview?<img src={f.preview} alt={f.file.name}/>
                    :<div className="aic-fdoc"><span>{isPDF(f.mt)?"📄":"📎"}</span><span className="aic-fn">{f.file.name}</span></div>}
                  <button className="aic-fx" onClick={()=>removeFile(i)}>✕</button>
                </div>
              ))}
            </div>
          )}
          <div className="aic-card">
            <textarea ref={taRef} className="aic-ta" placeholder="Ask anything…" value={input} rows={1}
              onChange={e=>{setInput(e.target.value);resizeTA();}} onKeyDown={onKey}/>
            <button className="aic-ab" onClick={()=>fileRef.current.click()}>📎</button>
            <button className="aic-sb" onClick={handleSend} disabled={loading||(!input.trim()&&files.length===0)}>➤</button>
          </div>
          <input type="file" ref={fileRef} style={{display:"none"}} accept="image/*,.pdf" multiple onChange={handleFiles}/>
          <div className="aic-hint">Enter to send · Shift+Enter for newline · Up to 5 files</div>
        </footer>
      </div>
    </>
  );
}