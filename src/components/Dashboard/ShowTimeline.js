// components/Dashboard/ShowTimeline.js
import React from 'react';
import { INTERMISSION_CONFIG, isIntermissionSlot } from '../../constants/intermissions';

const ShowTimeline = ({ performers, currentScene, streamStatus }) => {
  // Get current time
  const now = new Date();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;
  
  // Convert time slot to minutes for comparison
  const timeSlotToMinutes = (slot) => {
    const [hour, minute] = slot.split(':').map(Number);
    const adjustedHour = hour < 12 ? hour + 12 : hour; // Convert to 24-hour
    return adjustedHour * 60 + minute;
  };
  
  // Find current performer based on scene name
  const getCurrentPerformerIndex = () => {
    if (!currentScene) return -1;
    
    // Try to match scene name pattern: "7:30 - Artist Name - Song 1"
    const sceneMatch = currentScene.match(/(\d+:\d+) - ([^-]+) - /);
    if (sceneMatch) {
      const timeSlot = sceneMatch[1];
      const artist = sceneMatch[2].trim();
      
      return performers.findIndex(p => 
        p.timeSlot === timeSlot && p.artist === artist
      );
    }
    return -1;
  };
  
  const currentPerformerIndex = getCurrentPerformerIndex();
  
  // Timeline item styles
  const getTimelineItemStyle = (index, isIntermission, isPast) => ({
    padding: '15px 20px',
    marginBottom: '10px',
    borderRadius: '10px',
    border: '2px solid',
    borderColor: index === currentPerformerIndex && streamStatus.isStreaming ? '#4CAF50' :
                isIntermission ? INTERMISSION_CONFIG.borderColor :
                isPast ? '#666' : '#555',
    background: index === currentPerformerIndex && streamStatus.isStreaming ? 
                'linear-gradient(135deg, rgba(76, 175, 80, 0.2), rgba(56, 142, 60, 0.2))' :
                isIntermission ? INTERMISSION_CONFIG.backgroundColor :
                isPast ? 'rgba(50, 50, 50, 0.5)' : 'rgba(255, 255, 255, 0.05)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
    position: 'relative',
    opacity: isPast && index !== currentPerformerIndex ? 0.6 : 1
  });
  
  const getTimeSlotStyle = (isIntermission, isPast, isCurrent) => ({
    fontSize: '18px',
    fontWeight: '700',
    color: isCurrent ? '#4CAF50' :
           isIntermission ? INTERMISSION_CONFIG.color :
           isPast ? '#888' : '#e91e63',
    marginBottom: '5px'
  });
  
  const getArtistStyle = (isPast, isCurrent) => ({
    fontSize: '16px',
    color: isCurrent ? 'white' : isPast ? '#aaa' : 'white',
    fontWeight: isCurrent ? '600' : '400'
  });
  
  const getSongStyle = (isPast) => ({
    fontSize: '14px',
    color: isPast ? '#888' : '#ccc',
    marginTop: '5px',
    fontStyle: 'italic'
  });

  return (
    <div style={{
      background: 'rgba(40, 40, 40, 0.9)',
      border: '1px solid #333',
      padding: '30px',
      borderRadius: '25px',
      boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
      backdropFilter: 'blur(20px)'
    }}>
      <h2 style={{
        fontSize: '28px',
        color: 'white',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '15px'
      }}>
        📅 Show Timeline
        {streamStatus.isStreaming && (
          <span style={{
            fontSize: '14px',
            background: '#4CAF50',
            padding: '5px 15px',
            borderRadius: '20px',
            animation: 'pulse 2s infinite'
          }}>
            LIVE
          </span>
        )}
      </h2>
      
      <div style={{
        maxHeight: '400px',
        overflowY: 'auto',
        paddingRight: '10px'
      }}>
        {performers.map((performer, index) => {
          const isIntermission = isIntermissionSlot(performer.timeSlot);
          const slotMinutes = timeSlotToMinutes(performer.timeSlot);
          const isPast = slotMinutes < currentTimeInMinutes && index !== currentPerformerIndex;
          const isCurrent = index === currentPerformerIndex && streamStatus.isStreaming;
          const isNext = index === currentPerformerIndex + 1;
          
          return (
            <div
              key={`${performer.timeSlot}-${index}`}
              style={getTimelineItemStyle(index, isIntermission, isPast)}
              onMouseEnter={(e) => {
                if (!isCurrent && !isPast) {
                  e.currentTarget.style.background = isIntermission ? 
                    'rgba(255, 107, 107, 0.3)' : 'rgba(255, 255, 255, 0.08)';
                  e.currentTarget.style.borderColor = '#777';
                  e.currentTarget.style.transform = 'translateX(5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isCurrent && !isPast) {
                  e.currentTarget.style.background = isIntermission ? 
                    INTERMISSION_CONFIG.backgroundColor : 'rgba(255, 255, 255, 0.05)';
                  e.currentTarget.style.borderColor = isIntermission ? 
                    INTERMISSION_CONFIG.borderColor : '#555';
                  e.currentTarget.style.transform = 'translateX(0)';
                }
              }}
            >
              {/* Live indicator */}
              {isCurrent && (
                <div style={{
                  position: 'absolute',
                  left: '-30px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#ff0000',
                  boxShadow: '0 0 20px #ff0000',
                  animation: 'pulse 1s infinite'
                }} />
              )}
              
              {/* Next indicator */}
              {isNext && !streamStatus.isStreaming && (
                <div style={{
                  position: 'absolute',
                  right: '15px',
                  top: '15px',
                  background: '#2196F3',
                  color: 'white',
                  padding: '4px 12px',
                  borderRadius: '15px',
                  fontSize: '12px',
                  fontWeight: '600',
                  textTransform: 'uppercase'
                }}>
                  Next
                </div>
              )}
              
              <div style={getTimeSlotStyle(isIntermission, isPast, isCurrent)}>
                {performer.timeSlot}
                {isIntermission && ' - 🎭 INTERMISSION'}
              </div>
              
              {!isIntermission && (
                <>
                  <div style={getArtistStyle(isPast, isCurrent)}>
                    {performer.artist}
                  </div>
                  
                  {performer.songs && performer.songs.length > 0 && (
                    <div style={getSongStyle(isPast)}>
                      {performer.songs.filter(s => s.title).map(s => s.title).join(', ')}
                    </div>
                  )}
                </>
              )}
              
              {isPast && !isCurrent && (
                <div style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: '60px',
                  opacity: 0.1,
                  pointerEvents: 'none'
                }}>
                  ✓
                </div>
              )}
            </div>
          );
        })}
      </div>
      
      {/* Timeline legend */}
      <div style={{
        marginTop: '20px',
        paddingTop: '20px',
        borderTop: '1px solid #444',
        display: 'flex',
        gap: '30px',
        justifyContent: 'center',
        fontSize: '14px',
        color: '#aaa'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#ff0000',
            boxShadow: '0 0 10px #ff0000'
          }} />
          <span>Live Now</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: '#2196F3'
          }} />
          <span>Up Next</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ opacity: 0.6 }}>✓</span>
          <span>Completed</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '3px',
            background: INTERMISSION_CONFIG.backgroundColor,
            border: `1px solid ${INTERMISSION_CONFIG.borderColor}`
          }} />
          <span>Intermission</span>
        </div>
      </div>
      
      {/* CSS for animations */}
      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
};

export default ShowTimeline;