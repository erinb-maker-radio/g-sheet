// components/StaffDashboard.js
import React, { useState, useEffect } from 'react';
import OBSControl from './OBSControl';
import BroadcastManager from './BroadcastManager';
import BroadcastList from './BroadcastList';
import YouTubeBroadcastManager from './YouTubeBroadcastManager';
import InterstitialsManager from './InterstitialsManager';
import { logoutStaff } from '../utils/staffAuth';
import { containerStyle, gridBgStyle } from '../styles/styles';

const StaffDashboard = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');

  // Calculate episode number (changes on Fridays)
  const getEpisodeNumber = () => {
    const baseDate = new Date('2025-05-22'); // Thursday May 22, 2025 was episode #120
    const baseEpisode = 120;
    const currentDate = new Date();
    
    // Calculate days since base date
    const daysDiff = Math.floor((currentDate - baseDate) / (1000 * 60 * 60 * 24));
    
    // Calculate weeks, but increment on Friday (day 5)
    const currentDayOfWeek = currentDate.getDay();
    const daysUntilFriday = currentDayOfWeek >= 5 ? 7 - currentDayOfWeek + 5 : 5 - currentDayOfWeek;
    const adjustedDaysDiff = daysDiff + (currentDayOfWeek >= 5 ? 0 : -7);
    
    const weeksDiff = Math.floor(adjustedDaysDiff / 7);
    return baseEpisode + weeksDiff;
  };

  const handleLogout = () => {
    logoutStaff();
    onLogout();
  };

  return (
    <div style={containerStyle}>
      <div style={gridBgStyle} />
      
      {/* Header */}
      <div style={{
        background: 'rgba(40, 40, 40, 0.9)',
        borderBottom: '2px solid #333',
        padding: '15px 30px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'sticky',
        top: 0,
        zIndex: 100
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '30px' }}>
          <h1 style={{
            margin: 0,
            fontSize: '24px',
            color: '#e91e63',
            fontWeight: '700'
          }}>
            🎬 Video Staff Dashboard
          </h1>
          
          <div style={{ color: '#ccc', fontSize: '16px' }}>
            Episode #{getEpisodeNumber()} • {new Date().toLocaleDateString('en-US', { 
              weekday: 'long',
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </div>
        </div>
        
        <button
          onClick={handleLogout}
          style={{
            background: '#f44336',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '5px',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Logout
        </button>
      </div>

      {/* Tab Navigation */}
      <div style={{
        background: 'rgba(50, 50, 50, 0.9)',
        borderBottom: '1px solid #444',
        padding: '0 30px',
        display: 'flex',
        gap: '20px'
      }}>
        {['overview', 'obs-control', 'broadcasts', 'youtube'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              background: 'none',
              border: 'none',
              color: activeTab === tab ? '#e91e63' : '#ccc',
              padding: '15px 20px',
              cursor: 'pointer',
              fontWeight: '600',
              borderBottom: activeTab === tab ? '3px solid #e91e63' : '3px solid transparent',
              transition: 'all 0.2s ease',
              textTransform: 'capitalize'
            }}
          >
            {tab === 'youtube' ? '📺 YouTube' : tab.replace('-', ' ')}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      <div style={{
        padding: '30px',
        maxWidth: '1600px',
        margin: '0 auto',
        width: '100%'
      }}>
        {activeTab === 'overview' && (
          <div>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '30px',
              marginBottom: '30px'
            }}>
              <div>
                <h2 style={{ color: '#e91e63', marginBottom: '20px' }}>
                  📡 Live Broadcast Manager
                </h2>
                <BroadcastManager currentShow={`#${getEpisodeNumber()}`} />
              </div>
              
              <div>
                <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>
                  📺 Quick Scene Switcher
                </h2>
                <BroadcastList />
              </div>
            </div>
            
            {/* Add Interstitials Manager to Overview */}
            <div>
              <h2 style={{ color: '#FFC107', marginBottom: '20px' }}>
                🎬 Commercial Break Control
              </h2>
              <InterstitialsManager />
            </div>
          </div>
        )}

        {activeTab === 'obs-control' && (
          <div style={{
            maxWidth: '800px',
            margin: '0 auto'
          }}>
            <h2 style={{ color: '#9c27b0', marginBottom: '20px' }}>
              🎛️ OBS Studio Controls
            </h2>
            <OBSControl />
          </div>
        )}

        {activeTab === 'broadcasts' && (
          <div>
            <h2 style={{ color: '#2196F3', marginBottom: '20px' }}>
              📺 All Broadcasts & Scenes
            </h2>
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '30px'
            }}>
              <BroadcastManager currentShow={`#${getEpisodeNumber()}`} />
              <BroadcastList />
            </div>
          </div>
        )}

        {activeTab === 'youtube' && (
          <div style={{
            maxWidth: '1000px',
            margin: '0 auto'
          }}>
            <h2 style={{ color: '#FF0000', marginBottom: '20px' }}>
              📺 YouTube Live Streaming
            </h2>
            <YouTubeBroadcastManager />
          </div>
        )}
      </div>
    </div>
  );
};

export default StaffDashboard;