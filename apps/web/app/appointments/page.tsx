"use client";
import { useEffect, useMemo, useState } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";
type Patient = { id: string; mrn: string; firstName: string; lastName: string };
type Doctor = { id: string; user?: { email?: string }; department: { id: string; name: string; code: string } };
type Appointment = { id: string; scheduledAt: string; status: string; patient: Patient; doctor: Doctor; department: { id: string; name: string; code: string } };

export default function AppointmentsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patientId, setPatientId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [doctorId, setDoctorId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [status, setStatus] = useState("SCHEDULED");
  const [search, setSearch] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const departments = useMemo(() => Array.from(new Map(doctors.map(d => [d.department.id, d.department])).values()), [doctors]);
  const filteredDoctors = useMemo(() => doctors.filter(d => !departmentId || d.department.id === departmentId), [doctors, departmentId]);
  const filteredPatients = useMemo(() => patients.filter(p => `${p.mrn} ${p.firstName} ${p.lastName}`.toLowerCase().includes(search.toLowerCase())).slice(0, 100), [patients, search]);

  async function load() {
    try {
      const [p, d, a] = await Promise.all([fetch(`${API}/api/v1/patients`), fetch(`${API}/api/v1/doctors`), fetch(`${API}/api/v1/appointments`)]);
      if (p.ok) setPatients((await p.json()).data || []);
      if (d.ok) setDoctors((await d.json()).data || []);
      if (a.ok) setAppointments((await a.json()).data || []);
    } catch { setNotice("Hospital API unavailable"); }
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!doctorId || !filteredDoctors.some(d => d.id === doctorId)) setDoctorId(""); }, [departmentId, filteredDoctors, doctorId]);

  async function createAppointment() {
    if (!patientId || !departmentId || !doctorId || !scheduledAt) return setNotice("Patient, department, doctor and time are required");
    setBusy(true);
    try {
      const r = await fetch(`${API}/api/v1/appointments`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId, departmentId, doctorId, scheduledAt: new Date(scheduledAt).toISOString() }) });
      const x = await r.json();
      if (!r.ok) throw new Error(x.error || "Could not create appointment");
      setNotice("Appointment scheduled successfully"); setPatientId(""); setDoctorId(""); setScheduledAt(""); await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Could not create appointment"); }
    finally { setBusy(false); }
  }

  async function updateStatus(id: string, next: string) {
    try {
      const r = await fetch(`${API}/api/v1/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: next }) });
      if (!r.ok) throw new Error((await r.json()).error || "Update failed");
      await load();
    } catch (e) { setNotice(e instanceof Error ? e.message : "Update failed"); }
  }

  return <main className="page">
    <header><div><a href="/">← Command Center</a><small>HOSPITAL OPERATIONS</small><h1>Appointments & Queue</h1><p>Schedule patients, prevent doctor conflicts and manage today's flow.</p></div><button onClick={load}>↻ Refresh</button></header>
    {notice && <div className="notice">{notice}<button onClick={() => setNotice("")}>×</button></div>}
    <section className="grid">
      <section className="card"><h2>Schedule appointment</h2><p>Create a new consultation slot.</p>
        <label>Patient<select value={patientId} onChange={e => setPatientId(e.target.value)}><option value="">Select patient</option>{filteredPatients.map(p => <option key={p.id} value={p.id}>{p.mrn} · {p.firstName} {p.lastName}</option>)}</select></label>
        <input placeholder="Search patients" value={search} onChange={e => setSearch(e.target.value)} />
        <label>Department<select value={departmentId} onChange={e => setDepartmentId(e.target.value)}><option value="">Select department</option>{departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
        <label>Doctor<select value={doctorId} onChange={e => setDoctorId(e.target.value)}><option value="">Select doctor</option>{filteredDoctors.map(d => <option key={d.id} value={d.id}>{d.user?.email || d.id} · {d.department.name}</option>)}</select></label>
        <label>Date & time<input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} /></label>
        <button className="primary" disabled={busy} onClick={createAppointment}>{busy ? "Scheduling…" : "+ Schedule appointment"}</button>
      </section>
      <section className="card"><div className="title"><div><h2>Appointment board</h2><p>Latest scheduled visits and queue states.</p></div><b>{appointments.length}</b></div>
        <div className="list">{appointments.map(a => <article key={a.id}><div><strong>{a.patient.firstName} {a.patient.lastName}</strong><span>{a.patient.mrn} · {a.department.name}</span><small>{new Date(a.scheduledAt).toLocaleString()} · {a.doctor.user?.email || "Doctor"}</small></div><div className="actions"><em>{a.status.replaceAll("_", " ")}</em>{a.status === "SCHEDULED" && <button onClick={() => updateStatus(a.id, "CHECKED_IN")}>Check in</button>}{a.status === "CHECKED_IN" && <button onClick={() => updateStatus(a.id, "IN_CONSULTATION")}>Start</button>}{a.status === "IN_CONSULTATION" && <button onClick={() => updateStatus(a.id, "COMPLETED")}>Complete</button>}{["SCHEDULED","CHECKED_IN"].includes(a.status) && <button className="cancel" onClick={() => updateStatus(a.id, "CANCELLED")}>Cancel</button>}</div></article>)}{!appointments.length && <div className="empty">No appointments yet.</div>}</div>
      </section>
    </section>
    <footer>SpecialCare Hospital OS · Scheduling is backed by the hospital database.</footer>
    <style jsx global>{`*{box-sizing:border-box}body{margin:0;background:#f4f7fb;color:#172033;font-family:Inter,system-ui,sans-serif}.page{max-width:1500px;margin:auto;padding:30px}.page header{display:flex;justify-content:space-between;align-items:flex-start}.page a{color:#168a67;text-decoration:none;font-size:11px}.page header small{display:block;margin-top:18px;color:#8491a5;letter-spacing:1px;font-size:9px;font-weight:800}.page h1{font-size:26px;margin:5px 0}.page p{color:#8995a7;font-size:11px}.page header>button,.card button{border:1px solid #dfe5ec;background:#fff;border-radius:8px;padding:10px 14px;font-weight:700;cursor:pointer}.notice{margin:18px 0;background:#eaf7f2;border:1px solid #cfe9df;color:#176f55;border-radius:9px;padding:10px;font-size:11px}.notice button{float:right;border:0;background:none}.grid{display:grid;grid-template-columns:360px 1fr;gap:16px;margin-top:20px}.card{background:#fff;border:1px solid #e4e9f0;border-radius:13px;padding:20px;box-shadow:0 2px 7px #12233a08}.card h2{margin:0;font-size:16px}.card label{display:block;margin-top:13px;font-size:10px;font-weight:800;color:#647188}.card input,.card select{display:block;width:100%;margin-top:6px;padding:10px;border:1px solid #dfe5ec;border-radius:8px;background:#fff;font-size:11px}.card>.primary{margin-top:15px;width:100%;background:#168a67;color:#fff;border:0}.title{display:flex;justify-content:space-between;align-items:flex-start}.title>b{background:#eaf7f2;color:#168a67;border-radius:20px;padding:7px 10px}.list{margin-top:15px}.list article{display:flex;justify-content:space-between;gap:15px;padding:14px 0;border-top:1px solid #edf0f4}.list strong,.list span,.list small{display:block}.list strong{font-size:12px}.list span,.list small{font-size:10px;color:#7d899b;margin-top:4px}.actions{text-align:right;min-width:130px}.actions em{display:block;font-style:normal;font-size:9px;font-weight:800;margin-bottom:6px;color:#168a67}.actions button{font-size:9px;padding:6px 8px;margin-left:4px}.actions .cancel{color:#a84b4b}.empty{padding:35px;text-align:center;color:#8995a7;font-size:11px}footer{margin-top:18px;color:#8995a7;font-size:10px}@media(max-width:850px){.page{padding:18px}.grid{grid-template-columns:1fr}.list article{display:block}.actions{text-align:left;margin-top:8px}}`}</style>
  </main>;
}
