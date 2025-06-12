// components/AgreementPages.js
import React, { useState, useEffect } from 'react';
import { backButtonStyle } from '../styles/styles';

const AgreementPages = ({ currentPage, onAgree, onDisagree, onBack }) => {
  const [togglePosition, setTogglePosition] = useState(false);
  const [hasReadStay, setHasReadStay] = useState(false);
  const [checkboxChecked, setCheckboxChecked] = useState(false);
  const [userInitials, setUserInitials] = useState('');
  const [selectedRadio, setSelectedRadio] = useState('');
  const [timeDelay, setTimeDelay] = useState(3);
  const [canProceed, setCanProceed] = useState(false);

  // Reset states when page changes
  useEffect(() => {
    setTogglePosition(false);
    setHasReadStay(false);
    setCheckboxChecked(false);
    setUserInitials('');
    setSelectedRadio('');
    setTimeDelay(3);
    setCanProceed(false);
    
    // Start countdown timer
    const timer = setInterval(() => {
      setTimeDelay(prev => {
        if (prev <= 1) {
          setCanProceed(true);
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentPage]);

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

  const baseCardStyle = {
    background: 'rgba(40, 40, 40, 0.9)',
    border: '1px solid #333',
    padding: '70px 60px',
    borderRadius: '25px',
    boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
    backdropFilter: 'blur(20px)',
    textAlign: 'center'
  };

  // TOGGLE SWITCH PAGE
  if (currentPage === 'stay-agreement') {
    return (
      <div style={{
        ...baseCardStyle,
        background: 'linear-gradient(135deg, #17a2b8, #007bff)',
        border: '1px solid #0056b3'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={onBack}
            style={backButtonStyle}
            onMouseEnter={(e) => handleBackHover(e, true)}
            onMouseLeave={(e) => handleBackHover(e, false)}
          >
            ← Back
          </button>
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '20px',
          fontWeight: '600',
          letterSpacing: '1px'
        }}>
          STEP 1 OF 3: COMMUNITY COMMITMENT
        </div>
        
        <div style={{ marginBottom: '40px', lineHeight: '1.6' }}>
          <h2 style={{ 
            fontSize: '24px', 
            marginBottom: '20px', 
            fontWeight: '600',
            color: 'white'
          }}>
            Please stay for at least 4 other performances besides your own. We want to have a full audience for every performer, to cheer them on and celebrate their unique performances.
          </h2>
          
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)', marginBottom: '20px' }}>
            Will you commit to staying for other performers?
          </p>
        </div>
        
        {/* Toggle Switch */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '30px',
            marginBottom: '20px'
          }}>
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: togglePosition ? 'rgba(255,255,255,0.5)' : 'white' 
            }}>
              NO
            </span>
            
            <div 
              onClick={() => {
                if (canProceed) {
                  setTogglePosition(!togglePosition);
                  setHasReadStay(true);
                }
              }}
              style={{
                width: '80px',
                height: '40px',
                backgroundColor: togglePosition ? '#28a745' : '#dc3545',
                borderRadius: '20px',
                position: 'relative',
                cursor: canProceed ? 'pointer' : 'not-allowed',
                transition: 'all 0.3s ease',
                opacity: canProceed ? 1 : 0.5
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                backgroundColor: 'white',
                borderRadius: '50%',
                position: 'absolute',
                top: '4px',
                left: togglePosition ? '44px' : '4px',
                transition: 'all 0.3s ease',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
              }} />
            </div>
            
            <span style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: togglePosition ? 'white' : 'rgba(255,255,255,0.5)' 
            }}>
              YES
            </span>
          </div>
          
          {!canProceed && (
            <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '20px' }}>
              Please read carefully... {timeDelay > 0 ? `${timeDelay}s` : 'Ready!'}
            </div>
          )}
        </div>
        
        {hasReadStay && togglePosition && (
          <button 
            onClick={() => onAgree('stay')}
            style={{
              background: '#28a745',
              color: 'white',
              border: 'none',
              padding: '20px 40px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '10px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            ✅ Continue to Next Step
          </button>
        )}
        
        {hasReadStay && !togglePosition && (
          <button 
            onClick={() => onDisagree('stay')}
            style={{
              background: '#dc3545',
              color: 'white',
              border: 'none',
              padding: '20px 40px',
              fontSize: '18px',
              fontWeight: '700',
              borderRadius: '10px',
              cursor: 'pointer',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}
          >
            ❌ I Cannot Commit
          </button>
        )}
      </div>
    );
  }

  // CHECKBOX + INITIALS PAGE
  if (currentPage === 'attendance-agreement') {
    const canSubmit = checkboxChecked && userInitials.trim().length >= 2;
    
    return (
      <div style={{
        ...baseCardStyle,
        background: 'linear-gradient(135deg, #fd7e14, #dc3545)',
        border: '1px solid #bd2130'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={onBack}
            style={backButtonStyle}
            onMouseEnter={(e) => handleBackHover(e, true)}
            onMouseLeave={(e) => handleBackHover(e, false)}
          >
            ← Back
          </button>
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '20px',
          fontWeight: '600',
          letterSpacing: '1px'
        }}>
          STEP 2 OF 3: ATTENDANCE COMMITMENT
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            color: 'white',
            fontWeight: '600',
            marginBottom: '20px'
          }}>
            Please do not leave after you sign up, then return right before your performance.
          </h2>
          
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            This disrupts the show's flow and community energy.
          </p>
        </div>
        
        {/* Checkbox */}
        <div style={{ marginBottom: '25px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '15px',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            opacity: canProceed ? 1 : 0.5,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            <input
              type="checkbox"
              checked={checkboxChecked}
              onChange={(e) => canProceed && setCheckboxChecked(e.target.checked)}
              disabled={!canProceed}
              style={{ 
                transform: 'scale(1.5)', 
                accentColor: '#28a745'
              }}
            />
            <span>I understand this commitment</span>
          </label>
        </div>
        
        {/* Initials Input */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '10px', fontSize: '16px', color: 'rgba(255,255,255,0.9)' }}>
            Type your initials to confirm:
          </div>
          <input
            type="text"
            value={userInitials}
            onChange={(e) => setUserInitials(e.target.value.toUpperCase())}
            placeholder="Your initials"
            disabled={!checkboxChecked}
            style={{
              padding: '12px',
              fontSize: '18px',
              borderRadius: '8px',
              border: '2px solid white',
              background: 'rgba(255,255,255,0.9)',
              color: '#333',
              textAlign: 'center',
              fontWeight: '700',
              width: '100px'
            }}
          />
        </div>
        
        {!canProceed && (
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '20px' }}>
            Reading time... {timeDelay > 0 ? `${timeDelay}s` : 'Ready!'}
          </div>
        )}
        
        <button 
          onClick={() => onAgree('attendance')}
          disabled={!canSubmit}
          style={{
            background: canSubmit ? '#28a745' : '#6c757d',
            color: 'white',
            border: 'none',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '10px',
            cursor: canSubmit ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {canSubmit ? '✅ Confirm Agreement' : '⏳ Complete Above'}
        </button>
      </div>
    );
  }

  // RADIO QUIZ PAGE
  if (currentPage === 'smoking-agreement') {
    const isCorrectAnswer = selectedRadio === 'intermissions';
    
    return (
      <div style={{
        ...baseCardStyle,
        background: 'linear-gradient(135deg, #28a745, #20c997)',
        border: '1px solid #1e7e34'
      }}>
        <div style={{ marginBottom: '30px' }}>
          <button 
            onClick={onBack}
            style={backButtonStyle}
            onMouseEnter={(e) => handleBackHover(e, true)}
            onMouseLeave={(e) => handleBackHover(e, false)}
          >
            ← Back
          </button>
        </div>
        
        <div style={{ 
          fontSize: '14px', 
          color: 'rgba(255,255,255,0.8)', 
          marginBottom: '20px',
          fontWeight: '600',
          letterSpacing: '1px'
        }}>
          STEP 3 OF 3: BREAK SCHEDULE
        </div>
        
        <div style={{ marginBottom: '30px' }}>
          <h2 style={{ 
            fontSize: '24px', 
            color: 'white',
            fontWeight: '600',
            marginBottom: '15px'
          }}>
            Intermissions are at 8:30 PM and 9:30 PM
          </h2>
          
          <p style={{ fontSize: '18px', color: 'rgba(255,255,255,0.9)' }}>
            When is the appropriate time to go outside for breaks?
          </p>
        </div>
        
        {/* Radio Options */}
        <div style={{ marginBottom: '30px' }}>
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '15px',
            maxWidth: '400px',
            margin: '0 auto'
          }}>
            {[
              { value: 'anytime', label: 'Anytime during the show' },
              { value: 'intermissions', label: 'Only during intermissions' },
              { value: 'before', label: 'Only before my performance' }
            ].map((option) => (
              <label 
                key={option.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '15px',
                  background: selectedRadio === option.value ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  cursor: canProceed ? 'pointer' : 'not-allowed',
                  border: selectedRadio === option.value ? '2px solid white' : '2px solid transparent',
                  opacity: canProceed ? 1 : 0.5
                }}
                onClick={() => canProceed && setSelectedRadio(option.value)}
              >
                <input
                  type="radio"
                  name="breakTime"
                  value={option.value}
                  checked={selectedRadio === option.value}
                  onChange={() => {}}
                  disabled={!canProceed}
                  style={{ transform: 'scale(1.2)' }}
                />
                <span style={{ fontSize: '16px', color: 'white' }}>
                  {option.label}
                </span>
              </label>
            ))}
          </div>
          
          {selectedRadio && !isCorrectAnswer && (
            <div style={{ 
              marginTop: '15px', 
              color: '#ffffcc', 
              fontSize: '16px'
            }}>
              Please select the correct answer based on the schedule above.
            </div>
          )}
        </div>
        
        {!canProceed && (
          <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '16px', marginBottom: '20px' }}>
            Reading time... {timeDelay > 0 ? `${timeDelay}s` : 'Ready!'}
          </div>
        )}
        
        <button 
          onClick={() => onAgree('smoking')}
          disabled={!isCorrectAnswer}
          style={{
            background: isCorrectAnswer ? '#ffffff' : '#6c757d',
            color: isCorrectAnswer ? '#28a745' : 'white',
            border: 'none',
            padding: '20px 40px',
            fontSize: '18px',
            fontWeight: '700',
            borderRadius: '10px',
            cursor: isCorrectAnswer ? 'pointer' : 'not-allowed',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
        >
          {isCorrectAnswer ? '🎉 Complete Setup' : '⏳ Answer Above'}
        </button>
      </div>
    );
  }

  return null;
};

export default AgreementPages;