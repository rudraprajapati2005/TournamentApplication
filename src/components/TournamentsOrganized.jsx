import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api.js';
import './TournamentsOrganized.css';

const TournamentsOrganized = () => {
  const { user } = useAuth();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [viewMode, setViewMode] = useState('grid'); // grid or list
  const [showAll, setShowAll] = useState(false);
  const ITEMS_PER_PAGE = 6;

  useEffect(() => {
    if (user && user._id) {
      fetchOrganizedTournaments();
    }
  }, [user]);

  const fetchOrganizedTournaments = async () => {
    try {
      setLoading(true);
      setError('');
      
      const data = await api.get(`/tournaments/organized/${user._id}`);
      if (data.success) {
        setTournaments(data.tournaments);
      } else {
        setError(data.message || 'Failed to fetch tournaments');
      }
    } catch (error) {
      console.error('Error fetching organized tournaments:', error);
      setError('Failed to fetch tournaments');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTournament = async (tournamentId, tournamentName) => {
    if (!window.confirm(`Are you sure you want to delete "${tournamentName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const data = await api.del(`/tournaments/${tournamentId}`);
      
      if (data.success) {
        alert('Tournament deleted successfully!');
        // Refresh the tournaments list
        fetchOrganizedTournaments();
      } else {
        alert(data.message || 'Failed to delete tournament');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      alert('Failed to delete tournament');
    }
  };

  const canEditTournament = (tournament) => {
    return tournament.status !== 'ongoing' && tournament.status !== 'completed';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'upcoming':
        return '#f59e0b';
      case 'ongoing':
        return '#10b981';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'upcoming':
        return '⏰';
      case 'ongoing':
        return '🔥';
      case 'completed':
        return '✅';
      case 'cancelled':
        return '❌';
      default:
        return '📋';
    }
  };

  const getSportIcon = (sportType) => {
    const sportIcons = {
      'Football': '⚽',
      'Basketball': '🏀',
      'Tennis': '🎾',
      'Cricket': '🏏',
      'Badminton': '🏸',
      'Volleyball': '🏐',
      'Table Tennis': '🏓',
      'Swimming': '🏊',
      'Athletics': '🏃',
      'Chess': '♟️',
      'Other': '🏆'
    };
    return sportIcons[sportType] || '🏆';
  };

  const filteredAndSortedTournaments = tournaments
    .filter(tournament => filterStatus === 'all' || tournament.status === filterStatus)
    .sort((a, b) => {
      switch (sortBy) {
        case 'date':
          return new Date(b.date) - new Date(a.date);
        case 'name':
          return a.name.localeCompare(b.name);
        case 'participants':
          return b.currentParticipants - a.currentParticipants;
        case 'prize':
          return b.prizePool - a.prizePool;
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="tournaments-organized">
        <div className="loading-container">
          <h2>Loading your tournaments...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tournaments-organized">
        <div className="error-container">
          <h2>Error</h2>
          <p>{error}</p>
          <button onClick={fetchOrganizedTournaments} className="retry-button">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const listToRender = showAll ? filteredAndSortedTournaments : filteredAndSortedTournaments.slice(0, ITEMS_PER_PAGE);

  return (
    <div className="tournaments-organized">
      {/* Enhanced Header with Stats */}
      <div className="section-header">
        <div className="header-content">
          <div className="header-text">
            <h2>🏆 Tournaments Organized</h2>
            <p className="header-subtitle">Manage and track your tournament events</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <span className="stat-number">{tournaments.length}</span>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{tournaments.filter(t => t.status === 'upcoming').length}</span>
              <span className="stat-label">Upcoming</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">{tournaments.filter(t => t.status === 'ongoing').length}</span>
              <span className="stat-label">Active</span>
            </div>
          </div>
        </div>
        <Link to="/create-tournament" className="create-tournament-btn">
          <span className="btn-icon">➕</span>
          Create New Tournament
        </Link>
      </div>

      {/* Enhanced Controls */}
      {tournaments.length > 0 && (
        <div className="controls-section">
          <div className="controls-left">
            <div className="filter-group">
              <label>Filter by Status:</label>
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="all">All Tournaments</option>
                <option value="upcoming">Upcoming</option>
                <option value="ongoing">Ongoing</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <div className="sort-group">
              <label>Sort by:</label>
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value)}
                className="sort-select"
              >
                <option value="date">Date</option>
                <option value="name">Name</option>
                <option value="participants">Participants</option>
                <option value="prize">Prize Pool</option>
              </select>
            </div>
          </div>
          <div className="controls-right">
            <div className="view-toggle">
              <button 
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                ⊞
              </button>
              <button 
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
                title="List View"
              >
                ☰
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Empty State */}
      {tournaments.length === 0 ? (
        <div className="no-tournaments">
          <div className="no-tournaments-content">
            <div className="empty-icon">🏆</div>
            <h3>No tournaments created yet</h3>
            <p>Start organizing tournaments and manage them from here. Create your first tournament to get started!</p>
            <Link to="/create-tournament" className="create-first-tournament-btn">
              <span className="btn-icon">🚀</span>
              Create Your First Tournament
            </Link>
          </div>
        </div>
      ) : filteredAndSortedTournaments.length === 0 ? (
        <div className="no-tournaments">
          <div className="no-tournaments-content">
            <div className="empty-icon">🔍</div>
            <h3>No tournaments found</h3>
            <p>No tournaments match your current filter criteria. Try adjusting your filters.</p>
            <button 
              onClick={() => setFilterStatus('all')}
              className="reset-filters-btn"
            >
              Reset Filters
            </button>
          </div>
        </div>
      ) : (
        <>
        <div className={`tournaments-container ${viewMode}`}>
          {listToRender.map((tournament) => (
            <div key={tournament._id} className="tournament-card">
              {/* Enhanced Card Header */}
              <div className="tournament-header">
                <div className="tournament-title-section">
                  <div className="sport-icon">{getSportIcon(tournament.sportType)}</div>
                  <div className="title-content">
                    <h3>{tournament.name}</h3>
                    <p className="sport-type">{tournament.sportType}</p>
                  </div>
                </div>
                <div className="tournament-status">
                  <span 
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(tournament.status) }}
                  >
                    <span className="status-icon">{getStatusIcon(tournament.status)}</span>
                    {tournament.status.charAt(0).toUpperCase() + tournament.status.slice(1)}
                  </span>
                </div>
              </div>

              {/* Enhanced Tournament Details */}
              <div className="tournament-details">
                <div className="details-grid">
                  <div className="detail-item">
                    <span className="detail-icon">📅</span>
                    <div className="detail-content">
                      <span className="detail-label">Date</span>
                      <span className="detail-value">
                        {new Date(tournament.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-icon">📍</span>
                    <div className="detail-content">
                      <span className="detail-label">Location</span>
                      <span className="detail-value">{tournament.location}</span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-icon">👥</span>
                    <div className="detail-content">
                      <span className="detail-label">Participants</span>
                      <span className="detail-value">
                        {tournament.currentParticipants}/{tournament.participantsLimit}
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-icon">💰</span>
                    <div className="detail-content">
                      <span className="detail-label">Prize Pool</span>
                      <span className="detail-value">₹{tournament.prizePool.toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-icon">🏆</span>
                    <div className="detail-content">
                      <span className="detail-label">Format</span>
                      <span className="detail-value">
                        {tournament.format?.type === 'team' ? 'Team' : 'Individual'}
                        {tournament.format?.type === 'team' && tournament.format?.playersPerTeam && 
                          ` (${tournament.format.playersPerTeam} players)`
                        }
                      </span>
                    </div>
                  </div>
                  
                  <div className="detail-item">
                    <span className="detail-icon">⏰</span>
                    <div className="detail-content">
                      <span className="detail-label">Registration</span>
                      <span className="detail-value">
                        {new Date(tournament.registrationDeadline).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>
                </div>

                {tournament.description && (
                  <div className="description-section">
                    <span className="description-label">Description:</span>
                    <p className="description-text">
                      {tournament.description.length > 120 
                        ? `${tournament.description.substring(0, 120)}...` 
                        : tournament.description
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Enhanced Actions */}
              <div className="tournament-actions">
                <Link to={`/tournament/${tournament._id}`} className="action-btn view-btn">
                  <span className="btn-icon">👁️</span>
                  View Details
                </Link>
                
                {/* Manage button (always visible), Edit enabled only when allowed */}
                <div className="manage-actions">
                  <Link 
                    to={canEditTournament(tournament) ? `/edit-tournament/${tournament._id}` : `/tournament/${tournament._id}`}
                    className={`action-btn edit-btn ${canEditTournament(tournament) ? '' : 'disabled'}`}
                    title={canEditTournament(tournament) ? 'Edit tournament' : `Cannot edit ${tournament.status} tournament`}
                  >
                    <span className="btn-icon">✏️</span>
                    {canEditTournament(tournament) ? 'Edit' : 'Manage'}
                  </Link>
                  {canEditTournament(tournament) && (
                    <button 
                      onClick={() => handleDeleteTournament(tournament._id, tournament.name)}
                      className="action-btn delete-btn"
                    >
                      <span className="btn-icon">🗑️</span>
                      Delete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        {!showAll && filteredAndSortedTournaments.length > ITEMS_PER_PAGE && (
          <div className="view-all-container">
            <button className="view-all-btn" onClick={() => setShowAll(true)}>View All Tournaments</button>
          </div>
        )}
        </>
      )}
    </div>
  );
};

export default TournamentsOrganized;
