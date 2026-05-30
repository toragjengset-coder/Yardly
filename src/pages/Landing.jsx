import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Landing() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (user) navigate('/dashboard')
  }, [user])

  return (
    <div style={{
      minHeight:'100vh', display:'flex', flexDirection:'column',
      background:'#faf8f5', position:'relative', overflow:'hidden',
      fontFamily:"'Inter',system-ui,sans-serif"
    }}>
      {/* Grid bakgrunn */}
      <div style={{position:'absolute',top:0,right:0,width:'65%',height:'70%',pointerEvents:'none'}}>
        <svg viewBox="0 0 600 400" preserveAspectRatio="xMaxYMin meet"
             xmlns="http://www.w3.org/2000/svg" style={{width:'100%',height:'100%'}}>
          <defs>
            <radialGradient id="gridFade" cx="92%" cy="8%" r="85%">
              <stop offset="0%"   stopColor="#375037" stopOpacity="0.50"/>
              <stop offset="30%"  stopColor="#375037" stopOpacity="0.28"/>
              <stop offset="65%"  stopColor="#375037" stopOpacity="0.08"/>
              <stop offset="100%" stopColor="#375037" stopOpacity="0"/>
            </radialGradient>
            <pattern id="smallGrid" width="26" height="26" patternUnits="userSpaceOnUse">
              <path d="M 26 0 L 0 0 0 26" fill="none" stroke="#375037" strokeWidth="1.2"/>
            </pattern>
            <mask id="gridMask">
              <rect width="100%" height="100%" fill="url(#gridFade)"/>
            </mask>
          </defs>
          <rect width="100%" height="100%" fill="url(#smallGrid)" mask="url(#gridMask)"/>
        </svg>
      </div>

      {/* Header */}
      <div style={{padding:'24px 36px',position:'relative',zIndex:2}}>
        <span style={{fontSize:15,fontWeight:600,color:'#375037'}}>🌿 Yardly</span>
      </div>

      {/* Hero */}
      <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',
                   padding:'40px 24px',position:'relative',zIndex:2}}>
        <div style={{maxWidth:520,width:'100%',textAlign:'center'}}>
          <h1 style={{fontSize:46,fontWeight:300,lineHeight:1.2,color:'#292524',marginBottom:14}}>
            Hagedataen din,<br/>
            <span style={{color:'#446444'}}>samlet på ett sted</span>
          </h1>
          <p style={{fontSize:15,color:'#78716c',lineHeight:1.65,maxWidth:360,margin:'0 auto 30px'}}>
            Tegn opp hagen, logg plantene dine og få personlige råd basert på klima og årstid.
          </p>
          <button onClick={signInWithGoogle} style={{
            display:'inline-flex', alignItems:'center', gap:12,
            background:'white', color:'#44403c',
            padding:'12px 24px', borderRadius:14, fontSize:14, fontWeight:500,
            boxShadow:'0 1px 4px rgba(0,0,0,.06)', cursor:'pointer',
            border:'1px solid #e7e5e4', fontFamily:'inherit', transition:'all .15s'
          }}
            onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.1)'}
            onMouseOut={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.06)'}
          >
            <svg width="18" height="18" viewBox="0 0 18 18">
              <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
              <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
              <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
              <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
            </svg>
            Logg inn med Google
          </button>

          {/* Features */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:20,marginTop:44,textAlign:'left'}}>
            <div>
              <div style={{fontSize:22,marginBottom:6}}>🗺️</div>
              <div style={{fontSize:13,fontWeight:500,color:'#44403c',marginBottom:3}}>Hagekartet</div>
              <div style={{fontSize:12,color:'#a8a29e',lineHeight:1.5}}>Tegn opp hagen og plott plantene dine</div>
            </div>
            <div>
              <div style={{fontSize:22,marginBottom:6}}>📅</div>
              <div style={{fontSize:13,fontWeight:500,color:'#44403c',marginBottom:3}}>Sesongkalender</div>
              <div style={{fontSize:12,color:'#a8a29e',lineHeight:1.5}}>Automatiske oppgaver basert på plantene dine og hvor du bor</div>
            </div>
            <div>
              <div style={{fontSize:22,marginBottom:6}}>📸</div>
              <div style={{fontSize:13,fontWeight:500,color:'#44403c',marginBottom:3}}>Vekstkurve</div>
              <div style={{fontSize:12,color:'#a8a29e',lineHeight:1.5}}>Bildelogg per plante — se utviklingen over tid</div>
            </div>
          </div>
        </div>
      </div>

      <div style={{textAlign:'center',padding:18,fontSize:11,color:'#a8a29e',position:'relative',zIndex:2}}>
        Laget med kjærlighet til hagen
      </div>
    </div>
  )
}
