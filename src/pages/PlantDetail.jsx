import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP, plantDesc, LOG_ACTIVITIES } from '../lib/plantData'

const TABS = ['Info','Logg','Bilder','Skadedyr','Høst','ID']

export default function PlantDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plantRecord, setPlantRecord] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Info')
  const [showForm, setShowForm] = useState(null) // activity type being logged
  const [comment, setComment] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: p } = await supabase.from('garden_plants').select('*').eq('id', id).single()
    setPlantRecord(p)
    const { data: l } = await supabase.from('plant_logs').select('*').eq('garden_plant_id', id).order('logged_at', { ascending: false })
    setLogs(l || [])
    setLoading(false)
  }

  async function logActivity(actType) {
    const act = LOG_ACTIVITIES.find(a => a.type === actType)
    if (!act) return
    const { data } = await supabase.from('plant_logs').insert({
      garden_plant_id: id,
      user_id: user.id,
      activity_type: actType,
      label: act.label,
      emoji: act.emoji,
      comment: comment.trim() || null,
      logged_at: new Date().toISOString(),
    }).select().single()
    if (data) setLogs(prev => [data, ...prev])
    setShowForm(null)
    setComment('')
  }

  async function deleteLog(logId) {
    await supabase.from('plant_logs').delete().eq('id', logId)
    setLogs(prev => prev.filter(l => l.id !== logId))
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{width:24,height:24,border:'2px solid #cddccd',borderTopColor:'#446444',borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
  if (!plantRecord) return <div style={{padding:32,color:'#a8a29e'}}>Plante ikke funnet.</div>

  const info = PLANT_MAP[plantRecord.plant_key]
  const desc = plantDesc(plantRecord.plant_key)

  // last done per activity type
  const lastDone = {}
  logs.forEach(l => {
    if (!lastDone[l.activity_type]) lastDone[l.activity_type] = l
  })

  const s = {
    card: { background:'white', borderRadius:16, border:'1px solid #f5f5f4', boxShadow:'0 1px 3px rgba(0,0,0,.04)', fontFamily:"'Inter',system-ui,sans-serif" },
    tab: (active) => ({ flex:1, padding:8, borderRadius:9, fontSize:13, fontWeight:500, border:'none', cursor:'pointer', background: active?'white':'none', color: active?'#292524':'#78716c', fontFamily:'inherit', boxShadow: active?'0 1px 3px rgba(0,0,0,.08)':'' }),
  }

  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <button onClick={()=>navigate('/dashboard')} style={{border:'none',background:'none',color:'#a8a29e',fontSize:13,cursor:'pointer',padding:'6px 0',marginBottom:14,fontFamily:'inherit'}}>← Tilbake</button>

      {/* Header */}
      <div style={{...s.card, padding:24, marginBottom:18}}>
        <div style={{display:'flex',alignItems:'flex-start',gap:16}}>
          <div style={{width:64,height:64,borderRadius:16,background:'#f4f7f4',display:'flex',alignItems:'center',justifyContent:'center',fontSize:32,flexShrink:0}}>
            {info?.emoji || '🌱'}
          </div>
          <div style={{flex:1}}>
            <div style={{fontSize:20,fontWeight:500,color:'#292524'}}>{info?.name || plantRecord.plant_key}</div>
            <div style={{fontSize:13,color:'#a8a29e',marginTop:2}}>{info?.cat}</div>
            <div style={{fontSize:12,color:'#a8a29e',marginTop:4}}>
              Lagt til {plantRecord.planted_date ? new Date(plantRecord.planted_date).toLocaleDateString('no-NO',{day:'numeric',month:'short',year:'numeric'}) : '—'}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:'flex',gap:4,background:'#f5f5f4',padding:4,borderRadius:12,marginBottom:20}}>
        {TABS.map(t => (
          <button key={t} onClick={()=>setActiveTab(t)} style={s.tab(activeTab===t)}>{t}</button>
        ))}
      </div>

      {/* ── INFO ── */}
      {activeTab === 'Info' && (
        <div style={s.card}>
          <div style={{padding:22}}>
            <div style={{fontSize:13,color:'#57534e',lineHeight:1.7,marginBottom:18}}>{desc}</div>
            {info?.seasonal && (
              <div style={{marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',marginBottom:12}}>Sesongoppgaver</div>
                {Object.entries(info.seasonal).sort((a,b)=>+a[0]-+b[0]).map(([month, tasks]) => (
                  <div key={month} style={{display:'flex',gap:12,padding:'8px 0',borderBottom:'1px solid #f5f5f4'}}>
                    <div style={{width:60,flexShrink:0,fontSize:12,fontWeight:500,color:'#78716c'}}>
                      {['Jan','Feb','Mar','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Des'][+month-1]}
                    </div>
                    <div>{tasks.map((t,i) => <div key={i} style={{fontSize:12,color:'#57534e',marginBottom:2}}>• {t}</div>)}</div>
                  </div>
                ))}
              </div>
            )}
            <div style={{borderTop:'1px solid #f5f5f4',paddingTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>
              <a href={`https://www.plantasjen.no/search?q=${encodeURIComponent(info?.name||plantRecord.plant_key)}`}
                target="_blank" rel="noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1px solid #e7e5e4',fontSize:12,fontWeight:500,color:'#57534e',textDecoration:'none',background:'white',transition:'border-color .12s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#7a9f7a'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e7e5e4'}>
                🌿 Plantasjen
              </a>
              <a href={`https://www.google.com/search?q=${encodeURIComponent((info?.name||plantRecord.plant_key)+' dyrking Norge')}`}
                target="_blank" rel="noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1px solid #e7e5e4',fontSize:12,fontWeight:500,color:'#57534e',textDecoration:'none',background:'white',transition:'border-color .12s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#7a9f7a'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e7e5e4'}>
                🔍 Dyrketips
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── LOGG ── */}
      {activeTab === 'Logg' && (
        <>
          {/* Activity grid */}
          <div style={{...s.card, padding:18, marginBottom:14}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',marginBottom:12}}>Logg aktivitet</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom: showForm ? 12 : 0}}>
              {LOG_ACTIVITIES.map(a => {
                const last = lastDone[a.type]
                const isOpen = showForm === a.type
                return (
                  <button key={a.type}
                    onClick={()=>{ setShowForm(isOpen ? null : a.type); setComment('') }}
                    style={{border:`1px solid ${isOpen?'#7a9f7a':'#e7e5e4'}`,borderRadius:12,padding:'10px 6px',background:isOpen?'#f4f7f4':'white',cursor:'pointer',fontFamily:'inherit',textAlign:'center',transition:'all .12s'}}>
                    <div style={{fontSize:20,marginBottom:4}}>{a.emoji}</div>
                    <div style={{fontSize:12,fontWeight:500,color:'#44403c'}}>{a.label}</div>
                    {last
                      ? <div style={{fontSize:10,color:'#587f58',marginTop:3}}>{new Date(last.logged_at).toLocaleDateString('no-NO',{day:'numeric',month:'short'})}</div>
                      : <div style={{fontSize:10,color:'#d6d3d1',marginTop:3}}>Ikke logget</div>}
                  </button>
                )
              })}
            </div>
            {showForm && (
              <div style={{background:'#f4f7f4',borderRadius:10,padding:12}}>
                <div style={{fontSize:12,color:'#57534e',marginBottom:6}}>Kommentar (valgfritt)</div>
                <textarea value={comment} onChange={e=>setComment(e.target.value)}
                  placeholder="F.eks. mengde, produkt, observasjoner…"
                  rows={2}
                  style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',resize:'vertical',outline:'none',marginBottom:8}}/>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={()=>logActivity(showForm)}
                    style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#375037',color:'white',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                    Logg
                  </button>
                  <button onClick={()=>{setShowForm(null);setComment('')}}
                    style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e7e5e4',background:'white',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                    Avbryt
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Log history */}
          {logs.length === 0 ? (
            <div style={{...s.card, padding:32, textAlign:'center'}}>
              <div style={{fontSize:28,marginBottom:8}}>📋</div>
              <div style={{fontSize:13,color:'#a8a29e'}}>Ingen aktiviteter logget ennå.</div>
            </div>
          ) : (
            <div style={{...s.card, padding:18}}>
              <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',marginBottom:14}}>Historikk</div>
              {logs.map((l, i) => (
                <div key={l.id} style={{display:'flex',alignItems:'flex-start',gap:12,padding:'10px 0',borderBottom: i<logs.length-1?'1px solid #f5f5f4':''}}>
                  <span style={{fontSize:20,flexShrink:0,marginTop:1}}>{l.emoji}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:13,fontWeight:500,color:'#44403c'}}>{l.label}</div>
                    <div style={{fontSize:11,color:'#a8a29e',marginTop:2}}>
                      {new Date(l.logged_at).toLocaleDateString('no-NO',{day:'numeric',month:'short',year:'numeric'})} kl. {new Date(l.logged_at).toLocaleTimeString('no-NO',{hour:'2-digit',minute:'2-digit'})}
                    </div>
                    {l.comment && (
                      <div style={{fontSize:12,color:'#57534e',marginTop:5,background:'#f5f5f4',borderRadius:8,padding:'6px 10px',lineHeight:1.5}}>{l.comment}</div>
                    )}
                  </div>
                  <button onClick={()=>deleteLog(l.id)}
                    style={{border:'none',background:'none',color:'#d6d3d1',cursor:'pointer',fontSize:16,padding:0,flexShrink:0,marginTop:1}}
                    onMouseOver={e=>e.currentTarget.style.color='#78716c'}
                    onMouseOut={e=>e.currentTarget.style.color='#d6d3d1'}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── BILDER ── */}
      {activeTab === 'Bilder' && (
        <div style={{...s.card, padding:24, textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>📸</div>
          <div style={{fontSize:14,fontWeight:500,color:'#44403c',marginBottom:8}}>Bildelogg</div>
          <div style={{background:'#f4f7f4',border:'1px solid #cddccd',borderRadius:12,padding:'14px 18px',fontSize:13,color:'#587f58',textAlign:'left'}}>
            Bildeopplasting aktiveres når appen er publisert på server. Bildene lagres da i Supabase Storage knyttet til din konto.
          </div>
          <button disabled style={{marginTop:16,padding:'10px 20px',borderRadius:10,border:'none',background:'#cddccd',color:'white',fontSize:13,fontWeight:500,cursor:'not-allowed'}}>
            + Last opp bilde
          </button>
        </div>
      )}

      {/* ── SKADEDYR ── */}
      {activeTab === 'Skadedyr' && (
        <div style={s.card}>
          <div style={{padding:22}}>
            <div style={{fontSize:14,fontWeight:500,color:'#292524',marginBottom:16}}>Vanlige skadedyr og sykdommer</div>
            {info?.pests && info.pests.length > 0 ? info.pests.map((p, i) => (
              <div key={i} style={{border:'1px solid #f5f5f4',borderRadius:14,padding:16,marginBottom:10}}>
                <div style={{fontSize:13,fontWeight:600,color:'#292524',marginBottom:4}}>🐛 {p.name}</div>
                <div style={{fontSize:12,color:'#78716c',marginBottom:8}}>{p.description}</div>
                <div style={{fontSize:12,color:'#57534e',background:'#f4f7f4',borderRadius:8,padding:'8px 12px'}}>
                  <strong>Behandling:</strong> {p.treatment}
                </div>
              </div>
            )) : (
              <div style={{textAlign:'center',padding:24,color:'#a8a29e',fontSize:13}}>Ingen kjente skadedyrproblemer for denne planten.</div>
            )}
          </div>
        </div>
      )}

      {/* ── HØST ── */}
      {activeTab === 'Høst' && (
        <div style={{...s.card, padding:24}}>
          {info?.harvest ? (
            <>
              <div style={{fontSize:14,fontWeight:500,color:'#292524',marginBottom:16}}>Høstregistrering</div>
              <div style={{textAlign:'center',padding:24,color:'#a8a29e',fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>🧺</div>
                Registrer mengde og dato etter høsting for å se sesongens totale avling.
              </div>
              <button style={{width:'100%',padding:'10px 20px',borderRadius:10,border:'none',background:'#375037',color:'white',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                + Registrer høst
              </button>
            </>
          ) : (
            <div style={{textAlign:'center',padding:32,color:'#a8a29e',fontSize:13}}>
              <div style={{fontSize:32,marginBottom:8}}>🌸</div>
              Denne planten registreres ikke som høstplante.
            </div>
          )}
        </div>
      )}

      {/* ── ID ── */}
      {activeTab === 'ID' && (
        <div style={{...s.card, padding:24, textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:12}}>🔍</div>
          <div style={{fontSize:14,fontWeight:500,color:'#44403c',marginBottom:8}}>Planteidentifikasjon</div>
          <div style={{background:'#f4f7f4',border:'1px solid #cddccd',borderRadius:12,padding:'14px 18px',fontSize:13,color:'#587f58',textAlign:'left'}}>
            Planteidentifikasjon via bilde aktiveres når appen kjøres på server — den bruker Plant.id API (gratis for 100 identifiseringer/dag).
          </div>
          <button disabled style={{marginTop:16,padding:'10px 20px',borderRadius:10,border:'none',background:'#cddccd',color:'white',fontSize:13,fontWeight:500,cursor:'not-allowed'}}>
            Ta bilde for identifikasjon
          </button>
        </div>
      )}
    </div>
  )
}
