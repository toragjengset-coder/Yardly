import { useAuth } from '../contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import gardenBg from '/IMG_7043.jpg'

export default function Landing() {
  const { user, signInWithGoogle } = useAuth()
  const navigate = useNavigate()

  // Ikke auto-redirect — bruker kan se forsiden selv om innlogget

  const features = [
    { title: 'Hagekartet',     desc: 'Tegn opp hagen og plott plantene dine' },
    { title: 'Sesongkalender', desc: 'Automatiske oppgaver basert på plantene dine og hvor du bor' },
    { title: 'Plantelogg',     desc: 'Loggfør vedlikehold, ta bilder og registrer innhøsting' },
  ]

  return (
    <div style={{
      minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center',
      position:'relative', overflow:'hidden',
      fontFamily:"'Inter',system-ui,sans-serif",
    }}>
      {/* Bakgrunnsbilde */}
      <div style={{
        position:'absolute', inset:0,
        backgroundImage:`url(${gardenBg})`,
        backgroundSize:'cover', backgroundPosition:'center',
        filter:'brightness(0.88)',
      }} />

      {/* Yardly-logo øverst til venstre */}
      <div style={{
        position:'absolute', top:28, left:32, zIndex:10,
        fontSize:22, fontWeight:600, color:'white',
        textShadow:'0 1px 6px rgba(0,0,0,.4)',
        letterSpacing:'.01em',
      }}>
        Yardly
      </div>

      {/* Frosted glass-kort */}
      <div style={{
        position:'relative', zIndex:2,
        maxWidth:640, width:'calc(100% - 48px)',
        background:'rgba(250,248,245,0.72)',
        backdropFilter:'blur(18px)',
        WebkitBackdropFilter:'blur(18px)',
        borderRadius:20,
        border:'1px solid rgba(255,255,255,0.5)',
        boxShadow:'0 8px 40px rgba(0,0,0,0.18)',
        overflow:'hidden',
      }}>
        {/* Rutenett-overlay øverst til høyre */}
        <div style={{position:'absolute',inset:0,pointerEvents:'none',zIndex:0}}>
          <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="gf" cx="100%" cy="0%" r="90%">
                <stop offset="0%"   stopColor="#375037" stopOpacity="0.30"/>
                <stop offset="40%"  stopColor="#375037" stopOpacity="0.12"/>
                <stop offset="80%"  stopColor="#375037" stopOpacity="0.02"/>
                <stop offset="100%" stopColor="#375037" stopOpacity="0"/>
              </radialGradient>
              <pattern id="pg" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#375037" strokeWidth="1"/>
              </pattern>
              <mask id="gm">
                <rect width="100%" height="100%" fill="url(#gf)"/>
              </mask>
            </defs>
            <rect width="100%" height="100%" fill="url(#pg)" mask="url(#gm)"/>
          </svg>
        </div>

        <div style={{position:'relative', zIndex:1, padding:'40px 36px 36px'}}>
          {/* Headline */}
          <h1 style={{fontSize:36,fontWeight:300,lineHeight:1.2,color:'#292524',marginBottom:10,textAlign:'center'}}>
            Hagedataen din,<br/>
            <span style={{color:'#446444'}}>samlet på ett sted</span>
          </h1>
          <p style={{fontSize:14,color:'#78716c',lineHeight:1.6,marginBottom:28,textAlign:'center'}}>
            Tegn opp hagen, logg plantene dine og få personlige råd basert på klima og sesong.
          </p>

          {/* Knapp — avhengig av innloggingsstatus */}
          <div style={{display:'flex',justifyContent:'center',marginBottom:32}}>
            {user ? (
              <button onClick={() => navigate('/dashboard')} style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'#375037', color:'white',
                padding:'11px 26px', borderRadius:12, fontSize:13, fontWeight:500,
                cursor:'pointer', border:'none', fontFamily:'inherit', transition:'opacity .15s',
              }}
                onMouseOver={e => e.currentTarget.style.opacity='0.88'}
                onMouseOut={e => e.currentTarget.style.opacity='1'}
              >
                Gå til hagen →
              </button>
            ) : (
              <button onClick={signInWithGoogle} style={{
                display:'inline-flex', alignItems:'center', gap:10,
                background:'white', color:'#44403c',
                padding:'11px 22px', borderRadius:12, fontSize:13, fontWeight:500,
                boxShadow:'0 1px 4px rgba(0,0,0,.08)', cursor:'pointer',
                border:'1px solid #e7e5e4', fontFamily:'inherit', transition:'box-shadow .15s',
              }}
                onMouseOver={e => e.currentTarget.style.boxShadow='0 4px 16px rgba(0,0,0,.13)'}
                onMouseOut={e => e.currentTarget.style.boxShadow='0 1px 4px rgba(0,0,0,.08)'}
              >
                <svg width="16" height="16" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"/>
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Logg inn med Google
              </button>
            )}
          </div>

          {/* Features */}
          <style>{`
            .yardly-features { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; }
            @media (max-width: 500px) { .yardly-features { grid-template-columns: 1fr; gap: 12px; } }
          `}</style>
          <div className="yardly-features" style={{borderTop:'1px solid rgba(0,0,0,.07)',paddingTop:24}}>
            {features.map(f => (
              <div key={f.title} style={{textAlign:'center'}}>
                <div style={{fontSize:15,fontWeight:500,color:'#3d3530',marginBottom:5}}>{f.title}</div>
                <div style={{fontSize:13,color:'#8a7f78',lineHeight:1.5}}>{f.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
