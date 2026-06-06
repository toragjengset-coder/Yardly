import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP, plantDesc, LOG_ACTIVITIES } from '../lib/plantData'

const TABS = ['Info','Logg','Bilder','Innhøsting']

export default function PlantDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plantRecord, setPlantRecord] = useState(null)
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('Info')
  const [showForm, setShowForm] = useState(null)
  const [comment, setComment] = useState('')
  const [photos, setPhotos] = useState([])
  const [uploading, setUploading] = useState(false)
  const [lightbox, setLightbox] = useState(null) // { index, urls }
  const photoUrls = useRef({})
  const [photoNote, setPhotoNote] = useState('')
  const [pendingFile, setPendingFile] = useState(null)
  const [harvests, setHarvests] = useState([])
  const [showHarvestForm, setShowHarvestForm] = useState(false)
  const [harvestKg, setHarvestKg] = useState('')
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().split('T')[0])
  const [harvestNote, setHarvestNote] = useState('')

  useEffect(() => { load() }, [id])

  async function load() {
    setLoading(true)
    const { data: p } = await supabase.from('garden_plants').select('*').eq('id', id).single()
    setPlantRecord(p)
    const { data: l } = await supabase.from('plant_logs').select('*').eq('garden_plant_id', id).order('logged_at', { ascending: false })
    setLogs(l || [])
    const { data: ph } = await supabase.from('plant_photos').select('*').eq('garden_plant_id', id).order('taken_at', { ascending: false })
    setPhotos(ph || [])
    const { data: hv } = await supabase.from('harvest_logs').select('*').eq('garden_plant_id', id).order('harvested_at', { ascending: false })
    setHarvests(hv || [])
    setLoading(false)
  }

  async function saveHarvest() {
    const kg = parseFloat(harvestKg)
    if (!kg || kg <= 0) { alert('Fyll inn mengde i kg'); return }
    const plant = PLANT_MAP[plantRecord.plant_key]
    const { data } = await supabase.from('harvest_logs').insert({
      garden_plant_id: id,
      user_id: user.id,
      kg,
      estimated_value_nok: plant?.pricePerKg ? +(kg * plant.pricePerKg).toFixed(0) : null,
      notes: harvestNote.trim() || null,
      harvested_at: harvestDate,
    }).select().single()
    if (data) setHarvests(prev => [data, ...prev])
    setShowHarvestForm(false)
    setHarvestKg('')
    setHarvestNote('')
    setHarvestDate(new Date().toISOString().split('T')[0])
  }

  async function deleteHarvest(hid) {
    await supabase.from('harvest_logs').delete().eq('id', hid)
    setHarvests(prev => prev.filter(h => h.id !== hid))
  }

  async function uploadPhoto(file) {
    if (!file || !user) return
    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${user.id}/${id}/${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage.from('plant-photos').upload(path, file)
    if (uploadError) { alert('Feil ved opplasting: ' + uploadError.message); setUploading(false); return }
    const { data: ph } = await supabase.from('plant_photos').insert({
      garden_plant_id: id,
      user_id: user.id,
      storage_path: path,
      note: photoNote.trim() || null,
      taken_at: new Date().toISOString().split('T')[0],
    }).select().single()
    if (ph) setPhotos(prev => [ph, ...prev])
    setPhotoNote('')
    setUploading(false)
  }

  async function deletePhoto(photo) {
    await supabase.storage.from('plant-photos').remove([photo.storage_path])
    await supabase.from('plant_photos').delete().eq('id', photo.id)
    setPhotos(prev => prev.filter(p => p.id !== photo.id))
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
            <div style={{fontSize:13,color:'#57534e',lineHeight:1.7,marginBottom:info?.care ? 12 : 18}}>{desc}</div>
            {info?.care && (
              <div style={{background:'#f7faf6',border:'1px solid #d4e8cf',borderRadius:10,padding:'10px 14px',marginBottom:18}}>
                <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.05em',color:'#587f58',marginBottom:5}}>Vedlikehold</div>
                <div style={{fontSize:13,color:'#3d4a3d',lineHeight:1.6}}>{info.care}</div>
              </div>
            )}
            <div style={{borderTop:'1px solid #f5f5f4',paddingTop:14,display:'flex',gap:8,flexWrap:'wrap'}}>
              <a href={`https://www.google.com/search?q=${encodeURIComponent((info?.name||plantRecord.plant_key)+' site:plantasjen.no')}`}
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
              <a href={`https://www.google.com/search?q=${encodeURIComponent((info?.name||plantRecord.plant_key)+' vedlikehold stell Norge')}`}
                target="_blank" rel="noreferrer"
                style={{display:'inline-flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:9,border:'1px solid #e7e5e4',fontSize:12,fontWeight:500,color:'#57534e',textDecoration:'none',background:'white',transition:'border-color .12s'}}
                onMouseOver={e=>e.currentTarget.style.borderColor='#7a9f7a'}
                onMouseOut={e=>e.currentTarget.style.borderColor='#e7e5e4'}>
                ✂️ Vedlikeholdstips
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
        <div style={s.card}>
          <div style={{padding:20}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',marginBottom:14}}>Bildelogg</div>

            {/* Last opp */}
            <div style={{marginBottom:16}}>
              {!pendingFile ? (
                <label style={{display:'block',border:'2px dashed #e7e5e4',borderRadius:14,padding:20,textAlign:'center',cursor:'pointer',background:'white'}}>
                  <input type="file" accept="image/*" style={{display:'none'}}
                    onChange={e => { if (e.target.files[0]) setPendingFile(e.target.files[0]) }}/>
                  <div style={{fontSize:24,marginBottom:4}}>📷</div>
                  <div style={{fontSize:13,fontWeight:500,color:'#44403c'}}>+ Last opp bilde</div>
                </label>
              ) : (
                <div style={{background:'#f4f7f4',borderRadius:14,padding:16}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#292524',marginBottom:10}}>📷 {pendingFile.name}</div>
                  <input value={photoNote} onChange={e=>setPhotoNote(e.target.value)}
                    placeholder="Legg til kommentar (valgfritt)…"
                    style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:10}}/>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={async()=>{ await uploadPhoto(pendingFile); setPendingFile(null) }}
                      disabled={uploading}
                      style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#375037',color:'white',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>
                      {uploading ? 'Laster opp…' : 'Lagre'}
                    </button>
                    <button onClick={()=>{ setPendingFile(null); setPhotoNote('') }}
                      style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e7e5e4',background:'white',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>
                      Avbryt
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Bildegrid */}
            {photos.length === 0 ? (
              <div style={{textAlign:'center',padding:'20px 0',color:'#a8a29e',fontSize:13}}>Ingen bilder ennå — last opp det første!</div>
            ) : (
              <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
                {photos.map((ph, i) => (
                  <PhotoCard key={ph.id} photo={ph} supabase={supabase} onDelete={deletePhoto}
                    onClick={(url) => {
                      photoUrls.current[ph.id] = url
                      const mapped = photos.map(p => ({ ...p, url: photoUrls.current[p.id] || null }))
                      setLightbox({ index: i, photos: mapped })
                    }}
                  />
                ))}
              </div>
            )}

            {/* Lightbox */}
            {lightbox && (
              <Lightbox
                photos={lightbox.photos}
                startIndex={lightbox.index}
                onClose={() => setLightbox(null)}
                onDelete={(ph) => { deletePhoto(ph); setLightbox(null) }}
              />
            )}
          </div>
        </div>
      )}


      {/* ── INNHØSTING ── */}
      {activeTab === 'Innhøsting' && (
        <div style={s.card}>
          <div style={{padding:20}}>
            <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',marginBottom:14}}>Innhøstingsregistrering</div>

            {/* Totalsum */}
            {harvests.length > 0 && (
              <div style={{background:'#f4f7f4',borderRadius:12,padding:'12px 16px',marginBottom:16}}>
                <div style={{fontSize:11,color:'#78716c',marginBottom:4}}>Totalt innhøstet</div>
                <div style={{fontSize:18,fontWeight:500,color:'#375037'}}>{harvests.reduce((s,h)=>s+(parseFloat(h.kg)||0),0).toFixed(1)} kg</div>
              </div>
            )}

            {/* Skjema */}
            {showHarvestForm ? (
              <div style={{background:'#f4f7f4',borderRadius:12,padding:16,marginBottom:16}}>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
                  <div>
                    <div style={{fontSize:11,color:'#78716c',marginBottom:4}}>Mengde (kg)</div>
                    <input type="number" min="0.01" step="0.01" value={harvestKg} onChange={e=>setHarvestKg(e.target.value)}
                      placeholder="0.5"
                      style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                  </div>
                  <div>
                    <div style={{fontSize:11,color:'#78716c',marginBottom:4}}>Dato</div>
                    <input type="date" value={harvestDate} onChange={e=>setHarvestDate(e.target.value)}
                      style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                  </div>
                </div>
                <div style={{marginBottom:10}}>
                  <div style={{fontSize:11,color:'#78716c',marginBottom:4}}>Notat (valgfritt)</div>
                  <input value={harvestNote} onChange={e=>setHarvestNote(e.target.value)}
                    placeholder="F.eks. god smak, tidlig høst…"
                    style={{width:'100%',padding:'8px 12px',borderRadius:8,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
                <div style={{display:'flex',gap:8}}>
                  <button onClick={saveHarvest} style={{padding:'8px 18px',borderRadius:9,border:'none',background:'#375037',color:'white',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Lagre</button>
                  <button onClick={()=>setShowHarvestForm(false)} style={{padding:'8px 14px',borderRadius:9,border:'1px solid #e7e5e4',background:'white',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Avbryt</button>
                </div>
              </div>
            ) : (
              <button onClick={()=>setShowHarvestForm(true)}
                style={{width:'100%',padding:'10px 20px',borderRadius:10,border:'none',background:'#375037',color:'white',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',marginBottom:16}}>
                + Registrer innhøsting
              </button>
            )}

            {/* Historikk */}
            {harvests.map((h, i) => (
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 0',borderTop:'1px solid #f5f5f4'}}>
                <span style={{fontSize:20}}>🧺</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#44403c'}}>{h.kg} kg</div>
                  <div style={{fontSize:11,color:'#a8a29e'}}>
                    {new Date(h.harvested_at).toLocaleDateString('no-NO',{day:'numeric',month:'short',year:'numeric'})}
                  </div>
                  {h.notes && <div style={{fontSize:12,color:'#78716c',marginTop:3}}>{h.notes}</div>}
                </div>
                <button onClick={()=>deleteHarvest(h.id)} style={{border:'none',background:'none',color:'#d6d3d1',cursor:'pointer',fontSize:16}}
                  onMouseOver={e=>e.currentTarget.style.color='#78716c'}
                  onMouseOut={e=>e.currentTarget.style.color='#d6d3d1'}>×</button>
              </div>
            ))}

            {harvests.length === 0 && !showHarvestForm && (
              <div style={{textAlign:'center',padding:'16px 0',color:'#a8a29e',fontSize:13}}>Ingen innhøstinger registrert ennå.</div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

function Lightbox({ photos, startIndex, onClose, onDelete }) {
  const [idx, setIdx] = useState(startIndex)
  const touchStart = { current: null }

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowRight') setIdx(i => Math.min(i + 1, photos.length - 1))
      if (e.key === 'ArrowLeft')  setIdx(i => Math.max(i - 1, 0))
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [photos.length, onClose])

  const photo = photos[idx]

  return (
    <div
      onClick={onClose}
      style={{position:'fixed',inset:0,background:'rgba(0,0,0,.92)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center'}}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX }}
      onTouchEnd={e => {
        if (touchStart.current === null) return
        const diff = touchStart.current - e.changedTouches[0].clientX
        if (diff > 50) setIdx(i => Math.min(i + 1, photos.length - 1))
        if (diff < -50) setIdx(i => Math.max(i - 1, 0))
        touchStart.current = null
      }}
    >
      {/* Lukk */}
      <button onClick={onClose} style={{position:'absolute',top:16,right:16,background:'none',border:'none',color:'white',fontSize:28,cursor:'pointer',lineHeight:1,zIndex:10}}>×</button>

      {/* Pil venstre */}
      {idx > 0 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i - 1) }}
          style={{position:'absolute',left:12,background:'rgba(255,255,255,.15)',border:'none',color:'white',fontSize:24,borderRadius:'50%',width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          ‹
        </button>
      )}

      {/* Bilde */}
      <div onClick={e => e.stopPropagation()} style={{maxWidth:'90vw',maxHeight:'85vh',display:'flex',flexDirection:'column',alignItems:'center',gap:12}}>
        <img src={photo.url} alt="" style={{maxWidth:'90vw',maxHeight:'75vh',objectFit:'contain',borderRadius:8}}/>
        {photo.note && <div style={{color:'rgba(255,255,255,.8)',fontSize:13,textAlign:'center'}}>{photo.note}</div>}
        <div style={{display:'flex',gap:8,alignItems:'center'}}>
          <span style={{color:'rgba(255,255,255,.5)',fontSize:12}}>{idx + 1} / {photos.length}</span>
          <button onClick={() => { onDelete(photo); if (idx >= photos.length - 1) setIdx(Math.max(0, idx - 1)) }}
            style={{background:'rgba(239,68,68,.7)',border:'none',color:'white',borderRadius:6,padding:'4px 10px',fontSize:12,cursor:'pointer'}}>
            Slett
          </button>
        </div>
      </div>

      {/* Pil høyre */}
      {idx < photos.length - 1 && (
        <button onClick={e => { e.stopPropagation(); setIdx(i => i + 1) }}
          style={{position:'absolute',right:12,background:'rgba(255,255,255,.15)',border:'none',color:'white',fontSize:24,borderRadius:'50%',width:44,height:44,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
          ›
        </button>
      )}
    </div>
  )
}

function PhotoCard({ photo, supabase, onDelete, onClick }) {
  const [url, setUrl] = useState(null)
  useEffect(() => {
    supabase.storage.from('plant-photos').createSignedUrl(photo.storage_path, 3600)
      .then(({ data }) => { if (data?.signedUrl) setUrl(data.signedUrl) })
  }, [photo.storage_path])
  return (
    <div onClick={() => url && onClick(url)} style={{borderRadius:10,overflow:'hidden',background:'#f5f5f4',aspectRatio:'1',position:'relative',cursor: url ? 'pointer' : 'default'}}>
      {url
        ? <img src={url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
        : <div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:20}}>⏳</div>
      }
      {photo.note && (
        <div style={{position:'absolute',bottom:0,left:0,right:0,background:'rgba(0,0,0,.55)',color:'white',fontSize:10,padding:'4px 6px'}}>
          {photo.note}
        </div>
      )}
      <button onClick={e => { e.stopPropagation(); onDelete(photo) }}
        style={{position:'absolute',top:4,right:4,width:22,height:22,borderRadius:'50%',border:'none',background:'rgba(0,0,0,.5)',color:'white',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',lineHeight:1}}>
        ×
      </button>
    </div>
  )
}
