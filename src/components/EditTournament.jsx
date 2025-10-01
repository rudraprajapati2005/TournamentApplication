import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import sportsData from '../data/allSports.json';
import './CreateTournament.css';

const EditTournament = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    date: '',
    location: '',
    participantsLimit: '',
    prizePool: '',
    description: '',
    sportType: '',
    registrationDeadline: '',
    format: {
      type: 'single',
      playersPerTeam: '',
      substitutesAllowed: '0',
      minPlayersPerMatch: ''
    },
    eliminationType: 'single'
  });

  // Fetch tournament data
  useEffect(() => {
    const fetchTournament = async () => {
      try {
        const response = await fetch(`http://localhost:8080/tournaments/${id}`, {
          credentials: 'include'
        });
        const data = await response.json();
        
        if (data.success) {
          const tournament = data.tournament;
          
          // Check if user is the organizer
          if (tournament.organizer._id !== user._id) {
            setError('You can only edit tournaments you created');
            return;
          }

          // Check if tournament can be edited
          if (tournament.status === 'ongoing' || tournament.status === 'completed') {
            setError('Cannot edit tournament that is ongoing or completed');
            return;
          }

          // Format dates for input fields
          const formatDateForInput = (dateString) => {
            const date = new Date(dateString);
            return date.toISOString().slice(0, 16);
          };

          setFormData({
            name: tournament.name || '',
            date: formatDateForInput(tournament.date),
            location: tournament.location || '',
            participantsLimit: tournament.participantsLimit || '',
            prizePool: tournament.prizePool || '',
            description: tournament.description || '',
            sportType: tournament.sportType || '',
            registrationDeadline: formatDateForInput(tournament.registrationDeadline),
            format: {
              type: tournament.format?.type || 'single',
              playersPerTeam: tournament.format?.playersPerTeam || '',
              substitutesAllowed: tournament.format?.substitutesAllowed || '0',
              minPlayersPerMatch: tournament.format?.minPlayersPerMatch || ''
            },
            eliminationType: tournament.eliminationType || 'single'
          });
        } else {
          setError(data.message || 'Failed to fetch tournament');
        }
      } catch (error) {
        console.error('Error fetching tournament:', error);
        setError('Failed to fetch tournament');
      } finally {
        setLoading(false);
      }
    };

    if (user && id) {
      fetchTournament();
    }
  }, [id, user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'sportType') {
      const selectedSport = sportsData.sports.find(sport => sport.name === value);
      
      setFormData(prev => ({
        ...prev,
        sportType: value,
        format: {
          ...prev.format,
          type: selectedSport?.type?.toLowerCase() === 'team' ? 'team' : 'single',
          playersPerTeam: selectedSport?.players_per_team || '',
          minPlayersPerMatch: selectedSport?.players_per_team || '',
          substitutesAllowed: '0'
        }
      }));
      return;
    }

    if (name.includes('format.')) {
      const formatField = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        format: {
          ...prev.format,
          [formatField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      const response = await fetch(`http://localhost:8080/tournaments/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        alert('Tournament updated successfully!');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to update tournament');
      }
    } catch (error) {
      console.error('Error updating tournament:', error);
      setError('Failed to update tournament');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this tournament? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:8080/tournaments/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      const data = await response.json();
      if (data.success) {
        alert('Tournament deleted successfully!');
        navigate('/dashboard');
      } else {
        setError(data.message || 'Failed to delete tournament');
      }
    } catch (error) {
      console.error('Error deleting tournament:', error);
      setError('Failed to delete tournament');
    }
  };

  if (loading) {
    return (
      <div className="create-tournament-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Loading tournament...</h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="create-tournament-container">
        <div style={{ textAlign: 'center', padding: '2rem' }}>
          <h2>Error</h2>
          <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>
          <button onClick={() => navigate('/dashboard')} className="cancel-button">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="create-tournament-container">
      <h1>Edit Tournament</h1>
      {error && <div style={{ color: 'red', marginBottom: '1rem', padding: '0.5rem', background: '#ffe6e6', borderRadius: '4px' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} className="tournament-form">
        <div className="form-section">
          <h2>Basic Information</h2>
          <div className="form-group">
            <label>Tournament Name:</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Sport Type:</label>
            <select
              name="sportType"
              value={formData.sportType}
              onChange={handleChange}
              required
            >
              <option value="">Select a sport</option>
              {sportsData.sports.map((sport) => (
                <option key={sport.name} value={sport.name}>
                  {sport.name} ({sport.type})
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Tournament Date:</label>
            <input
              type="datetime-local"
              name="date"
              value={formData.date}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Registration Deadline:</label>
            <input
              type="datetime-local"
              name="registrationDeadline"
              value={formData.registrationDeadline}
              onChange={handleChange}
              required
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Tournament Details</h2>
          <div className="form-group">
            <label>Location:</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          <div className="form-group">
            <label>Participant Limit:</label>
            <input
              type="number"
              name="participantsLimit"
              value={formData.participantsLimit}
              onChange={handleChange}
              required
              min="2"
            />
          </div>

          <div className="form-group">
            <label>Prize Pool (₹):</label>
            <input
              type="number"
              name="prizePool"
              value={formData.prizePool}
              onChange={handleChange}
              required
              min="0"
            />
          </div>
        </div>

        <div className="form-section">
          <h2>Format Settings</h2>
          <div className="form-group">
            <label>Tournament Type:</label>
            <select
              name="format.type"
              value={formData.format.type}
              onChange={handleChange}
              required
            >
              <option value="single">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>

          {formData.format.type === 'team' && (
            <>
              <div className="form-group">
                <label>Players Per Team:</label>
                <input
                  type="number"
                  name="format.playersPerTeam"
                  value={formData.format.playersPerTeam}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>

              <div className="form-group">
                <label>Substitutes Allowed:</label>
                <input
                  type="number"
                  name="format.substitutesAllowed"
                  value={formData.format.substitutesAllowed}
                  onChange={handleChange}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Minimum Players Per Match:</label>
                <input
                  type="number"
                  name="format.minPlayersPerMatch"
                  value={formData.format.minPlayersPerMatch}
                  onChange={handleChange}
                  required
                  min="1"
                />
              </div>
            </>
          )}

          <div className="form-group">
            <label>Elimination Type:</label>
            <select
              name="eliminationType"
              value={formData.eliminationType}
              onChange={handleChange}
              required
            >
              <option value="single">Single Elimination</option>
              <option value="double">Double Elimination</option>
              <option value="round-robin">Round Robin</option>
            </select>
          </div>
        </div>

        <div className="form-section">
          <h2>Additional Information</h2>
          <div className="form-group">
            <label>Description:</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="4"
              required
            />
          </div>
        </div>

        <div className="form-actions">
          <button type="submit" className="submit-button">Update Tournament</button>
          <button type="button" onClick={handleDelete} className="delete-button">
            Delete Tournament
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditTournament;
