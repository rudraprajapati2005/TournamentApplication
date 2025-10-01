import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';

export default function MatchCenter() {
  const [tournamentId, setTournamentId] = useState('');
  const [round, setRound] = useState(1);
  const [scheduled, setScheduled] = useState([]);
  const [message, setMessage] = useState('');

  const shuffle = async () => {
    setMessage('');
    try {
      const data = await api.post('/utils/shuffle', { tournamentId, round });
      setScheduled(data.matches);
      setMessage('Matches created');
    } catch (err) {
      setMessage(err.message);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Match Center</h2>
      <div>
        <input placeholder="Tournament ID" value={tournamentId} onChange={(e) => setTournamentId(e.target.value)} />
        <input type="number" placeholder="Round" value={round} onChange={(e) => setRound(Number(e.target.value))} />
        <button onClick={shuffle}>Shuffle & Create</button>
      </div>
      {message && <p>{message}</p>}
      <ul>
        {scheduled.map(m => (
          <li key={m._id}>{m._id} - {m.status}</li>
        ))}
      </ul>
    </div>
  );
}


