import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP } from '../lib/plantData'

const card = { background:'white', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #f1ede8' }

export default function HarvestOverview() {
  const { user } = useAuth()
  const [plants, setPlants]     = useState([])
  const [harvests, setHarvests] = useState([])
  const [loading, setLoading]   = useState(true)
  const [editId, setEditId]     = useState(null)
  const [editData, setEditData] = useState({})

  const load = useCallback(async () => {
    setLoading(true)
    const { data: g } = await supabase.from('gardens').select('id').eq('user_id', user.id).single()
    if (g) {
      const { data: gp } = await supabase.from('garden_plants').select('id, plant_key').eq('garden_id', g.id)
      setPlants(gp || [])
      const ids = (gp || []).map(p => p.id)
      if (ids.length > 0) {
        const { data: h } = await supabase
          .from('harvest_logs')
          .select('*')
          .in('garden_plant_id', ids)
          .eq('user_id', user.id)
          .order('harvested_at', { ascending: false })
        setHarvests(h || [])
      } else {
        setHarvests([])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const plantName = (gardenPlantId) => {
    const gp = plants.find(p => p.id === gardenPlantId)
    if (!gp) return '–'
    const info = PLANT_MAP[gp.plant_key]
    return info?.harvestLabel || info?.name || gp.plant_key
  }
  const plantEmoji = (gardenPlantId) => {
    const gp = plants.find(p => p.id === gardenPlantId)
    return gp ? (PLANT_MAP[gp.plant_key]?.emoji || '🌱') : '🌱'
  }

  const startEdit = (h) => {
    setEditId(h.id)
    setEditData({ kg: h.kg || '', notes: h.notes || '', harvested_at: h.harvested_at?.slice(0,10) || '' })
  }

  const saveEdit = async () => {
    await supabase.from('harvest_logs').update({
      kg: editData.kg ? parseFloat(editData.kg) : null,
      notes: editData.notes || null,
      harvested_at: editData.harvested_at || null,
    }).eq('id', editId)
    setEditId(null)
    load()
  }

  const deleteEntry = async (id) => {
    if (!confirm('Slett denne innhøstingen?')) return
    await supabase.from('harvest_logs').delete().eq('id', id)
    setHarvests(prev => prev.filter(h => h.id !== id))
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:20,height:20,border:'2px solid #b5c9b0',borderTopColor:'#6d9d64',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{maxWidth:700}}>
      <h1 style={{fontSize:20,fontWeight:300,color:'#3d3530',marginBottom:24}}>Innhøsting</h1>

      {harvests.length === 0 ? (
        <div style={{...card, padding:48, textAlign:'center'}}>
          <div style={{fontSize:36,marginBottom:12}}>🧺</div>
          <div style={{fontSize:13,color:'#a09080',lineHeight:1.6}}>Loggfør innhøsting på en av plantene dine for å få oversikt her</div>
        </div>
      ) : (
        harvests.map(h => (
          <div key={h.id} style={{...card, padding:'16px 20px', marginBottom:10}}>
            {editId === h.id ? (
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                  <span style={{fontSize:20}}>{plantEmoji(h.garden_plant_id)}</span>
                  <span style={{fontSize:13,fontWeight:500,color:'#4a3f38'}}>{plantName(h.garden_plant_id)}</span>
                </div>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  <input
                    type="number" step="0.1" placeholder="Vekt (kg)"
                    value={editData.kg}
                    onChange={e => setEditData(d => ({...d, kg:e.target.value}))}
                    style={{border:'1px solid #e7e5e4',borderRadius:8,padding:'6px 10px',fontSize:13,width:120,fontFamily:'inherit'}}
                  />
                  <input
                    type="date"
                    value={editData.harvested_at}
                    onChange={e => setEditData(d => ({...d, harvested_at:e.target.value}))}
                    style={{border:'1px solid #e7e5e4',borderRadius:8,padding:'6px 10px',fontSize:13,fontFamily:'inherit'}}
                  />
                </div>
                <input
                  type="text" placeholder="Kommentar"
                  value={editData.notes}
                  onChange={e => setEditData(d => ({...d, notes:e.target.value}))}
                  style={{border:'1px solid #e7e5e4',borderRadius:8,padding:'6px 10px',fontSize:13,fontFamily:'inherit'}}
                />
                <div style={{display:'flex',gap:8,marginTop:4}}>
                  <button onClick={saveEdit} style={{background:'#f0f7ef',border:'1px solid #c8e6c4',color:'#4a7a4a',borderRadius:8,padding:'6px 14px',fontSize:12,fontWeight:500,cursor:'pointer',fontFamily:'inherit'}}>Lagre</button>
                  <button onClick={() => setEditId(null)} style={{background:'none',border:'1px solid #e7e5e4',color:'#a09080',borderRadius:8,padding:'6px 14px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Avbryt</button>
                </div>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',gap:12}}>
                <span style={{fontSize:22}}>{plantEmoji(h.garden_plant_id)}</span>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#4a3f38'}}>{plantName(h.garden_plant_id)}</div>
                  <div style={{fontSize:12,color:'#78716c',marginTop:2}}>
                    {h.kg ? `${h.kg} kg` : '–'}
                    {h.harvested_at ? ` · ${new Date(h.harvested_at).toLocaleDateString('no-NO',{day:'numeric',month:'short',year:'numeric'})}` : ''}
                    {h.notes ? ` · ${h.notes}` : ''}
                  </div>
                </div>
                <div style={{display:'flex',gap:6,flexShrink:0}}>
                  <button onClick={() => startEdit(h)} style={{background:'none',border:'1px solid #e7e5e4',color:'#78716c',borderRadius:8,padding:'5px 10px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Rediger</button>
                  <button onClick={() => deleteEntry(h.id)} style={{background:'none',border:'1px solid #fecaca',color:'#ef4444',borderRadius:8,padding:'5px 10px',fontSize:12,cursor:'pointer',fontFamily:'inherit'}}>Slett</button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}
