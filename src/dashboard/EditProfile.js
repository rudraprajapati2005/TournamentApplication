import React, { useState } from 'react';

const EditProfile = ({ user, onSave }) => {
  const [form, setForm] = useState({
    name: user?.name || '',
    profilePic: user?.profilePic || '',
    dob: user?.dob ? new Date(user.dob).toISOString().split('T')[0] : '',
    gender: user?.gender || 'prefer not to say',
  });
  
  // Keep track of which fields have been modified
  const [modifiedFields, setModifiedFields] = useState({
    name: false,
    profilePic: false,
    dob: false,
    gender: false
  });

  // Calculate age from DOB
  const calculateAge = (dob) => {
    if (!dob) return '';
    const birth = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const handleChange = (e) => {
    const { name, value, files } = e.target;
    if (name === 'profilePic' && files && files[0]) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setForm((prev) => ({ ...prev, profilePic: ev.target.result }));
        setModifiedFields(prev => ({ ...prev, profilePic: true }));
      };
      reader.readAsDataURL(files[0]);
    } else {
      setForm((prev) => ({ ...prev, [name]: value }));
      setModifiedFields(prev => ({ ...prev, [name]: true }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Only include fields that were actually modified
    const updatedData = {};
    Object.keys(modifiedFields).forEach(field => {
      if (modifiedFields[field]) {
        updatedData[field] = form[field];
      }
    });

    onSave(updatedData);
  };

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 400, margin: 'auto', background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.12)', padding: 32, fontFamily: 'Segoe UI' }}>
      <h2 style={{ textAlign: 'center', marginBottom: 24, color: '#1976d2' }}>Edit Profile</h2>
      <div style={{ marginBottom: 18, textAlign: 'center' }}>
        <img
          src={form.profilePic || '/static/media/defaultProfilePic.10691648d79aa2f92514.png'}
          alt="Profile"
          style={{ width: 100, height: 100, borderRadius: '50%', objectFit: 'cover', marginBottom: 8 }}
        />
        <input type="file" name="profilePic" accept="image/*" onChange={handleChange} />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Name</label>
        <input
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #ccc', marginTop: 6 }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Date of Birth</label>
        <input
          type="date"
          name="dob"
          value={form.dob}
          onChange={handleChange}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #ccc', marginTop: 6 }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Age</label>
        <input
          type="text"
          value={calculateAge(form.dob)}
          readOnly
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #ccc', marginTop: 6, background: '#f5f5f5' }}
        />
      </div>
      <div style={{ marginBottom: 18 }}>
        <label>Gender</label>
        <select
          name="gender"
          value={form.gender}
          onChange={handleChange}
          style={{ width: '100%', padding: 10, borderRadius: 8, border: '1.5px solid #ccc', marginTop: 6 }}
        >
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="other">Other</option>
          <option value="prefer not to say">Prefer not to say</option>
        </select>
      </div>
      <button type="submit" style={{ width: '100%', padding: 12, borderRadius: 8, background: '#1976d2', color: '#fff', fontWeight: 600, fontSize: 16, border: 'none', cursor: 'pointer', boxShadow: '0 2px 8px rgba(25, 118, 210, 0.08)', transition: 'background 0.2s' }}>
        Save Changes
      </button>
    </form>
  );
};

export default EditProfile;
