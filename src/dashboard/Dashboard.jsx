import React, { useEffect, useState } from 'react';
import './Dashboard.css';
import defaultPic from './defaultProfilePic.png';
import EditProfile from './EditProfile.js';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [sportsData, setSportsData] = useState([]);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    fetch('http://localhost:8080/auth/login/success', {
      method: 'GET',
      credentials: 'include',
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const profilePic = data.user.profile_pic || defaultPic;
          setUser({ ...data.user, profile_pic: profilePic });
        } else {
          console.error('Login not successful');
        }
      })
      .catch(err => console.error('Error fetching user:', err));
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/sports/detailed')
      .then(res => res.json())
      .then(data => setSportsData(data))
      .catch(err => console.error('Error fetching sports data:', err));
  }, []);

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
          <p>
            <button className="logout-button" onClick={() => setEditing(true)}>Edit Profile</button>
          </p>
        </div>
      </aside>

      <main className="main-content">
        <h1>Welcome to Your Dashboard</h1>
        
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
          <h2>Individual Tournaments</h2>
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
          <h2>Team Tournaments</h2>
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
            <p>No team tournaments found</p>
          )}
        </section>

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