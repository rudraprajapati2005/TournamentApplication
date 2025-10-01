import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import './TournamentDetails.css';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [tournament, setTournament] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isParticipating, setIsParticipating] = useState(false);
  const [canJoin, setCanJoin] = useState(false);
  const [joinLoading, setJoinLoading] = useState(false);
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [orgTeamName, setOrgTeamName] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [emailSuggestions, setEmailSuggestions] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState([]);
  const [inviting, setInviting] = useState(false);
  const [organizingTeam, setOrganizingTeam] = useState(null);
  const [organizerOpen, setOrganizerOpen] = useState(false);
  const [myTeam, setMyTeam] = useState(null);
  const [teamName, setTeamName] = useState('');
  const [teamInviteEmail, setTeamInviteEmail] = useState('');
  const [teamLoading, setTeamLoading] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [activeTab, setActiveTab] = useState('description');
  const [matchScores, setMatchScores] = useState({});
  const [updatingScores, setUpdatingScores] = useState({});

  useEffect(() => {
    fetchTournamentDetails();
    if (user) {
      checkParticipationStatus();
    }
    loadOrganizingTeam();
    loadMyTeam();
  }, [id, user]);

  const fetchTournamentDetails = async () => {
    try {
      setLoading(true);
      const data = await api.get(`/tournaments/${id}`);
      
      if (data.success) {
        setTournament(data.tournament);
      } else {
        setError(data.message || 'Failed to fetch tournament details');
      }
    } catch (err) {
      setError('Error fetching tournament details');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const checkParticipationStatus = async () => {
    try {
      const data = await api.get(`/tournaments/${id}/participation-status`);
      
      if (data.success) {
        setIsParticipating(data.isParticipating);
        setCanJoin(data.canJoin);
      }
    } catch (err) {
      console.error('Error checking participation status:', err);
    }
  };

  const handleJoinTournament = async () => {
    if (!user) {
      navigate('/login');
      return;
    }

    try {
      setJoinLoading(true);
      const data = await api.post(`/tournaments/${id}/join`);
      
      if (data.success) {
        setIsParticipating(true);
        setCanJoin(false);
        // Refresh tournament details to update participant count
        fetchTournamentDetails();
      } else {
        alert(data.message || 'Failed to join tournament');
      }
    } catch (err) {
      alert('Error joining tournament');
      console.error('Error:', err);
    } finally {
      setJoinLoading(false);
    }
  };

  const handleLeaveTournament = async () => {
    try {
      setLeaveLoading(true);
      const data = await api.post(`/tournaments/${id}/leave`);
      
      if (data.success) {
        setIsParticipating(false);
        setCanJoin(true);
        // Refresh tournament details to update participant count
        fetchTournamentDetails();
      } else {
        alert(data.message || 'Failed to leave tournament');
      }
    } catch (err) {
      alert('Error leaving tournament');
      console.error('Error:', err);
    } finally {
      setLeaveLoading(false);
    }
  };

  // Suggest users by email for organizing team
  useEffect(() => {
    const controller = new AbortController();
    const load = async () => {
      try {
        if (!emailQuery || emailQuery.length < 2) { setEmailSuggestions([]); return; }
        const data = await api.get(`/teams/search-users?q=${encodeURIComponent(emailQuery)}`);
        setEmailSuggestions(data.users || []);
      } catch (e) {
        setEmailSuggestions([]);
      }
    };
    const idt = setTimeout(load, 250);
    return () => { clearTimeout(idt); controller.abort(); };
  }, [emailQuery]);

  const createOrganizingTeam = async (e) => {
    e.preventDefault();
    if (!orgTeamName.trim()) return;
    setInviting(true);
    try {
      // Create team for this tournament
      const team = await api.post('/teams', { name: orgTeamName.trim(), tournamentId: id, isOrganizing: true });
      // Invite selected emails
      const teamId = team.team?._id || team._id;
      for (const em of selectedEmails) {
        await api.post(`/teams/${teamId}/invite`, { receiverEmail: em });
      }
      setOrgTeamName('');
      setSelectedEmails([]);
      setEmailQuery('');
      alert('Organizing team created and invitations sent');
      await loadOrganizingTeam();
      setOrganizerOpen(true);
    } catch (e) {
      alert(e.message || 'Failed to create team');
    } finally {
      setInviting(false);
    }
  };

  const loadOrganizingTeam = async () => {
    try {
      const data = await api.get(`/teams/organizing/${id}`);
      setOrganizingTeam(data.team);
      if (data.team) setOrganizerOpen(true);
    } catch (e) {
      setOrganizingTeam(null);
    }
  };

  const removeMember = async (memberUserId) => {
    try {
      if (!organizingTeam) return;
      const data = await api.post(`/teams/${organizingTeam._id}/remove-member`, { memberUserId });
      setOrganizingTeam(data.team);
    } catch (e) {
      alert(e.message || 'Failed to remove member');
    }
  };

  const loadMyTeam = async () => {
    try {
      const data = await api.get(`/teams/my-team/${id}`);
      setMyTeam(data.team || null);
    } catch (e) {
      setMyTeam(null);
    }
  };

  const createMyTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) return;
    setTeamLoading(true);
    try {
      await api.post('/teams', { name: teamName.trim(), tournamentId: id, isOrganizing: false });
      setTeamName('');
      await loadMyTeam();
      alert('Team created');
    } catch (e) {
      alert(e.message || 'Failed to create team');
    } finally {
      setTeamLoading(false);
    }
  };

  const inviteToMyTeam = async (e) => {
    e.preventDefault();
    if (!myTeam || !teamInviteEmail.trim()) return;
    setTeamLoading(true);
    try {
      await api.post(`/teams/${myTeam._id}/invite`, { receiverEmail: teamInviteEmail.trim() });
      setTeamInviteEmail('');
      alert('Invitation sent');
    } catch (e) {
      alert(e.message || 'Failed to send invitation');
    } finally {
      setTeamLoading(false);
    }
  };

  const autoSchedule = async () => {
    try {
      setScheduling(true);
      const response = await api.post(`/matches/auto-schedule/${id}`, {});
      await fetchTournamentDetails();
      alert('Round 1 matches scheduled');
    } catch (e) {
      const errorMessage = e.response?.data?.message || e.message || 'Failed to schedule matches';
      if (e.response?.data?.tournamentCancelled) {
        alert(`Tournament cancelled: ${errorMessage}`);
        // Refresh to show updated status
        await fetchTournamentDetails();
      } else {
        alert(errorMessage);
      }
    } finally {
      setScheduling(false);
    }
  };

  const updateMatchScore = async (matchId, participantId, teamId, points, metrics) => {
    try {
      setUpdatingScores(prev => ({ ...prev, [matchId]: true }));
      await api.post(`/matches/${matchId}/score`, {
        playerId: participantId,
        teamId: teamId,
        points: points,
        metrics: metrics
      });
      await fetchTournamentDetails();
      alert('Score updated successfully');
    } catch (e) {
      alert(e.message || 'Failed to update score');
    } finally {
      setUpdatingScores(prev => ({ ...prev, [matchId]: false }));
    }
  };

  const canEditTournament = (tournament) => {
    return user && 
           user.role === 'Organizer' && 
           tournament.organizer._id === user._id;
  };

  const isOrganizingMember = () => {
    if (!user) return false;
    if (canEditTournament(tournament)) return true;
    const leaderId = organizingTeam?.leader?._id?.toString();
    if (leaderId && leaderId === user._id) return true;
    const inMembers = (organizingTeam?.members || []).some(m => (m.user?._id || m.user)?.toString?.() === user._id);
    return inMembers;
  };

  const isRegistrationOpen = () => {
    if (!tournament) return false;
    return new Date() <= new Date(tournament.registrationDeadline);
  };

  const getDerivedStatus = (t) => {
    if (!t) return 'upcoming';
    const base = t.status || 'upcoming';
    if (base === 'upcoming') {
      const start = new Date(t.date);
      const now = new Date();
      if (!isNaN(start.getTime()) && now >= start) {
        return 'ongoing';
      }
    }
    return base;
  };

  const setLocalScore = (matchId, entityId, value) => {
    setMatchScores(prev => ({
      ...prev,
      [matchId]: {
        ...(prev[matchId] || {}),
        [entityId]: value
      }
    }));
  };

  const declareWinner = async (matchId, overrideWinnerId, overrideModel) => {
    try {
      setUpdatingScores(prev => ({ ...prev, [matchId]: true }));
      await api.post(`/matches/${matchId}/declare`, overrideWinnerId && overrideModel ? { overrideWinnerId, overrideModel } : {});
      await fetchTournamentDetails();
      alert('Winner declared');
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to declare winner');
    } finally {
      setUpdatingScores(prev => ({ ...prev, [matchId]: false }));
    }
  };

  if (loading) {
    return (
      <div className="tournament-details-container">
        <div className="loading">Loading tournament details...</div>
      </div>
    );
  }

  if (error || !tournament) {
    return (
      <div className="tournament-details-container">
        <div className="error">
          <h2>Tournament Not Found</h2>
          <p>{error || 'The tournament you are looking for does not exist.'}</p>
          <Link to="/" className="back-btn">Back to Home</Link>
        </div>
      </div>
    );
  }


  return (
    <div className="tournament-page">
      {/* Organizer Panel */}
      {canEditTournament(tournament) && (
        <div className="organizer-panel">
          <div className="organizer-panel__header" onClick={() => setOrganizerOpen(!organizerOpen)}>
            <div className="organizer-panel__title">{organizingTeam ? (organizingTeam.name || 'Organizing Team') : 'Organizer Tools'}</div>
            <div className="organizer-panel__actions">
              {!organizingTeam && (
                <button className="op-btn">Create Organizing Team</button>
              )}
            </div>
          </div>
          <div className={`organizer-panel__body ${organizerOpen ? 'open' : ''}`}>
            {!organizingTeam ? (
            <form onSubmit={createOrganizingTeam} className="organizing-team-form">
              <div className="ot-row">
                <input className="ot-input" placeholder="Team name" value={orgTeamName} onChange={(e) => setOrgTeamName(e.target.value)} />
                <div className="ot-suggest">
                  <input className="ot-input" placeholder="Search member by email" value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} />
                  {emailSuggestions.length > 0 && (
                    <div className="ot-suggest-list">
                      {emailSuggestions.map(u => (
                        <div key={u._id} className="ot-suggest-item" onClick={() => {
                          if (!selectedEmails.includes(u.email)) setSelectedEmails([...selectedEmails, u.email]);
                          setEmailQuery('');
                          setEmailSuggestions([]);
                        }}>{u.name} ({u.email})</div>
                      ))}
                    </div>
                  )}
                </div>
                <button className="op-btn primary" type="submit" disabled={inviting}>{inviting ? 'Creating...' : 'Create & Invite'}</button>
              </div>
              {selectedEmails.length > 0 && (
                <div className="ot-chips">
                  {selectedEmails.map(em => (
                    <span key={em} className="ot-chip">
                      {em}
                      <button type="button" className="ot-chip-x" onClick={() => setSelectedEmails(selectedEmails.filter(e => e !== em))}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </form>
            ) : (
              <div className="organizing-team-view">
                <div className="otv-header">
                  <div>
                    <div className="otv-title">{organizingTeam.name || 'Organizing Team'}</div>
                    <div className="otv-sub">Leader: {organizingTeam.leader?.name} ({organizingTeam.leader?.email})</div>
                  </div>
                  {(user?._id === organizingTeam.leader?._id || user?._id === tournament.organizer._id) && (
                    <div className="otv-add">
                      <div className="ot-suggest">
                        <input className="ot-input" placeholder="Add member by email" value={emailQuery} onChange={(e) => setEmailQuery(e.target.value)} />
                        {emailSuggestions.length > 0 && (
                          <div className="ot-suggest-list">
                            {emailSuggestions.map(u => (
                              <div key={u._id} className="ot-suggest-item" onClick={async () => {
                                try {
                                  const data = await api.post(`/teams/${organizingTeam._id}/add-member`, { userEmail: u.email, role: 'member' });
                                  setOrganizingTeam(data.team);
                                  setEmailQuery('');
                                  setEmailSuggestions([]);
                                } catch (e) { alert(e.message || 'Failed to add member'); }
                              }}>{u.name} ({u.email})</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <div className="otv-members">
                  {organizingTeam.members?.length ? organizingTeam.members.map(m => (
                    <div key={m.user?._id || m.user} className="otv-member">
                      <div className="otv-member-info">
                        <div className="otv-member-name">{m.user?.name}</div>
                        <div className="otv-member-email">{m.user?.email}</div>
                        <div className="otv-member-role">{m.role}</div>
                      </div>
                      {(user?._id === organizingTeam.leader?._id || user?._id === tournament.organizer._id) && (
                        <button className="op-btn" onClick={() => removeMember(m.user?._id)}>
                          Remove
                        </button>
                      )}
                    </div>
                  )) : (
                    <div className="otv-empty">No members yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="tournament-details-container">
        <div className="tournament-details-header">
        <button onClick={() => navigate(-1)} className="back-button">
          ← Back
        </button>
        <h1 className="tournament-title">{tournament.name}</h1>
        <div className={`status-badge ${getDerivedStatus(tournament)}`}>
          {getDerivedStatus(tournament).charAt(0).toUpperCase() + getDerivedStatus(tournament).slice(1)}
        </div>
        </div>

      <div className="tournament-details-content">
        {/* Navigation Bar */}
        <div className="tournament-nav">
          <button 
            className={`nav-tab ${activeTab === 'description' ? 'active' : ''}`}
            onClick={() => setActiveTab('description')}
          >
            Description
          </button>
          <button 
            className={`nav-tab ${activeTab === 'matches' ? 'active' : ''}`}
            onClick={() => setActiveTab('matches')}
          >
            Matches
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'description' && (
          <>
          <div className="tournament-info">
          <div className="info-section">
            <h3>Tournament Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Sport:</span>
                <span className="info-value">{tournament.sportType}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Format:</span>
                <span className="info-value">
                  {tournament.format?.type === 'team' ? 'Team' : 'Individual'}
                  {tournament.format?.type === 'team' && tournament.format?.playersPerTeam && 
                    ` (${tournament.format.playersPerTeam} players per team)`
                  }
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Date:</span>
                <span className="info-value">
                  {new Date(tournament.date).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Time:</span>
                <span className="info-value">
                  {new Date(tournament.date).toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Location:</span>
                <span className="info-value">{tournament.location}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Participants:</span>
                <span className="info-value">
                  {tournament.currentParticipants}/{tournament.participantsLimit}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Prize Pool:</span>
                <span className="info-value">₹{tournament.prizePool.toLocaleString()}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Registration Deadline:</span>
                <span className="info-value">
                  {new Date(tournament.registrationDeadline).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Elimination Type:</span>
                <span className="info-value">
                  {tournament.eliminationType?.charAt(0).toUpperCase() + tournament.eliminationType?.slice(1) || 'Single'}
                </span>
              </div>
            </div>
          </div>

          {tournament.description && (
            <div className="info-section">
              <h3>Description</h3>
              <p className="description">{tournament.description}</p>
            </div>
          )}

          <div className="info-section">
            <h3>Organizer</h3>
            <div className="organizer-info">
              <span className="organizer-name">{tournament.organizer.name}</span>
              <span className="organizer-email">{tournament.organizer.email}</span>
            </div>
          </div>

          {tournament.participants && tournament.participants.length > 0 && (
            <div className="info-section">
              <h3>Participants ({tournament.participants.length})</h3>
              <div className="participants-list">
                {tournament.participants.map((participant, index) => (
                  <div key={participant._id || index} className="participant-item">
                    <span className="participant-name">
                      {participant.user?.name || 'Unknown User'}
                    </span>
                    <span className="participant-status">
                      {participant.status || 'Registered'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* (moved) Your Team section will render in right column below actions */}
        </div>

        <div className="tournament-actions">
          {user && user.role === 'participant' && tournament.status === 'upcoming' && (
            <>
              {isParticipating ? (
                <button 
                  className="leave-tournament-btn"
                  onClick={handleLeaveTournament}
                  disabled={leaveLoading || !isRegistrationOpen()}
                >
                  {leaveLoading ? 'Leaving...' : 'Leave Tournament'}
                </button>
              ) : (
                <button 
                  className="join-tournament-btn"
                  onClick={handleJoinTournament}
                  disabled={!canJoin || joinLoading || !isRegistrationOpen()}
                >
                  {joinLoading ? 'Joining...' : 
                   !isRegistrationOpen() ? 'Registration Closed' : 
                   'Join Tournament'}
                </button>
              )}
            </>
          )}

          {canEditTournament(tournament) && (
            <Link to={`/edit-tournament/${tournament._id}`} className="edit-tournament-btn">
              Edit Tournament
            </Link>
          )}

          {!user && (
            <Link to="/login" className="login-to-join-btn">
              Login to Join Tournament
            </Link>
          )}
          {/* Your Team (participants) */}
          {user && user.role === 'participant' && tournament.format?.type === 'team' && (
            <div style={{marginTop: '1rem'}}>
              <h3 style={{margin: '0 0 0.5rem'}}>Your Team</h3>
              {!myTeam ? (
                <form onSubmit={createMyTeam} className="organizing-team-form">
                  <div className="ot-row">
                    <input className="ot-input" placeholder="Team name (unique in this tournament)" value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                    <button className="op-btn primary" type="submit" disabled={teamLoading}>{teamLoading ? 'Creating...' : 'Create Team'}</button>
                  </div>
                </form>
              ) : (
                <div className="organizing-team-view">
                  <div className="otv-header">
                    <div>
                      <div className="otv-title">{myTeam.name}</div>
                      <div className="otv-sub">Leader: {myTeam.leader?.name} ({myTeam.leader?.email})</div>
                    </div>
                    {user?._id === myTeam.leader?._id && (
                      <div className="otv-add">
                        <form onSubmit={inviteToMyTeam} className="ot-row">
                          <input className="ot-input" placeholder="Invite by email" value={teamInviteEmail} onChange={(e) => setTeamInviteEmail(e.target.value)} />
                          <button className="op-btn primary" type="submit" disabled={teamLoading}>{teamLoading ? 'Sending...' : 'Send Invite'}</button>
                        </form>
                      </div>
                    )}
                  </div>
                  <div className="otv-members">
                    {myTeam.members?.length ? myTeam.members.map(m => (
                      <div key={m.user?._id || m.user} className="otv-member">
                        <div className="otv-member-info">
                          <div className="otv-member-name">{m.user?.name}</div>
                          <div className="otv-member-email">{m.user?.email}</div>
                          <div className="otv-member-role">{m.role}</div>
                        </div>
                      </div>
                    )) : (
                      <div className="otv-empty">No members yet.</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        </>
        )}

        {activeTab === 'matches' && (
          <>
          <div className="tournament-info matches-section">
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
              <h3>Matches</h3>
              {canEditTournament(tournament) && (
                <button className="op-btn" onClick={autoSchedule} disabled={scheduling}>
                  {scheduling ? 'Scheduling...' : 'Auto-schedule Round 1'}
                </button>
              )}
            </div>
            {(tournament.matches && tournament.matches.length > 0) ? (
              <div className="matches-list">
                {tournament.matches.map((m) => {
                  const isTeam = m.matchType === 'team';
                  const left = isTeam ? (m.teams?.[0]?.name || 'Team A') : (m.participants?.[0]?.user?.name || m.participants?.[0]?.name || 'Player 1');
                  const right = isTeam ? (m.teams?.[1]?.name || 'Team B') : (m.participants?.[1]?.user?.name || m.participants?.[1]?.name || 'Player 2');
                  return (
                    <div key={m._id} className="match-card">
                      <h4>{left} vs {right}</h4>
                      <p>Round {m.round} • Status: {m.status}</p>

                      {isOrganizingMember() && (
                        <div>
                          <div className="match-participants">
                            {isTeam ? (
                              <>
                                <div className="match-participant">
                                  <h5>{m.teams?.[0]?.name || 'Team A'}</h5>
                                  <div className="score-input-group">
                                    <input
                                      type="number"
                                      className="score-input"
                                      placeholder="Points"
                                      value={(matchScores[m._id]?.[m.teams?.[0]?._id] ?? '')}
                                      onChange={(e) => setLocalScore(m._id, m.teams?.[0]?._id, e.target.value)}
                                    />
                                    <button
                                      className="update-score-btn"
                                      disabled={updatingScores[m._id]}
                                      onClick={() => updateMatchScore(m._id, undefined, m.teams?.[0]?._id, Number(matchScores[m._id]?.[m.teams?.[0]?._id] || 0), {})}
                                    >Save</button>
                                  </div>
                                </div>
                                <div className="match-participant">
                                  <h5>{m.teams?.[1]?.name || 'Team B'}</h5>
                                  <div className="score-input-group">
                                    <input
                                      type="number"
                                      className="score-input"
                                      placeholder="Points"
                                      value={(matchScores[m._id]?.[m.teams?.[1]?._id] ?? '')}
                                      onChange={(e) => setLocalScore(m._id, m.teams?.[1]?._id, e.target.value)}
                                    />
                                    <button
                                      className="update-score-btn"
                                      disabled={updatingScores[m._id]}
                                      onClick={() => updateMatchScore(m._id, undefined, m.teams?.[1]?._id, Number(matchScores[m._id]?.[m.teams?.[1]?._id] || 0), {})}
                                    >Save</button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="match-participant">
                                  <h5>{m.participants?.[0]?.user?.name || m.participants?.[0]?.name || 'Player 1'}</h5>
                                  <div className="score-input-group">
                                    <input
                                      type="number"
                                      className="score-input"
                                      placeholder="Points"
                                      value={(matchScores[m._id]?.[m.participants?.[0]?._id] ?? '')}
                                      onChange={(e) => setLocalScore(m._id, m.participants?.[0]?._id, e.target.value)}
                                    />
                                    <button
                                      className="update-score-btn"
                                      disabled={updatingScores[m._id]}
                                      onClick={() => updateMatchScore(m._id, m.participants?.[0]?._id, undefined, Number(matchScores[m._id]?.[m.participants?.[0]?._id] || 0), {})}
                                    >Save</button>
                                  </div>
                                </div>
                                <div className="match-participant">
                                  <h5>{m.participants?.[1]?.user?.name || m.participants?.[1]?.name || 'Player 2'}</h5>
                                  <div className="score-input-group">
                                    <input
                                      type="number"
                                      className="score-input"
                                      placeholder="Points"
                                      value={(matchScores[m._id]?.[m.participants?.[1]?._id] ?? '')}
                                      onChange={(e) => setLocalScore(m._id, m.participants?.[1]?._id, e.target.value)}
                                    />
                                    <button
                                      className="update-score-btn"
                                      disabled={updatingScores[m._id]}
                                      onClick={() => updateMatchScore(m._id, m.participants?.[1]?._id, undefined, Number(matchScores[m._id]?.[m.participants?.[1]?._id] || 0), {})}
                                    >Save</button>
                                  </div>
                                </div>
                              </>
                            )}
                          </div>

                          <div style={{display:'flex', gap:'8px', marginTop:'12px', flexWrap:'wrap'}}>
                            <button className="op-btn" disabled={updatingScores[m._id]} onClick={() => declareWinner(m._id)}>
                              Auto declare winner
                            </button>
                            {/* Manual override selection */}
                            {isTeam ? (
                              <>
                                <button className="op-btn primary" disabled={updatingScores[m._id]} onClick={() => declareWinner(m._id, m.teams?.[0]?._id, 'Team')}>Set {m.teams?.[0]?.name || 'Team A'} as Winner</button>
                                <button className="op-btn primary" disabled={updatingScores[m._id]} onClick={() => declareWinner(m._id, m.teams?.[1]?._id, 'Team')}>Set {m.teams?.[1]?.name || 'Team B'} as Winner</button>
                              </>
                            ) : (
                              <>
                                <button className="op-btn primary" disabled={updatingScores[m._id]} onClick={() => declareWinner(m._id, m.participants?.[0]?._id, 'User')}>Set {m.participants?.[0]?.user?.name || 'Player 1'} as Winner</button>
                                <button className="op-btn primary" disabled={updatingScores[m._id]} onClick={() => declareWinner(m._id, m.participants?.[1]?._id, 'User')}>Set {m.participants?.[1]?.user?.name || 'Player 2'} as Winner</button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="otv-empty">No matches scheduled yet.</div>
            )}
          </div>
          </>
        )}
      </div>
      </div>
    </div>
  );
};

export default TournamentDetails;
