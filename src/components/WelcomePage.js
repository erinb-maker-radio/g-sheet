// components/WelcomePage.js
import React from 'react';
import { welcomeCardStyle } from '../styles/styles';

const WelcomePage = ({ onNext }) => {
  return (
    <div style={welcomeCardStyle}>
      {/* Animated diagonal stripes */}
      <div style={{
        position: 'absolute',
        top: '-50%',
        right: '-50%',
        width: '200%',
        height: '200%',
        background: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.03) 15px, rgba(255,255,255,0.03) 30px)',
        pointerEvents: 'none'
      }} />
      
      <div style={{ position: 'relative', zIndex: 1 }}>
        <div style={{
          fontSize: '28px',
          fontWeight: '300',
          marginBottom: '0px',
          opacity: 0.9,
          letterSpacing: '3px',
          textTransform: 'uppercase'
        }}>
          Welcome to
        </div>
        
        <h1 style={{ 
          fontSize: '64px', 
          fontWeight: '900', 
          marginBottom: '6px', 
          textShadow: '0 8px 16px rgba(0,0,0,0.5)',
          lineHeight: '0.9',
          textTransform: 'uppercase',
          letterSpacing: '-2px'
        }}>
          What Is Art?
        </h1>

        {/* Episode info */}
        <div style={{
          fontSize: '30px',
          fontWeight: '600',
          marginBottom: '6px',
          opacity: 0.9,
          letterSpacing: '1px'
        }}>
          {(() => {
            // Calculate episode number (starting from #120 on May 22, 2025)
            const baseDate = new Date('2025-05-22'); // Thursday May 22, 2025 was episode #120
            const baseEpisode = 120;
            const currentDate = new Date();
            const weeksDiff = Math.floor((currentDate.getTime() - baseDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const currentEpisode = baseEpisode + weeksDiff;
            
            // Format current date
            const formatDate = (date) => {
              const months = ['January', 'February', 'March', 'April', 'May', 'June',
                             'July', 'August', 'September', 'October', 'November', 'December'];
              const month = months[date.getMonth()];
              const day = date.getDate();
              const year = date.getFullYear();
              
              // Add ordinal suffix
              const getOrdinal = (n) => {
                const s = ['th', 'st', 'nd', 'rd'];
                const v = n % 100;
                return n + (s[(v - 20) % 10] || s[v] || s[0]);
              };
              
              return `${month} ${getOrdinal(day)}, ${year}`;
            };
            
            return `Episode #${currentEpisode}, ${formatDate(currentDate)}`;
          })()}
        </div>
        
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          marginBottom: '6px', 
          opacity: 0.8,
          textTransform: 'uppercase',
          letterSpacing: '3px',
          position: 'relative',
          display: 'inline-block'
        }}>
          <span style={{
            position: 'absolute',
            left: '-60px',
            top: '50%',
            width: '40px',
            height: '1px',
            background: 'rgba(255,255,255,0.5)'
          }} />
          Open Stage • Open Mic • Livestream
          <span style={{
            position: 'absolute',
            right: '-60px',
            top: '50%',
            width: '40px',
            height: '1px',
            background: 'rgba(255,255,255,0.5)'
          }} />
        </h2>
        
        <div style={{ 
          fontSize: '17px', 
          lineHeight: '1.8', 
          marginBottom: '50px', 
          opacity: 0.95,
          maxWidth: '580px',
          marginLeft: 'auto',
          marginRight: 'auto'
        }}>
          <p style={{ marginBottom: '25px' }}>
            This is a live recording event. All performances and audience interactions will be captured for broadcast and streaming purposes.
          </p>
          
          <p>
            "What Is Art?" is built on collaborative participation. Every performer and audience member contributes to the energy and authenticity of tonight's show. Your engagement—whether as a performer or audience member—is essential to creating an authentic and dynamic experience.
          </p>
        </div>
        
        <div style={{ 
          fontSize: '26px', 
          fontWeight: '700', 
          marginBottom: '40px',
          textTransform: 'uppercase',
          letterSpacing: '1px'
        }}>
          Are you ready to participate?
        </div>
        
        <button 
          onClick={onNext}
          style={{
            background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
            color: 'white',
            border: '3px solid #000',
            padding: '22px 55px',
            fontSize: '16px',
            fontWeight: '900',
            borderRadius: '15px',
            cursor: 'pointer',
            textTransform: 'uppercase',
            letterSpacing: '2px',
            boxShadow: '0 10px 30px rgba(233, 30, 99, 0.4)',
            transition: 'all 0.3s ease'
          }}
          onMouseEnter={(e) => {
            e.target.style.transform = 'translateY(-3px) scale(1.05)';
            e.target.style.boxShadow = '0 20px 40px rgba(233, 30, 99, 0.5)';
          }}
          onMouseLeave={(e) => {
            e.target.style.transform = 'translateY(0) scale(1)';
            e.target.style.boxShadow = '0 10px 30px rgba(233, 30, 99, 0.4)';
          }}
        >
          I'm Ready!
        </button>
      </div>
    </div>
  );
};

export default WelcomePage;