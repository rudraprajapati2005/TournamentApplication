import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../utils/api.js';
import sportsData from '../data/allSports.json';
import './CreateTournament.css';

const CreateTournament = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
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
  const [nameError, setNameError] = useState('');
  const [checkingName, setCheckingName] = useState(false);

  // Check if tournament name exists
  const checkTournamentName = async (tournamentName) => {
    if (!tournamentName || tournamentName.trim() === '') {
      setNameError('');
      return;
    }

    setCheckingName(true);
    try {
      const data = await api.get('/tournaments');
      if (data.success && data.tournaments) {
        const nameExists = data.tournaments.some(
          tournament => tournament.name.toLowerCase().trim() === tournamentName.toLowerCase().trim()
        );
        if (nameExists) {
          setNameError('That tournament with name already exists');
        } else {
          setNameError('');
        }
      }
    } catch (error) {
      console.error('Error checking tournament name:', error);
      // Don't show error if API call fails, just allow submission
      setNameError('');
    } finally {
      setCheckingName(false);
    }
  };

  // Debounce function for name checking
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (formData.name) {
        checkTournamentName(formData.name);
      } else {
        setNameError('');
      }
    }, 500); // Wait 500ms after user stops typing

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.name]);

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

    // Clear name error when user starts typing again
    if (name === 'name') {
      setNameError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Check name again before submission
    if (formData.name) {
      try {
        const data = await api.get('/tournaments');
        if (data.success && data.tournaments) {
          const nameExists = data.tournaments.some(
            tournament => tournament.name.toLowerCase().trim() === formData.name.toLowerCase().trim()
          );
          if (nameExists) {
            setNameError('That tournament with name already exists');
            return;
          }
        }
      } catch (error) {
        console.error('Error checking tournament name:', error);
        // Continue with submission if check fails
      }
    }

    // Prevent submission if name error exists
    if (nameError) {
      return;
    }

    try {
      const response = await fetch('http://localhost:8080/tournaments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          ...formData,
          organizer: user._id
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Tournament created successfully!');
        navigate('/dashboard');
      } else {
        // Check if error is due to duplicate name
        if (data.message && data.message.toLowerCase().includes('name')) {
          setNameError('That tournament with name already exists');
        } else {
          alert(data.message || 'Failed to create tournament');
        }
      }
    } catch (error) {
      console.error('Error creating tournament:', error);
      alert('Failed to create tournament');
    }
  };

  return (
    <div className="create-tournament-container">
      <h1>Create New Tournament</h1>
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
              onBlur={() => checkTournamentName(formData.name)}
              required
              className={nameError ? 'input-error' : ''}
            />
            {checkingName && (
              <div className="checking-name">Checking name...</div>
            )}
            {nameError && (
              <div className="error-message">{nameError}</div>
            )}
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
            <label>Start Date:</label>
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
          <button type="submit" className="submit-button">Create Tournament</button>
          <button type="button" onClick={() => navigate(-1)} className="cancel-button">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateTournament;
