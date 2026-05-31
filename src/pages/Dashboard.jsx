import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { PLANT_MAP, CAT_ORDER, CAT_LABELS, CITIES, DIR_HINTS } from '../lib/plantData'

const C = {
  garden:      { fill:'#c8e6c0', stroke:'#446444' },
  house:       { fill:'#d0d8e8', stroke:'#4a5a7a' },
  greenhouse:  { fill:'#fff3cc', stroke:'#886600' },
  wintergarden:{ fill:'#fce8f8', stroke:'#8a3080' },
  other:       { fill:'#f0ece8', stroke:'#887060' },
}
const TOOLS = [
  { key:'garden', label:'🌿 Hage' },
  { key:'house', label:'🏠 Hus' },
  { key:'greenhouse', label:'🪴 Drivhus' },
  { key:'wintergarden', label:'🌡️ Vinterhage' },
  { key:'other', label:'📦 Annet' },
]
const DIRS = ['N','NE','E','SE','S','SW','W','NW']
const DIR_LABELS = { N:'N', NE:'NØ', E:'Ø', SE:'SØ', S:'S', SW:'SV', W:'V', NW:'NV' }

export default function Dashboard() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [garden, setGarden] = useState(null)
  const [plants, setPlants] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('app') // app | setup
  const [setupStep, setSetupStep] = useState(1)
  const [showModal, setShowModal] = useState(false)
  const [pendingPos, setPendingPos] = useState(null)
  const [plantSearch, setPlantSearch] = useState('')
  // setup state
  const [drawTool, setDrawTool] = useState('garden')
  const [shapes, setShapes] = useState([])
  const [currentShape, setCurrentShape] = useState([])
  const [city, setCity] = useState('Oslo')
  const [direction, setDirection] = useState('S')
  const [width, setWidth] = useState(10)
  const [depth, setDepth] = useState(8)
  const [citySearch, setCitySearch] = useState('')
  const [mousePos, setMousePos] = useState(null)
  const [addError, setAddError] = useState('')
  const [adding, setAdding] = useState(false)
  const [modalTab, setModalTab] = useState('planter')
  const [collapsedCats, setCollapsedCats] = useState({})
  const pendingPosRef = useRef(null)
  const drawSvgRef = useRef(null)
  const mapSvgRef = useRef(null)

  useEffect(() => { load() }, [user])

  async function load() {
    setLoading(true)
    const { data: g } = await supabase.from('gardens').select('*').eq('user_id', user.id).single()
    if (g) {
      setGarden(g)
      setShapes(g.shapes || [])
      setCity(g.city || 'Oslo')
      setDirection(g.direction || 'S')
      setWidth(g.width_m || 10)
      setDepth(g.height_m || 8)
      const { data: p } = await supabase.from('garden_plants').select('*').eq('garden_id', g.id)
      setPlants(p || [])
      setView('app')
    } else {
      setView('setup')
    }
    setLoading(false)
  }

  // ── SVG Drawing ──
  function svgPoint(svgEl, clientX, clientY) {
    const rect = svgEl.getBoundingClientRect()
    const vb = svgEl.viewBox.baseVal
    return {
      x: ((clientX - rect.left) / rect.width) * vb.width,
      y: ((clientY - rect.top) / rect.height) * vb.height,
    }
  }

  function handleDrawMouseMove(e) {
    const svg = drawSvgRef.current
    if (!svg || currentShape.length === 0) { setMousePos(null); return }
    setMousePos(svgPoint(svg, e.clientX, e.clientY))
  }

  function handleDrawClick(e) {
    const svg = drawSvgRef.current
    if (!svg) return
    const pt = svgPoint(svg, e.clientX, e.clientY)
    if (currentShape.length > 2) {
      const first = currentShape[0]
      const dx = pt.x - first.x, dy = pt.y - first.y
      if (Math.sqrt(dx*dx + dy*dy) < 14) {
        setShapes(prev => [...prev, { type: drawTool, points: currentShape, closed: true }])
        setCurrentShape([])
        setMousePos(null)
        return
      }
    }
    setCurrentShape(prev => [...prev, pt])
  }

  function pointsToStr(pts) { return pts.map(p => `${p.x},${p.y}`).join(' ') }

  // ── Map click ──
  function handleMapClick(e) {
    const svg = mapSvgRef.current
    if (!svg) return
    const pt = svgPoint(svg, e.clientX, e.clientY)
    const pos = { x: pt.x / 500 * 100, y: pt.y / 320 * 100 }
    pendingPosRef.current = pos
    setPendingPos(pos)
    setShowModal(true)
  }

  // ── Add plant ──
  async function addPlant(plantKey, pos) {
    if (!garden) {
      setAddError('Ingen hage funnet — sett opp hagen først.')
      return
    }
    if (!pos) {
      setAddError('Ingen posisjon — klikk i hagekartet for å velge sted.')
      return
    }
    setAdding(true)
    setAddError('')
    const { data, error } = await supabase.from('garden_plants').insert({
      garden_id: garden.id,
      user_id: user.id,
      plant_key: plantKey,
      position_x: pos.x,
      position_y: pos.y,
      planted_date: new Date().toISOString().split('T')[0],
    }).select().single()
    setAdding(false)
    if (error) {
      setAddError('Feil: ' + error.message)
      return
    }
    if (data) setPlants(prev => [...prev, data])
    setShowModal(false)
    setPendingPos(null)
    pendingPosRef.current = null
    setPlantSearch('')
    setAddError('')
  }

  async function deletePlant(id) {
    await supabase.from('garden_plants').delete().eq('id', id)
    setPlants(prev => prev.filter(p => p.id !== id))
  }

  // ── Save garden ──
  async function finishSetup() {
    const payload = { name: 'Hagen min', city, direction, width_m: width, height_m: depth }
    let g
    if (garden) {
      const { data } = await supabase.from('gardens').update(payload).eq('id', garden.id).select().single()
      g = data
    } else {
      const { data, error } = await supabase.from('gardens').insert({ ...payload, user_id: user.id }).select().single()
      if (error) { alert('Feil ved lagring av hage: ' + error.message); return }
      g = data
    }
    // Prøv å lagre shapes separat (kolonnen kan mangle i eldre databaser)
    if (g && shapes.length > 0) {
      await supabase.from('gardens').update({ shapes }).eq('id', g.id)
    }
    setGarden(g)
    setShapes(shapes)
    setView('app')
  }

  // ── Plant picker filter ──
  const filteredBySearch = plantSearch.trim().length > 0
    ? Object.fromEntries(
        CAT_ORDER.map(cat => [cat, Object.values(PLANT_MAP).filter(p =>
          p.cat === cat && p.name.toLowerCase().includes(plantSearch.toLowerCase())
        )])
      )
    : Object.fromEntries(CAT_ORDER.map(cat => [cat, Object.values(PLANT_MAP).filter(p => p.cat === cat)]))

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',minHeight:'60vh'}}>
      <div style={{width:24,height:24,border:'2px solid #cddccd',borderTopColor:'#446444',borderRadius:'50%',animation:'spin 0.8s linear infinite'}} />
    </div>
  )

  // ═══════════════════════════════════════
  // SETUP VIEW
  // ═══════════════════════════════════════
  if (view === 'setup') return (
    <div style={{minHeight:'100vh',background:'#faf8f5',display:'flex',flexDirection:'column',fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      {/* Progress */}
      <div style={{padding:'22px 32px',background:'white',borderBottom:'1px solid #e7e5e4',display:'flex',alignItems:'center',gap:8}}>
        {[1,2,3,4].map((n,i) => (
          <span key={n} style={{display:'flex',alignItems:'center',gap:8}}>
            <span style={{width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:600,background:setupStep>n?'#446444':setupStep===n?'#375037':'#e7e5e4',color:setupStep>=n?'white':'#78716c'}}>
              {setupStep > n ? '✓' : n}
            </span>
            <span style={{fontSize:12,color:setupStep===n?'#375037':'#a8a29e',fontWeight:setupStep===n?500:400}}>
              {['Tegn hagen','Størrelse','By','Retning'][i]}
            </span>
            {i < 3 && <span style={{flex:1,height:1,background:setupStep>n?'#7a9f7a':'#e7e5e4',width:24}} />}
          </span>
        ))}
      </div>

      <div style={{flex:1,display:'flex',justifyContent:'center',padding:'40px 20px'}}>
        <div style={{width:'100%',maxWidth:640}}>

          {/* Step 1: Draw */}
          {setupStep === 1 && (
            <SetupCard title="Tegn opp hagen din" sub="Klikk på rutenettet for å sette punkter. Klikk tilbake på første punkt for å lukke.">
              <div style={{display:'flex',gap:8,marginBottom:10,flexWrap:'wrap'}}>
                {TOOLS.map(t => (
                  <button key={t.key} onClick={() => setDrawTool(t.key)} style={{padding:'7px 14px',borderRadius:9,fontSize:12,fontWeight:500,border:'1px solid',borderColor:drawTool===t.key?'#375037':'#e7e5e4',background:drawTool===t.key?'#375037':'white',color:drawTool===t.key?'white':'#57534e',cursor:'pointer',fontFamily:'inherit'}}>
                    {t.label}
                  </button>
                ))}
                <button onClick={() => setCurrentShape(prev => prev.slice(0,-1))} style={{padding:'7px 14px',borderRadius:9,fontSize:12,border:'1px solid #e7e5e4',background:'none',color:'#78716c',cursor:'pointer',fontFamily:'inherit',marginLeft:'auto'}}>↩ Angre</button>
                <button onClick={() => { setShapes([]); setCurrentShape([]) }} style={{padding:'7px 14px',borderRadius:9,fontSize:12,border:'1px solid #e7e5e4',background:'none',color:'#78716c',cursor:'pointer',fontFamily:'inherit'}}>🗑 Slett alt</button>
              </div>

              <svg ref={drawSvgRef} viewBox="0 0 500 340" xmlns="http://www.w3.org/2000/svg"
                   onClick={handleDrawClick}
                   onMouseMove={handleDrawMouseMove}
                   onMouseLeave={() => setMousePos(null)}
                   style={{width:'100%',borderRadius:12,border:'1px solid #e7e5e4',background:'#f6faf5',display:'block',cursor:'crosshair',touchAction:'none'}}>
                {/* Grid */}
                <defs>
                  <pattern id="drawGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                    <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e7e5e4" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="500" height="340" fill="url(#drawGrid)"/>
                {shapes.map((sh, si) => {
                  const style = C[sh.type] || C.garden
                  return (
                    <polygon key={si} points={pointsToStr(sh.points)}
                      fill={style.fill} stroke={style.stroke} strokeWidth="1.5" fillOpacity="0.8"/>
                  )
                })}
                {currentShape.length > 0 && (
                  <>
                    <polyline points={pointsToStr(currentShape)} fill="none"
                      stroke={C[drawTool]?.stroke||'#446444'} strokeWidth="1.5" strokeDasharray="4,3"/>
                    {/* Preview line to cursor */}
                    {mousePos && (
                      <line
                        x1={currentShape[currentShape.length-1].x}
                        y1={currentShape[currentShape.length-1].y}
                        x2={mousePos.x} y2={mousePos.y}
                        stroke={C[drawTool]?.stroke||'#446444'} strokeWidth="1" strokeDasharray="4,3" opacity="0.5"/>
                    )}
                    {currentShape.map((pt, i) => (
                      <circle key={i} cx={pt.x} cy={pt.y} r={i===0?7:4}
                        fill={i===0?C[drawTool]?.stroke||'#446444':'white'}
                        stroke={C[drawTool]?.stroke||'#446444'} strokeWidth="1.5"/>
                    ))}
                  </>
                )}
              </svg>

              <div style={{fontSize:12,color:'#a8a29e',marginTop:8,minHeight:18}}>
                {currentShape.length === 0 ? 'Klikk for å sette første punkt' :
                 currentShape.length < 3 ? `${currentShape.length} punkt — legg til minst 3` :
                 'Klikk på første punkt (rød sirkel) for å lukke formen'}
              </div>

              {/* Legend */}
              <div style={{display:'flex',gap:12,flexWrap:'wrap',padding:'10px 0',fontSize:11,color:'#78716c',marginTop:8}}>
                {Object.entries(C).map(([k,v]) => (
                  <span key={k} style={{display:'flex',alignItems:'center',gap:4}}>
                    <span style={{width:10,height:10,borderRadius:2,background:v.fill,border:`1.5px solid ${v.stroke}`,display:'inline-block'}}/>
                    {TOOLS.find(t=>t.key===k)?.label.replace(/^.+\s/,'')}
                  </span>
                ))}
              </div>

              <div style={{display:'flex',justifyContent:'flex-end',marginTop:20}}>
                <button onClick={() => setSetupStep(2)}
                  disabled={shapes.length === 0}
                  style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:'none',background:shapes.length===0?'#cddccd':'#375037',color:'white',cursor:shapes.length===0?'not-allowed':'pointer',opacity:shapes.length===0?0.6:1,fontFamily:'inherit'}}>
                  Neste →
                </button>
              </div>
            </SetupCard>
          )}

          {/* Step 2: Size */}
          {setupStep === 2 && (
            <SetupCard title="Omtrent hvor stor er hagen?" sub="Brukes til å beregne planteavstander og plass.">
              <div style={{background:'linear-gradient(135deg,#e8f5e2,#d4edcc)',borderRadius:12,padding:16,display:'flex',alignItems:'center',justifyContent:'center',minHeight:110,marginBottom:20}}>
                <div style={{background:'rgba(55,80,55,.15)',border:'2px solid #446444',borderRadius:6,display:'flex',alignItems:'center',justifyContent:'center',transition:'all .2s',
                  width: Math.min(200, Math.max(60, width * 12)),
                  height: Math.min(120, Math.max(40, depth * 12)) }}>
                  <span style={{fontSize:12,fontWeight:500,color:'#375037'}}>{width} × {depth} m</span>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:20}}>
                <div>
                  <label style={{fontSize:11,fontWeight:500,color:'#78716c',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:6}}>Bredde (m)</label>
                  <input type="number" value={width} min="1" max="300" onChange={e=>setWidth(+e.target.value)}
                    style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
                <div>
                  <label style={{fontSize:11,fontWeight:500,color:'#78716c',textTransform:'uppercase',letterSpacing:'.05em',display:'block',marginBottom:6}}>Dybde (m)</label>
                  <input type="number" value={depth} min="1" max="300" onChange={e=>setDepth(+e.target.value)}
                    style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}}/>
                </div>
              </div>
              <SetupNav onBack={()=>setSetupStep(1)} onNext={()=>setSetupStep(3)}/>
            </SetupCard>
          )}

          {/* Step 3: City */}
          {setupStep === 3 && (
            <SetupCard title="Hvor ligger hagen?" sub="Vi tilpasser sesongkalender og planteråd til din by.">
              <input className="input" placeholder="Søk etter by…" value={citySearch}
                onChange={e=>setCitySearch(e.target.value)}
                style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none',marginBottom:10}}/>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6,marginBottom:16}}>
                {CITIES.filter(c => c.name.toLowerCase().includes(citySearch.toLowerCase())).map(c => (
                  <button key={c.name} onClick={()=>{setCity(c.name);setCitySearch('')}} style={{padding:'10px 14px',borderRadius:10,fontSize:13,border:'1px solid',borderColor:city===c.name?'#375037':'#e7e5e4',background:city===c.name?'#375037':'white',color:city===c.name?'white':'#57534e',cursor:'pointer',textAlign:'left',fontFamily:'inherit',transition:'all .12s'}}>
                    <div style={{fontWeight:500}}>{c.name}</div>
                    <div style={{fontSize:11,opacity:.7}}>{c.info}</div>
                  </button>
                ))}
              </div>
              {city && <div style={{background:'#f4f7f4',border:'1px solid #cddccd',borderRadius:12,padding:'12px 16px',marginBottom:16,fontSize:13,color:'#375037'}}>📍 {city} valgt</div>}
              <SetupNav onBack={()=>setSetupStep(2)} onNext={()=>setSetupStep(4)}/>
            </SetupCard>
          )}

          {/* Step 4: Direction */}
          {setupStep === 4 && (
            <SetupCard title="Hvilken retning vender hagen?" sub="Tenk på hvilken vei du ser når du ser utover hagen fra huset.">
              <div style={{display:'flex',justifyContent:'center',marginBottom:22}}>
                <div style={{position:'relative',width:140,height:140}}>
                  <div style={{position:'absolute',inset:0,borderRadius:'50%',border:'2px solid #e7e5e4',background:'white',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <span style={{fontSize:32}}>🧭</span>
                  </div>
                  {['N','Ø','S','V'].map((l,i) => {
                    const pos = [{top:4,left:'50%',transform:'translateX(-50%)'},{right:4,top:'50%',transform:'translateY(-50%)'},{bottom:4,left:'50%',transform:'translateX(-50%)'},{left:4,top:'50%',transform:'translateY(-50%)'}][i]
                    return <div key={l} style={{position:'absolute',fontSize:10,fontWeight:600,color:'#a8a29e',...pos}}>{l}</div>
                  })}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:8,marginBottom:14}}>
                {DIRS.map(d => (
                  <button key={d} onClick={()=>setDirection(d)} style={{padding:10,borderRadius:10,fontSize:13,fontWeight:500,border:'1px solid',borderColor:direction===d?'#375037':'#e7e5e4',background:direction===d?'#375037':'white',color:direction===d?'white':'#57534e',cursor:'pointer',textAlign:'center',fontFamily:'inherit'}}>
                    {DIR_LABELS[d]}
                  </button>
                ))}
              </div>
              <div style={{background:'#f4f7f4',border:'1px solid #cddccd',borderRadius:12,padding:'12px 16px',marginBottom:20,fontSize:12,color:'#375037'}}>
                {direction === 'N' ? '🌥️' : direction === 'S' || direction === 'SE' || direction === 'SW' ? '☀️' : '⛅'} {DIR_HINTS[direction]}
              </div>
              <div style={{display:'flex',justifyContent:'space-between'}}>
                <button onClick={()=>setSetupStep(3)} style={{background:'none',border:'none',color:'#78716c',padding:'8px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Tilbake</button>
                <button onClick={finishSetup} style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:'none',background:'#375037',color:'white',cursor:'pointer',fontFamily:'inherit'}}>Kom i gang →</button>
              </div>
            </SetupCard>
          )}
        </div>
      </div>
    </div>
  )

  // ═══════════════════════════════════════
  // APP VIEW
  // ═══════════════════════════════════════
  return (
    <div style={{fontFamily:"'Inter',system-ui,sans-serif"}}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} .plant-card:hover{box-shadow:0 4px 14px rgba(0,0,0,.08)!important}`}</style>

      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
        <div>
          <div style={{fontSize:20,fontWeight:500,color:'#292524'}}>Hagen min</div>
          <div style={{fontSize:13,color:'#a8a29e',marginTop:2}}>
            {garden ? `${garden.width_m}×${garden.height_m}m · ${garden.city} · ${garden.direction}` : 'Sett opp hagen for å begynne'}
          </div>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setView('setup');setSetupStep(1)}} style={{padding:'8px 14px',borderRadius:10,fontSize:12,fontWeight:500,border:'1px solid #e7e5e4',background:'white',cursor:'pointer',fontFamily:'inherit'}}>✏️ Tegn på nytt</button>
        </div>
      </div>

      {/* Map card */}
      <div style={{background:'white',borderRadius:16,border:'2px solid #f5f5f4',boxShadow:'0 1px 3px rgba(0,0,0,.04)',overflow:'hidden',marginBottom:22}}>
        <div style={{display:'flex',alignItems:'center',padding:'12px 16px',borderBottom:'1px solid #f5f5f4',background:'white',gap:8}}>
          <span style={{fontSize:12,color:'#78716c'}}>
            🌱 Klikk i hagen for å legge til plante
          </span>
          <div style={{marginLeft:'auto',background:'#f5f5f4',borderRadius:8,padding:'5px 10px',fontSize:12,fontWeight:500,color:'#57534e'}}>🧭 {garden?.direction || 'S'}</div>
        </div>
        <div style={{position:'relative',width:'100%',background:'#f6faf5'}}>
          <svg ref={mapSvgRef} viewBox="0 0 500 320" xmlns="http://www.w3.org/2000/svg"
               style={{width:'100%',display:'block',cursor:'crosshair'}}
               onClick={handleMapClick}>
            {shapes.map((sh, si) => {
              const style = C[sh.type] || C.garden
              return <polygon key={si} points={pointsToStr(sh.points)} fill={style.fill} stroke={style.stroke} strokeWidth="1.5" fillOpacity="0.8"/>
            })}
            {plants.map(p => {
              const info = PLANT_MAP[p.plant_key]
              const cx = (p.position_x / 100) * 500
              const cy = (p.position_y / 100) * 320
              return (
                <g key={p.id} style={{cursor:'pointer'}} onClick={e=>{e.stopPropagation();navigate(`/plant/${p.id}`)}}>
                  <circle cx={cx} cy={cy} r="11" fill="white" fillOpacity="0.9" stroke="#7a9f7a" strokeWidth="1.2"/>
                  <text x={cx} y={cy} textAnchor="middle" dominantBaseline="central" fontSize="13">{info?.emoji || '🌱'}</text>
                </g>
              )
            })}
          </svg>
        </div>
        <div style={{display:'flex',gap:12,flexWrap:'wrap',padding:'10px 14px',background:'#f5f5f4',fontSize:11,color:'#78716c'}}>
          {Object.entries(C).slice(0,3).map(([k,v]) => (
            <span key={k} style={{display:'flex',alignItems:'center',gap:4}}>
              <span style={{width:10,height:10,borderRadius:2,background:v.fill,border:`1.5px solid ${v.stroke}`}}/>
              {k==='garden'?'Hage':k==='house'?'Hus':'Drivhus/Vinterhage'}
            </span>
          ))}
        </div>
      </div>

      {/* Plant list */}
      <div style={{marginBottom:8}}>
        <div style={{fontSize:20,fontWeight:500,color:'#292524'}}>Mine planter</div>
        <div style={{fontSize:13,color:'#a8a29e',marginTop:2}}>
          Trykk på planten for å få informasjon, loggføre vedlikehold og lage bildelogg
        </div>
      </div>

      {plants.length === 0 ? (
        <div style={{textAlign:'center',padding:32,color:'#a8a29e',fontSize:13}}>
          Klikk i hagen for å legge til din første plante 🌱
        </div>
      ) : (
        <div style={{background:'white',borderRadius:16,border:'1px solid #f5f5f4',boxShadow:'0 1px 3px rgba(0,0,0,.04)',overflow:'hidden',marginTop:12}}>
          {(() => {
            const catGroups = {}
            const catOrder = ['grønnsak','bær','frukt','urt','rose','staude','busk','tre','prydplante']
            const catNames = {
              grønnsak:'Grønnsaker', bær:'Bær', frukt:'Frukt', urt:'Urter',
              rose:'Roser', staude:'Blomster og stauder', busk:'Busker', tre:'Trær', prydplante:'Prydplanter'
            }
            plants.forEach(p => {
              const cat = PLANT_MAP[p.plant_key]?.cat || 'annet'
              if (!catGroups[cat]) catGroups[cat] = []
              catGroups[cat].push(p)
            })
            // Beregn nummer per plant_key
            const keyCount = {}
            const keyIndex = {}
            plants.forEach(p => { keyCount[p.plant_key] = (keyCount[p.plant_key] || 0) + 1 })
            function getPlantLabel(p) {
              const info = PLANT_MAP[p.plant_key]
              const name = info?.name || p.plant_key
              if (keyCount[p.plant_key] <= 1) return name
              keyIndex[p.plant_key] = (keyIndex[p.plant_key] || 0) + 1
              return `${name} ${keyIndex[p.plant_key]}`
            }
            // Reset index before render
            Object.keys(keyIndex).forEach(k => delete keyIndex[k])
            return catOrder.filter(c => catGroups[c]).map((cat) => {
              const isCollapsed = collapsedCats[cat]
              return (
                <div key={cat}>
                  <button
                    onClick={() => setCollapsedCats(prev => ({...prev, [cat]: !prev[cat]}))}
                    style={{width:'100%',display:'flex',alignItems:'center',justifyContent:'space-between',fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',padding:'10px 16px 8px',background:'#faf9f8',border:'none',cursor:'pointer',fontFamily:'inherit',textAlign:'left'}}>
                    <span>{catNames[cat]} ({catGroups[cat].length})</span>
                    <span style={{fontSize:11,opacity:.6}}>{isCollapsed ? '▸' : '▾'}</span>
                  </button>
                  {!isCollapsed && catGroups[cat].map((p, i) => {
                    const isLast = i === catGroups[cat].length - 1
                    const label = getPlantLabel(p)
                    return (
                      <div key={p.id} className="plant-card"
                        style={{display:'flex',alignItems:'center',padding:'11px 16px',cursor:'pointer',borderBottom: isLast ? 'none' : '1px solid #f5f5f4',transition:'background .1s'}}
                        onClick={()=>navigate(`/plant/${p.id}`)}>
                        <div style={{flex:1}}>
                          <div style={{fontSize:13,fontWeight:500,color:'#292524'}}>{label}</div>
                        </div>
                        <button onClick={e=>{e.stopPropagation();deletePlant(p.id)}}
                          style={{width:22,height:22,borderRadius:'50%',border:'none',background:'#fee2e2',color:'#dc2626',fontSize:13,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                          ×
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })
          })()}
        </div>
      )}

      {/* Plant picker modal */}
      {showModal && (
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,.3)',backdropFilter:'blur(3px)',zIndex:50,display:'flex',alignItems:'flex-end',justifyContent:'center',padding:16}}>
          <div style={{background:'white',borderRadius:20,width:'100%',maxWidth:420,maxHeight:'80vh',display:'flex',flexDirection:'column',boxShadow:'0 8px 40px rgba(0,0,0,.15)'}}>

            {/* Header */}
            <div style={{padding:'18px 20px 0'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <div style={{fontSize:15,fontWeight:500,color:'#292524'}}>Legg til plante</div>
                <button onClick={()=>{setShowModal(false);setPendingPos(null);setPlantSearch('');setModalTab('planter')}} style={{border:'none',background:'none',cursor:'pointer',fontSize:18,color:'#a8a29e'}}>✕</button>
              </div>
              <div style={{display:'flex',background:'#f5f5f4',borderRadius:10,padding:3,gap:2,marginBottom:14}}>
                {[['planter','🌿 Planter'],['identifiser','🔍 Vet du ikke hva det er?']].map(([key,label]) => (
                  <button key={key} onClick={()=>setModalTab(key)} style={{
                    flex:1,padding:'7px 10px',borderRadius:8,border:'none',cursor:'pointer',
                    fontSize:12,fontWeight:500,fontFamily:'inherit',
                    background:modalTab===key?'white':'transparent',
                    color:modalTab===key?'#292524':'#78716c',
                    boxShadow:modalTab===key?'0 1px 3px rgba(0,0,0,.08)':'none',
                  }}>{label}</button>
                ))}
              </div>
            </div>

            {/* Planter-fane */}
            {modalTab === 'planter' && (
              <>
                <div style={{padding:'0 20px 12px',borderBottom:'1px solid #f5f5f4'}}>
                  <input placeholder="Søk…" value={plantSearch} onChange={e=>setPlantSearch(e.target.value)}
                    style={{width:'100%',padding:'10px 14px',borderRadius:10,border:'1px solid #e7e5e4',fontSize:13,fontFamily:'inherit',outline:'none'}} autoFocus/>
                  {addError && <div style={{fontSize:12,color:'#dc2626',marginTop:8,padding:'6px 10px',background:'#fee2e2',borderRadius:8}}>{addError}</div>}
                </div>
                <div style={{overflowY:'auto',padding:12,flex:1}}>
                  {CAT_ORDER.map(cat => {
                    const items = filteredBySearch[cat] || []
                    if (items.length === 0) return null
                    return (
                      <div key={cat}>
                        <div style={{fontSize:10,fontWeight:600,textTransform:'uppercase',letterSpacing:'.06em',color:'#a8a29e',padding:'8px 4px 4px'}}>{CAT_LABELS[cat]}</div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                          {items.map(plant => (
                            <button key={plant.key} onClick={()=>addPlant(plant.key, pendingPos)}
                              disabled={adding}
                              style={{display:'flex',alignItems:'center',gap:10,padding:12,borderRadius:12,border:'1px solid transparent',cursor:adding?'wait':'pointer',background:'none',fontFamily:'inherit',textAlign:'left',width:'100%',transition:'all .12s',opacity:adding?0.6:1}}
                              onMouseOver={e=>{if(!adding){e.currentTarget.style.background='#f4f7f4';e.currentTarget.style.borderColor='#cddccd'}}}
                              onMouseOut={e=>{e.currentTarget.style.background='none';e.currentTarget.style.borderColor='transparent'}}>
                              <span style={{fontSize:20,flexShrink:0}}>{plant.emoji}</span>
                              <div><div style={{fontSize:13,fontWeight:500,color:'#292524'}}>{plant.name}</div></div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}

            {/* Identifiser-fane */}
            {modalTab === 'identifiser' && (
              <div style={{padding:24,flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',textAlign:'center'}}>
                <div style={{fontSize:48,marginBottom:16}}>🌿</div>
                <div style={{fontSize:15,fontWeight:500,color:'#292524',marginBottom:10}}>Vet du ikke hva planten er?</div>
                <div style={{fontSize:13,color:'#78716c',lineHeight:1.6,marginBottom:24,maxWidth:300}}>
                  Ta et bilde av planten med Google Lens — den gjenkjenner de fleste planter på sekunder. Kom tilbake hit og søk den opp i lista etterpå.
                </div>
                <a href="https://lens.google.com" target="_blank" rel="noreferrer"
                  style={{display:'inline-flex',alignItems:'center',gap:8,padding:'12px 24px',borderRadius:12,background:'#375037',color:'white',fontSize:14,fontWeight:500,textDecoration:'none'}}>
                  🔍 Åpne Google Lens
                </a>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  )
}

function SetupCard({ title, sub, children }) {
  return (
    <div style={{background:'white',borderRadius:20,border:'1px solid #f5f5f4',boxShadow:'0 4px 24px rgba(0,0,0,.06)',overflow:'hidden',fontFamily:"'Inter',system-ui,sans-serif"}}>
      <div style={{padding:'28px 32px 0'}}>
        <div style={{fontSize:17,fontWeight:500,color:'#292524'}}>{title}</div>
        <div style={{fontSize:13,color:'#a8a29e',marginTop:4,marginBottom:20}}>{sub}</div>
      </div>
      <div style={{padding:'24px 32px 32px'}}>{children}</div>
    </div>
  )
}

function SetupNav({ onBack, onNext, nextLabel = 'Neste →' }) {
  return (
    <div style={{display:'flex',justifyContent:'space-between'}}>
      <button onClick={onBack} style={{background:'none',border:'none',color:'#78716c',padding:'8px 14px',borderRadius:8,fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>← Tilbake</button>
      <button onClick={onNext} style={{padding:'10px 20px',borderRadius:10,fontSize:13,fontWeight:500,border:'none',background:'#375037',color:'white',cursor:'pointer',fontFamily:'inherit'}}>{nextLabel}</button>
    </div>
  )
}
