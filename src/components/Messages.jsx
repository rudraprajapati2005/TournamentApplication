import { useEffect, useState } from 'react';
import { api } from '../utils/api.js';
import './Messages.css';

export default function Messages() {
  const [requests, setRequests] = useState([]);
  const [error, setError] = useState('');
  const [unreadCount, setUnreadCount] = useState(0);

  const load = async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        api.get('/teams/my-requests'),
        api.get('/teams/my-requests/unread-count')
      ]);
      setRequests(listRes.requests || []);
      setUnreadCount(countRes.count || 0);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => { load(); }, []);

  const markAllRead = async () => {
    try {
      await api.post('/teams/my-requests/mark-read', {});
      setUnreadCount(0);
      // also reflect read state in list
      setRequests(prev => prev.map(r => ({ ...r, isRead: true })));
    } catch (err) {
      setError(err.message);
    }
  };

  const respond = async (id, action) => {
    await api.post(`/teams/requests/${id}/respond`, { action });
    load();
  };

  return (
    <div className="messages-container">
      <div className="messages-header">
        <h2>Messages</h2>
        <div className="badge-wrap" onClick={markAllRead} title="Mark all as read">
          <span className={`badge ${unreadCount > 0 ? 'active' : ''}`}>{unreadCount}</span>
        </div>
      </div>
      {error && <p className="error-text">{error}</p>}
      <ul className="messages-list">
        {requests.map(r => (
          <li key={r._id} className={`message-item ${r.isRead ? '' : 'unread'}`}>
            <div className="message-text">
              Invite from <strong>{r.sender?.name || r.sender?.email}</strong> to join team <strong>{r.team?.name}</strong>
            </div>
            <div className="message-actions">
              <button className="btn btn-accept" onClick={() => respond(r._id, 'accepted')}>Accept</button>
              <button className="btn btn-reject" onClick={() => respond(r._id, 'rejected')}>Reject</button>
            </div>
          </li>
        ))}
        {requests.length === 0 && (
          <li className="message-empty">No pending invitations</li>
        )}
      </ul>
    </div>
  );
}


