// components/PerformerFormPage.js
import React from 'react';
import { 
  formCardStyle, 
  backButtonStyle, 
  titleStyle, 
  songCardStyle, 
  timeSlotButtonStyle 
} from '../styles/styles';
import obsWebSocketService from '../services/obsWebSocket';
import { INTERMISSION_SLOTS, isIntermissionSlot } from '../constants/intermissions';

const PerformerFormPage = ({ 
  songs, 
  updateSong, 
  selectedSlot, 
  setSelectedSlot, 
  takenSlots, 
  timeSlots, 
  onSubmit, 
  submitting, 
  formSuccess, 
  error, 
  onBack,
  artist,
  email
}) => {
  // Add OBS sync function
  const syncPerformerToOBS = async () => {
    if (!obsWebSocketService.connected) {
      console.log('OBS not connected, skipping sync');
      return;
    }

    try {
      // Calculate episode number
      const baseDate = new Date('2025-05-22');
      const baseEpisode = 120;
      const currentDate = new Date();
      const weeksDiff = Math.floor((currentDate.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const currentEpisode = baseEpisode + weeksDiff;

      // Format show date
      const showDate = currentDate.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });

      // Filter songs that have titles
      const validSongs = songs.filter(s => s.title.trim());

      // CREATE INDIVIDUAL BROADCASTS FOR EACH SONG
      const songBroadcasts = await obsWebSocketService.createSongBroadcasts(
        artist,
        selectedSlot,
        validSongs,
        currentEpisode
      );

      console.log(`Created ${songBroadcasts.length} song broadcasts for ${artist}`);

      // Update show title for main broadcast
      await obsWebSocketService.setBroadcastInfo(
        `What Is Art? Episode #${currentEpisode} - ${showDate}`,
        `Performer: ${artist} at ${selectedSlot} - ${validSongs.length} songs`
      );

      // Create/update performer source
      const performerInfo = {
        artist: artist,
        timeSlot: selectedSlot,
        songs: validSongs,
        email: email
      };
      await obsWebSocketService.createPerformerSource(performerInfo);

      // Update the full performer list
      const allPerformers = [...takenSlots, performerInfo];
      await obsWebSocketService.updateBroadcastList(allPerformers);

      // Switch to the first song's scene
      if (songBroadcasts.length > 0) {
        try {
          await obsWebSocketService.switchToSongBroadcast(songBroadcasts[0].sceneName);
        } catch (e) {
          console.log('Could not switch to first song scene');
        }
      }

      console.log('OBS sync completed for', artist);
    } catch (error) {
      console.error('OBS sync error:', error);
      // Don't block form submission if OBS sync fails
    }
  };

  // Modified submit handler that includes OBS sync
  const handleSubmitWithOBS = async () => {
    // First sync to OBS (non-blocking)
    syncPerformerToOBS();
    
    // Then submit the form as normal
    await onSubmit();
  };

  const handleBackHover = (e, isEntering) => {
    if (isEntering) {
      e.target.style.color = 'white';
      e.target.style.borderColor = '#e91e63';
      e.target.style.background = 'rgba(233, 30, 99, 0.1)';
    } else {
      e.target.style.color = '#888';
      e.target.style.borderColor = '#555';
      e.target.style.background = 'transparent';
    }
  };

  const handleSongCardHover = (e, isEntering) => {
    if (isEntering) {
      e.target.style.borderColor = '#e91e63';
      e.target.style.background = 'rgba(233, 30, 99, 0.1)';
    } else {
      e.target.style.borderColor = '#555';
      e.target.style.background = 'rgba(255, 255, 255, 0.05)';
    }
  };

  const handleInputFocus = (e, isFocused) => {
    if (isFocused) {
      e.target.style.borderColor = '#e91e63';
      e.target.style.boxShadow = '0 0 15px rgba(233, 30, 99, 0.3)';
    } else {
      e.target.style.borderColor = '#555';
      e.target.style.boxShadow = 'none';
    }
  };

  const handleTimeSlotHover = (e, isEntering, isSelected, isTaken, isIntermission) => {
    if (!isTaken && !isSelected && !isIntermission && isEntering) {
      e.target.style.borderColor = '#e91e63';
      e.target.style.background = 'rgba(233, 30, 99, 0.2)';
      e.target.style.transform = 'translateY(-2px)';
    } else if (!isTaken && !isSelected && !isIntermission) {
      e.target.style.borderColor = '#555';
      e.target.style.background = 'rgba(255, 255, 255, 0.1)';
      e.target.style.transform = 'translateY(0)';
    }
  };

  const handleSubmitHover = (e, isEntering) => {
    if (selectedSlot && !submitting && isEntering) {
      e.target.style.transform = 'translateY(-5px)';
      e.target.style.boxShadow = '0 25px 50px rgba(233, 30, 99, 0.5)';
    } else if (selectedSlot && !submitting) {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 15px 35px rgba(233, 30, 99, 0.4)';
    }
  };

  const inputStyle = {
    width: '100%',
    padding: '15px',
    fontSize: '16px',
    borderRadius: '10px',
    border: '2px solid #555',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    boxSizing: 'border-box',
    transition: 'all 0.3s ease'
  };

  return (
    <div style={formCardStyle}>
      <div style={{ marginBottom: '30px' }}>
        <button 
          onClick={onBack}
          style={backButtonStyle}
          onMouseEnter={(e) => handleBackHover(e, true)}
          onMouseLeave={(e) => handleBackHover(e, false)}
        >
          ← Back to Agreements
        </button>
      </div>
      
      <h1 style={titleStyle}>Song Submission</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h3 style={{ 
          textAlign: 'left', 
          marginBottom: '20px', 
          color: 'white', 
          fontSize: '24px', 
          fontWeight: '700' 
        }}>
          Songs (up to 4):
        </h3>
        
        {songs.map((song, index) => (
          <div 
            key={index} 
            style={songCardStyle}
            onMouseEnter={(e) => handleSongCardHover(e, true)}
            onMouseLeave={(e) => handleSongCardHover(e, false)}
          >
            <h4 style={{ 
              textAlign: 'left', 
              marginBottom: '15px', 
              color: '#e91e63', 
              fontSize: '18px', 
              fontWeight: '700' 
            }}>
              Song {index + 1}
            </h4>
            
            <input
              type="text"
              placeholder={`Song ${index + 1} Title${index === 0 ? ' (required)' : ' (optional)'}`}
              value={song.title}
              onChange={e => updateSong(index, 'title', e.target.value)}
              style={{
                ...inputStyle,
                marginBottom: '10px'
              }}
              onFocus={(e) => handleInputFocus(e, true)}
              onBlur={(e) => handleInputFocus(e, false)}
            />
            
            <input
              type="text"
              placeholder={`Song ${index + 1} Writer (optional)`}
              value={song.writer}
              onChange={e => updateSong(index, 'writer', e.target.value)}
              style={inputStyle}
              onFocus={(e) => handleInputFocus(e, true)}
              onBlur={(e) => handleInputFocus(e, false)}
            />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <div style={{ 
          textAlign: 'left', 
          fontWeight: '700', 
          marginBottom: '20px', 
          color: 'white', 
          fontSize: '24px' 
        }}>
          Pick a Time Slot:
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: '15px',
          marginBottom: '20px'
        }}>
          {timeSlots.map(slot => {
            const isSelected = selectedSlot === slot;
            const isIntermission = isIntermissionSlot(slot);
            
            // Handle both old format (strings) and new format (objects)
            let isTaken = false;
            let artistName = null;
            
            if (!isIntermission && takenSlots.length > 0) {
              // Check if takenSlots contains objects or strings
              const firstItem = takenSlots[0];
              if (typeof firstItem === 'object' && firstItem.timeSlot) {
                // New format: array of objects
                const takenSlot = takenSlots.find(taken => taken.timeSlot === slot);
                isTaken = !!takenSlot;
                artistName = takenSlot ? takenSlot.artist : null;
              } else {
                // Old format: array of strings
                isTaken = takenSlots.includes(slot);
                artistName = null;
              }
            }
            
            return (
              <button
                key={slot}
                type="button"
                disabled={isTaken || isIntermission}
                onClick={() => !isIntermission && setSelectedSlot(slot)}
                style={{
                  ...timeSlotButtonStyle,
                  border: isSelected ? '3px solid #e91e63' : isIntermission ? '2px solid #FF6B6B' : '2px solid #555',
                  background: isIntermission 
                    ? 'linear-gradient(135deg, rgba(255, 107, 107, 0.2), rgba(255, 107, 107, 0.1))' 
                    : isTaken 
                      ? '#333' 
                      : isSelected 
                        ? 'linear-gradient(135deg, #e91e63, #9c27b0)' 
                        : 'rgba(255, 255, 255, 0.1)',
                  color: isIntermission ? '#FF6B6B' : isTaken ? '#888' : 'white',
                  cursor: isTaken || isIntermission ? 'not-allowed' : 'pointer',
                  minHeight: '60px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  alignItems: 'center',
                  textAlign: 'center',
                  position: 'relative'
                }}
                onMouseEnter={(e) => handleTimeSlotHover(e, true, isSelected, isTaken, isIntermission)}
                onMouseLeave={(e) => handleTimeSlotHover(e, false, isSelected, isTaken, isIntermission)}
              >
                {isIntermission ? (
                  <>
                    <div style={{ fontSize: '14px', fontWeight: '700', marginBottom: '2px' }}>
                      🎭 INTERMISSION
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.8 }}>
                      {slot}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '16px', fontWeight: '700' }}>{slot}</div>
                    {isTaken && artistName && (
                      <div style={{ 
                        fontSize: '14px', 
                        marginTop: '4px', 
                        opacity: 1,
                        color: '#e91e63',
                        fontWeight: '600'
                      }}>
                        {artistName}
                      </div>
                    )}
                    {isTaken && !artistName && (
                      <div style={{ fontSize: '12px', marginTop: '4px', opacity: 0.8 }}>
                        (taken)
                      </div>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <button
        onClick={handleSubmitWithOBS}
        disabled={!selectedSlot || submitting}
        style={{
          width: '100%',
          padding: '25px',
          background: (!selectedSlot || submitting) ? '#555' : 'linear-gradient(135deg, #e91e63, #9c27b0)',
          color: 'white',
          border: 'none',
          borderRadius: '15px',
          fontWeight: '800',
          fontSize: '20px',
          cursor: (!selectedSlot || submitting) ? 'not-allowed' : 'pointer',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          transition: 'all 0.3s ease',
          boxShadow: (!selectedSlot || submitting) ? 'none' : '0 15px 35px rgba(233, 30, 99, 0.4)'
        }}
        onMouseEnter={(e) => handleSubmitHover(e, true)}
        onMouseLeave={(e) => handleSubmitHover(e, false)}
      >
        {submitting ? "Submitting..." : "Submit Performance"}
      </button>
      
      {formSuccess && (
        <div style={{ 
          color: '#4caf50', 
          marginTop: '25px', 
          textAlign: 'center', 
          fontSize: '18px', 
          fontWeight: '700' 
        }}>
          ✅ Submission successful!
        </div>
      )}
      
      {error && (
        <div style={{ 
          color: '#f44336', 
          marginTop: '25px', 
          textAlign: 'center', 
          fontSize: '18px', 
          fontWeight: '700' 
        }}>
          ❌ {error}
        </div>
      )}
    </div>
  );
};

export default PerformerFormPage;