import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const ADMIN_EMAIL = 'tora.gjengset@gmail.com'
const ADMIN_PASS  = 'yardlyadmin123!'

export default function Admin() {
  const [authed, setAuthed] = useState(false)
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [err, setErr]       = useState('')
  const [users, setUsers]   = useState([])
  const [loading, setLoading] = useState(false)

  const login = (e) => {
    e.preventDefault()
    if (email === ADMIN_EMAIL && pass === ADMIN_PASS) {
      setAuthed(true)
    } else {
      setErr('Feil brukernavn eller passord')
    }
  }

  useEffect(() => {
    if (!authed) return
    setLoading(true)
    supabase
      .from('profiles')
      .select('id, display_name, username, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setUsers(data || [])
        setLoading(false)
      })
  }, [authed])

  const s = { fontFamily:"'Inter',system-ui,sans-serif" }

  if (!authed) return (
    <div style={{...s, minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9f7f4'}}>
      <form onSubmit={login} style={{background:'white', borderRadius:16, padding:'36px 32px', boxShadow:'0 2px 12px rgba(0,0,0,.08)', width:320}}>
        <div style={{fontSize:17,fontWeight:600,color:'#375037',marginBottom:24}}>Yardly Admin</div>
        <input type="email" placeholder="E-post" value={email} onChange={e => setEmail(e.target.value)}
          style={{display:'block',width:'100%',border:'1px solid #e7e5e4',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:10,boxSizing:'border-box',fontFamily:'inherit'}} />
        <input type="password" placeholder="Passord" value={pass} onChange={e => setPass(e.target.value)}
          style={{display:'block',width:'100%',border:'1px solid #e7e5e4',borderRadius:8,padding:'8px 12px',fontSize:13,marginBottom:16,boxSizing:'border-box',fontFamily:'inherit'}} />
        {err && <div style={{color:'#ef4444',fontSize:12,marginBottom:10}}>{err}</div>}
        <button type="submit" style={{width:'100%',background:'#375037',color:'white',border:'none',borderRadius:8,padding:'9px',fontSize:13,cursor:'pointer',fontFamily:'inherit'}}>Logg inn</button>
      </form>
    </div>
  )

  return (
    <div style={{...s, minHeight:'100vh', background:'#f9f7f4', padding:32}}>
      <div style={{maxWidth:800,margin:'0 auto'}}>
        <div style={{fontSize:18,fontWeight:600,color:'#375037',marginBottom:24}}>Yardly Admin — Brukere</div>
        {loading ? (
          <div style={{color:'#a09080',fontSize:13}}>Laster...</div>
        ) : users.length === 0 ? (
          <div style={{color:'#a09080',fontSize:13}}>Ingen brukere registrert ennå.</div>
        ) : (
          <div style={{background:'white',borderRadius:12,border:'1px solid #e7e5e4',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
              <thead>
                <tr style={{background:'#f5f5f4',borderBottom:'1px solid #e7e5e4'}}>
                  <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#78716c'}}>#</th>
                  <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#78716c'}}>Navn</th>
                  <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#78716c'}}>Brukernavn</th>
                  <th style={{padding:'10px 16px',textAlign:'left',fontWeight:500,color:'#78716c'}}>Registrert</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{borderBottom:'1px solid #f5f0eb'}}>
                    <td style={{padding:'10px 16px',color:'#a09080'}}>{i + 1}</td>
                    <td style={{padding:'10px 16px',color:'#4a3f38'}}>{u.display_name || '–'}</td>
                    <td style={{padding:'10px 16px',color:'#a09080'}}>{u.username || '–'}</td>
                    <td style={{padding:'10px 16px',color:'#a09080'}}>
                      {u.created_at ? new Date(u.created_at).toLocaleDateString('no-NO',{day:'numeric',month:'short',year:'numeric'}) : '–'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div style={{marginTop:12,fontSize:12,color:'#a09080'}}>{users.length} bruker(e) totalt</div>
      </div>
    </div>
  )
}
