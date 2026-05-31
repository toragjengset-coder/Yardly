import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { path:'/dashboard', label:'Hagen min',    icon:'🌸' },
  { path:'/calendar',  label:'Kalender',     icon:'📅' },
  { path:'/harvest',   label:'Innhøsting',   icon:'🍎' },
  { path:'/naboer',    label:'Naboer',       icon:'👥' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const s = {
    sidebar: {
      width:220, flexShrink:0, background:'white',
      borderRight:'1px solid #e7e5e4', display:'flex', flexDirection:'column',
      padding:'28px 18px', position:'fixed', top:0, left:0,
      height:'100vh', zIndex:20, overflowY:'auto',
      fontFamily:"'Inter',system-ui,sans-serif"
    },
    logo: { fontSize:15, fontWeight:600, color:'#375037', marginBottom:32 },
    navItem: (active) => ({
      display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
      borderRadius:10, fontSize:14, cursor:'pointer', color: active ? '#375037' : '#78716c',
      background: active ? '#f4f7f4' : 'none', fontWeight: active ? 500 : 400,
      marginBottom:2, border:'none', width:'100%', textAlign:'left',
      fontFamily:'inherit', transition:'all .12s'
    }),
    bottom: { marginTop:'auto', borderTop:'1px solid #e7e5e4', paddingTop:18, flexShrink:0 }
  }

  return (
    <nav style={s.sidebar}>
      <div style={s.logo}>Yardly</div>
      {NAV.map(item => (
        <button
          key={item.path}
          style={s.navItem(location.pathname === item.path)}
          onClick={() => navigate(item.path)}
          onMouseOver={e => { if (location.pathname !== item.path) { e.currentTarget.style.background='#f5f5f4'; e.currentTarget.style.color='#44403c' }}}
          onMouseOut={e => { if (location.pathname !== item.path) { e.currentTarget.style.background='none'; e.currentTarget.style.color='#78716c' }}}
        >
          {item.icon} {item.label}
        </button>
      ))}
      <div style={s.bottom}>
        <div style={{fontSize:12,color:'#a8a29e',marginBottom:6}}>
          {profile?.display_name || 'Min konto'}
        </div>
        <button
          onClick={signOut}
          style={{background:'none',border:'none',color:'#a8a29e',fontSize:12,cursor:'pointer',padding:0,fontFamily:'inherit'}}
        >
          Logg ut
        </button>
      </div>
    </nav>
  )
}
