import { useNavigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV = [
  { path:'/dashboard', label:'Hagen min', icon:'🌸' },
  { path:'/calendar',  label:'Kalender',  icon:'📅' },
  { path:'/harvest',   label:'Innhøsting',icon:'🍎' },
]

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { profile, signOut } = useAuth()

  const active = (path) => location.pathname === path

  return (
    <>
      <style>{`
        @media (max-width: 768px) {
          .yardly-sidebar { display: none !important; }
          .yardly-mobile-nav { display: flex !important; }
          .yardly-mobile-topbar { display: flex !important; }
          .yardly-main { margin-left: 0 !important; padding-bottom: 72px !important; padding-top: 56px !important; }
        }
        @media (min-width: 769px) {
          .yardly-mobile-nav { display: none !important; }
          .yardly-mobile-topbar { display: none !important; }
        }
      `}</style>

      {/* Desktop sidebar */}
      <nav className="yardly-sidebar" style={{
        width:220, flexShrink:0, background:'white',
        borderRight:'1px solid #e7e5e4', display:'flex', flexDirection:'column',
        padding:'28px 18px', position:'fixed', top:0, left:0,
        height:'100vh', zIndex:20, overflowY:'auto',
        fontFamily:"'Inter',system-ui,sans-serif",
      }}>
        <Link to="/" style={{fontSize:15,fontWeight:600,color:'#375037',marginBottom:32,textDecoration:'none',display:'block'}}>Yardly</Link>

        {NAV.map(item => (
          <button key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display:'flex', alignItems:'center', gap:10, padding:'10px 12px',
              borderRadius:10, fontSize:14, cursor:'pointer',
              color: active(item.path) ? '#375037' : '#78716c',
              background: active(item.path) ? '#f4f7f4' : 'none',
              fontWeight: active(item.path) ? 500 : 400,
              marginBottom:2, border:'none', width:'100%', textAlign:'left',
              fontFamily:'inherit', transition:'all .12s'
            }}
            onMouseOver={e => { if (!active(item.path)) { e.currentTarget.style.background='#f5f5f4'; e.currentTarget.style.color='#44403c' }}}
            onMouseOut={e => { if (!active(item.path)) { e.currentTarget.style.background='none'; e.currentTarget.style.color='#78716c' }}}
          >
            {item.icon} {item.label}
          </button>
        ))}

        <div style={{marginTop:'auto',borderTop:'1px solid #e7e5e4',paddingTop:18,flexShrink:0}}>
          <div style={{fontSize:12,color:'#a8a29e',marginBottom:6}}>
            {profile?.display_name || 'Min konto'}
          </div>
          <button onClick={signOut}
            style={{background:'none',border:'none',color:'#a8a29e',fontSize:12,cursor:'pointer',padding:0,fontFamily:'inherit'}}>
            Logg ut
          </button>
        </div>
      </nav>

      {/* Mobile top bar */}
      <div className="yardly-mobile-topbar" style={{
        display:'none',
        position:'fixed', top:0, left:0, right:0, zIndex:30,
        background:'white', borderBottom:'1px solid #e7e5e4',
        height:52, padding:'0 16px',
        alignItems:'center', justifyContent:'space-between',
        fontFamily:"'Inter',system-ui,sans-serif",
      }}>
        <Link to="/" style={{fontSize:16,fontWeight:600,color:'#375037',textDecoration:'none'}}>Yardly</Link>
        <button onClick={signOut}
          style={{background:'none',border:'none',color:'#a8a29e',fontSize:13,cursor:'pointer',padding:'6px 10px',fontFamily:'inherit'}}>
          Logg ut
        </button>
      </div>

      {/* Mobile bottom nav */}
      <nav className="yardly-mobile-nav" style={{
        display:'none',
        position:'fixed', bottom:0, left:0, right:0, zIndex:30,
        background:'white', borderTop:'1px solid #e7e5e4',
        justifyContent:'space-around', alignItems:'center',
        height:60, padding:'0 8px',
        fontFamily:"'Inter',system-ui,sans-serif",
      }}>
        {NAV.map(item => (
          <button key={item.path}
            onClick={() => navigate(item.path)}
            style={{
              display:'flex', flexDirection:'column', alignItems:'center', gap:2,
              padding:'6px 12px', border:'none', background:'none', cursor:'pointer',
              fontFamily:'inherit', flex:1,
              color: active(item.path) ? '#375037' : '#a8a29e',
            }}>
            <span style={{fontSize:20}}>{item.icon}</span>
            <span style={{fontSize:10,fontWeight: active(item.path) ? 600 : 400}}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </>
  )
}
