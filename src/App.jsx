import { useEffect, useState } from 'react'
import './App.css'

const emptyForm = { name: '', studio: '', mobile: '', camera: '', address: '', photo: '', password: '' }
const OWNER_KEY = 'photolink-owned-profiles'
const initials = (name) => name.split(' ').map((word) => word[0]).slice(0, 2).join('').toUpperCase()

function App() {
  const [photographers, setPhotographers] = useState([])
  const [ownedProfiles, setOwnedProfiles] = useState(() => JSON.parse(localStorage.getItem(OWNER_KEY) || '{}'))
  const [isLoading, setIsLoading] = useState(true)
  const [form, setForm] = useState(emptyForm)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [loginForm, setLoginForm] = useState({ mobile: '', password: '' })
  const [loginError, setLoginError] = useState('')
  const [selectedProfileId, setSelectedProfileId] = useState(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    const loadPhotographers = () => fetch('/api/photographers').then((response) => response.json()).then(setPhotographers).catch(() => setPhotographers([])).finally(() => setIsLoading(false))
    loadPhotographers()
    const refreshTimer = window.setInterval(loadPhotographers, 10000)
    return () => window.clearInterval(refreshTimer)
  }, [])
  const availableCount = photographers.filter((person) => person.available).length
  const visiblePhotographers = photographers.filter((person) => {
    const matchesFilter = filter === 'all' || (filter === 'available' ? person.available : !person.available)
    return matchesFilter
  })
  const selectedProfile = photographers.find((person) => person.id === selectedProfileId && ownedProfiles[person.id])
  const ownerProfile = photographers.find((person) => ownedProfiles[person.id])
  const handleSubmit = async (event) => {
    event.preventDefault()
    const response = await fetch('/api/photographers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    const { ownerToken, ...photographer } = await response.json()
    const nextOwnedProfiles = { ...ownedProfiles, [photographer.id]: ownerToken }
    localStorage.setItem(OWNER_KEY, JSON.stringify(nextOwnedProfiles))
    setOwnedProfiles(nextOwnedProfiles)
    setPhotographers((current) => [photographer, ...current])
    setForm(emptyForm); setIsFormOpen(false)
  }
  const handlePhoto = (event) => {
    const file = event.target.files?.[0]
    if (!file) return
    const reader = new FileReader(); reader.onload = () => setForm((current) => ({ ...current, photo: reader.result })); reader.readAsDataURL(file)
  }
  const handleLogin = async (event) => {
    event.preventDefault()
    setLoginError('')
    const response = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(loginForm) })
    if (!response.ok) { setLoginError('Mobile number or password is incorrect'); return }
    const { ownerToken, ...profile } = await response.json()
    const nextOwnedProfiles = { ...ownedProfiles, [profile.id]: ownerToken }
    localStorage.setItem(OWNER_KEY, JSON.stringify(nextOwnedProfiles))
    setOwnedProfiles(nextOwnedProfiles)
    setLoginForm({ mobile: '', password: '' }); setIsLoginOpen(false)
  }
  const toggleAvailability = async (id) => {
    const person = photographers.find((item) => item.id === id)
    const response = await fetch(`/api/photographers/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ available: !person.available }) })
    const updated = await response.json()
    setPhotographers((current) => current.map((item) => item.id === id ? updated : item))
  }
  const deleteProfile = async (id) => {
    if (!window.confirm('Delete your profile permanently?')) return
    const response = await fetch(`/api/photographers/${id}`, { method: 'DELETE', headers: { 'x-owner-token': ownedProfiles[id] || '' } })
    if (!response.ok) return
    const nextOwnedProfiles = { ...ownedProfiles }
    delete nextOwnedProfiles[id]
    localStorage.setItem(OWNER_KEY, JSON.stringify(nextOwnedProfiles))
    setOwnedProfiles(nextOwnedProfiles)
    setPhotographers((current) => current.filter((person) => person.id !== id))
    setSelectedProfileId(null)
  }
  return (
    <div className="app-shell">
      <header className="topbar"><a className="brand" href="#top"><span className="brand-mark">✦</span><span>PhotoLink</span></a><div className="topbar-actions"><span className="developer-credit">Developed by Shivaram</span><span className="network-status"><i /> Live directory</span>{ownerProfile && <button className="profile-bubble" onClick={() => setSelectedProfileId(ownerProfile.id)} aria-label="Open my profile">{ownerProfile.photo ? <img src={ownerProfile.photo} alt="" /> : initials(ownerProfile.name)}</button>}<button className="login-button" onClick={() => { setLoginError(''); setIsLoginOpen(true) }}>Login</button><button className="outline-button" onClick={() => setIsFormOpen(true)}>+ Register as photographer</button></div></header>
      <main id="top">
        <section className="hero-section"><div className="hero-copy"><p className="eyebrow">THE PHOTOGRAPHER NETWORK</p><h1>Find the right<br /><em>eye</em> for your story.</h1><p className="hero-description">Discover talented photographers around you, check who is ready for your next shoot, and connect in one simple place.</p><button className="primary-button hero-button" onClick={() => document.getElementById('directory')?.scrollIntoView({ behavior: 'smooth' })}>Explore photographers <span>↘</span></button></div><div className="hero-art" aria-hidden="true"><div className="sun-disc" /><div className="photo-frame"><div className="frame-scene"><span className="scene-sun" /><span className="scene-hill one" /><span className="scene-hill two" /><span className="scene-grass" /></div></div><span className="art-note">YOUR MOMENT<br />DESERVES<br />A GOOD EYE</span><span className="art-number">01 / 01</span></div></section>
        <section className="stats-strip"><div><strong>{photographers.length}</strong><span>Photographers registered</span></div><div><strong className="green-number">{availableCount}</strong><span>Available right now</span></div><div><strong>100%</strong><span>Local &amp; independent</span></div><p>Find the right photographer for your needs.</p></section>
        <section className="directory" id="directory"><div className="section-heading"><div><p className="eyebrow">THE DIRECTORY</p><h2>People behind<br /><em>the lens.</em></h2></div><p className="section-intro">Browse the community and find someone whose style matches the way you see the world.</p></div><div className="directory-tools"><div className="filter-tabs">{[['all', 'All'], ['available', 'Available'], ['unavailable', 'Unavailable']].map(([value, label]) => <button key={value} className={filter === value ? 'active' : ''} onClick={() => setFilter(value)}>{label}</button>)}</div></div>
          {isLoading ? <div className="empty-state"><h3>Loading photographers...</h3></div> : visiblePhotographers.length === 0 ? <div className="empty-state"><div className="empty-icon">◎</div><h3>{photographers.length === 0 ? 'Be the first to join.' : 'No photographers found.'}</h3><p>{photographers.length === 0 ? 'Create your profile and let people discover your work.' : 'Try another filter.'}</p>{photographers.length === 0 && <button className="primary-button" onClick={() => setIsFormOpen(true)}>Create my profile <span>↗</span></button>}</div> : <div className="photographer-grid">{visiblePhotographers.map((person) => <article className="photographer-card" key={person.id}><div className="card-image">{person.photo ? <img src={person.photo} alt={person.name} /> : <span>{initials(person.name)}</span>}<span className={`availability ${person.available ? 'is-available' : ''}`}><i />{person.available ? 'Available' : 'Unavailable'}</span></div><div className="card-content"><div className="card-title"><div><h3>{person.name}</h3><p>{person.studio}</p></div><span className="arrow">↗</span></div><dl><div><dt>CAMERA</dt><dd>{person.camera}</dd></div><div><dt>LOCATION</dt><dd>{person.address}</dd></div></dl><a className="call-link" href={`tel:${person.mobile}`}>Call photographer <span>→</span></a></div></article>)}</div>}
        </section>
      </main>
      <footer><span className="brand"><span className="brand-mark">✦</span> PhotoLink</span><span>Developed by Shivaram</span><span>© 2026</span></footer>
      {selectedProfile && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setSelectedProfileId(null)}><section className="owner-panel"><button className="close-button" onClick={() => setSelectedProfileId(null)} aria-label="Close profile">×</button><p className="eyebrow">MY ACCOUNT</p><div className="owner-heading">{selectedProfile.photo ? <img src={selectedProfile.photo} alt={selectedProfile.name} /> : <span>{initials(selectedProfile.name)}</span>}<div><h2>{selectedProfile.name}</h2><p>{selectedProfile.studio}</p></div></div><dl><div><dt>MOBILE</dt><dd>{selectedProfile.mobile}</dd></div><div><dt>CAMERA</dt><dd>{selectedProfile.camera}</dd></div><div><dt>LOCATION</dt><dd>{selectedProfile.address}</dd></div></dl><div className="owner-status-buttons"><button className={selectedProfile.available ? 'selected' : ''} onClick={() => !selectedProfile.available && toggleAvailability(selectedProfile.id)}><i /> Available</button><button className={!selectedProfile.available ? 'selected offline' : ''} onClick={() => selectedProfile.available && toggleAvailability(selectedProfile.id)}><i /> Unavailable</button></div><button className="owner-delete" onClick={() => deleteProfile(selectedProfile.id)}>Delete profile</button></section></div>}
      {isFormOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsFormOpen(false)}><section className="register-modal"><button className="close-button" onClick={() => setIsFormOpen(false)} aria-label="Close registration">×</button><p className="eyebrow">JOIN THE NETWORK</p><h2>Create your<br /><em>profile.</em></h2><p className="modal-copy">Share a few details so clients can find and contact you.</p><form onSubmit={handleSubmit}><label>Full name<input required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Enter your full name" /></label><label>Studio name<input required value={form.studio} onChange={(event) => setForm({ ...form, studio: event.target.value })} placeholder="Enter your studio name" /></label><div className="form-row"><label>Mobile number<input required type="tel" pattern="[0-9+ ()-]{10,}" value={form.mobile} onChange={(event) => setForm({ ...form, mobile: event.target.value })} placeholder="Enter your mobile number" /></label><label>Camera model<input required value={form.camera} onChange={(event) => setForm({ ...form, camera: event.target.value })} placeholder="Enter your camera model" /></label></div><label>Address / location<input required value={form.address} onChange={(event) => setForm({ ...form, address: event.target.value })} placeholder="Enter your address or location" /></label><label>Password<input required type="password" minLength="6" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} placeholder="Create a password (6+ characters)" /></label><label className="upload-field">Profile photo<span>{form.photo ? 'Photo selected ✓' : 'Choose a photo from your device'}</span><input type="file" accept="image/*" onChange={handlePhoto} /></label><button className="primary-button submit-button" type="submit">Publish my profile <span>↗</span></button></form></section></div>}
      {isLoginOpen && <div className="modal-backdrop" onMouseDown={(event) => event.target === event.currentTarget && setIsLoginOpen(false)}><section className="register-modal login-modal"><button className="close-button" onClick={() => setIsLoginOpen(false)} aria-label="Close login">×</button><p className="eyebrow">PHOTOGRAPHER LOGIN</p><h2>Welcome<br /><em>back.</em></h2><p className="modal-copy">Login to open your private profile controls.</p><form onSubmit={handleLogin}><label>Mobile number<input required type="tel" value={loginForm.mobile} onChange={(event) => setLoginForm({ ...loginForm, mobile: event.target.value })} placeholder="Enter your mobile number" /></label><label>Password<input required type="password" value={loginForm.password} onChange={(event) => setLoginForm({ ...loginForm, password: event.target.value })} placeholder="Enter your password" /></label>{loginError && <p className="form-error">{loginError}</p>}<button className="primary-button submit-button" type="submit">Login to my profile <span>↗</span></button></form></section></div>}
    </div>
  )
}

export default App
