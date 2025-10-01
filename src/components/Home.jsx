import React, { useState, useEffect } from 'react';
import { api } from '../utils/api.js';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './Home.css';

const Home = () => {
  const { user, triggerRefresh } = useAuth();
  const [tournaments, setTournaments] = useState({
    latest: [],
    ongoing: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [participationStatus, setParticipationStatus] = useState({});
  const [actionLoading, setActionLoading] = useState({});

  // Function to check participation status for a tournament
  const checkParticipationStatus = async (tournamentId) => {
    if (!user) return;
    
    try {
      const data = await api.get(`/tournaments/${tournamentId}/participation-status`);
      
      if (data.success) {
        setParticipationStatus(prev => ({
          ...prev,
          [tournamentId]: data
        }));
      }
    } catch (error) {
      console.error('Error checking participation status:', error);
    }
  };

  // Function to join a tournament
  const joinTournament = async (tournamentId) => {
    if (!user) {
      alert('Please log in to join tournaments');
      return;
    }

    setActionLoading(prev => ({ ...prev, [tournamentId]: true }));
    
    try {
      const data = await api.post(`/tournaments/${tournamentId}/join`);
      
      if (data.success) {
        alert('Successfully joined tournament!');
        // Refresh participation status
        await checkParticipationStatus(tournamentId);
        // Refresh tournaments to update participant count
        fetchTournaments();
        // Trigger dashboard refresh with a small delay to ensure API calls complete
        setTimeout(() => {
          triggerRefresh();
        }, 500);
      } else {
        alert(data.message || 'Failed to join tournament');
      }
    } catch (error) {
      console.error('Error joining tournament:', error);
      alert('Failed to join tournament. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  // Function to leave a tournament
  const leaveTournament = async (tournamentId) => {
    if (!user) return;

    setActionLoading(prev => ({ ...prev, [tournamentId]: true }));
    
    try {
      const data = await api.post(`/tournaments/${tournamentId}/leave`);
      
      if (data.success) {
        alert('Successfully left tournament');
        // Refresh participation status
        await checkParticipationStatus(tournamentId);
        // Refresh tournaments to update participant count
        fetchTournaments();
        // Trigger dashboard refresh with a small delay to ensure API calls complete
        setTimeout(() => {
          triggerRefresh();
        }, 500);
      } else {
        alert(data.message || 'Failed to leave tournament');
      }
    } catch (error) {
      console.error('Error leaving tournament:', error);
      alert('Failed to leave tournament. Please try again.');
    } finally {
      setActionLoading(prev => ({ ...prev, [tournamentId]: false }));
    }
  };

  // Function to fetch tournaments
  const fetchTournaments = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const latestData = await api.get('/tournaments/latest');
      const ongoingData = await api.get('/tournaments/ongoing');

      // Log the data for debugging
      console.log('Latest tournaments:', latestData);
      console.log('Ongoing tournaments:', ongoingData);

      // api.get throws on !ok

      const latestTournaments = latestData.success ? latestData.tournaments : [];
      const ongoingTournaments = ongoingData.success ? ongoingData.tournaments : [];

      setTournaments({
        latest: latestTournaments,
        ongoing: ongoingTournaments
      });

      // Check participation status for all tournaments
      if (user) {
        [...latestTournaments, ...ongoingTournaments].forEach(tournament => {
          checkParticipationStatus(tournament._id);
        });
      }
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      setError('Failed to load tournaments. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
  }, [user]);

  const TournamentCard = ({ tournament }) => {
    const canEdit = user && 
      user.role === 'Organizer' && 
      tournament.organizer && 
      tournament.organizer._id === user._id &&
      tournament.status !== 'ongoing' && 
      tournament.status !== 'completed';

    const participation = participationStatus[tournament._id];
    const isParticipating = participation?.isParticipating || false;
    const canJoin = participation?.canJoin || false;
    const isLoading = actionLoading[tournament._id] || false;
    const isRegistrationOpen = tournament.status === 'upcoming' && 
                              new Date() <= new Date(tournament.registrationDeadline) &&
                              tournament.currentParticipants < tournament.participantsLimit;

    return (
      <div className="tournament-card">
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
          <Link to={`/tournament/${tournament._id}`} className="join-button">View Details</Link>

          {/* Participation buttons for participants */}
          {user && user.role === 'participant' && tournament.status === 'upcoming' && (
            <>
              {isParticipating ? (
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
                  disabled={!canJoin || isLoading || !isRegistrationOpen}
                >
                  {isLoading ? 'Joining...' : 
                   !isRegistrationOpen ? 'Registration Closed' : 
                   'Join Tournament'}
                </button>
              )}
            </>
          )}

          {/* Manage/Edit for organizers of this tournament */}
          {user && user.role === 'Organizer' && tournament.organizer && tournament.organizer._id === user._id && (
            <Link 
              to={canEdit ? `/edit-tournament/${tournament._id}` : `/tournament/${tournament._id}`}
              className={`edit-button ${canEdit ? '' : 'disabled'}`}
              title={canEdit ? 'Edit tournament' : `Cannot edit ${tournament.status} tournament`}
            >
              {canEdit ? 'Edit Tournament' : 'Manage'}
            </Link>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="home-container">
      <header className="hero-section">
        <h1>Welcome to Tournament Hub</h1>
        <p>Join exciting tournaments and compete with players worldwide</p>
      </header>

      {error ? (
        <div className="error-message">
          {error}
        </div>
      ) : loading ? (
        <div className="loading-message">
          Loading tournaments...
        </div>
      ) : (
        <>
          <section className="featured-section">
            <div className="section-header">
              <h2>Latest Tournaments</h2>
              <button className="view-all-button">View All</button>
            </div>
            <div className="tournaments-grid">
              {tournaments.latest && tournaments.latest.length > 0 ? (
                tournaments.latest.map((tournament, index) => (
                  <TournamentCard key={`latest-${index}`} tournament={tournament} />
                ))
              ) : (
                <p className="no-tournaments">No tournaments available</p>
              )}
            </div>
          </section>

          <section className="featured-section">
            <div className="section-header">
              <h2>Ongoing Tournaments</h2>
              <button className="view-all-button">View All</button>
            </div>
            <div className="tournaments-grid">
              {tournaments.ongoing && tournaments.ongoing.length > 0 ? (
                tournaments.ongoing.map((tournament, index) => (
                  <TournamentCard key={`ongoing-${index}`} tournament={tournament} />
                ))
              ) : (
                <p className="no-tournaments">No ongoing tournaments</p>
              )}
            </div>
          </section>
        </>
      )}
    </div>
  );
};

export default Home;
