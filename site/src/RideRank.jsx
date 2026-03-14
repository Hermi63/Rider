import { useState, useEffect, useRef, useCallback } from "react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, PolarRadiusAxis } from "recharts";
import { subscribeData, addReview as fbAddReview, deleteReview as fbDeleteReview, banUser as fbBanUser, unbanUser as fbUnbanUser } from "./firebase";

// ══════════════════════════════════════════════════════════════
//  RIDE RANK — Preview версия (localStorage)
//  Для реального сайта с Firebase — см. файл RideRank_firebase.jsx
// ══════════════════════════════════════════════════════════════

const ADMIN_PASSWORD = "riderank2024";
const STORAGE_KEY = "riderank_v6";

// ── Нормализация ──────────────────────────────────────────────
const NICKNAMES = {
  "дима":"дмитрий","димас":"дмитрий","димон":"дмитрий","дмитрий":"дмитрий","митя":"дмитрий",
  "саша":"александр","шура":"александр","санёк":"александр","александр":"александр","саня":"александр","сашок":"александр",
  "вася":"василий","василий":"василий","васёк":"василий",
  "коля":"николай","колян":"николай","николай":"николай","колька":"николай",
  "серёга":"сергей","серый":"сергей","сергей":"сергей","серёжа":"сергей","серж":"сергей",
  "андрюха":"андрей","андрей":"андрей","андрон":"андрей",
  "паша":"павел","пашок":"павел","павел":"павел","пашка":"павел",
  "женя":"евгений","евгений":"евгений","женёк":"евгений",
  "лёха":"алексей","лёша":"алексей","алексей":"алексей","алёша":"алексей",
  "рома":"роман","ромка":"роман","роман":"роман","ромчик":"роман",
  "антон":"антон","антоха":"антон","антошка":"антон",
  "макс":"максим","максим":"максим","максон":"максим",
  "тёма":"артём","артём":"артём","артем":"артём",
  "витя":"виктор","виктор":"виктор","витёк":"виктор",
  "стас":"станислав","станислав":"станислав",
  "миша":"михаил","мишаня":"михаил","михаил":"михаил","мишка":"михаил",
  "кирилл":"кирилл","кирюха":"кирилл","кирюша":"кирилл",
  "ваня":"иван","ванёк":"иван","иван":"иван","ванька":"иван",
  "юра":"юрий","юрий":"юрий","юрок":"юрий",
  "олег":"олег","олежа":"олег",
  "игорь":"игорь","игорёк":"игорь",
  "денис":"денис","дэн":"денис",
  "никита":"никита","никитос":"никита",
  "влад":"владислав","владислав":"владислав","владик":"владислав",
  "слава":"вячеслав","вячеслав":"вячеслав","славик":"вячеслав",
  "тимур":"тимур","тима":"тимур",
  "руслан":"руслан","руслик":"руслан",
  "рустам":"рустам",
  "илья":"илья","илюха":"илья","илюша":"илья",
  "костя":"константин","константин":"константин","костян":"константин",
  "боря":"борис","борис":"борис","борян":"борис",
  "федя":"фёдор","фёдор":"фёдор","федор":"фёдор",
  "петя":"пётр","пётр":"пётр","петр":"пётр","петруха":"пётр",
};

const CAR_ALIASES = {
  "бмв":"bmw","бимер":"bmw","бумер":"bmw","bmw":"bmw","бэха":"bmw",
  "мерс":"mercedes","мерседес":"mercedes","mercedes":"mercedes","мерин":"mercedes","мерсос":"mercedes",
  "ауди":"audi","audi":"audi",
  "тойота":"toyota","toyota":"toyota","тойотка":"toyota",
  "лада":"lada","ваз":"lada","жигули":"lada","жига":"lada","вазик":"lada","гранта":"lada","веста":"lada","нива":"lada","калина":"lada","приора":"lada",
  "киа":"kia","kia":"kia","киашка":"kia",
  "хёндай":"hyundai","хундай":"hyundai","hyundai":"hyundai","хёнда":"hyundai",
  "фольксваген":"volkswagen","volkswagen":"volkswagen","фольц":"volkswagen","вольцваген":"volkswagen",
  "ниссан":"nissan","nissan":"nissan","нисан":"nissan",
  "мазда":"mazda","mazda":"mazda",
  "хонда":"honda","honda":"honda",
  "форд":"ford","ford":"ford",
  "рено":"renault","renault":"renault",
  "шкода":"skoda","skoda":"skoda","шкодка":"skoda",
  "шевроле":"chevrolet","chevrolet":"chevrolet",
  "митсубиши":"mitsubishi","mitsubishi":"mitsubishi","мицубиси":"mitsubishi",
  "субару":"subaru","subaru":"subaru","субарик":"subaru",
  "лексус":"lexus","lexus":"lexus",
  "порше":"porsche","porsche":"porsche","порш":"porsche",
  "тесла":"tesla","tesla":"tesla",
  "вольво":"volvo","volvo":"volvo",
  "пежо":"peugeot","peugeot":"peugeot",
  "опель":"opel","opel":"opel",
  "сузуки":"suzuki","suzuki":"suzuki",
  "джили":"geely","geely":"geely",
  "хавал":"haval","haval":"haval",
  "чери":"chery","chery":"chery",
  "москвич":"москвич",
};

const BRAND_DISPLAY = {
  "bmw":"BMW","mercedes":"Mercedes","audi":"Audi","toyota":"Toyota","lada":"Lada",
  "kia":"Kia","hyundai":"Hyundai","volkswagen":"Volkswagen","nissan":"Nissan",
  "mazda":"Mazda","honda":"Honda","ford":"Ford","renault":"Renault","skoda":"Skoda",
  "chevrolet":"Chevrolet","mitsubishi":"Mitsubishi","subaru":"Subaru","lexus":"Lexus",
  "porsche":"Porsche","tesla":"Tesla","volvo":"Volvo","peugeot":"Peugeot","opel":"Opel",
  "suzuki":"Suzuki","geely":"Geely","haval":"Haval","chery":"Chery","москвич":"Москвич",
};

const NAME_DISPLAY = {
  "дмитрий":"Дмитрий","александр":"Александр","василий":"Василий","николай":"Николай",
  "сергей":"Сергей","андрей":"Андрей","павел":"Павел","евгений":"Евгений","алексей":"Алексей",
  "роман":"Роман","антон":"Антон","максим":"Максим","артём":"Артём","виктор":"Виктор",
  "станислав":"Станислав","михаил":"Михаил","кирилл":"Кирилл","иван":"Иван",
  "юрий":"Юрий","олег":"Олег","игорь":"Игорь","денис":"Денис","никита":"Никита",
  "владислав":"Владислав","вячеслав":"Вячеслав","тимур":"Тимур","руслан":"Руслан",
  "рустам":"Рустам","илья":"Илья","константин":"Константин","борис":"Борис",
  "фёдор":"Фёдор","пётр":"Пётр",
};

function normName(raw) { return NICKNAMES[raw.trim().toLowerCase()] || raw.trim().toLowerCase(); }
function normCar(raw) {
  const parts = raw.trim().split(/\s+/);
  const brand = CAR_ALIASES[parts[0].toLowerCase()] || parts[0].toLowerCase();
  const disp = BRAND_DISPLAY[brand] || (brand.charAt(0).toUpperCase()+brand.slice(1));
  const model = parts.slice(1).join(" ");
  return { key:brand, full: model ? `${disp} ${model}` : disp };
}
function getDisplayName(raw) {
  const n = normName(raw);
  return NAME_DISPLAY[n] || (raw.trim().charAt(0).toUpperCase()+raw.trim().slice(1));
}
function makeKey(name) { return normName(name).replace(/\s+/g,"_"); }

// ── Данные ────────────────────────────────────────────────────
const CRITERIA = [
  { key:"driving",     label:"Вождение",       icon:"🏎️" },
  { key:"music",       label:"Музыка",          icon:"🎵" },
  { key:"punctuality", label:"Пунктуальность",  icon:"⏰" },
  { key:"cleanliness", label:"Чистота авто",    icon:"✨" },
  { key:"shashki",     label:"Шашки",           icon:"♟️" },
  { key:"safety",      label:"Безопасность",    icon:"🛡️" },
  { key:"comfort",     label:"Комфорт",         icon:"🛋️" },
];

