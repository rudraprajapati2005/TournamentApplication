import React, { useEffect, useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import './Dashboard.css';
import defaultPic from './defaultProfilePic.png';
import EditProfile from './EditProfile.js';
import TournamentsOrganized from '../components/TournamentsOrganized.jsx';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../utils/api.js';

const RoleSwitcher = () => {
  const { user, checkRoleSwitchEligibility, switchUserRole } = useAuth();
  const [canSwitch, setCanSwitch] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    checkSwitchEligibility();
  }, [user?.role]);

  const checkSwitchEligibility = async () => {
    const result = await checkRoleSwitchEligibility();
    setCanSwitch(result.canSwitch);
    if (!result.canSwitch && result.reason) {
      setMessage(result.reason);
    }
  };

  const handleRoleSwitch = async () => {
    setLoading(true);
    try {
      const result = await switchUserRole();
      if (result.success) {
        setMessage(`Successfully switched to ${result.newRole}`);
        setShowConfirm(false);
      } else {
        setMessage(result.message || 'Failed to switch role');
      }
    } catch (error) {
      setMessage('An error occurred while switching roles');
    }
    setLoading(false);
  };

  if (showConfirm) {
    return (
      <div className="role-confirmation">
        <p>Are you sure you want to switch to {user?.role === 'participant' ? 'Organizer' : 'Participant'} role?</p>
        <div className="button-group">
          <button 
            className="dashboard-button"
            onClick={handleRoleSwitch}
            disabled={loading}
          >
            {loading ? 'Switching...' : 'Yes, Switch Role'}
          </button>
          <button 
            className="dashboard-button cancel"
            onClick={() => setShowConfirm(false)}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="role-switcher">
      {message && <p className="role-message">{message}</p>}
      <button
        className="dashboard-button switch-role"
        onClick={() => setShowConfirm(true)}
        disabled={!canSwitch || loading}
        title={!canSwitch ? message : `Switch to ${user?.role === 'participant' ? 'Organizer' : 'Participant'} role`}
      >
        Switch to {user?.role === 'participant' ? 'Organizer' : 'Participant'}
      </button>
    </div>
  );
};

