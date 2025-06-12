// styles/styles.js
export const containerStyle = {
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  background: '#0a0a0a',
  color: 'white',
  minHeight: '100vh',
  position: 'relative'
};

export const gridBgStyle = {
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  backgroundImage: 'linear-gradient(rgba(233, 30, 99, 0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(233, 30, 99, 0.08) 1px, transparent 1px)',
  backgroundSize: '60px 60px',
  pointerEvents: 'none',
  zIndex: -1,
  opacity: 0.4
};

export const welcomeCardStyle = {
  background: 'linear-gradient(135deg, #e91e63 0%, #673ab7 100%)',
  padding: '40px 60px 70px 60px',
  borderRadius: '25px',
  marginBottom: '30px',
  position: 'relative',
  overflow: 'hidden',
  textAlign: 'center',
  boxShadow: '0 25px 50px rgba(233, 30, 99, 0.2)'
};

export const formCardStyle = {
  background: 'rgba(40, 40, 40, 0.9)',
  border: '1px solid #333',
  padding: '60px 50px',
  borderRadius: '25px',
  boxShadow: '0 25px 50px rgba(0, 0, 0, 0.3)',
  backdropFilter: 'blur(20px)'
};

export const backButtonStyle = {
  background: 'transparent',
  color: '#888',
  border: '2px solid #555',
  padding: '15px 30px',
  borderRadius: '10px',
  cursor: 'pointer',
  fontSize: '16px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  transition: 'all 0.3s ease'
};

export const primaryButtonStyle = {
  background: 'linear-gradient(135deg, #e91e63, #9c27b0)',
  color: 'white',
  border: 'none',
  padding: '25px 40px',
  fontSize: '18px',
  fontWeight: '700',
  borderRadius: '15px',
  cursor: 'pointer',
  minWidth: '180px',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  transition: 'all 0.3s ease',
  boxShadow: '0 10px 25px rgba(233, 30, 99, 0.3)'
};

export const inputStyle = {
  width: '100%',
  padding: '20px',
  fontSize: '18px',
  borderRadius: '15px',
  border: '2px solid #555',
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'white',
  boxSizing: 'border-box',
  transition: 'all 0.3s ease',
  backdropFilter: 'blur(10px)'
};

export const titleStyle = {
  fontSize: '48px',
  marginBottom: '40px',
  fontWeight: '900',
  textAlign: 'center',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  background: 'linear-gradient(45deg, #e91e63, #9c27b0)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  backgroundClip: 'text'
};

export const agreementButtonStyles = {
  yes: {
    background: 'linear-gradient(135deg, #4CAF50, #45a049)',
    color: 'white',
    border: 'none',
    padding: '25px 40px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '15px',
    cursor: 'pointer',
    minWidth: '180px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(76, 175, 80, 0.3)'
  },
  no: {
    background: 'linear-gradient(135deg, #f44336, #d32f2f)',
    color: 'white',
    border: 'none',
    padding: '25px 40px',
    fontSize: '18px',
    fontWeight: '700',
    borderRadius: '15px',
    cursor: 'pointer',
    minWidth: '180px',
    textTransform: 'uppercase',
    letterSpacing: '1px',
    transition: 'all 0.3s ease',
    boxShadow: '0 10px 25px rgba(244, 67, 54, 0.3)'
  }
};

export const songCardStyle = {
  marginBottom: '20px',
  padding: '25px',
  border: '2px solid #555',
  borderRadius: '15px',
  background: 'rgba(255, 255, 255, 0.05)',
  transition: 'all 0.3s ease'
};

export const timeSlotButtonStyle = {
  padding: '18px 0',
  borderRadius: '12px',
  fontWeight: '700',
  fontSize: '16px',
  transition: 'all 0.3s ease',
  textTransform: 'uppercase',
  letterSpacing: '1px',
  cursor: 'pointer'
};

// Hover effect helpers
export const addHoverEffect = (element, hoverStyle, originalStyle) => {
  element.onmouseenter = () => Object.assign(element.style, hoverStyle);
  element.onmouseleave = () => Object.assign(element.style, originalStyle);
};