const ACHIEVEMENTS = [
  { id:"speed",  icon:"👹", title:"Демон скорости",       desc:"Вождение 5/5",      check: s => s.driving >= 5 },
  { id:"dj",     icon:"🎧", title:"Бог плейлистов",       desc:"Музыка 5/5",        check: s => s.music >= 5 },
  { id:"late",   icon:"🐌", title:"Вечно опаздывает",     desc:"Пунктуальность ≤2", check: s => s.punctuality <= 2 },
  { id:"clean",  icon:"🧼", title:"Чистюля",              desc:"Чистота 5/5",       check: s => s.cleanliness >= 5 },
  { id:"chess",  icon:"♟️", title:"Мастер шашек",         desc:"Шашки 5/5",         check: s => s.shashki >= 5 },
  { id:"death",  icon:"💀", title:"Опасный тип",          desc:"Безопасность ≤2",   check: s => s.safety <= 2 },
  { id:"couch",  icon:"🛋️", title:"Комфорт-класс",        desc:"Комфорт 5/5",       check: s => s.comfort >= 5 },
  { id:"legend", icon:"👑", title:"ЛЕГЕНДА",              desc:"Всё на 5/5",        check: s => Object.values(s).every(v=>v>=5) },
];

const TITLES = [
  { min:4.5, label:"👑 Легенда дороги",  color:"#b8ff00" },
  { min:4.0, label:"🔥 Огонь за рулём", color:"#7fff00" },
  { min:3.5, label:"😎 Уверенный",      color:"#39ff14" },
  { min:3.0, label:"🙂 Нормально",      color:"#a8ff00" },
  { min:2.0, label:"😬 Так себе",       color:"#ff9500" },
  { min:0,   label:"💀 Лучше пешком",   color:"#ff2d78" },
];

function getTitle(a)   { return TITLES.find(t=>a>=t.min) || TITLES[TITLES.length-1]; }
function calcAvg(sc)   { const v=Object.values(sc); return v.length ? v.reduce((a,b)=>a+b,0)/v.length : 0; }
function getStats(revs) {
  if(!revs.length) return null;
  const r={};
  CRITERIA.forEach(c=>{ r[c.key]=revs.reduce((s,rev)=>s+(rev.scores[c.key]||0),0)/revs.length; });
  return r;
}
function getAchs(stats) { return stats ? ACHIEVEMENTS.filter(a=>a.check(stats)) : []; }

// ── Storage helpers ───────────────────────────────────────────
function loadData() {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? JSON.parse(s) : { reviews:[], drivers:{}, banned:{} };
  } catch { return { reviews:[], drivers:{}, banned:{} }; }
}
function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
}

// ── Hooks ─────────────────────────────────────────────────────
function useInView(thr=0.12) {
  const ref = useRef(null);
  const [vis, setVis] = useState(false);
  useEffect(()=>{
    const obs = new IntersectionObserver(([e])=>{ if(e.isIntersecting) setVis(true); },{threshold:thr});
    if(ref.current) obs.observe(ref.current);
    return ()=>obs.disconnect();
  },[]);
  return [ref, vis];
}

function Reveal({ children, delay=0, style={} }) {
  const [ref, vis] = useInView();
  return (
    <div ref={ref} style={{ opacity:vis?1:0, transform:vis?"translateY(0)":"translateY(36px)", transition:`opacity 0.65s ease ${delay}s, transform 0.65s ease ${delay}s`, ...style }}>
      {children}
    </div>
  );
}

// ── Stars ─────────────────────────────────────────────────────
function Stars({ value, onChange, size=24 }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{display:"flex",gap:3}}>
      {[1,2,3,4,5].map(i=>(
        <span key={i}
          onClick={()=>onChange&&onChange(i)}
          onMouseEnter={()=>onChange&&setHover(i)}
          onMouseLeave={()=>onChange&&setHover(0)}
          style={{fontSize:size,cursor:onChange?"pointer":"default",opacity:(hover||value)>=i?1:0.18,filter:(hover||value)>=i?"drop-shadow(0 0 6px #39ff14)":"none",transition:"all 0.15s",userSelect:"none",display:"inline-block"}}>
          ⭐
        </span>
      ))}
    </div>
  );
}

// ── BannedScreen ──────────────────────────────────────────────
function BannedScreen() {
  return (
    <div style={{position:"fixed",inset:0,zIndex:9999,background:"#030603",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:20}}>
      <div style={{fontSize:80}}>🚫</div>
      <div style={{fontSize:28,fontWeight:900,color:"#ff2d78",letterSpacing:-1}}>ДОСТУП ЗАБЛОКИРОВАН</div>
      <div style={{fontSize:14,color:"#4a3030",fontFamily:"monospace",marginTop:4}}>Вы были заблокированы администратором</div>
    </div>
  );
}

