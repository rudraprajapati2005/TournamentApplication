import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/api.js';

export default function TeamHub() {
  const { user } = useAuth();
  const [name, setName] = useState('');
  const [tournamentId, setTournamentId] = useState('');
  const [message, setMessage] = useState('');

  const createTeam = async (e) => {
    e.preventDefault();
    setMessage('');
    try {
      await api.post('/teams', { name, tournamentId });
      setMessage('Team created');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Team Hub</h2>
      <form onSubmit={createTeam}>
        <input placeholder="Team name" value={name} onChange={(e) => setName(e.target.value)} />
        <input placeholder="Tournament ID" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} />
        <button type="submit">Create Team</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}


