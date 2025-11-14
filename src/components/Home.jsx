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
  const [allTournaments, setAllTournaments] = useState([]);
  const [showAllTournaments, setShowAllTournaments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [allTournamentsLoading, setAllTournamentsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [participationStatus, setParticipationStatus] = useState({});
  const [actionLoading, setActionLoading] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('date-desc');

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

  // Function to fetch all tournaments
  const fetchAllTournaments = async () => {
    try {
      setAllTournamentsLoading(true);
      setError(null);
      
      const data = await api.get('/tournaments');
      const allTournamentsList = data.success ? data.tournaments : [];
      
      setAllTournaments(allTournamentsList);
      setShowAllTournaments(true);

      // Check participation status for all tournaments
      if (user) {
        allTournamentsList.forEach(tournament => {
          checkParticipationStatus(tournament._id);
        });
      }
    } catch (error) {
      console.error('Error fetching all tournaments:', error);
      setError('Failed to load tournaments. Please try again later.');
    } finally {
      setAllTournamentsLoading(false);
    }
  };

  // Function to handle view all button click
  const handleViewAll = () => {
    if (!showAllTournaments) {
      fetchAllTournaments();
    } else {
      setShowAllTournaments(false);
    }
  };

  useEffect(() => {
    fetchTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only fetch on mount, user check is inside fetchTournaments

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

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Filter and sort tournaments
  const getFilteredAndSortedTournaments = () => {
    let filtered = [...allTournaments];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(tournament => 
        tournament.name.toLowerCase().includes(query) ||
        tournament.sportType?.toLowerCase().includes(query) ||
        tournament.location?.toLowerCase().includes(query) ||
        tournament.status?.toLowerCase().includes(query)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '');
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '');
        case 'date-asc':
          const dateA = new Date(a.startDate || a.date || 0);
          const dateB = new Date(b.startDate || b.date || 0);
          return dateA - dateB;
        case 'date-desc':
          const dateA2 = new Date(a.startDate || a.date || 0);
          const dateB2 = new Date(b.startDate || b.date || 0);
          return dateB2 - dateA2;
        case 'participants-asc':
          return (a.currentParticipants || 0) - (b.currentParticipants || 0);
        case 'participants-desc':
          return (b.currentParticipants || 0) - (a.currentParticipants || 0);
        case 'status-asc':
          return (a.status || '').localeCompare(b.status || '');
        case 'status-desc':
          return (b.status || '').localeCompare(a.status || '');
        default:
          return 0;
      }
    });

    return filtered;
  };

  const filteredAndSortedTournaments = getFilteredAndSortedTournaments();

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
      ) : showAllTournaments ? (
        <section className="all-tournaments-section">
          <div className="section-header">
            <h2>All Tournaments</h2>
            <button className="view-all-button" onClick={handleViewAll}>
              Back to Home
            </button>
          </div>
          
          {/* Search and Sort Controls */}
          <div className="search-sort-controls">
            <div className="search-container">
              <input
                type="text"
                placeholder="Search tournaments by name, sport, location, or status..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search-button"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  ×
                </button>
              )}
            </div>
            <div className="sort-container">
              <label htmlFor="sort-select" className="sort-label">Sort by:</label>
              <select
                id="sort-select"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="participants-desc">Participants (High to Low)</option>
                <option value="participants-asc">Participants (Low to High)</option>
                <option value="status-asc">Status (A-Z)</option>
                <option value="status-desc">Status (Z-A)</option>
              </select>
            </div>
          </div>

          {allTournamentsLoading ? (
            <div className="loading-message">Loading all tournaments...</div>
          ) : (
            <>
              {searchQuery && (
                <div className="search-results-info">
                  Showing {filteredAndSortedTournaments.length} of {allTournaments.length} tournaments
                </div>
              )}
              <div className="tournaments-table-container">
                <table className="tournaments-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Date</th>
                      <th>Participants</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAndSortedTournaments && filteredAndSortedTournaments.length > 0 ? (
                      filteredAndSortedTournaments.map((tournament) => (
                        <tr key={tournament._id}>
                          <td className="tournament-name">{tournament.name}</td>
                          <td>{formatDate(tournament.startDate || tournament.date)}</td>
                          <td>
                            {tournament.currentParticipants || 0} / {tournament.participantsLimit}
                          </td>
                          <td>
                            <span className={`status-badge ${tournament.status?.toLowerCase() || 'upcoming'}`}>
                              {tournament.status || 'Upcoming'}
                            </span>
                          </td>
                          <td>
                            <Link 
                              to={`/tournament/${tournament._id}`} 
                              className="view-details-button"
                            >
                              View Details
                            </Link>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="5" className="no-tournaments-cell">
                          {searchQuery ? 'No tournaments found matching your search' : 'No tournaments available'}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </section>
      ) : loading ? (
        <div className="loading-message">
          Loading tournaments...
        </div>
      ) : (
        <>
          <section className="featured-section">
            <div className="section-header">
              <h2>Latest Tournaments</h2>
              <button className="view-all-button" onClick={handleViewAll}>
                View All
              </button>
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
              <button className="view-all-button" onClick={handleViewAll}>
                View All
              </button>
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
