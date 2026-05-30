import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

const card = { background:'white', borderRadius:16, boxShadow:'0 1px 4px rgba(0,0,0,.06)', border:'1px solid #f1ede8' }

export default function Profile() {
  const { user, profile: authProfile, signOut } = useAuth()
  const [garden, setGarden]   = useState(null)
  const [plants, setPlants]   = useState([])
  const [profile, setProfile] = useState(null)
  const [editing, setEditing] = useState(false)
  const [form, setForm]       = useState({ display_name:'', username:'' })
  const [copied, setCopied]   = useState(false)
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { data: prof } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (prof) {
      setProfile(prof)
      setForm({ display_name: prof.display_name || '', username: prof.username || '' })
    }
    const { data: g } = await supabase.from('gardens').select('*').eq('user_id', user.id).single()
    if (g) {
      setGarden(g)
      const { data: gp } = await supabase.from('garden_plants').select('id').eq('garden_id', g.id)
      setPlants(gp || [])
    }
    setLoading(false)
  }, [user])

  useEffect(() => { load() }, [load])

  async function saveProfile() {
    const { data } = await supabase.from('profiles').update(form).eq('id', user.id).select().single()
    setProfile(data)
    setEditing(false)
  }

  async function togglePublic() {
    const val = !profile?.public_profile
    const { data } = await supabase.from('profiles').update({ public_profile: val }).eq('id', user.id).select().single()
    setProfile(data)
  }

  function copyLink() {
    navigator.clipboard.writeText(`${window.location.origin}/garden/${profile.username}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:200}}>
      <div style={{width:20,height:20,border:'2px solid #b5c9b0',borderTopColor:'#6d9d64',borderRadius:'50%',animation:'spin 1s linear infinite'}} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )

  return (
    <div style={{maxWidth:520}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
        <h1 style={{fontSize:20,fontWeight:300,color:'#3d3530'}}>Min profil</h1>
        <button onClick={() => { setEditing(!editing); if (editing) setForm({ display_name: profile?.display_name||'', username: profile?.username||'' }) }} style={{
          padding:'7px 14px',borderRadius:10,border:'1px solid #e8e0d8',background:'white',
          fontSize:12,fontWeight:500,color:'#6b5b4e',cursor:'pointer',fontFamily:'inherit',
        }}>{editing ? 'Avbryt' : 'Rediger'}</button>
      </div>

      {/* Profile card */}
      <div style={{...card, padding:24, marginBottom:16}}>
        {editing ? (
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#8a7a6e',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Visningsnavn</div>
              <input value={form.display_name} onChange={e => setForm(f => ({...f, display_name: e.target.value}))}
                style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e8e0d8',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} />
            </div>
            <div>
              <div style={{fontSize:11,fontWeight:600,color:'#8a7a6e',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:6}}>Brukernavn</div>
              <input value={form.username} placeholder="minehage"
                onChange={e => setForm(f => ({...f, username: e.target.value.toLowerCase()}))}
                style={{width:'100%',padding:'10px 12px',borderRadius:10,border:'1px solid #e8e0d8',fontSize:13,fontFamily:'inherit',outline:'none',boxSizing:'border-box'}} />
              {form.username && <div style={{fontSize:11,color:'#a09080',marginTop:4}}>{window.location.origin}/garden/{form.username}</div>}
            </div>
            <button onClick={saveProfile} style={{
              padding:'10px 20px',borderRadius:10,border:'none',background:'#6d9d64',color:'white',
              fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
            }}>Lagre</button>
          </div>
        ) : (
          <div style={{display:'flex',alignItems:'center',gap:16}}>
            <div style={{width:52,height:52,borderRadius:'50%',background:'#e8f0e5',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0}}>🌿</div>
            <div style={{flex:1}}>
              <div style={{fontSize:15,fontWeight:500,color:'#3d3530'}}>{profile?.display_name || user?.email}</div>
              {profile?.username && <div style={{fontSize:12,color:'#a09080',marginTop:2}}>@{profile.username}</div>}
              {garden?.city && <div style={{fontSize:12,color:'#a09080',marginTop:1}}>📍 {garden.city}</div>}
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      {garden && (
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:16}}>
          <div style={{...card,padding:16,textAlign:'center'}}>
            <div style={{fontSize:22,fontWeight:300,color:'#3d3530'}}>{plants.length}</div>
            <div style={{fontSize:11,color:'#a09080',marginTop:4}}>Planter</div>
          </div>
          <div style={{...card,padding:16,textAlign:'center'}}>
            <div style={{fontSize:16,fontWeight:300,color:'#3d3530'}}>{garden.width_m}×{garden.height_m}m</div>
            <div style={{fontSize:11,color:'#a09080',marginTop:4}}>Areal</div>
          </div>
          <div style={{...card,padding:16,textAlign:'center'}}>
            <div style={{fontSize:15,fontWeight:300,color:'#3d3530'}}>{garden.city || '—'}</div>
            <div style={{fontSize:11,color:'#a09080',marginTop:4}}>By</div>
          </div>
        </div>
      )}

      {/* Public profile toggle */}
      <div style={{...card, padding:20, marginBottom:16}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: profile?.public_profile && profile?.username ? 12 : 0}}>
          <div>
            <div style={{fontSize:13,fontWeight:500,color:'#4a3f38'}}>Offentlig profil</div>
            <div style={{fontSize:12,color:'#a09080',marginTop:2}}>
              {profile?.public_profile ? 'Hagen din er synlig for alle med lenken' : 'Kun du kan se hagen din'}
            </div>
          </div>
          <button onClick={togglePublic} style={{
            width:44,height:24,borderRadius:12,border:'none',cursor:'pointer',position:'relative',flexShrink:0,
            background: profile?.public_profile ? '#6d9d64' : '#d4c8bc',
            transition:'background .2s',
          }}>
            <span style={{
              position:'absolute',top:2,width:20,height:20,borderRadius:'50%',background:'white',
              boxShadow:'0 1px 3px rgba(0,0,0,.2)',transition:'left .2s',
              left: profile?.public_profile ? 22 : 2,
            }} />
          </button>
        </div>
        {profile?.public_profile && profile?.username && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#f8f5f2',borderRadius:10,padding:'10px 12px'}}>
            <span style={{fontSize:12,color:'#8a7a6e',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {window.location.origin}/garden/{profile.username}
            </span>
            <button onClick={copyLink} style={{fontSize:12,fontWeight:500,color:'#6d9d64',background:'none',border:'none',cursor:'pointer',fontFamily:'inherit',flexShrink:0,marginLeft:8}}>
              {copied ? '✓ Kopiert' : 'Kopier'}
            </button>
          </div>
        )}
        {profile?.public_profile && !profile?.username && (
          <div style={{background:'#fef9ec',border:'1px solid #f0d97a',borderRadius:10,padding:'10px 12px',fontSize:12,color:'#8a6a10',marginTop:12}}>
            Sett brukernavn for å dele profilen din. Trykk «Rediger» øverst.
          </div>
        )}
      </div>

      {/* Sign out */}
      <button onClick={signOut} style={{
        width:'100%',padding:'12px 20px',borderRadius:12,border:'1px solid #fecaca',
        background:'#fff5f5',color:'#dc2626',fontSize:13,fontWeight:500,cursor:'pointer',fontFamily:'inherit',
      }}>Logg ut</button>
    </div>
  )
}
