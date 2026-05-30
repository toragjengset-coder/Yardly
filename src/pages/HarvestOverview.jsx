import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP } from '../lib/plantData'

const card = { background:'white', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #f1ede8' }

export default function HarvestOverview() {
  const { user } = useAuth()
  const [garden, setGarden]     = useState(null)
  const [plants, setPlants]     = useState([])   // all garden_plants with harvest:true
  const [harvests, setHarvests] = useState([])   // harvest_logs
  const [loading, setLoading]   = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: g } = await supabase.from('gardens').select('*').eq('user_id', user.id).single()
    if (g) {
      setGarden(g)
      const { data: gp } = await supabase.from('garden_plants').select('id, plant_key, added_at').eq('garden_id', g.id)
      const harvestPlants = (gp || []).filter(p => PLANT_MAP[p.plant_key]?.harvest)
      setPlants(harvestPlants)

      if (harvestPlants.length > 0) {
        const ids = harvestPlants.map(p => p.id)
        const { data: h } = await supabase
          .from('harvest_logs')
          .select('*')
          .in('garden_plant_id', ids)
          .eq('user_id', user.id)
          .order('harvested_at', { ascending: false })
        setHarvests(h || [])
      }
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  const totalKg    = harvests.reduce((s, h) => s + (parseFloat(h.kg) || 0), 0)
  const totalValue = harvests.reduce((s, h) => s + (parseFloat(h.estimated_value_nok) || 0), 0)

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:20,height:20,border:'2px solid #b5c9b0',borderTopColor:'#6d9d64',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{maxWidth:700}}>
      <h1 style={{fontSize:20,fontWeight:300,color:'#3d3530',marginBottom:4}}>Høstlogg</h1>
      <div style={{fontSize:12,color:'#a09080',marginBottom:24}}>Grønnsaker, bær og frukt</div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:20}}>
        {[
          ['Totalt høstet', totalKg > 0 ? `${totalKg.toFixed(1)} kg` : '0 kg'],
          ['Estimert verdi', totalValue > 0 ? `${totalValue.toFixed(0)} kr` : '0 kr'],
          ['Høstinger', harvests.length],
        ].map(([label, val]) => (
          <div key={label} style={{...card, padding:16}}>
            <div style={{fontSize:11,color:'#a09080',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:4}}>{label}</div>
            <div style={{fontSize:22,fontWeight:300,color:'#3d3530'}}>{val}</div>
          </div>
        ))}
      </div>

      {plants.length === 0 ? (
        <div style={{...card, padding:40, textAlign:'center'}}>
          <div style={{fontSize:32,marginBottom:8}}>🧺</div>
          <div style={{fontSize:13,color:'#a09080'}}>Legg til grønnsaker, bær eller frukt i hagen for å logge høsting</div>
        </div>
      ) : (
        plants.map(mp => {
          const info = PLANT_MAP[mp.plant_key]
          const plantHarvests = harvests.filter(h => h.garden_plant_id === mp.id)
          const addedDate = mp.added_at
            ? new Date(mp.added_at).toLocaleDateString('no-NO', {day:'numeric',month:'short',year:'numeric'})
            : ''

          return (
            <div key={mp.id} style={{...card, padding:20, marginBottom:12}}>
              <div style={{display:'flex',alignItems:'center',gap:12,marginBottom:14}}>
                <span style={{fontSize:26}}>{info?.emoji || '🌱'}</span>
                <div style={{flex:1}}>
                  <div style={{fontSize:13,fontWeight:500,color:'#4a3f38'}}>{info?.name || mp.plant_key}</div>
                  <div style={{fontSize:12,color:'#a09080',marginTop:1}}>Lagt til {addedDate}</div>
                </div>
                <Link to={`/plant/${mp.id}`} style={{
                  padding:'7px 14px',borderRadius:10,border:'1px solid #c8e6c4',background:'#f0f7ef',
                  color:'#4a7a4a',fontSize:12,fontWeight:500,textDecoration:'none',
                }}>+ Logg høsting</Link>
              </div>

              {plantHarvests.length === 0 ? (
                <div style={{fontSize:12,color:'#a09080',textAlign:'center',padding:'8px 0'}}>Ingen høstinger logget ennå</div>
              ) : (
                plantHarvests.map(h => (
                  <div key={h.id} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderTop:'1px solid #f5f0eb'}}>
                    <div>
                      <span style={{fontSize:13,color:'#4a3f38'}}>{h.kg ? `${h.kg} kg` : '—'}</span>
                      {h.estimated_value_nok && <span style={{fontSize:12,color:'#a09080',marginLeft:8}}>≈ {h.estimated_value_nok} kr</span>}
                      {h.notes && <div style={{fontSize:11,color:'#a09080',marginTop:2}}>{h.notes}</div>}
                    </div>
                    <span style={{fontSize:11,color:'#a09080'}}>
                      {h.harvested_at ? new Date(h.harvested_at).toLocaleDateString('no-NO',{day:'numeric',month:'short'}) : ''}
                    </span>
                  </div>
                ))
              )}
            </div>
          )
        })
      )}
    </div>
  )
}
