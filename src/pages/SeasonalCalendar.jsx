import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP, MONTH_NAMES, isInfoTask, getTaskTip } from '../lib/plantData'

const S = {
  card: { background:'white', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #f1ede8' },
}

export default function SeasonalCalendar() {
  const { user } = useAuth()
  const [garden, setGarden]           = useState(null)
  const [plants, setPlants]           = useState([])
  const [completions, setCompletions] = useState({})
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear]  = useState(new Date().getFullYear())
  const [calView, setCalView] = useState('month')
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: g } = await supabase.from('gardens').select('*').eq('user_id', user.id).single()
    if (g) {
      setGarden(g)
      const { data: gp } = await supabase.from('garden_plants').select('id, plant_key').eq('garden_id', g.id)
      setPlants(gp || [])
    }
    const { data: tc } = await supabase.from('task_completions').select('task_key, completed_at').eq('user_id', user.id)
    const map = {}
    ;(tc || []).forEach(r => { map[r.task_key] = r.completed_at })
    setCompletions(map)
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  // Dedupliserer planter — én rad per plante-type uavhengig av antall
  function uniquePlants(plantList) {
    const seen = new Set()
    return plantList.filter(p => {
      if (seen.has(p.plant_key)) return false
      seen.add(p.plant_key)
      return true
    })
  }

  function taskKey(plantDbId, taskIdx) {
    return `${currentYear}-${currentMonth + 1}-${plantDbId}-${taskIdx}`
  }

  async function toggleTask(plantDbId, taskIdx) {
    const k = taskKey(plantDbId, taskIdx)
    if (completions[k]) {
      await supabase.from('task_completions').delete().eq('user_id', user.id).eq('task_key', k)
      setCompletions(prev => { const next = {...prev}; delete next[k]; return next })
    } else {
      const now = new Date().toLocaleDateString('no-NO', {day:'numeric', month:'short'})
      await supabase.from('task_completions').upsert({
        user_id: user.id,
        garden_plant_id: plantDbId,
        task_key: k,
        completed_at: now,
      }, { onConflict: 'user_id,task_key' })
      setCompletions(prev => ({...prev, [k]: now}))
    }
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:20,height:20,border:'2px solid #b5c9b0',borderTopColor:'#6d9d64',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
    </div>
  )

  if (!garden || plants.length === 0) {
    return (
      <div style={{maxWidth:640}}>
        <h1 style={{fontSize:20,fontWeight:300,color:'#3d3530',marginBottom:20}}>Sesongkalender</h1>
        <div style={{...S.card,padding:40,textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>{!garden ? '🌱' : '😌'}</div>
          <div style={{fontSize:13,color:'#a09080'}}>
            {!garden ? 'Sett opp hagen din først for å se sesongoppgaver.' : 'Legg til planter i hagen for å se tilpassede sesongoppgaver.'}
          </div>
        </div>
      </div>
    )
  }

  // Bygg oppgaveliste for valgt måned — kun unike planter
  const m = currentMonth + 1
  const allItems = []
  uniquePlants(plants).forEach(mp => {
    const info = PLANT_MAP[mp.plant_key]
    if (!info?.seasonal?.[m]) return
    info.seasonal[m].forEach((t, idx) => {
      const globalIdx = `${mp.id}-${idx}`
      allItems.push({
        emoji: info.emoji,
        plant: info.name,
        task: t,
        tip: getTaskTip(t),
        isInfo: isInfoTask(t),
        plantDbId: mp.id,
        idx: globalIdx,
      })
    })
  })

  const infoItems = allItems.filter(t => t.isInfo)
  const taskItems = allItems.filter(t => !t.isInfo)
  const pending   = taskItems.filter(t => !completions[taskKey(t.plantDbId, t.idx)])
  const completed = taskItems.filter(t =>  completions[taskKey(t.plantDbId, t.idx)])

  return (
    <div style={{maxWidth:700}}>
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>

      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:24}}>
        <div>
          <h1 style={{fontSize:20,fontWeight:300,color:'#3d3530',marginBottom:4}}>Sesongkalender</h1>
          {garden?.city && <div style={{fontSize:12,color:'#a09080'}}>Tilpasset {garden.city}</div>}
        </div>
        <div style={{display:'flex',background:'#f5f0eb',borderRadius:10,padding:4,gap:2}}>
          {[['month','Måned'],['year','År']].map(([v,label]) => (
            <button key={v} onClick={() => setCalView(v)} style={{
              padding:'6px 14px',borderRadius:8,border:'none',cursor:'pointer',fontSize:13,fontWeight:500,fontFamily:'inherit',
              background: calView===v ? 'white' : 'transparent',
              color: calView===v ? '#3d3530' : '#8a7a6e',
              boxShadow: calView===v ? '0 1px 3px rgba(0,0,0,.08)' : 'none',
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* MONTH VIEW */}
      {calView === 'month' && (
        <>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20}}>
            <button onClick={() => setCurrentMonth(m => (m - 1 + 12) % 12)} style={{
              width:36,height:36,borderRadius:10,border:'1px solid #e8e0d8',background:'white',
              cursor:'pointer',fontSize:16,color:'#6b5b4e',display:'flex',alignItems:'center',justifyContent:'center',
            }}>←</button>
            <div style={{fontSize:17,fontWeight:400,color:'#3d3530'}}>
              {MONTH_NAMES[currentMonth]} {currentYear}
            </div>
            <button onClick={() => setCurrentMonth(m => (m + 1) % 12)} style={{
              width:36,height:36,borderRadius:10,border:'1px solid #e8e0d8',background:'white',
              cursor:'pointer',fontSize:16,color:'#6b5b4e',display:'flex',alignItems:'center',justifyContent:'center',
            }}>→</button>
          </div>

          {allItems.length === 0 ? (
            <div style={{...S.card,padding:40,textAlign:'center'}}>
              <div style={{fontSize:32,marginBottom:8}}>😌</div>
              <div style={{fontSize:13,color:'#a09080'}}>Ingen oppgaver denne måneden — nyt hagen!</div>
            </div>
          ) : (
            <>
              {/* Hva som skjer nå — observasjoner */}
              {infoItems.length > 0 && (
                <div style={{marginBottom:16,display:'flex',flexWrap:'wrap',gap:8}}>
                  {infoItems.map((t, i) => (
                    <div key={i} style={{
                      display:'inline-flex',alignItems:'center',gap:6,
                      padding:'6px 12px',borderRadius:20,
                      background:'#f0f7ee',border:'1px solid #c8dfc4',
                      fontSize:12,color:'#4a6e46',
                    }}>
                      <span>{t.emoji}</span>
                      <span style={{fontWeight:500}}>{t.task}</span>
                      <span style={{color:'#7a9f74',fontSize:11}}>{t.plant}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Gjøremål */}
              {taskItems.length > 0 && (
                <div style={{...S.card,padding:20,marginBottom:12}}>
                  <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#8a7a6e',marginBottom:14}}>
                    Gjøremål · {pending.length} igjen
                  </div>
                  {pending.length === 0
                    ? <div style={{fontSize:13,color:'#6d9d64',padding:'8px 0'}}>🎉 Alt er gjort denne måneden!</div>
                    : pending.map(t => <TaskRow key={`${t.plantDbId}-${t.idx}`} t={t} done={false} completions={completions} taskKey={taskKey} onToggle={toggleTask} />)
                  }
                </div>
              )}

              {/* Fullført */}
              {completed.length > 0 && (
                <div style={{...S.card,padding:20}}>
                  <div style={{fontSize:11,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a09080',marginBottom:14}}>
                    Fullført · {completed.length}
                  </div>
                  {completed.map(t => <TaskRow key={`${t.plantDbId}-${t.idx}`} t={t} done={true} completions={completions} taskKey={taskKey} onToggle={toggleTask} />)}
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* YEAR VIEW */}
      {calView === 'year' && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
          {MONTH_NAMES.map((name, i) => {
            const mi = i + 1
            const items = []
            uniquePlants(plants).forEach(mp => {
              const info = PLANT_MAP[mp.plant_key]
              if (info?.seasonal?.[mi]) {
                info.seasonal[mi].forEach(t => items.push({emoji: info.emoji, t, isInfo: isInfoTask(t)}))
              }
            })
            const taskCount = items.filter(x => !x.isInfo).length
            const isCurrent = i === new Date().getMonth()
            return (
              <button key={i} onClick={() => { setCurrentMonth(i); setCalView('month') }} style={{
                ...S.card,padding:16,textAlign:'left',cursor:'pointer',border:`1px solid ${isCurrent ? '#9ab89a' : '#f1ede8'}`,
                outline: isCurrent ? '2px solid #9ab89a' : 'none', outlineOffset:-2, background:'white',
                fontFamily:'inherit',
              }}>
                <div style={{fontSize:13,fontWeight:500,color:isCurrent ? '#4a7a4a' : '#6b5b4e',marginBottom:6}}>{name}</div>
                {items.length === 0
                  ? <div style={{fontSize:11,color:'#c8b8a8'}}>Rolig</div>
                  : <>
                      {items.filter(x => !x.isInfo).slice(0,2).map((x,j) => (
                        <div key={j} style={{fontSize:11,color:'#8a7a6e',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>
                          {x.emoji} {x.t}
                        </div>
                      ))}
                      {taskCount > 2 && <div style={{fontSize:11,color:'#a09080'}}>+{taskCount-2} gjøremål</div>}
                      {taskCount === 0 && items.length > 0 && (
                        <div style={{fontSize:11,color:'#9ab89a'}}>{items[0].emoji} {items[0].t}</div>
                      )}
                    </>
                }
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function TaskRow({ t, done, completions, taskKey, onToggle }) {
  const k = taskKey(t.plantDbId, t.idx)
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:12,padding:'12px 0',borderBottom:'1px solid #f5f0eb',opacity:done?0.5:1}}>
      <button onClick={() => onToggle(t.plantDbId, t.idx)} style={{
        width:22,height:22,borderRadius:6,border:`2px solid ${done ? '#6d9d64' : '#c8b8a8'}`,
        background:done ? '#6d9d64' : 'white',cursor:'pointer',flexShrink:0,marginTop:1,
        display:'flex',alignItems:'center',justifyContent:'center',color:'white',fontSize:13,
      }}>{done ? '✓' : ''}</button>
      <span style={{fontSize:18,flexShrink:0,marginTop:1}}>{t.emoji}</span>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:13,fontWeight:500,color:'#4a3f38',textDecoration:done?'line-through':'none'}}>
          {t.task}
        </div>
        <div style={{fontSize:11,color:'#a09080',marginTop:1}}>
          {t.plant}{done ? ' · fullført ' + completions[k] : ''}
        </div>
        {t.tip && !done && (
          <div style={{fontSize:12,color:'#7a6e66',marginTop:5,lineHeight:1.5,background:'#faf7f4',borderRadius:8,padding:'6px 10px'}}>
            {t.tip}
          </div>
        )}
      </div>
    </div>
  )
}