// ── AdminLogin ────────────────────────────────────────────────
function AdminLogin({ onSuccess, onClose }) {
  const [pw, setPw] = useState("");
  const [err, setErr] = useState(false);
  function tryLogin() {
    if(pw === ADMIN_PASSWORD) { onSuccess(); }
    else { setErr(true); setTimeout(()=>setErr(false), 2000); }
  }
  return (
    <div style={{position:"fixed",inset:0,zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.92)",backdropFilter:"blur(12px)"}} onClick={onClose}>
      <div style={{background:"#080b08",border:"1px solid rgba(255,45,120,0.35)",borderRadius:24,padding:32,width:320,boxShadow:"0 0 60px rgba(255,45,120,0.12)"}} onClick={e=>e.stopPropagation()}>
        <div style={{fontSize:22,fontWeight:900,color:"#ff2d78",marginBottom:6,letterSpacing:-0.5}}>⚡ Вход для модератора</div>
        <div style={{fontSize:12,color:"#4a3030",fontFamily:"monospace",marginBottom:22}}>Введите пароль</div>
        <input type="password" placeholder="Пароль" value={pw} onChange={e=>setPw(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryLogin()}
          style={{width:"100%",background:"rgba(255,45,120,0.06)",border:`1px solid ${err?"#ff2d78":"rgba(255,45,120,0.2)"}`,borderRadius:12,padding:"13px 16px",color:"#f0ffe0",fontSize:14,outline:"none",fontFamily:"inherit",boxSizing:"border-box",marginBottom:6,transition:"border-color 0.2s"}}
          autoFocus />
        {err && <div style={{fontSize:11,color:"#ff2d78",fontFamily:"monospace",marginBottom:6}}>Неверный пароль</div>}
        <div style={{display:"flex",gap:8,marginTop:14}}>
          <button onClick={onClose} style={{flex:1,padding:12,background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:12,color:"#4a4040",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>Отмена</button>
          <button onClick={tryLogin} style={{flex:2,padding:12,background:"#ff2d78",border:"none",borderRadius:12,color:"white",fontSize:13,fontWeight:900,cursor:"pointer",fontFamily:"inherit"}}>Войти →</button>
        </div>
      </div>
    </div>
  );
}

// ── AdminPanel ────────────────────────────────────────────────
function AdminPanel({ reviews, drivers, banned, currentUser, adminName, onDelete, onBan, onUnban, onClose }) {
  const [aTab, setATab] = useState("reviews");
  const sorted = [...reviews].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));

  return (
    <div style={{position:"fixed",inset:0,zIndex:500,background:"rgba(0,0,0,0.96)",backdropFilter:"blur(16px)",overflow:"auto"}} onClick={onClose}>
      <div style={{maxWidth:800,margin:"0 auto",padding:"32px 16px"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
          <div>
            <div style={{fontSize:26,fontWeight:900,color:"#ff2d78",letterSpacing:-1}}>⚡ ПАНЕЛЬ МОДЕРАТОРА</div>
            <div style={{fontSize:11,color:"#4a3030",fontFamily:"monospace",marginTop:4,letterSpacing:2}}>RIDE RANK ADMIN</div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,45,120,0.1)",border:"1px solid rgba(255,45,120,0.3)",borderRadius:12,color:"#ff2d78",fontSize:16,width:40,height:40,cursor:"pointer"}}>✕</button>
        </div>

        {/* Stats */}
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
          {[
            {l:"Всего отзывов", v:reviews.length,              c:"#39ff14"},
            {l:"Водителей",     v:Object.keys(drivers).length, c:"#39ff14"},
            {l:"Забанено",      v:Object.keys(banned).length,  c:"#ff2d78"},
          ].map(s=>(
            <div key={s.l} style={{background:"rgba(255,255,255,0.03)",border:`1px solid ${s.c}20`,borderRadius:16,padding:16,textAlign:"center"}}>
              <div style={{fontSize:30,fontWeight:900,color:s.c}}>{s.v}</div>
              <div style={{fontSize:10,color:"#4a6040",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,marginTop:4}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{display:"flex",gap:4,background:"rgba(0,0,0,0.4)",padding:4,borderRadius:12,border:"1px solid rgba(255,255,255,0.06)",marginBottom:18}}>
          {[{id:"reviews",l:`Отзывы (${reviews.length})`},{id:"banned",l:`Баны (${Object.keys(banned).length})`}].map(t=>(
            <button key={t.id} onClick={()=>setATab(t.id)}
              style={{flex:1,padding:10,background:aTab===t.id?"rgba(255,45,120,0.15)":"transparent",border:aTab===t.id?"1px solid rgba(255,45,120,0.3)":"1px solid transparent",borderRadius:10,color:aTab===t.id?"#ff2d78":"#4a4040",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700,textTransform:"uppercase",letterSpacing:0.5}}>
              {t.l}
            </button>
          ))}
        </div>

        {/* Reviews */}
        {aTab==="reviews" && (
          <div>
            {sorted.length===0 && <div style={{textAlign:"center",padding:40,color:"#4a4040",fontFamily:"monospace"}}>Отзывов пока нет</div>}
            {sorted.map(r=>{
              const d = drivers[r.driverId]; if(!d) return null;
              const avg = calcAvg(r.scores);
              const t   = getTitle(avg);
              const bKey = r.reviewer?.toLowerCase().replace(/\s+/g,"_");
              const isBanned = !!banned[bKey];
              return (
                <div key={r.id} style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:16,padding:"14px 16px",marginBottom:9,position:"relative",overflow:"hidden"}}>
                  <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${t.color}40,transparent)`}}/>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                    <div>
                      <div style={{fontSize:14,fontWeight:700,color:"#f0ffe0"}}>{d.displayName} <span style={{color:"#2a4020",fontSize:11}}>· {d.displayCar}</span></div>
                      <div style={{fontSize:11,fontFamily:"monospace",marginTop:2,color:isBanned?"#ff2d78":"#4a4040"}}>
                        от {r.reviewer}{isBanned?" 🚫":""} · {r.date}
                      </div>
                      {r.comment && <div style={{fontSize:12,color:"#4a6040",fontStyle:"italic",marginTop:5,borderLeft:"2px solid #39ff1430",paddingLeft:8}}>"{r.comment}"</div>}
                    </div>
                    <div style={{fontSize:20,fontWeight:900,color:t.color}}>{avg.toFixed(1)}</div>
                  </div>
                  <div style={{display:"flex",gap:7,flexWrap:"wrap"}}>
                    <button onClick={()=>onDelete(r.id)}
                      style={{padding:"5px 12px",background:"rgba(255,45,120,0.1)",border:"1px solid rgba(255,45,120,0.3)",borderRadius:8,color:"#ff2d78",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                      🗑 Удалить
                    </button>
                    {/* Скрываем кнопку бана для себя и модератора */}
                    {r.reviewer?.toLowerCase() !== currentUser?.toLowerCase() &&
                     r.reviewer?.toLowerCase() !== adminName?.toLowerCase() && (
                      !isBanned
                        ? <button onClick={()=>onBan(r.reviewer)}
                            style={{padding:"5px 12px",background:"rgba(255,149,0,0.1)",border:"1px solid rgba(255,149,0,0.3)",borderRadius:8,color:"#ff9500",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                            🚫 Забанить {r.reviewer}
                          </button>
                        : <button onClick={()=>onUnban(r.reviewer)}
                            style={{padding:"5px 12px",background:"rgba(57,255,20,0.1)",border:"1px solid rgba(57,255,20,0.3)",borderRadius:8,color:"#39ff14",fontSize:11,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                            ✅ Разбанить {r.reviewer}
                          </button>
                    )}
                    {(r.reviewer?.toLowerCase() === currentUser?.toLowerCase() ||
                      r.reviewer?.toLowerCase() === adminName?.toLowerCase()) && (
                      <div style={{padding:"5px 12px",background:"rgba(57,255,20,0.05)",border:"1px solid rgba(57,255,20,0.1)",borderRadius:8,color:"#2a4020",fontSize:11,fontFamily:"monospace"}}>
                        🛡 это ты
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Banned */}
        {aTab==="banned" && (
          <div>
            {Object.keys(banned).length===0 && <div style={{textAlign:"center",padding:40,color:"#4a4040",fontFamily:"monospace"}}>Забаненных нет 🎉</div>}
            {Object.entries(banned).map(([key,name])=>(
              <div key={key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",background:"rgba(255,45,120,0.05)",border:"1px solid rgba(255,45,120,0.15)",borderRadius:14,padding:"13px 16px",marginBottom:7}}>
                <div>
                  <div style={{fontSize:15,fontWeight:700,color:"#ff2d78"}}>🚫 {name}</div>
                  <div style={{fontSize:10,color:"#4a3030",fontFamily:"monospace",marginTop:2}}>Заблокирован</div>
                </div>
                <button onClick={()=>onUnban(name)}
                  style={{padding:"7px 14px",background:"rgba(57,255,20,0.1)",border:"1px solid rgba(57,255,20,0.3)",borderRadius:10,color:"#39ff14",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:700}}>
                  ✅ Разбанить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── DriverModal ───────────────────────────────────────────────
function DriverModal({ driver, reviews, isAdmin, onClose, onReview, onDeleteReview }) {
  const stats = getStats(reviews);
  const avg   = stats ? calcAvg(stats) : 0;
  const t     = getTitle(avg);
  const achs  = getAchs(stats);
  const radar = stats ? CRITERIA.map(c=>({subject:c.label,value:stats[c.key],fullMark:5})) : [];

  return (
    <div style={{position:"fixed",inset:0,zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.9)",backdropFilter:"blur(12px)",padding:16}} onClick={onClose}>
      <div style={{background:"#080b08",border:"1px solid rgba(57,255,20,0.25)",borderRadius:24,padding:28,maxWidth:540,width:"100%",maxHeight:"90vh",overflowY:"auto",position:"relative"}} onClick={e=>e.stopPropagation()}>
        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#39ff14,transparent)",borderRadius:"24px 24px 0 0"}}/>
        <button onClick={onClose} style={{position:"absolute",top:14,right:14,background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.2)",borderRadius:10,color:"#39ff14",fontSize:16,width:34,height:34,cursor:"pointer"}}>✕</button>

        <div style={{marginBottom:20}}>
          <div style={{fontSize:26,fontWeight:900,color:"#f0ffe0",letterSpacing:-1}}>{driver.displayName}</div>
          <div style={{fontSize:13,color:"#4a6040",fontFamily:"monospace",marginTop:3}}>{driver.displayCar}</div>
          <div style={{display:"flex",alignItems:"center",gap:14,marginTop:12}}>
            <span style={{fontSize:42,fontWeight:900,color:"#39ff14",textShadow:"0 0 30px #39ff1480",letterSpacing:-2}}>{avg.toFixed(1)}</span>
            <div>
              <div style={{color:t.color,fontSize:16,fontWeight:700}}>{t.label}</div>
              <div style={{color:"#4a6040",fontSize:11,fontFamily:"monospace"}}>{reviews.length} отзывов</div>
            </div>
          </div>
        </div>

        {stats && (
          <div style={{height:200,marginBottom:20}}>
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radar}>
                <PolarGrid stroke="rgba(57,255,20,0.12)"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:"#4a6040",fontSize:9,fontFamily:"monospace"}}/>
                <PolarRadiusAxis domain={[0,5]} tick={false} axisLine={false}/>
                <Radar dataKey="value" stroke="#39ff14" fill="#39ff14" fillOpacity={0.12} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:20}}>
          {CRITERIA.map(c=>(
            <div key={c.key} style={{background:"rgba(57,255,20,0.04)",borderRadius:12,padding:"10px 12px",border:"1px solid rgba(57,255,20,0.1)"}}>
              <div style={{fontSize:11,color:"#4a6040",fontFamily:"monospace",marginBottom:5}}>{c.icon} {c.label}</div>
              <Stars value={stats?Math.round(stats[c.key]):0} size={14}/>
              <div style={{fontSize:12,fontFamily:"monospace",color:"#39ff14",marginTop:3}}>{stats?stats[c.key].toFixed(1):"—"}</div>
            </div>
          ))}
        </div>

        {achs.length>0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:"#4a6040",marginBottom:8,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:2}}>Ачивки</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
              {achs.map(a=>(
                <div key={a.id} style={{background:"rgba(57,255,20,0.06)",border:"1px solid rgba(57,255,20,0.15)",borderRadius:12,padding:"7px 11px",display:"flex",alignItems:"center",gap:7}}>
                  <span style={{fontSize:18}}>{a.icon}</span>
                  <div><div style={{fontSize:11,fontWeight:700,color:"#f0ffe0"}}>{a.title}</div><div style={{fontSize:10,color:"#4a6040",fontFamily:"monospace"}}>{a.desc}</div></div>
                </div>
              ))}
            </div>
          </div>
        )}

        {reviews.filter(r=>r.comment).length>0 && (
          <div style={{marginBottom:20}}>
            <div style={{fontSize:11,color:"#4a6040",marginBottom:8,fontFamily:"monospace",textTransform:"uppercase",letterSpacing:2}}>Комментарии</div>
            {reviews.filter(r=>r.comment).slice(-5).map((r,i)=>(
              <div key={i} style={{background:"rgba(57,255,20,0.04)",borderRadius:10,padding:"9px 12px",borderLeft:"2px solid #39ff1440",marginBottom:7,position:"relative"}}>
                <div style={{fontSize:13,lineHeight:1.5,color:"#c0d8b0"}}>"{r.comment}"</div>
                <div style={{fontSize:10,color:"#4a6040",marginTop:5,fontFamily:"monospace"}}>— {r.reviewer}{r.route?` · ${r.route}`:""} · {r.date}</div>
                {isAdmin && (
                  <button onClick={()=>onDeleteReview(r.id)}
                    style={{position:"absolute",top:8,right:8,background:"rgba(255,45,120,0.1)",border:"none",borderRadius:6,color:"#ff2d78",fontSize:10,padding:"2px 8px",cursor:"pointer"}}>🗑</button>
                )}
              </div>
            ))}
          </div>
        )}

        <button onClick={onReview} style={{width:"100%",padding:14,background:"#39ff14",border:"none",borderRadius:14,color:"#020a02",fontSize:14,fontWeight:900,cursor:"pointer",boxShadow:"0 0 30px #39ff1440",letterSpacing:0.5}}>
          + ОСТАВИТЬ ОТЗЫВ
        </button>
      </div>
    </div>
  );
}

// ── ReviewForm ────────────────────────────────────────────────
function ReviewForm({ prefill, onSubmit, onClose, allDrivers }) {
  const [step, setStep]           = useState(1);
  const [reviewer, setReviewer]   = useState("");
  const [driverName, setDriverName] = useState(prefill?.displayName || "");
  const [driverCar, setDriverCar] = useState(prefill?.displayCar || "");
  const [route, setRoute]         = useState("");
  const [scores, setScores]       = useState({});
  const [comment, setComment]     = useState("");

  const norm     = driverName.trim() ? normName(driverName) : "";
  const key      = norm.replace(/\s+/g,"_");
  const existing = allDrivers.find(d=>d.id===key);
  const nameHint = driverName.trim() && existing && existing.displayName.toLowerCase()!==driverName.trim().toLowerCase()
    ? `→ профиль "${existing.displayName}"`
    : driverName.trim() && NAME_DISPLAY[norm] && NAME_DISPLAY[norm].toLowerCase()!==driverName.trim().toLowerCase()
    ? `→ будет "${NAME_DISPLAY[norm]}"` : null;
  const carRes  = driverCar.trim() ? normCar(driverCar) : null;
  const carHint = carRes && carRes.full.toLowerCase()!==driverCar.trim().toLowerCase() ? `→ "${carRes.full}"` : null;

  const inp = {background:"rgba(57,255,20,0.04)",border:"1px solid rgba(57,255,20,0.15)",borderRadius:12,padding:"13px 16px",color:"#f0ffe0",fontSize:14,width:"100%",outline:"none",fontFamily:"inherit",marginBottom:4,boxSizing:"border-box",display:"block",transition:"border-color 0.2s"};
  const onF = e=>e.target.style.borderColor="rgba(57,255,20,0.5)";
  const onB = e=>e.target.style.borderColor="rgba(57,255,20,0.15)";

  function canNext() {
    if(step===1) return reviewer.trim().length>=2;
    if(step===2) return driverName.trim().length>=2 && driverCar.trim().length>=2;
    if(step===3) return Object.keys(scores).length===CRITERIA.length;
    return true;
  }
  function submit() {
    const {full:car} = normCar(driverCar);
    const n = normName(driverName);
    const disp = getDisplayName(driverName);
    onSubmit({reviewer, driverName:disp, driverNameNorm:n, driverCar:car, route, scores, comment, date:new Date().toLocaleDateString("ru-RU"), timestamp:Date.now()});
  }

  return (
    <div style={{position:"fixed",inset:0,zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",background:"rgba(0,0,0,0.92)",backdropFilter:"blur(16px)",padding:16}} onClick={onClose}>
      <div style={{background:"#080b08",border:"1px solid rgba(57,255,20,0.3)",borderRadius:24,padding:28,maxWidth:460,width:"100%",maxHeight:"90vh",overflowY:"auto",boxShadow:"0 0 60px rgba(57,255,20,0.08)"}} onClick={e=>e.stopPropagation()}>

        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:24}}>
          <div>
            <div style={{fontSize:22,fontWeight:900,color:"#f0ffe0",letterSpacing:-0.5}}>НОВЫЙ ОТЗЫВ</div>
            <div style={{display:"flex",gap:5,marginTop:10}}>
              {[1,2,3,4].map(i=>(
                <div key={i} style={{height:3,width:36,borderRadius:2,background:step>=i?"#39ff14":"rgba(57,255,20,0.1)",boxShadow:step>=i?"0 0 10px #39ff14":"none",transition:"all 0.3s"}}/>
              ))}
            </div>
          </div>
          <button onClick={onClose} style={{background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.2)",borderRadius:10,color:"#39ff14",fontSize:16,width:34,height:34,cursor:"pointer"}}>✕</button>
        </div>

        {step===1 && (
          <div>
            <div style={{fontSize:13,color:"#4a6040",fontFamily:"monospace",marginBottom:14,letterSpacing:1,textTransform:"uppercase"}}>Кто оценивает?</div>
            <input style={inp} onFocus={onF} onBlur={onB} placeholder="Твоё имя" value={reviewer} onChange={e=>setReviewer(e.target.value)} autoFocus/>
          </div>
        )}

        {step===2 && (
          <div>
            <div style={{fontSize:13,color:"#4a6040",fontFamily:"monospace",marginBottom:14,letterSpacing:1,textTransform:"uppercase"}}>О ком отзыв?</div>
            {allDrivers.length>0 && (
              <div style={{marginBottom:14}}>
                <div style={{fontSize:10,color:"#2a4020",fontFamily:"monospace",marginBottom:8,textTransform:"uppercase",letterSpacing:2}}>Выбери водителя</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:7}}>
                  {allDrivers.map(d=>{
                    const sel = makeKey(driverName)===d.id;
                    return (
                      <button key={d.id} onClick={()=>{setDriverName(d.displayName);setDriverCar(d.displayCar);}}
                        style={{background:sel?"rgba(57,255,20,0.15)":"rgba(57,255,20,0.04)",border:`1px solid ${sel?"#39ff14":"rgba(57,255,20,0.15)"}`,borderRadius:10,padding:"7px 14px",color:sel?"#39ff14":"#8ab080",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:sel?700:400,transition:"all 0.15s"}}>
                        {d.displayName}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            <div style={{marginBottom:11}}>
              <input style={{...inp,marginBottom:0,borderColor:nameHint?"rgba(57,255,20,0.5)":"rgba(57,255,20,0.15)"}} onFocus={onF} onBlur={onB}
                placeholder="Имя водителя (Дима, Димас, Дмитрий...)" value={driverName} onChange={e=>setDriverName(e.target.value)}/>
              {nameHint
                ? <div style={{fontSize:11,fontFamily:"monospace",color:"#39ff14",marginTop:4,padding:"4px 10px",background:"rgba(57,255,20,0.08)",borderRadius:8}}>✓ {nameHint}</div>
                : <div style={{fontSize:11,fontFamily:"monospace",color:"#2a4020",marginTop:4}}>Дима, Димас, Дмитрий — объединяем в один профиль</div>}
            </div>
            <div style={{marginBottom:11}}>
              <input style={{...inp,marginBottom:0,borderColor:carHint?"rgba(57,255,20,0.5)":"rgba(57,255,20,0.15)"}} onFocus={onF} onBlur={onB}
                placeholder="Марка авто (БМВ, Бумер, BMW M3...)" value={driverCar} onChange={e=>setDriverCar(e.target.value)}/>
              {carHint
                ? <div style={{fontSize:11,fontFamily:"monospace",color:"#39ff14",marginTop:4,padding:"4px 10px",background:"rgba(57,255,20,0.08)",borderRadius:8}}>✓ {carHint}</div>
                : <div style={{fontSize:11,fontFamily:"monospace",color:"#2a4020",marginTop:4}}>Бумер, БМВ, BMW — распознаём автоматически</div>}
            </div>
            <input style={inp} onFocus={onF} onBlur={onB} placeholder="Маршрут (необязательно)" value={route} onChange={e=>setRoute(e.target.value)}/>
          </div>
        )}

        {step===3 && (
          <div>
            <div style={{fontSize:12,color:"#4a6040",fontFamily:"monospace",marginBottom:16,padding:"10px 14px",background:"rgba(57,255,20,0.04)",borderRadius:12,border:"1px solid rgba(57,255,20,0.1)"}}>
              Оцениваешь: <span style={{color:"#39ff14",fontWeight:700}}>{driverName}</span> · <span style={{color:"#8ab080"}}>{driverCar}</span>
            </div>
            {CRITERIA.map(c=>(
              <div key={c.key} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16,paddingBottom:16,borderBottom:"1px solid rgba(57,255,20,0.06)"}}>
                <div style={{display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20}}>{c.icon}</span>
                  <span style={{fontSize:13,color:"#8ab080"}}>{c.label}</span>
                </div>
                <Stars value={scores[c.key]||0} onChange={v=>setScores(s=>({...s,[c.key]:v}))} size={22}/>
              </div>
            ))}
          </div>
        )}

        {step===4 && (
          <div>
            <div style={{fontSize:13,color:"#4a6040",fontFamily:"monospace",marginBottom:14,letterSpacing:1,textTransform:"uppercase"}}>Комментарий</div>
            <textarea style={{...inp,height:120,resize:"none",lineHeight:1.7}} onFocus={onF} onBlur={onB}
              placeholder="Расскажи о поездке (необязательно)" value={comment} onChange={e=>setComment(e.target.value)}/>
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:24}}>
          {step>1 && <button onClick={()=>setStep(s=>s-1)} style={{flex:1,padding:13,background:"rgba(57,255,20,0.06)",border:"1px solid rgba(57,255,20,0.15)",borderRadius:14,color:"#8ab080",fontSize:13,cursor:"pointer",fontFamily:"inherit"}}>← Назад</button>}
          {step<4
            ? <button onClick={()=>canNext()&&setStep(s=>s+1)} style={{flex:2,padding:13,background:canNext()?"#39ff14":"rgba(57,255,20,0.08)",border:"none",borderRadius:14,color:canNext()?"#020a02":"#2a4020",fontSize:14,fontWeight:900,cursor:canNext()?"pointer":"not-allowed",fontFamily:"inherit",transition:"all 0.2s",boxShadow:canNext()?"0 0 20px #39ff1430":"none"}}>Далее →</button>
            : <button onClick={submit} style={{flex:2,padding:13,background:"#39ff14",border:"none",borderRadius:14,color:"#020a02",fontSize:14,fontWeight:900,cursor:"pointer",fontFamily:"inherit",boxShadow:"0 0 30px #39ff1440"}}>🚀 ОТПРАВИТЬ</button>
          }
        </div>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────
export default function RideRank() {
  const [tab, setTab]             = useState("feed");
  const [data, setData]           = useState({ reviews:[], drivers:{}, banned:{} });
  const [loading, setLoading]     = useState(true);
  const [showForm, setShowForm]   = useState(false);
  const [selDriver, setSelDriver] = useState(null);
  const [prefill, setPrefill]     = useState(null);
  const [toast, setToast]         = useState(null);
  const [scrollY, setScrollY]     = useState(0);
  const [isAdmin, setIsAdmin]     = useState(false);
  const [adminName, setAdminName] = useState("");
  const [showLogin, setShowLogin] = useState(false);
  const [showPanel, setShowPanel] = useState(false);

  const { reviews, drivers, banned } = data;

  useEffect(()=>{
    const unsub = subscribeData(d => { setData(d); setLoading(false); });
    return unsub;
  },[]);

  useEffect(()=>{
    const onScroll = ()=>setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, {passive:true});
    return ()=>window.removeEventListener("scroll", onScroll);
  },[]);

  const storedName = typeof localStorage!=="undefined" ? (localStorage.getItem("rr_myname")||"") : "";
  const myBanKey = storedName.toLowerCase().replace(/\s+/g,"_");
  if(storedName && banned[myBanKey]) return <BannedScreen/>;

  function showToast(m, err=false) { setToast({m,err}); setTimeout(()=>setToast(null),3000); }

  async function handleReview({reviewer,driverName,driverNameNorm,driverCar,route,scores,comment,date,timestamp}) {
    const rKey = reviewer.toLowerCase().replace(/\s+/g,"_");
    if(banned[rKey]) { showToast("🚫 Вы заблокированы",true); return; }
    const dKey = driverNameNorm.replace(/\s+/g,"_");
    const existing = drivers[dKey];
    try {
      await fbAddReview(
        { driverId:dKey, reviewer, scores, comment, route, date, timestamp },
        dKey,
        { id:dKey, displayName:driverName, displayCar:driverCar }
      );
      if(typeof localStorage!=="undefined") localStorage.setItem("rr_myname", reviewer);
      setShowForm(false); setSelDriver(null);
      showToast(existing ? `🔥 Добавлено к профилю ${existing.displayName}!` : "✅ Отзыв опубликован!");
    } catch(e) { showToast("Ошибка: "+e.message, true); }
  }

  async function handleDelete(reviewId) {
    try {
      await fbDeleteReview(reviewId);
      showToast("🗑 Отзыв удалён");
    } catch(e) { showToast("Ошибка: "+e.message, true); }
  }

  async function handleBan(name) {
    if(name.toLowerCase() === storedName.toLowerCase()) {
      showToast("🛡 Нельзя забанить самого себя!", true); return;
    }
    if(name.toLowerCase() === adminName.toLowerCase() && adminName) {
      showToast("🛡 Нельзя забанить модератора!", true); return;
    }
    const key = name.toLowerCase().replace(/\s+/g,"_");
    try {
      await fbBanUser(name, key);
      for(const r of reviews) {
        if(r.reviewer?.toLowerCase()===name.toLowerCase()) await fbDeleteReview(r.id);
      }
      showToast(`🚫 ${name} заблокирован`,true);
    } catch(e) { showToast("Ошибка: "+e.message, true); }
  }

  async function handleUnban(name) {
    const key = name.toLowerCase().replace(/\s+/g,"_");
    try {
      await fbUnbanUser(key);
      showToast(`✅ ${name} разблокирован`);
    } catch(e) { showToast("Ошибка: "+e.message, true); }
  }

  if(loading) return (
    <div style={{minHeight:"100vh",background:"#030603",display:"flex",alignItems:"center",justifyContent:"center"}}>
      <div style={{color:"#39ff14",fontFamily:"monospace",fontSize:14,animation:"pulse 1.5s infinite"}}>Загрузка...</div>
    </div>
  );

  const sorted = Object.values(drivers).map(d=>{
    const dr = reviews.filter(r=>r.driverId===d.id);
    const stats = getStats(dr);
    return {...d, average:stats?calcAvg(stats):0, reviewCount:dr.length};
  }).sort((a,b)=>b.average-a.average);

  const sortedReviews = [...reviews].sort((a,b)=>(b.timestamp||0)-(a.timestamp||0));
  const globalAvg = reviews.length ? (reviews.reduce((s,r)=>s+calcAvg(r.scores),0)/reviews.length).toFixed(1) : "—";

  const MEDALS = ["🥇","🥈","🥉"];
  const TABS = [{id:"feed",l:"ЛЕНТА",i:"📡"},{id:"rating",l:"РЕЙТИНГ",i:"🏆"},{id:"drivers",l:"ВОДИТЕЛИ",i:"🚗"}];

  return (
    <div style={{minHeight:"100vh",background:"#030603",color:"#f0ffe0",fontFamily:"'Exo 2','Segoe UI',sans-serif",position:"relative",overflowX:"hidden"}}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Exo+2:wght@300;400;600;700;800;900&display=swap');
        *{box-sizing:border-box}
        ::selection{background:#39ff14;color:#020a02}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#39ff1430;border-radius:2px}
        @keyframes pulse{0%,100%{box-shadow:0 0 20px #39ff1420}50%{box-shadow:0 0 50px #39ff1460}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
        @keyframes tin{from{opacity:0;transform:translate(-50%,10px)}to{opacity:1;transform:translate(-50%,0)}}
        @keyframes scan{0%{transform:translateY(-100vh)}100%{transform:translateY(100vh)}}
        @keyframes glitch{0%,100%{text-shadow:2px 0 #ff2d78,-2px 0 #00f0ff}25%{text-shadow:-2px -1px #ff2d78,2px 1px #00f0ff}50%{text-shadow:1px 2px #ff2d78,-1px -2px #00f0ff}75%{text-shadow:-1px 1px #ff2d78,1px -1px #00f0ff}}
        @keyframes particle{0%{opacity:0;transform:translateY(0) scale(0)}20%{opacity:1}80%{opacity:0.5}100%{opacity:0;transform:translateY(-120px) scale(1.2)}}
        @keyframes slideIn{from{opacity:0;transform:translateX(-20px)}to{opacity:1;transform:translateX(0)}}
        @keyframes glow{0%,100%{filter:drop-shadow(0 0 8px #39ff1440)}50%{filter:drop-shadow(0 0 20px #39ff1480)}}
        @keyframes shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-2deg)}75%{transform:rotate(2deg)}}
      `}</style>

      {/* bg grid */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",backgroundImage:"linear-gradient(rgba(57,255,20,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(57,255,20,0.025) 1px,transparent 1px)",backgroundSize:"60px 60px"}}/>
      {/* scan */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        <div style={{position:"absolute",left:0,right:0,height:"1px",background:"linear-gradient(90deg,transparent,rgba(57,255,20,0.05),transparent)",animation:"scan 12s linear infinite"}}/>
      </div>
      {/* orbs */}
      <div style={{position:"fixed",top:"-20%",left:"-10%",width:600,height:600,borderRadius:"50%",background:"radial-gradient(circle,rgba(57,255,20,0.06) 0%,transparent 65%)",pointerEvents:"none",zIndex:0,transform:`translateY(${scrollY*0.1}px)`}}/>
      <div style={{position:"fixed",bottom:"-20%",right:"-10%",width:700,height:700,borderRadius:"50%",background:"radial-gradient(circle,rgba(57,255,20,0.04) 0%,transparent 65%)",pointerEvents:"none",zIndex:0,transform:`translateY(${-scrollY*0.05}px)`}}/>
      {/* floating particles */}
      <div style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none",overflow:"hidden"}}>
        {[...Array(12)].map((_,i)=>(
          <div key={i} style={{position:"absolute",left:`${8+i*8}%`,bottom:"-10px",width:i%3===0?3:2,height:i%3===0?3:2,borderRadius:"50%",background:"#39ff14",opacity:0.3,animation:`particle ${4+i*0.7}s ease-in-out ${i*0.5}s infinite`}}/>
        ))}
      </div>

      {/* ── HERO ── */}
      <div style={{position:"relative",zIndex:1,minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"80px 24px 60px",textAlign:"center"}}>
        <Reveal>
          <div style={{display:"inline-block",background:"rgba(57,255,20,0.08)",border:"1px solid rgba(57,255,20,0.2)",borderRadius:100,padding:"6px 18px",fontSize:11,fontFamily:"monospace",color:"#39ff14",letterSpacing:3,marginBottom:28,textTransform:"uppercase"}}>
            ● Онлайн · {reviews.length} поездок
          </div>
        </Reveal>

        <Reveal delay={0.1}>
          <h1 style={{fontSize:"clamp(60px,15vw,130px)",fontWeight:900,letterSpacing:"-5px",lineHeight:0.85,margin:"0 0 24px",color:"#f0ffe0",cursor:"default"}}
            onMouseEnter={e=>e.currentTarget.style.animation="glitch 0.3s ease-in-out"}
            onAnimationEnd={e=>e.currentTarget.style.animation=""}>
            RIDE<br/>
            <span style={{color:"#39ff14",textShadow:"0 0 60px #39ff1440, 0 0 120px #39ff1420",WebkitTextStroke:"1px #39ff14",animation:"glow 3s ease-in-out infinite"}}>RANK</span>
          </h1>
        </Reveal>

        <Reveal delay={0.2}>
          <p style={{fontSize:18,color:"#4a6040",maxWidth:500,lineHeight:1.6,marginBottom:48,fontWeight:300}}>
            Рейтинг водителей твоей компании.<br/>
            <span style={{color:"#39ff14",fontWeight:600}}>Честно. Анонимно. Беспощадно.</span>
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center"}}>
            <button onClick={()=>setShowForm(true)}
              onMouseEnter={e=>e.currentTarget.style.transform="scale(1.05)"} onMouseLeave={e=>e.currentTarget.style.transform=""}
              style={{padding:"18px 48px",background:"#39ff14",border:"none",borderRadius:100,color:"#020a02",fontSize:16,fontWeight:900,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",boxShadow:"0 0 40px #39ff1440",animation:"pulse 2.5s ease-in-out infinite",transition:"transform 0.2s"}}>
              + Добавить отзыв
            </button>
            {!isAdmin
              ? <button onClick={()=>setShowLogin(true)}
                  onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(255,45,120,0.5)";e.currentTarget.style.color="#ff2d78";}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(255,45,120,0.2)";e.currentTarget.style.color="#4a3030";}}
                  style={{padding:"18px 28px",background:"transparent",border:"1px solid rgba(255,45,120,0.2)",borderRadius:100,color:"#4a3030",fontSize:14,fontWeight:700,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",transition:"all 0.2s"}}>
                  ⚡ Модератор
                </button>
              : <button onClick={()=>setShowPanel(true)}
                  style={{padding:"18px 28px",background:"rgba(255,45,120,0.15)",border:"1px solid rgba(255,45,120,0.4)",borderRadius:100,color:"#ff2d78",fontSize:14,fontWeight:900,cursor:"pointer",letterSpacing:1,textTransform:"uppercase",animation:"pulse 2s infinite"}}>
                  ⚡ Панель модератора
                </button>
            }
          </div>
        </Reveal>

        {/* Stats */}
        {sorted.length>0 && (
          <Reveal delay={0.5} style={{width:"100%",maxWidth:600,marginTop:60}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12}}>
              {[{l:"Поездок",v:reviews.length},{l:"Ср. оценка",v:globalAvg},{l:"Водителей",v:sorted.length}].map((s,i)=>(
                <Reveal key={s.l} delay={0.08*i}>
                  <div onMouseEnter={e=>{e.currentTarget.style.background="rgba(57,255,20,0.08)";e.currentTarget.style.borderColor="rgba(57,255,20,0.3)";e.currentTarget.style.transform="translateY(-4px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.background="rgba(57,255,20,0.04)";e.currentTarget.style.borderColor="rgba(57,255,20,0.12)";e.currentTarget.style.transform="";}}
                    style={{background:"rgba(57,255,20,0.04)",border:"1px solid rgba(57,255,20,0.12)",borderRadius:20,padding:"24px",textAlign:"center",position:"relative",overflow:"hidden",transition:"all 0.25s",cursor:"default"}}>
                    <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,#39ff14,transparent)"}}/>
                    <div style={{fontSize:38,fontWeight:900,color:"#39ff14",textShadow:"0 0 20px #39ff1450",letterSpacing:-2}}>{s.v}</div>
                    <div style={{fontSize:11,color:"#4a6040",fontFamily:"monospace",marginTop:6,textTransform:"uppercase",letterSpacing:1}}>{s.l}</div>
                  </div>
                </Reveal>
              ))}
            </div>
          </Reveal>
        )}

        {/* scroll hint */}
        <div style={{position:"absolute",bottom:32,left:"50%",transform:"translateX(-50%)",display:"flex",flexDirection:"column",alignItems:"center",gap:8,opacity:scrollY>50?0:0.5,transition:"opacity 0.5s",animation:"float 2s ease-in-out infinite",cursor:"pointer"}}
          onClick={()=>window.scrollTo({top:window.innerHeight,behavior:"smooth"})}>
          <div style={{width:20,height:32,borderRadius:12,border:"1px solid #39ff14",position:"relative"}}>
            <div style={{width:3,height:8,borderRadius:2,background:"#39ff14",position:"absolute",top:6,left:"50%",marginLeft:-1.5,animation:"float 1.5s ease-in-out infinite"}}/>
          </div>
          <div style={{fontSize:9,fontFamily:"monospace",color:"#39ff14",letterSpacing:3,textTransform:"uppercase"}}>листай вниз</div>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{position:"relative",zIndex:1,maxWidth:720,margin:"0 auto",padding:"0 16px 120px"}}>

        {/* sticky tabs */}
        <div style={{position:"sticky",top:0,zIndex:50,paddingTop:14,paddingBottom:12,background:"linear-gradient(180deg,#030603 80%,transparent)"}}>
          <div style={{display:"flex",gap:4,background:"rgba(0,0,0,0.7)",padding:5,borderRadius:100,border:"1px solid rgba(57,255,20,0.1)",backdropFilter:"blur(20px)"}}>
            {TABS.map(t=>(
              <button key={t.id} onClick={()=>setTab(t.id)}
                style={{flex:1,padding:"11px 8px",background:tab===t.id?"#39ff14":"transparent",border:"none",borderRadius:100,color:tab===t.id?"#020a02":"#2a4020",fontSize:12,cursor:"pointer",fontFamily:"inherit",fontWeight:900,transition:"all 0.2s",letterSpacing:0.5,textTransform:"uppercase"}}>
                {t.i} {t.l}
              </button>
            ))}
          </div>
        </div>

        {/* ── FEED ── */}
        {tab==="feed" && (
          <div>
            {reviews.length===0
              ? <Reveal><div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:64,marginBottom:20,animation:"float 3s ease-in-out infinite"}}>🚗</div><div style={{fontSize:14,color:"#2a4020",fontFamily:"monospace",lineHeight:2,textTransform:"uppercase",letterSpacing:1}}>Пока пусто<br/>Добавь первый отзыв</div></div></Reveal>
              : sortedReviews.slice(0,25).map((r,i)=>{
                  const d = drivers[r.driverId]; if(!d) return null;
                  const avg = calcAvg(r.scores); const t = getTitle(avg);
                  return (
                    <Reveal key={r.id} delay={Math.min(i*0.05,0.35)}>
                      <div onClick={()=>setSelDriver(d)}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor="rgba(57,255,20,0.3)";e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.background="rgba(57,255,20,0.06)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor="rgba(57,255,20,0.08)";e.currentTarget.style.transform="";e.currentTarget.style.background="rgba(57,255,20,0.02)";}}
                        style={{background:"rgba(57,255,20,0.02)",border:"1px solid rgba(57,255,20,0.08)",borderRadius:18,padding:"16px 18px",cursor:"pointer",transition:"all 0.22s",marginBottom:10,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${t.color}60,transparent)`}}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:9}}>
                          <div>
                            <div style={{fontSize:15,fontWeight:800,color:"#f0ffe0"}}>{d.displayName} <span style={{color:"#2a4020",fontWeight:400,fontSize:12}}>· {d.displayCar}</span></div>
                            <div style={{fontSize:11,color:"#2a4020",fontFamily:"monospace",marginTop:2}}>от {r.reviewer}{r.route?` · ${r.route}`:""} · {r.date}</div>
                          </div>
                          <div style={{display:"flex",alignItems:"center",gap:8}}>
                            {isAdmin && <button onClick={e=>{e.stopPropagation();handleDelete(r.id);}} style={{padding:"3px 10px",background:"rgba(255,45,120,0.1)",border:"1px solid rgba(255,45,120,0.3)",borderRadius:8,color:"#ff2d78",fontSize:11,cursor:"pointer"}}>🗑</button>}
                            <div style={{fontSize:24,fontWeight:900,color:t.color,textShadow:`0 0 15px ${t.color}50`,letterSpacing:-1}}>{avg.toFixed(1)}</div>
                          </div>
                        </div>
                        <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                          {CRITERIA.map(c=>(
                            <div key={c.key} style={{background:"rgba(57,255,20,0.05)",borderRadius:8,padding:"3px 8px",fontSize:11,fontFamily:"monospace",color:r.scores[c.key]>=4?"#39ff14":r.scores[c.key]<=2?"#ff2d78":"#4a6040",border:"1px solid rgba(57,255,20,0.08)"}}>
                              {c.icon} {r.scores[c.key]}
                            </div>
                          ))}
                        </div>
                        {r.comment && <div style={{fontSize:12,color:"#4a6040",fontStyle:"italic",borderLeft:"2px solid #39ff1440",paddingLeft:10,marginTop:9}}>"{r.comment}"</div>}
                      </div>
                    </Reveal>
                  );
                })
            }
          </div>
        )}

        {/* ── RATING ── */}
        {tab==="rating" && (
          <div>
            {sorted.length===0
              ? <Reveal><div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:64,marginBottom:20,animation:"float 3s ease-in-out infinite"}}>🏆</div><div style={{fontSize:14,color:"#2a4020",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,lineHeight:2}}>Рейтинг пока пуст<br/>Будь первым</div></div></Reveal>
              : <>
                  {/* TOP-1 hero card */}
                  <Reveal>
                    <div style={{marginBottom:28}}>
                      <div style={{fontSize:10,color:"#39ff14",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:3,marginBottom:12,animation:"glow 2s ease-in-out infinite"}}>● Лидер рейтинга</div>
                      <div onClick={()=>setSelDriver(sorted[0])}
                        onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-4px)";e.currentTarget.style.boxShadow="0 20px 60px #39ff1420";}}
                        onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.boxShadow="0 0 40px #39ff1415";}}
                        style={{background:"rgba(57,255,20,0.06)",border:"1px solid rgba(57,255,20,0.25)",borderRadius:24,padding:"28px 24px",cursor:"pointer",transition:"all 0.25s",position:"relative",overflow:"hidden",boxShadow:"0 0 40px #39ff1415"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,#39ff14,transparent)"}}/>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                          <div>
                            <div style={{fontSize:11,color:"#39ff14",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:2,marginBottom:8}}>🥇 Место #1</div>
                            <div style={{fontSize:28,fontWeight:900,color:"#f0ffe0",letterSpacing:-1}}>{sorted[0].displayName}</div>
                            <div style={{fontSize:13,color:"#4a6040",marginTop:4}}>{sorted[0].displayCar}</div>
                            <div style={{fontSize:12,color:getTitle(sorted[0].average).color,marginTop:6,fontFamily:"monospace"}}>{getTitle(sorted[0].average).label}</div>
                          </div>
                          <div style={{textAlign:"right"}}>
                            <div style={{fontSize:56,fontWeight:900,color:"#39ff14",textShadow:"0 0 30px #39ff1450",letterSpacing:-3}}>{sorted[0].average.toFixed(1)}</div>
                            <div style={{fontSize:11,color:"#2a4020",fontFamily:"monospace"}}>{sorted[0].reviewCount} отзывов</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </Reveal>

                  <div style={{fontSize:10,color:"#2a4020",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:3,marginBottom:12}}>Все водители</div>
                  {sorted.map((d,i)=>{
                    const t = getTitle(d.average);
                    const achs = getAchs(getStats(reviews.filter(r=>r.driverId===d.id)));
                    return (
                      <Reveal key={d.id} delay={i*0.07}>
                        <div onClick={()=>setSelDriver(d)}
                          onMouseEnter={e=>{e.currentTarget.style.background="rgba(57,255,20,0.07)";e.currentTarget.style.transform="translateX(6px)";e.currentTarget.style.borderColor="rgba(57,255,20,0.3)";}}
                          onMouseLeave={e=>{e.currentTarget.style.background="rgba(57,255,20,0.03)";e.currentTarget.style.transform="";e.currentTarget.style.borderColor="rgba(57,255,20,0.1)";}}
                          style={{display:"flex",alignItems:"center",gap:16,background:"rgba(57,255,20,0.03)",border:"1px solid rgba(57,255,20,0.1)",borderRadius:16,padding:"16px 20px",cursor:"pointer",transition:"all 0.25s",marginBottom:9,position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",left:0,top:0,bottom:0,width:2,background:i===0?"linear-gradient(180deg,transparent,#39ff14,transparent)":"transparent"}}/>
                          <div style={{fontSize:i<3?24:14,minWidth:32,textAlign:"center",fontFamily:"monospace",color:"#39ff14",fontWeight:900}}>{i<3?MEDALS[i]:`#${i+1}`}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:16,fontWeight:800,color:"#f0ffe0",letterSpacing:-0.3}}>{d.displayName}</div>
                            <div style={{display:"flex",gap:8,marginTop:4,alignItems:"center",flexWrap:"wrap"}}>
                              <span style={{fontSize:10,color:"#4a6040",fontFamily:"monospace"}}>{d.displayCar}</span>
                              <span style={{fontSize:11,color:t.color,fontFamily:"monospace"}}>{t.label}</span>
                              <span style={{fontSize:10,color:"#2a4020",fontFamily:"monospace"}}>{d.reviewCount} отз.</span>
                              {achs.slice(0,3).map(a=><span key={a.id} style={{fontSize:13}}>{a.icon}</span>)}
                            </div>
                          </div>
                          <div style={{fontSize:28,fontWeight:900,color:"#39ff14",letterSpacing:-1,textShadow:"0 0 15px #39ff1460"}}>{d.average.toFixed(1)}</div>
                        </div>
                      </Reveal>
                    );
                  })}
                </>
            }
          </div>
        )}

        {/* ── DRIVERS ── */}
        {tab==="drivers" && (
          <div>
            {sorted.length===0
              ? <Reveal><div style={{textAlign:"center",padding:"80px 20px"}}><div style={{fontSize:64,marginBottom:20,animation:"float 3s ease-in-out infinite"}}>🚗</div><div style={{fontSize:14,color:"#2a4020",fontFamily:"monospace",textTransform:"uppercase",letterSpacing:1,lineHeight:2}}>Водителей пока нет<br/>Добавь первого</div></div></Reveal>
              : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                  {sorted.map((d,i)=>{
                    const dr = reviews.filter(r=>r.driverId===d.id);
                    const stats = getStats(dr); const t = getTitle(d.average); const achs = getAchs(stats);
                    return (
                      <Reveal key={d.id} delay={i*0.07}>
                        <div onClick={()=>setSelDriver(d)}
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-5px)";e.currentTarget.style.borderColor="rgba(57,255,20,0.4)";e.currentTarget.style.boxShadow="0 20px 40px rgba(57,255,20,0.08)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.style.borderColor="rgba(57,255,20,0.1)";e.currentTarget.style.boxShadow="";}}
                          style={{background:"rgba(57,255,20,0.03)",border:"1px solid rgba(57,255,20,0.1)",borderRadius:20,padding:"22px",cursor:"pointer",transition:"all 0.25s",position:"relative",overflow:"hidden"}}>
                          <div style={{position:"absolute",top:0,left:0,right:0,height:1,background:`linear-gradient(90deg,transparent,${t.color}60,transparent)`}}/>
                          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                            <div>
                              <div style={{fontSize:19,fontWeight:800,color:"#f0ffe0",letterSpacing:-0.5}}>{d.displayName}</div>
                              <div style={{fontSize:11,color:"#2a4020",marginTop:3,fontFamily:"monospace"}}>{d.displayCar} · {dr.length} отз.</div>
                            </div>
                            <div style={{textAlign:"right"}}>
                              <div style={{fontSize:30,fontWeight:900,color:"#39ff14",letterSpacing:-1,textShadow:"0 0 20px #39ff1440"}}>{d.average.toFixed(1)}</div>
                              <div style={{fontSize:10,color:t.color,fontFamily:"monospace",marginTop:2}}>{t.label}</div>
                            </div>
                          </div>
                          {achs.length>0 && (
                            <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                              {achs.slice(0,4).map(a=><span key={a.id} title={a.title} style={{fontSize:18,background:"rgba(57,255,20,0.06)",borderRadius:8,padding:"3px 7px",border:"1px solid rgba(57,255,20,0.1)"}}>{a.icon}</span>)}
                              {achs.length>4 && <span style={{fontSize:11,color:"#2a4020",padding:"5px 7px",fontFamily:"monospace"}}>+{achs.length-4}</span>}
                            </div>
                          )}
                        </div>
                      </Reveal>
                    );
                  })}
                </div>
            }
          </div>
        )}
      </div>

      {/* FAB */}
      <div style={{position:"fixed",bottom:28,right:24,zIndex:100,display:"flex",flexDirection:"column",alignItems:"flex-end",gap:8}}>
        <button onClick={()=>{setPrefill(null);setShowForm(true);}}
          onMouseEnter={e=>{e.currentTarget.style.transform="scale(1.1) rotate(90deg)";e.currentTarget.parentElement.querySelector('.fab-hint').style.opacity="1";}}
          onMouseLeave={e=>{e.currentTarget.style.transform="";e.currentTarget.parentElement.querySelector('.fab-hint').style.opacity="0";}}
          style={{background:"#39ff14",border:"none",borderRadius:20,width:60,height:60,fontSize:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",color:"#020a02",fontWeight:900,transition:"all 0.3s cubic-bezier(0.34,1.56,0.64,1)",animation:"pulse 2s ease-in-out infinite",boxShadow:"0 4px 20px #39ff1450"}}>
          +
        </button>
        <div className="fab-hint" style={{opacity:0,transition:"opacity 0.2s",background:"rgba(0,0,0,0.85)",border:"1px solid rgba(57,255,20,0.3)",borderRadius:10,padding:"6px 12px",fontSize:11,fontFamily:"monospace",color:"#39ff14",whiteSpace:"nowrap",pointerEvents:"none"}}>
          Добавить отзыв
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:100,left:"50%",transform:"translateX(-50%)",zIndex:400,background:toast.err?"#ff2d78":"#39ff14",borderRadius:14,padding:"12px 20px",color:toast.err?"white":"#020a02",fontFamily:"monospace",fontSize:12,fontWeight:700,whiteSpace:"nowrap",animation:"tin 0.3s ease",boxShadow:`0 0 30px ${toast.err?"#ff2d7860":"#39ff1460"}`}}>
          {toast.m}
        </div>
      )}

      {/* Modals */}
      {selDriver && (
        <DriverModal driver={selDriver} reviews={reviews.filter(r=>r.driverId===selDriver.id)} isAdmin={isAdmin}
          onClose={()=>setSelDriver(null)} onDeleteReview={handleDelete}
          onReview={()=>{setPrefill(selDriver);setSelDriver(null);setShowForm(true);}}/>
      )}
      {showForm && <ReviewForm prefill={prefill} allDrivers={Object.values(drivers)} onSubmit={handleReview} onClose={()=>setShowForm(false)}/>}
      {showLogin && <AdminLogin onSuccess={(name)=>{setIsAdmin(true);setAdminName(name||storedName);setShowLogin(false);showToast("⚡ Добро пожаловать, модератор!");}} onClose={()=>setShowLogin(false)}/>}
      {showPanel && isAdmin && <AdminPanel reviews={reviews} drivers={drivers} banned={banned} currentUser={storedName} adminName={adminName} onDelete={handleDelete} onBan={handleBan} onUnban={handleUnban} onClose={()=>setShowPanel(false)}/>}
    </div>
  );
}
