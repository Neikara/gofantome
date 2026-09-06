import { useEffect } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './state/store';
import Library from './pages/Library';
import GameViewer from './pages/GameViewer';
import Sequences from './pages/Sequences';
import Trainer from './pages/Trainer';

export default function App() {
  const hydrate = useStore(s => s.hydrate);
  const ready = useStore(s => s.ready);

  useEffect(() => { void hydrate(); }, [hydrate]);

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="brand">
          <span className="brand-mark" />
          GoFantome
        </NavLink>
        <nav className="nav">
          <NavLink to="/" end>Parties</NavLink>
          <NavLink to="/sequences">Séquences</NavLink>
        </nav>
      </header>

      {!ready ? (
        <div className="page"><p className="muted"><span className="spinner" /> Chargement…</p></div>
      ) : (
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/game/:id" element={<GameViewer />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/train/:id" element={<Trainer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}
