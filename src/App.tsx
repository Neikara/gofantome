import { useEffect, useMemo } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { useStore } from './state/store';
import { isDue } from './services/srs';
import Library from './pages/Library';
import GameViewer from './pages/GameViewer';
import Sequences from './pages/Sequences';
import Trainer from './pages/Trainer';
import Review from './pages/Review';
import Intuition from './pages/Intuition';

export default function App() {
  const hydrate = useStore(s => s.hydrate);
  const ready = useStore(s => s.ready);
  const sequences = useStore(s => s.sequences);

  useEffect(() => { void hydrate(); }, [hydrate]);

  // Compté au rendu plutôt que stocké : l'échéance dépend de l'heure courante.
  const dueCount = useMemo(() => sequences.filter(s => isDue(s.srs)).length, [sequences]);

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
          <NavLink to="/intuition">Intuition</NavLink>
          <NavLink to="/review">
            Réviser
            {dueCount > 0 && <span className="nav-badge">{dueCount}</span>}
          </NavLink>
        </nav>
      </header>

      {!ready ? (
        <div className="page"><p className="muted"><span className="spinner" /> Chargement…</p></div>
      ) : (
        <Routes>
          <Route path="/" element={<Library />} />
          <Route path="/game/:id" element={<GameViewer />} />
          <Route path="/sequences" element={<Sequences />} />
          <Route path="/review" element={<Review />} />
          <Route path="/intuition" element={<Intuition />} />
          <Route path="/train/:id" element={<Trainer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}
