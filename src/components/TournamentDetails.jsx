import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import './TournamentDetails.css';

const TournamentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, triggerRefresh, checkAuthStatus } = useAuth();
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
  const [updatingStatus, setUpdatingStatus] = useState({});
  const [showWinnerDeclaration, setShowWinnerDeclaration] = useState(false);
  const [winners, setWinners] = useState([{ position: 1, user: null }]);
  const [declaringWinners, setDeclaringWinners] = useState(false);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantSuggestions, setParticipantSuggestions] = useState([]);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [creatingMatch, setCreatingMatch] = useState(false);
  const [newMatch, setNewMatch] = useState({
    matchType: 'individual',
    round: 1,
    participant1: '',
    participant2: '',
    team1: '',
    team2: '',
    scheduledAt: '',
    durationMinutes: '',
    location: '',
    description: ''
  });

  useEffect(() => {
    fetchTournamentDetails();
    if (user) {
      checkParticipationStatus();
    }
    loadOrganizingTeam();
    loadMyTeam();
  }, [id, user]);

  // Initialize score inputs from server-provided scores map
  useEffect(() => {
    if (!tournament || !Array.isArray(tournament.matches)) return;
    const initial = {};
    for (const m of tournament.matches) {
      if (m && m._id && m.scores) {
        initial[m._id] = { ...m.scores };
      }
    }
    setMatchScores(initial);
  }, [tournament]);

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
      const errorMessage = err.message || err.data?.message || 'Error joining tournament';
      alert(errorMessage);
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

  const updateMatchScore = async (matchId, participantUserId, teamId, points, metrics) => {
    try {
      setUpdatingScores(prev => ({ ...prev, [matchId]: true }));
      await api.post(`/matches/${matchId}/score`, {
        playerId: participantUserId,
        teamId,
        points,
        metrics
      });
      // Optimistic UI update: reflect saved points without refetching entire tournament
      const key = teamId || participantUserId;
      setMatchScores(prev => ({
        ...prev,
        [matchId]: { ...(prev[matchId] || {}), [key]: points }
      }));
      setTournament(prev => {
        if (!prev) return prev;
        const updatedMatches = (prev.matches || []).map(m => {
          if (m._id !== matchId) return m;
          const nextScores = { ...(m.scores || {}) };
          nextScores[key] = points;
          return { ...m, scores: nextScores };
        });
        return { ...prev, matches: updatedMatches };
      });
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
      const resp = await api.post(`/matches/${matchId}/declare`, overrideWinnerId && overrideModel ? { overrideWinnerId, overrideModel } : {});
      // Update the match with the returned data
      const updatedMatch = resp.match || resp.data?.match; // api wrapper may unwrap
      if (updatedMatch) {
        setTournament(prev => {
          if (!prev) return prev;
          const updatedMatches = (prev.matches || []).map(m => {
            if (m._id === matchId || m._id?.toString() === matchId?.toString()) {
              // Merge the updated match data, preserving participants and teams if they exist
              return {
                ...m,
                ...updatedMatch,
                status: updatedMatch.status || 'completed',
                winner: updatedMatch.winner,
                winnerModel: updatedMatch.winnerModel,
                participants: updatedMatch.participants || m.participants,
                teams: updatedMatch.teams || m.teams
              };
            }
            return m;
          });
          return { ...prev, matches: updatedMatches };
        });
        // Refresh tournament details to ensure we have the latest data
        setTimeout(() => {
          fetchTournamentDetails();
        }, 500);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to declare winner');
    } finally {
      setUpdatingScores(prev => ({ ...prev, [matchId]: false }));
    }
  };

  const updateMatchStatus = async (matchId, newStatus) => {
    try {
      setUpdatingStatus(prev => ({ ...prev, [matchId]: true }));
      const data = await api.put(`/matches/${matchId}/status`, { status: newStatus });
      
      if (data.success) {
        // Update the match status in the tournament state
        setTournament(prev => {
          if (!prev) return prev;
          const updatedMatches = (prev.matches || []).map(m => 
            m._id === matchId ? { ...m, status: newStatus, ...data.match } : m
          );
          return { ...prev, matches: updatedMatches };
        });
      } else {
        alert(data.message || 'Failed to update match status');
      }
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to update match status';
      alert(errorMessage);
      console.error('Error:', err);
    } finally {
      setUpdatingStatus(prev => ({ ...prev, [matchId]: false }));
    }
  };

  // Handler for declaring top players
  const handleDeclareWinners = async () => {
    try {
      setDeclaringWinners(true);
      
      // Validate winners
      const validWinners = winners.filter(w => w.user);
      if (validWinners.length === 0) {
        alert('Please select at least one winner');
        setDeclaringWinners(false);
        return;
      }

      // Sort winners by position
      const sortedWinners = validWinners.sort((a, b) => a.position - b.position);

      const data = await api.post(`/tournaments/${id}/declare-winners`, {
        winners: sortedWinners.map(w => ({
          position: w.position,
          user: w.user
        }))
      });

      if (data.success) {
        setTournament(data.tournament);
        setShowWinnerDeclaration(false);
        alert('Winners declared successfully!');
        
        // Refresh user data to update participation status and statistics
        // This ensures winners see their updated status in the dashboard
        setTimeout(async () => {
          await checkAuthStatus();
          triggerRefresh();
        }, 500);
      }
    } catch (e) {
      alert(e.response?.data?.message || e.message || 'Failed to declare winners');
    } finally {
      setDeclaringWinners(false);
    }
  };

  // Add a winner position
  const addWinnerPosition = () => {
    setWinners([...winners, { position: winners.length + 1, user: null }]);
  };

  // Remove a winner position
  const removeWinnerPosition = (index) => {
    const newWinners = winners.filter((_, i) => i !== index);
    // Re-number positions
    const renumbered = newWinners.map((w, i) => ({ ...w, position: i + 1 }));
    setWinners(renumbered);
  };

  // Set winner user
  const setWinnerUser = (index, userId) => {
    const newWinners = [...winners];
    newWinners[index].user = userId;
    setWinners(newWinners);
    setParticipantSearch('');
    setParticipantSuggestions([]);
  };

  // Search participants when typing
  useEffect(() => {
    if (!participantSearch || participantSearch.length < 2) {
      setParticipantSuggestions([]);
      return;
    }

    if (!tournament || !tournament.participants) return;

    const filtered = tournament.participants.filter(p => 
      p.user?.name?.toLowerCase().includes(participantSearch.toLowerCase()) ||
      p.user?.email?.toLowerCase().includes(participantSearch.toLowerCase())
    );

    setParticipantSuggestions(filtered);
  }, [participantSearch, tournament]);

  const handleCreateMatch = async (e) => {
    e.preventDefault();
    if (!tournament) return;

    try {
      setCreatingMatch(true);
      const matchData = {
        tournamentId: id,
        round: parseInt(newMatch.round),
        matchType: newMatch.matchType,
        scheduledAt: newMatch.scheduledAt || undefined,
        durationMinutes: newMatch.durationMinutes || undefined,
        location: newMatch.location || undefined,
        description: newMatch.description || undefined
      };

      if (newMatch.matchType === 'team') {
        if (!newMatch.team1 || !newMatch.team2) {
          alert('Please select both teams');
          setCreatingMatch(false);
          return;
        }
        matchData.teamIds = [newMatch.team1, newMatch.team2];
      } else {
        if (!newMatch.participant1 || !newMatch.participant2) {
          alert('Please select both participants');
          setCreatingMatch(false);
          return;
        }
        matchData.participantIds = [newMatch.participant1, newMatch.participant2];
      }

      const data = await api.post('/matches/create-custom', matchData);
      
      if (data.success) {
        alert('Match created successfully!');
        setShowCreateMatch(false);
        setNewMatch({
          matchType: 'individual',
          round: 1,
          participant1: '',
          participant2: '',
          team1: '',
          team2: '',
          scheduledAt: '',
          durationMinutes: '',
          location: '',
          description: ''
        });
        await fetchTournamentDetails();
      } else {
        alert(data.message || 'Failed to create match');
      }
    } catch (err) {
      const errorMessage = err.message || err.data?.message || 'Failed to create match';
      alert(errorMessage);
      console.error('Error:', err);
    } finally {
      setCreatingMatch(false);
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
      {/* Create Match Modal */}
      {showCreateMatch && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCreateMatch(false)}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Create Custom Match</h2>
            <form onSubmit={handleCreateMatch}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Match Type</label>
                <select
                  value={newMatch.matchType}
                  onChange={(e) => setNewMatch({ ...newMatch, matchType: e.target.value, participant1: '', participant2: '', team1: '', team2: '' })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                >
                  <option value="individual">Individual</option>
                  <option value="team">Team</option>
                </select>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Round</label>
                <input
                  type="number"
                  min="1"
                  value={newMatch.round}
                  onChange={(e) => setNewMatch({ ...newMatch, round: e.target.value })}
                  required
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              {newMatch.matchType === 'team' ? (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Team 1</label>
                    <select
                      value={newMatch.team1}
                      onChange={(e) => setNewMatch({ ...newMatch, team1: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="">Select Team 1</option>
                      {tournament?.teams?.filter(t => !t.isOrganizing).map(team => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Team 2</label>
                    <select
                      value={newMatch.team2}
                      onChange={(e) => setNewMatch({ ...newMatch, team2: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="">Select Team 2</option>
                      {tournament?.teams?.filter(t => !t.isOrganizing && t._id !== newMatch.team1).map(team => (
                        <option key={team._id} value={team._id}>{team.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Participant 1</label>
                    <select
                      value={newMatch.participant1}
                      onChange={(e) => setNewMatch({ ...newMatch, participant1: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="">Select Participant 1</option>
                      {tournament?.participants?.map(participant => (
                        <option key={participant._id} value={participant._id}>
                          {participant.user?.name || participant.user?.email || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Participant 2</label>
                    <select
                      value={newMatch.participant2}
                      onChange={(e) => setNewMatch({ ...newMatch, participant2: e.target.value })}
                      required
                      style={{
                        width: '100%',
                        padding: '0.5rem 0.75rem',
                        border: '1px solid #d1d5db',
                        borderRadius: '6px'
                      }}
                    >
                      <option value="">Select Participant 2</option>
                      {tournament?.participants?.filter(p => p._id !== newMatch.participant1).map(participant => (
                        <option key={participant._id} value={participant._id}>
                          {participant.user?.name || participant.user?.email || 'Unknown'}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Scheduled Date & Time (Optional)</label>
                <input
                  type="datetime-local"
                  value={newMatch.scheduledAt}
                  onChange={(e) => setNewMatch({ ...newMatch, scheduledAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Duration (minutes, Optional)</label>
                <input
                  type="number"
                  min="1"
                  value={newMatch.durationMinutes}
                  onChange={(e) => setNewMatch({ ...newMatch, durationMinutes: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Location (Optional)</label>
                <input
                  type="text"
                  value={newMatch.location}
                  onChange={(e) => setNewMatch({ ...newMatch, location: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px'
                  }}
                />
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600 }}>Description (Optional)</label>
                <textarea
                  value={newMatch.description}
                  onChange={(e) => setNewMatch({ ...newMatch, description: e.target.value })}
                  rows="3"
                  style={{
                    width: '100%',
                    padding: '0.5rem 0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '6px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
                <button
                  type="button"
                  onClick={() => setShowCreateMatch(false)}
                  style={{
                    background: 'white',
                    color: '#64748b',
                    border: '1px solid #d1d5db',
                    padding: '0.5rem 1rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    flex: 1
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingMatch}
                  style={{
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    padding: '0.5rem 1.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    flex: 1
                  }}
                >
                  {creatingMatch ? 'Creating...' : 'Create Match'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Winner Declaration Modal */}
      {showWinnerDeclaration && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowWinnerDeclaration(false)}>
          <div style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '12px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto',
            position: 'relative'
          }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ marginTop: 0 }}>Declare Tournament Winners</h2>
            <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>
              Manually declare the top players in this tournament (1st, 2nd, 3rd place, etc.)
            </p>

            {winners.map((winner, index) => (
              <div key={index} style={{
                marginBottom: '1rem',
                padding: '1rem',
                border: '1px solid #e2e8f0',
                borderRadius: '8px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                  <span style={{ fontWeight: 600 }}>Position {index === 0 ? '1st (Winner)' : index === 1 ? '2nd (Runner-up)' : index === 2 ? '3rd (Second Runner-up)' : `${index + 1}th`}</span>
                  {winners.length > 1 && (
                    <button 
                      onClick={() => removeWinnerPosition(index)}
                      style={{
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '0.875rem'
                      }}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div style={{ position: 'relative' }}>
                  <input
                    type="text"
                    placeholder={`Search for participant`}
                    value={winner.user ? tournament.participants.find(p => p.user._id === winner.user)?.user.name : participantSearch}
                    onChange={(e) => {
                      setParticipantSearch(e.target.value);
                      if (!e.target.value) {
                        const newWinners = [...winners];
                        newWinners[index].user = null;
                        setWinners(newWinners);
                      }
                    }}
                    style={{
                      width: '100%',
                      padding: '0.5rem 0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '6px'
                    }}
                  />
                  {participantSuggestions.length > 0 && participantSearch && !winner.user && (
                    <div style={{
                      position: 'absolute',
                      top: '100%',
                      left: 0,
                      right: 0,
                      background: 'white',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      boxShadow: '0 8px 20px rgba(0,0,0,0.08)',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      zIndex: 1000,
                      marginTop: '4px'
                    }}>
                      {participantSuggestions.map(p => (
                        <div
                          key={p.user._id}
                          onClick={() => setWinnerUser(index, p.user._id)}
                          style={{
                            padding: '8px 12px',
                            cursor: 'pointer'
                          }}
                          onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                          onMouseLeave={(e) => e.target.style.background = 'white'}
                        >
                          {p.user.name} ({p.user.email})
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
              <button
                onClick={addWinnerPosition}
                style={{
                  background: '#64748b',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem'
                }}
              >
                Add Position
              </button>
              <div style={{ flex: 1 }} />
              <button
                onClick={() => setShowWinnerDeclaration(false)}
                style={{
                  background: 'white',
                  color: '#64748b',
                  border: '1px solid #d1d5db',
                  padding: '0.5rem 1rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  marginRight: '0.5rem'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDeclareWinners}
                disabled={declaringWinners}
                style={{
                  background: '#10b981',
                  color: 'white',
                  border: 'none',
                  padding: '0.5rem 1.5rem',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {declaringWinners ? 'Declaring...' : 'Declare Winners'}
              </button>
            </div>
          </div>
        </div>
      )}

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

          {tournament.winners && tournament.winners.length > 0 && (
            <div className="info-section" style={{ background: 'linear-gradient(135deg, #fef3c7, #fde68a)' }}>
              <h3 style={{ color: '#92400e' }}>🏆 Tournament Winners</h3>
              <div className="winners-list" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '1rem',
                marginTop: '1rem'
              }}>
                {tournament.winners
                  .sort((a, b) => a.position - b.position)
                  .map((winner, index) => (
                    <div key={index} style={{
                      padding: '1rem',
                      background: 'white',
                      borderRadius: '8px',
                      border: '1px solid #f59e0b',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        marginBottom: '0.5rem'
                      }}>
                        {index === 0 && <span style={{ fontSize: '1.5rem' }}>🥇</span>}
                        {index === 1 && <span style={{ fontSize: '1.5rem' }}>🥈</span>}
                        {index === 2 && <span style={{ fontSize: '1.5rem' }}>🥉</span>}
                        {index > 2 && <span style={{ fontSize: '1.25rem' }}>🏅</span>}
                        <span style={{
                          fontWeight: 700,
                          color: '#92400e',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase'
                        }}>
                          {index === 0 ? 'Winner' : index === 1 ? 'Runner-up' : index === 2 ? 'Second Runner-up' : `${winner.position}th Place`}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>
                        {winner.user?.name || 'Unknown User'}
                      </div>
                      {winner.user?.email && (
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {winner.user.email}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}

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

          {/* Show declare winners button for organizers or organizing team members */}
          {(canEditTournament(tournament) || (tournament && isOrganizingMember())) && (
            <button 
              className="declare-winners-btn"
              onClick={() => setShowWinnerDeclaration(true)}
              style={{
                background: 'linear-gradient(135deg, #f59e0b, #d97706)',
                color: 'white',
                border: 'none',
                padding: '1rem 1.5rem',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: 600,
                cursor: 'pointer',
                width: '100%',
                marginTop: canEditTournament(tournament) ? '0.5rem' : '0'
              }}
            >
              Declare Winners
            </button>
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
            <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap: 'wrap', gap: '0.5rem'}}>
              <h3>Matches</h3>
              <div style={{display:'flex', gap:'0.5rem', flexWrap: 'wrap'}}>
                {(canEditTournament(tournament) || (tournament && isOrganizingMember())) && (
                  <button 
                    className="op-btn primary" 
                    onClick={() => setShowCreateMatch(true)}
                    style={{background: '#10b981'}}
                  >
                    Add Match
                  </button>
                )}
              {canEditTournament(tournament) && (
                <button className="op-btn" onClick={autoSchedule} disabled={scheduling}>
                  {scheduling ? 'Scheduling...' : 'Auto-schedule Round 1'}
                </button>
              )}
              </div>
            </div>
            {(tournament.matches && tournament.matches.length > 0) ? (
              <div className="matches-list">
                {tournament.matches.map((m) => {
                  const isTeam = m.matchType === 'team';
                  const left = isTeam ? (m.teams?.[0]?.name || 'Team A') : (m.participants?.[0]?.user?.name || m.participants?.[0]?.name || 'Player 1');
                  const right = isTeam ? (m.teams?.[1]?.name || 'Team B') : (m.participants?.[1]?.user?.name || m.participants?.[1]?.name || 'Player 2');
                  // Get winner information
                  let winnerName = null;
                  if (m.winner && m.winnerModel) {
                    if (m.winnerModel === 'Team') {
                      const winnerTeam = m.teams?.find(t => {
                        const tId = t._id?.toString() || (typeof t === 'string' ? t : null);
                        const wId = m.winner?.toString() || (typeof m.winner === 'string' ? m.winner : null);
                        return tId === wId;
                      });
                      winnerName = winnerTeam?.name || 'Unknown Team';
                    } else {
                      // For individual matches, winner is stored as User ID
                      // We need to find the participant whose user ID matches the winner
                      const winnerParticipant = m.participants?.find(p => {
                        const userId = p.user?._id?.toString() || (p.user && typeof p.user === 'string' ? p.user : null);
                        const participantId = p._id?.toString() || (typeof p === 'string' ? p : null);
                        const winnerId = m.winner?.toString() || (typeof m.winner === 'string' ? m.winner : null);
                        // Check both user ID and participant ID (in case backend stores participant ID)
                        return userId === winnerId || participantId === winnerId;
                      });
                      winnerName = winnerParticipant?.user?.name || winnerParticipant?.name || 'Unknown Player';
                    }
                  }

                  return (
                    <div key={m._id} className="match-card">
                      <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem'}}>
                        <div>
                          <h4 style={{margin: 0}}>Round {m.round}</h4>
                          {!(canEditTournament(tournament) || (tournament && isOrganizingMember())) && (
                            <p style={{margin: '0.25rem 0 0 0', fontSize: '0.75rem'}}>Status: {m.status}</p>
                          )}
                        </div>
                        {(canEditTournament(tournament) || (tournament && isOrganizingMember())) && (
                          <div style={{display: 'flex', alignItems: 'center', gap: '0.5rem'}}>
                            <label style={{fontSize: '0.75rem', fontWeight: 500}}>Status:</label>
                            <select
                              value={m.status || 'upcoming'}
                              onChange={(e) => updateMatchStatus(m._id, e.target.value)}
                              disabled={updatingStatus[m._id]}
                              style={{
                                padding: '0.25rem 0.5rem',
                                border: '1px solid #d1d5db',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: updatingStatus[m._id] ? 'not-allowed' : 'pointer',
                                opacity: updatingStatus[m._id] ? 0.6 : 1
                              }}
                            >
                              <option value="upcoming">Upcoming</option>
                              <option value="started">Started</option>
                              <option value="completed">Completed</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                            {updatingStatus[m._id] && (
                              <span style={{fontSize: '0.7rem', color: '#64748b'}}>Updating...</span>
                            )}
                          </div>
                        )}
                      </div>

                      {isOrganizingMember() ? (
                        <table className="match-table">
                          <thead>
                            <tr>
                              <th>Participant 1</th>
                              <th>Score</th>
                              <th>Participant 2</th>
                              <th>Score</th>
                              <th>Winner</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{fontWeight: 600}}>
                                {isTeam ? (m.teams?.[0]?.name || 'Team A') : (m.participants?.[0]?.user?.name || m.participants?.[0]?.name || 'Player 1')}
                              </td>
                              <td>
                                <div className="score-input-group">
                                  <input
                                    type="number"
                                    className="score-input"
                                    placeholder="0"
                                    value={(matchScores[m._id]?.[isTeam ? m.teams?.[0]?._id : m.participants?.[0]?.user?._id] ?? '')}
                                    onChange={(e) => setLocalScore(m._id, isTeam ? m.teams?.[0]?._id : m.participants?.[0]?.user?._id, e.target.value)}
                                  />
                                  <button
                                    className="update-score-btn"
                                    disabled={updatingScores[m._id]}
                                    onClick={() => updateMatchScore(
                                      m._id,
                                      isTeam ? undefined : m.participants?.[0]?.user?._id,
                                      isTeam ? m.teams?.[0]?._id : undefined,
                                      Number(matchScores[m._id]?.[isTeam ? m.teams?.[0]?._id : m.participants?.[0]?.user?._id] || 0),
                                      {}
                                    )}
                                    style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}
                                  >Save</button>
                                </div>
                              </td>
                              <td style={{fontWeight: 600}}>
                                {isTeam ? (m.teams?.[1]?.name || 'Team B') : (m.participants?.[1]?.user?.name || m.participants?.[1]?.name || 'Player 2')}
                              </td>
                              <td>
                                <div className="score-input-group">
                                  <input
                                    type="number"
                                    className="score-input"
                                    placeholder="0"
                                    value={(matchScores[m._id]?.[isTeam ? m.teams?.[1]?._id : m.participants?.[1]?.user?._id] ?? '')}
                                    onChange={(e) => setLocalScore(m._id, isTeam ? m.teams?.[1]?._id : m.participants?.[1]?.user?._id, e.target.value)}
                                  />
                                  <button
                                    className="update-score-btn"
                                    disabled={updatingScores[m._id]}
                                    onClick={() => updateMatchScore(
                                      m._id,
                                      isTeam ? undefined : m.participants?.[1]?.user?._id,
                                      isTeam ? m.teams?.[1]?._id : undefined,
                                      Number(matchScores[m._id]?.[isTeam ? m.teams?.[1]?._id : m.participants?.[1]?.user?._id] || 0),
                                      {}
                                    )}
                                    style={{padding: '0.25rem 0.5rem', fontSize: '0.75rem'}}
                                  >Save</button>
                                </div>
                              </td>
                              <td style={{fontWeight: winnerName ? 600 : 400, color: winnerName ? '#10b981' : '#64748b'}}>
                                {winnerName || '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="match-table">
                          <thead>
                            <tr>
                              <th>Participant 1</th>
                              <th>Score</th>
                              <th>Participant 2</th>
                              <th>Score</th>
                              <th>Winner</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td style={{fontWeight: 600}}>
                                {isTeam ? (m.teams?.[0]?.name || 'Team A') : (m.participants?.[0]?.user?.name || m.participants?.[0]?.name || 'Player 1')}
                              </td>
                              <td>
                                {matchScores[m._id]?.[isTeam ? m.teams?.[0]?._id : m.participants?.[0]?.user?._id] ?? '-'}
                              </td>
                              <td style={{fontWeight: 600}}>
                                {isTeam ? (m.teams?.[1]?.name || 'Team B') : (m.participants?.[1]?.user?.name || m.participants?.[1]?.name || 'Player 2')}
                              </td>
                              <td>
                                {matchScores[m._id]?.[isTeam ? m.teams?.[1]?._id : m.participants?.[1]?.user?._id] ?? '-'}
                              </td>
                              <td style={{fontWeight: winnerName ? 600 : 400, color: winnerName ? '#10b981' : '#64748b'}}>
                                {winnerName || '-'}
                              </td>
                            </tr>
                          </tbody>
                        </table>
                      )}

                      {isOrganizingMember() && (
                        <div style={{display:'flex', gap:'6px', marginTop:'0.75rem', flexWrap:'wrap'}}>
                          <button 
                            className="op-btn" 
                            disabled={updatingScores[m._id]} 
                            onClick={() => declareWinner(m._id)}
                            style={{padding: '0.5rem 0.75rem', fontSize: '0.75rem'}}
                          >
                            Auto declare winner
                          </button>
                          {isTeam ? (
                            <>
                              <button 
                                className="op-btn primary" 
                                disabled={updatingScores[m._id]} 
                                onClick={() => declareWinner(m._id, m.teams?.[0]?._id, 'Team')}
                                style={{padding: '0.5rem 0.75rem', fontSize: '0.75rem'}}
                              >
                                Set {m.teams?.[0]?.name || 'Team A'} as Winner
                              </button>
                              <button 
                                className="op-btn primary" 
                                disabled={updatingScores[m._id]} 
                                onClick={() => declareWinner(m._id, m.teams?.[1]?._id, 'Team')}
                                style={{padding: '0.5rem 0.75rem', fontSize: '0.75rem'}}
                              >
                                Set {m.teams?.[1]?.name || 'Team B'} as Winner
                              </button>
                            </>
                          ) : (
                            <>
                              <button 
                                className="op-btn primary" 
                                disabled={updatingScores[m._id]} 
                                onClick={() => {
                                  // Pass user ID for individual matches
                                  const userId = m.participants?.[0]?.user?._id || m.participants?.[0]?.user;
                                  declareWinner(m._id, userId, 'User');
                                }}
                                style={{padding: '0.5rem 0.75rem', fontSize: '0.75rem'}}
                              >
                                Set {m.participants?.[0]?.user?.name || 'Player 1'} as Winner
                              </button>
                              <button 
                                className="op-btn primary" 
                                disabled={updatingScores[m._id]} 
                                onClick={() => {
                                  // Pass user ID for individual matches
                                  const userId = m.participants?.[1]?.user?._id || m.participants?.[1]?.user;
                                  declareWinner(m._id, userId, 'User');
                                }}
                                style={{padding: '0.5rem 0.75rem', fontSize: '0.75rem'}}
                              >
                                Set {m.participants?.[1]?.user?.name || 'Player 2'} as Winner
                              </button>
                            </>
                          )}
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
