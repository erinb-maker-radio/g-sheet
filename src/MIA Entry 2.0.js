import React, { useEffect, useState } from 'react';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxFv6VxPaYK_Sb_gTwkx5MN9DnbYuIcP0WXgH0TwKvOBpoqMJGbgWWYgqsT92RnpNd4HA/exec';

const TIME_SLOTS = [
  "7:30–7:45", "7:45–8:00", "8:00–8:15", "8:15–8:30",
  "8:45–9:00", "9:00–9:15", "9:15–9:30",
  "9:45–10:00", "10:00–10:15", "10:15–10:30"
];

export default function App() {
  const [form, setForm] = useState({ artist: '', song: '', writtenBy: '', timeSlot: '' });
  const [status, setStatus] = useState('');
  const [availableSlots, setAvailableSlots] = useState(TIME_SLOTS);

  // Fetch taken slots on mount
  useEffect(() => {
    fetch(`${SCRIPT_URL}?query=slots`)
      .then(r => r.json())
      .then(({ takenSlots }) => {
        setAvailableSlots(TIME_SLOTS.filter(slot => !takenSlots.includes(slot)));
      })
      .catch(() => setAvailableSlots(TIME_SLOTS));
  }, [status]); // refetch after each submit

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = e => {
    e.preventDefault();
    setStatus('Sending…');
    const query = new URLSearchParams(form).toString();
    new Image().src = `${SCRIPT_URL}?${query}`;
    setStatus('✅ Submitted successfully!');
    setForm({ artist: '', song: '', writtenBy: '', timeSlot: '' });
  };

  return (
    <div style={{ maxWidth: 400, margin: '2rem auto', fontFamily: 'sans-serif' }}>
      <h1 style={{ textAlign: 'center' }}>Song Submission</h1>
      <form onSubmit={handleSubmit}>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Artist Name<br/>
          <input
            name="artist"
            value={form.artist}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Song Name<br/>
          <input
            name="song"
            value={form.song}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Song Written By<br/>
          <input
            name="writtenBy"
            value={form.writtenBy}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          />
        </label>
        <label style={{ display: 'block', marginBottom: 12 }}>
          Time Slot<br/>
          <select
            name="timeSlot"
            value={form.timeSlot}
            onChange={handleChange}
            required
            style={{ width: '100%', padding: 8 }}
          >
            <option value="">Select a slot...</option>
            {availableSlots.map(slot => (
              <option key={slot} value={slot}>{slot}</option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          style={{ width: '100%', padding: 10, cursor: 'pointer' }}
          disabled={!form.timeSlot}
        >
          Submit
        </button>
      </form>
      {status && <p style={{ textAlign: 'center', marginTop: 12 }}>{status}</p>}
    </div>
  );
}
