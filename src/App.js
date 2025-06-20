// App.js - Simplified Dashboard
import React, { useState, useEffect } from 'react';
import './App.css';

const API_URL = 'http://localhost:3001';

function App() {
  const [status, setStatus] = useState({
    episode: '',
    performers: [],
    broadcasts: []
  });
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(null);

  // Fetch status every 5 seconds
  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const response = await fetch(`${API_URL}/api/status`);
        const data = await response.json();
        setStatus(data);
        setLastUpdate(new Date());
        setLoading(false);
      } catch (error) {
        console.error('Error fetching status:', error);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  // Group broadcasts by performer
  const getBroadcastsByPerformer = () => {
    const grouped = {};
    
    status.broadcasts.forEach(broadcast => {
      const match = broadcast.title.match(/#\d+ \| (.+) \| (.+)$/);
      if (match) {
        const artist = match[1];
        if (!grouped[artist]) {
          grouped[artist] = [];
        }
        grouped[artist].push(broadcast);
      }
    });
    
    return grouped;
  };

  const groupedBroadcasts = getBroadcastsByPerformer();

  return (
    <div className="app">
      <header className="header">
        <h1>What Is Art? - Episode #{status.episode}</h1>
        <div className="status-info">
          {lastUpdate && (
            <span>Last update: {lastUpdate.toLocaleTimeString()}</span>
          )}
        </div>
      </header>

      <main className="main">
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="broadcasts">
            <h2>Active Broadcasts</h2>
            
            {Object.keys(groupedBroadcasts).length === 0 ? (
              <p className="no-broadcasts">No active broadcasts. Add performers to the spreadsheet to get started.</p>
            ) : (
              Object.entries(groupedBroadcasts).map(([artist, broadcasts]) => (
                <div key={artist} className="performer-group">
                  <h3>{artist}</h3>
                  <div className="broadcast-list">
                    {broadcasts.map(broadcast => (
                      <div 
                        key={broadcast.id} 
                        className={`broadcast ${broadcast.status}`}
                      >
                        <div className="broadcast-info">
                          <span className="song-title">
                            {broadcast.title.split(' | ')[2]}
                          </span>
                          <span className={`status-badge ${broadcast.status}`}>
                            {broadcast.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      <footer className="footer">
        <p>Broadcasts sync automatically with the Google Spreadsheet every 15 seconds</p>
      </footer>
    </div>
  );
}

export default App;