const Dashboard = () => {
  const { user, setUser, checkAuthStatus, refreshTrigger } = useAuth();
  const location = useLocation();
  const [sportsData, setSportsData] = useState([]);
  const [editing, setEditing] = useState(false);
  const [availableTournaments, setAvailableTournaments] = useState([]);
  const [participatedTournaments, setParticipatedTournaments] = useState([]);
  const [participationLoading, setParticipationLoading] = useState({});
  const [dataLoading, setDataLoading] = useState(false);
  const [myTeams, setMyTeams] = useState([]);
  const organizingTeams = myTeams.filter(t => t.isOrganizing);
  const regularTeams = myTeams.filter(t => !t.isOrganizing);

  useEffect(() => {
    // Set profile picture if not already set
    if (user) {
      const profilePic = user.profile_pic || defaultPic;
      if (user.profile_pic !== profilePic) {
        setUser({ ...user, profile_pic: profilePic });
      }
    }
  }, []);

  // Load my teams
  useEffect(() => {
    const loadTeams = async () => {
      try {
        const data = await api.get('/teams/mine');
        setMyTeams(data.teams || []);
      } catch (e) {
        setMyTeams([]);
      }
    };
    if (user) loadTeams();
  }, [user]);

  useEffect(() => {
    fetch('http://localhost:8080/sports/detailed')
      .then(res => res.json())
      .then(data => setSportsData(data))
      .catch(err => console.error('Error fetching sports data:', err));
  }, []);

  // Fetch available tournaments for participation
  useEffect(() => {
    if (user && user.role === 'participant') {
      fetchAvailableTournaments();
      fetchParticipatedTournaments();
    }
  }, [user]);

  // Refresh data when refreshTrigger changes
  useEffect(() => {
    if (user && user.role === 'participant' && refreshTrigger > 0) {
      fetchAvailableTournaments();
      fetchParticipatedTournaments();
    }
  }, [refreshTrigger, user]);

  // Refresh data when user navigates to dashboard
  useEffect(() => {
    if (user && user.role === 'participant' && location.pathname === '/dashboard') {
      fetchAvailableTournaments();
      fetchParticipatedTournaments();
    }
  }, [location.pathname, user]);

  // Refresh data when component becomes visible (user navigates to dashboard)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user && user.role === 'participant') {
        fetchAvailableTournaments();
        fetchParticipatedTournaments();
      }
    };

    const handleFocus = () => {
      if (user && user.role === 'participant') {
        fetchAvailableTournaments();
        fetchParticipatedTournaments();
      }
    };

    // Listen for visibility changes and window focus
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    // Also refresh when component mounts (in case user navigated from another page)
    if (user && user.role === 'participant') {
      fetchAvailableTournaments();
      fetchParticipatedTournaments();
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const fetchAvailableTournaments = async () => {
    try {
      setDataLoading(true);
      const response = await fetch('http://localhost:8080/tournaments/available', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setAvailableTournaments(data.tournaments);
      }
    } catch (error) {
      console.error('Error fetching available tournaments:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchParticipatedTournaments = async () => {
    try {
      setDataLoading(true);
      const response = await fetch('http://localhost:8080/tournaments/participated', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.success) {
        setParticipatedTournaments(data.tournaments);
      }
    } catch (error) {
      console.error('Error fetching participated tournaments:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const joinTournament = async (tournamentId) => {
    setParticipationLoading(prev => ({ ...prev, [tournamentId]: true }));
    
    try {
      const response = await fetch(`http://localhost:8080/tournaments/${tournamentId}/join`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Successfully joined tournament!');
        // Refresh available tournaments
        await fetchAvailableTournaments();
        // Refresh participated tournaments
        await fetchParticipatedTournaments();
        // Refresh user data to update participation stats
        await checkAuthStatus();
      } else {
        alert(data.message || 'Failed to join tournament');
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('Failed to join tournament. Please try again.');
    } finally {
      setParticipationLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  const leaveTournament = async (tournamentId) => {
    setParticipationLoading(prev => ({ ...prev, [tournamentId]: true }));
    
    try {
      const response = await fetch(`http://localhost:8080/tournaments/${tournamentId}/leave`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        alert('Successfully left tournament');
        // Refresh available tournaments
        await fetchAvailableTournaments();
        // Refresh participated tournaments
        await fetchParticipatedTournaments();
        // Refresh user data to update participation stats
        await checkAuthStatus();
      } else {
        alert(data.message || 'Failed to leave tournament');
      }
    } catch (error) {
      console.error('Error leaving tournament:', error);
      alert('Failed to leave tournament. Please try again.');
    } finally {
      setParticipationLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  const handleSave = async (updated) => {
    try {
      const res = await fetch('http://localhost:8080/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updated),
      });
      const data = await res.json();
      if (data.success) {
        setUser(data.user);
        await checkAuthStatus(); // Refresh the auth context
      } else {
        alert(data.error || 'Failed to update profile');
      }
    } catch (err) {
      alert('Failed to update profile');
    }
    setEditing(false);
  };


  
  if (editing) {
    return <EditProfile user={user} onSave={handleSave} />;
  }

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="profile-section">
          <img src={user?.profile_pic || user?.profilePic || defaultPic} alt="Profile" className="profile-pic" />
          <h2>{user?.name || 'Guest'}</h2>
          <p>{user?.email}</p>
          <p><strong>Date of Birth:</strong> {user?.dob ? new Date(user.dob).toLocaleDateString() : 'N/A'}</p>
          <p><strong>Gender:</strong> {user?.gender || 'N/A'}</p>
          <p><strong>Age:</strong> {user?.dob ? Math.max(0, new Date().getFullYear() - new Date(user.dob).getFullYear() - (new Date().getMonth() < new Date(user.dob).getMonth() || (new Date().getMonth() === new Date(user.dob).getMonth() && new Date().getDate() < new Date(user.dob).getDate()) ? 1 : 0)) : 'N/A'}</p>
          <p><strong>Role:</strong> {user?.role || 'N/A'}</p>
          <div className="profile-actions">
            <button className="dashboard-button" onClick={() => setEditing(true)}>Edit Profile</button>
            <RoleSwitcher />
          </div>
        </div>
      </aside>

      <main className="main-content">
        <h1>Welcome to Your Dashboard</h1>

        {/* Your Organizing Team */}
        {organizingTeams.length > 0 && (
          <section className="organizing-team-section">
            <h2>Your Organizing Team</h2>
            <div className="tournament-grid">
              {organizingTeams.map((team) => (
                <div key={team._id} className="tournament-card">
                  <div className="tournament-card-header">
                    <h3>{team.name}</h3>
                    <span className="status-badge ongoing">Organizing</span>
                  </div>
                  <div className="tournament-info">
                    <p><strong>Tournament:</strong> {team.tournament?.name || '—'}</p>
                    <p><strong>Created:</strong> {team.createdAt ? new Date(team.createdAt).toLocaleDateString() : '—'}</p>
                    <p><strong>Leader:</strong> {team.leader?.name || '—'}</p>
                    <p><strong>Members:</strong> {team.members?.length || 0}</p>
                    {team.tournament?.description && (
                      <p className="muted"><strong>Description:</strong> {team.tournament.description.length > 100 ? `${team.tournament.description.slice(0,100)}...` : team.tournament.description}</p>
                    )}
                  </div>
                  <div className="tournament-footer">
                    <Link to={`/tournament/${team.tournament?._id}`} className="view-details-button">View in detail</Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* My Teams (excluding organizing teams) */}
        {regularTeams.length > 0 && (
          <section className="my-teams-section">
            <h2>My Teams</h2>
            <div className="tournament-grid">
              {regularTeams.map((team) => (
                <div key={team._id} className="tournament-card">
                  <div className="tournament-card-header">
                    <h3>{team.name}</h3>
                    <span className="status-badge upcoming">{team.isRegistered ? 'Registered' : 'Draft'}</span>
                  </div>
                  <div className="tournament-info">
                    <p><strong>Tournament:</strong> {team.tournament?.name || '—'}</p>
                    <p><strong>Leader:</strong> {team.leader?.name || '—'}</p>
                    <p><strong>Members:</strong> {team.members?.length || 0}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
        
        {/* Tournament Statistics */}
        <section className="stats-section">
          <h2>Your Tournament Statistics</h2>
          {user?.participationSummary?.stats ? (
            <div className="stats-grid">
              <div className="stat-card">
                <h3>Total Matches</h3>
                <p>{user.participationSummary.stats.totalMatches || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Matches Won</h3>
                <p>{user.participationSummary.stats.totalWins || 0}</p>
              </div>
              <div className="stat-card">
                <h3>Win Rate</h3>
                <p>
                  {user.participationSummary.stats.totalMatches > 0
                    ? ((user.participationSummary.stats.totalWins / user.participationSummary.stats.totalMatches) * 100).toFixed(1)
                    : '0.0'}%
                </p>
              </div>
              <div className="stat-card">
                <h3>Active Tournaments</h3>
                <p>{user.participationSummary.stats.activeTournaments || 0}</p>
              </div>
            </div>
          ) : (
            <p>No tournament statistics available</p>
          )}
        </section>

        {/* Individual Tournaments */}
        <section className="tournaments-section">

          <div className='individualTournament'>
            <div
              style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', fontSize: '20px', color: '#050f19ff' , width:'100%'}}
              onClick={()=>{
                const individualTournamentContent = document.querySelector('.individualTournamentContent');
                individualTournamentContent.style.display = 'block';  
              }}
            >
              Individual Tournaments
              <span style={{color: '#1976d2', fontWeight: '999', fontSize: '25px', paddingRight: '2%'}}>
                &gt;
              </span>
            </div>
          </div>
          <div className='individualTournamentContent' style={{display:'none'}}>
            <div className="modal-content">
              <div className="modal-header">
                <h2>Individual Tournaments</h2>
                <button className="close-button" onClick={() => {
                  const individualTournamentContent = document.querySelector('.individualTournamentContent');
                  individualTournamentContent.style.display = 'none';
                }}>×</button>
              </div>
              <div className="modal-body">
                {user?.participationSummary?.singleTournaments?.length > 0 ? (
                  <div className="tournament-grid">
                    {user.participationSummary.singleTournaments.map((participation, index) => (
                      <div key={index} className="tournament-card">
                        <h3>{participation?.tournament?.name || 'Unknown Tournament'}</h3>
                        <p>Status: {participation?.status || 'Unknown'}</p>
                        <p>Matches Played: {participation?.matchesPlayed || 0}</p>
                        <p>Matches Won: {participation?.matchesWon || 0}</p>
                        <p>Current Round: {participation?.currentRound || 1}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-tournaments">No individual tournaments found</p>
                )}
              </div>
            </div>
          </div>
          {user?.participationSummary?.singleTournaments?.length > 0 ? (
            <div className="tournament-grid">
              {user.participationSummary.singleTournaments.map((participation, index) => (
                <div key={index} className="tournament-card">
                  <h3>{participation?.tournament?.name || 'Unknown Tournament'}</h3>
                  <p>Status: {participation?.status || 'Unknown'}</p>
                  <p>Matches Played: {participation?.matchesPlayed || 0}</p>
                  <p>Matches Won: {participation?.matchesWon || 0}</p>
                  <p>Current Round: {participation?.currentRound || 1}</p>
                </div>
              ))}
            </div>
          ) : (
            <p>No individual tournaments found</p>
          )}
        </section>

        {/* Team Tournaments */}
        <section className="tournaments-section">
          <div className='tournament-header-container' style={{cursor: 'pointer'}} >
            <div
              style={{display:'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 10px', fontSize: '20px', color: '#050f19ff' , width:'100%'}}
              onClick={()=>{
                const teamTournamentContent = document.querySelector('.teamTournamentContent');
                teamTournamentContent.style.display = 'block';  
              }}
            >
              Team Tournaments
              <span style={{color: '#1976d2', fontWeight: '999', fontSize: '25px', paddingRight: '2%'}}>
                &gt;
              </span>
            </div>
          </div>
          <div className='teamTournamentContent' style={{display:'none'}}>
            <div className="modal-content">
              <div className="modal-header" >
                <h2>Team Tournaments</h2>
                <button className="close-button" onClick={() => {
                  const teamTournamentContent = document.querySelector('.teamTournamentContent');
                  teamTournamentContent.style.display = 'none';
                }}>×</button>
              </div>
              <div className="modal-body">
                {user?.participationSummary?.teamTournaments?.length > 0 ? (
                  <div className="tournament-grid">
                    {user.participationSummary.teamTournaments.map((participation, index) => (
                      <div key={index} className="tournament-card">
                        <h3>{participation?.tournament?.name || 'Unknown Tournament'}</h3>
                        <p>Team Size: {participation?.tournament?.format?.playersPerTeam || 'Unknown'}</p>
                        <p>Status: {participation?.status || 'Unknown'}</p>
                        <p>Matches Played: {participation?.matchesPlayed || 0}</p>
                        <p>Matches Won: {participation?.matchesWon || 0}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-tournaments">No team tournaments found</p>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Available Tournaments Section - Only for Participants */}
        {user?.role === 'participant' && (
          <section className="available-tournaments-section">
            <h2>Available Tournaments</h2>
            {dataLoading ? (
              <div className="loading-message">Loading available tournaments...</div>
            ) : availableTournaments.length > 0 ? (
              <div className="tournament-grid">
                {availableTournaments.map((tournament, index) => {
                  const isLoading = participationLoading[tournament._id] || false;
                  const isRegistrationOpen = tournament.status === 'upcoming' && 
                                            new Date() <= new Date(tournament.registrationDeadline) &&
                                            tournament.currentParticipants < tournament.participantsLimit;
                  
                  return (
                    <div key={index} className="tournament-card">
                      <div className="tournament-card-header">
                        <h3>{tournament.name}</h3>
                        <span className={`status-badge ${tournament.status?.toLowerCase() || 'upcoming'}`}>
                          {tournament.status || 'Upcoming'}
                        </span>
                      </div>
                      <div className="tournament-info">
                        <p><strong>Sport:</strong> {tournament.sportType}</p>
                        <p><strong>Format:</strong> {tournament.format?.type || 'N/A'}</p>
                        <p><strong>Start Date:</strong> {new Date(tournament.date).toLocaleDateString()}</p>
                        <p><strong>Registration Deadline:</strong> {new Date(tournament.registrationDeadline).toLocaleDateString()}</p>
                        <p><strong>Players:</strong> {tournament.currentParticipants}/{tournament.participantsLimit}</p>
                        <p><strong>Prize Pool:</strong> ₹{tournament.prizePool}</p>
                        <p><strong>Location:</strong> {tournament.location}</p>
                      </div>
                      <div className="tournament-footer">
                        {tournament.isParticipating ? (
                          <button 
                            className="leave-button"
                            onClick={() => leaveTournament(tournament._id)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Leaving...' : 'Leave Tournament'}
                          </button>
                        ) : (
                          <button 
                            className="join-tournament-button"
                            onClick={() => joinTournament(tournament._id)}
                            disabled={!tournament.canJoin || isLoading || !isRegistrationOpen}
                          >
                            {isLoading ? 'Joining...' : 
                             !isRegistrationOpen ? 'Registration Closed' : 
                             'Join Tournament'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>No available tournaments at the moment</p>
            )}
          </section>
        )}

        {/* Participated Tournaments Section - Only for Participants */}
        {user?.role === 'participant' && (
          <section className="participated-tournaments-section">
            <h2>My Tournament Participations</h2>
            {dataLoading ? (
              <div className="loading-message">Loading your participations...</div>
            ) : participatedTournaments.length > 0 ? (
              <div className="tournament-grid">
                {participatedTournaments.map((tournament, index) => {
                  const isLoading = participationLoading[tournament._id] || false;
                  const participation = tournament.participation;
                  const canLeave = tournament.status === 'upcoming' && 
                                  new Date() <= new Date(tournament.registrationDeadline);
                  
                  return (
                    <div key={index} className="tournament-card participated-card">
                      <div className="tournament-card-header">
                        <h3>{tournament.name}</h3>
                        <div className="participation-status">
                          <span className={`status-badge ${tournament.status?.toLowerCase() || 'upcoming'}`}>
                            {tournament.status || 'Upcoming'}
                          </span>
                          <span className={`participation-badge ${participation?.status || 'registered'}`}>
                            {participation?.status || 'Registered'}
                          </span>
                        </div>
                      </div>
                      <div className="tournament-info">
                        <p><strong>Sport:</strong> {tournament.sportType}</p>
                        <p><strong>Format:</strong> {tournament.format?.type || 'N/A'}</p>
                        <p><strong>Start Date:</strong> {new Date(tournament.date).toLocaleDateString()}</p>
                        <p><strong>Registration Date:</strong> {new Date(participation?.registrationDate).toLocaleDateString()}</p>
                        <p><strong>Players:</strong> {tournament.currentParticipants}/{tournament.participantsLimit}</p>
                        <p><strong>Prize Pool:</strong> ₹{tournament.prizePool}</p>
                        <p><strong>Location:</strong> {tournament.location}</p>
                        {participation && (
                          <>
                            <p><strong>Current Round:</strong> {participation.currentRound || 1}</p>
                            <p><strong>Matches Played:</strong> {participation.matchesPlayed || 0}</p>
                            <p><strong>Matches Won:</strong> {participation.matchesWon || 0}</p>
                            {participation.totalScore > 0 && (
                              <p><strong>Total Score:</strong> {participation.totalScore}</p>
                            )}
                          </>
                        )}
                      </div>
                      <div className="tournament-footer">
                        <Link to={`/tournament/${tournament._id}`} className="view-details-button">View Details</Link>
                        {canLeave && (
                          <button 
                            className="leave-button"
                            onClick={() => leaveTournament(tournament._id)}
                            disabled={isLoading}
                          >
                            {isLoading ? 'Leaving...' : 'Leave Tournament'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p>You haven't participated in any tournaments yet</p>
            )}
          </section>
        )}

        {/* Tournaments Organized Section - Only for Organizers */}
        {user?.role === 'Organizer' && (
          <section className="tournaments-organized-section">
            <TournamentsOrganized />
          </section>
        )}

        {/* Sports Data Section */}
        <section className="sports-section">
          <h2>Available Sports</h2>
          {sportsData.length > 0 ? (
            <ul className="sports-list">
              {sportsData.map((sport, index) => (
                <li key={index} className="sport-item">
                  <strong>{sport?.name || "NO"}</strong>: {sport?.details || "No details available"}
                </li>
              ))}
            </ul>
          ) : (
            <p>Loading sports data...</p>
          )}
        </section>
      </main>
    </div>
  );
};

export default Dashboard;