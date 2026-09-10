const modules = ["Patients","Appointments","Admissions","Beds","Nursing","Laboratory","Radiology","Pharmacy","Billing","Emergency","Inventory","Reports"];

export default function Home() {
  const cards = [["Beds","1,284"],["Occupied","1,067"],["ICU","83 / 86"],["Emergency","27"]];
  return <main style={{fontFamily:"system-ui",padding:40,maxWidth:1250,margin:"auto"}}>
    <h1>SpecialCare Enterprise Hospital OS</h1>
    <p>Hospital command center for 1,000+ bed operations.</p>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginTop:28}}>{cards.map(([label,value])=><section key={label} style={{border:"1px solid #ddd",borderRadius:16,padding:20}}><small>{label}</small><h2>{value}</h2></section>)}</div>
    <h2 style={{marginTop:40}}>Hospital modules</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12}}>{modules.map(m=><div key={m} style={{border:"1px solid #eee",padding:16,borderRadius:12}}>{m}</div>)}</div>
  </main>;
}
