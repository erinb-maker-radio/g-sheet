// components/ArtistNamePage.js
import React from 'react';
import { formCardStyle, backButtonStyle, inputStyle, titleStyle } from '../styles/styles';

const ArtistNamePage = ({ artist, setArtist, onNext, onBack }) => {
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

  const handleInputFocus = (e, isFocused) => {
    if (isFocused) {
      e.target.style.borderColor = '#e91e63';
      e.target.style.boxShadow = '0 0 20px rgba(233, 30, 99, 0.3)';
    } else {
      e.target.style.borderColor = '#555';
      e.target.style.boxShadow = 'none';
    }
  };

  const handleSubmitHover = (e, isEntering) => {
    if (artist.trim() && isEntering) {
      e.target.style.transform = 'translateY(-3px)';
      e.target.style.boxShadow = '0 15px 35px rgba(233, 30, 99, 0.4)';
    } else if (artist.trim()) {
      e.target.style.transform = 'translateY(0)';
      e.target.style.boxShadow = '0 10px 25px rgba(233, 30, 99, 0.3)';
    }
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
          ← Back to Role Selection
        </button>
      </div>
      
      <h1 style={titleStyle}>Artist Information</h1>
      
      <div style={{ marginBottom: '40px' }}>
        <input
          type="text"
          placeholder="Artist Name"
          value={artist}
          onChange={e => setArtist(e.target.value)}
          style={inputStyle}
          onFocus={(e) => handleInputFocus(e, true)}
          onBlur={(e) => handleInputFocus(e, false)}
        />
      </div>

      <button
        onClick={() => {
          if (artist.trim()) {
            onNext();
          }
        }}
        disabled={!artist.trim()}
        style={{
          width: '100%',
          padding: '20px',
          background: artist.trim() ? 'linear-gradient(135deg, #e91e63, #9c27b0)' : '#555',
          color: 'white',
          border: 'none',
          borderRadius: '15px',
          fontWeight: '800',
          fontSize: '18px',
          cursor: artist.trim() ? 'pointer' : 'not-allowed',
          textTransform: 'uppercase',
          letterSpacing: '2px',
          transition: 'all 0.3s ease',
          boxShadow: artist.trim() ? '0 10px 25px rgba(233, 30, 99, 0.3)' : 'none'
        }}
        onMouseEnter={(e) => handleSubmitHover(e, true)}
        onMouseLeave={(e) => handleSubmitHover(e, false)}
      >
        Continue
      </button>
    </div>
  );
};

export default ArtistNamePage;