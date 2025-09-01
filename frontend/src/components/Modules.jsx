import React, { useState } from 'react'

const MODULES = [
  { id:'acute-abdomen', title:'Acute abdomen pathway criteria quiz', questions: 10, duration:'~5 min' },
  { id:'ct-head-ooH', title:'OOH CT Head indications (iRefer)', questions: 10, duration:'~5 min' },
]

export default function Modules({ visible }){
  const [msg, setMsg] = useState('')
  if (!visible) return null
  return (
    <section className="card">
      <h3>eLearning modules</h3>
      <p className="muted">Short MCQs aligned with iRefer to reinforce appropriate OOH CT requesting. Completing a module awards +50 points.</p>
      <div className="kpis">
        {MODULES.map(m=>(
          <div className="kpi" key={m.id}>
            <div>{m.duration}</div>
            <strong>{m.title}</strong>
            <div style={{ marginTop:8 }}>
              <button className="chip" onClick={()=>setMsg('Module launcher placeholder')}>Start ({m.questions} Qs)</button>
            </div>
          </div>
        ))}
      </div>
      {msg && <p className="muted" style={{ marginTop:8 }}>{msg}</p>}
    </section>
  )
}
