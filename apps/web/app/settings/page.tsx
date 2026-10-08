"use client";
import {useEffect,useState} from "react";
export default function Settings(){
 const [hospital,setHospital]=useState("SpecialCare Medical Center"),[auto,setAuto]=useState(true),[interval,setIntervalMs]=useState(30),[saved,setSaved]=useState(false);
 useEffect(()=>{try{const s=JSON.parse(localStorage.getItem("specialcare.settings")||"{}");if(s.hospital)setHospital(s.hospital);if(typeof s.auto==="boolean")setAuto(s.auto);if(s.interval)setIntervalMs(s.interval)}catch{}},[]);
 function save(){localStorage.setItem("specialcare.settings",JSON.stringify({hospital,auto,interval}));setSaved(true);setTimeout(()=>setSaved(false),2500)}
 return <main style={{minHeight:"100vh",padding:40,fontFamily:"Inter,system-ui",background:"#f4f7fb",color:"#172033"}}><a href="/">← Command Center</a><h1>Hospital Settings</h1><p>Real-time operational settings for this browser workspace.</p><section style={{background:"#fff",padding:24,borderRadius:14,maxWidth:760,display:"grid",gap:18}}>
 <label>Hospital name<input value={hospital} onChange={e=>setHospital(e.target.value)} style={{display:"block",width:"100%",padding:12,marginTop:8}}/></label>
 <label><input type="checkbox" checked={auto} onChange={e=>setAuto(e.target.checked)}/> Enable live operational refresh</label>
 <label>Refresh interval<select value={interval} onChange={e=>setIntervalMs(Number(e.target.value))} style={{display:"block",padding:10,marginTop:8}}><option value={10}>10 seconds</option><option value={30}>30 seconds</option><option value={60}>60 seconds</option></select></label>
 <button onClick={save} style={{padding:"11px 16px",background:"#168a67",color:"#fff",border:0,borderRadius:8}}>Save Settings</button>{saved&&<strong>Settings saved successfully.</strong>}
 </section></main>
}