// utils/staffAuth.js
// Simple staff authentication system
// In production, you'd want to use proper authentication

const STAFF_CODES = [
  'MAKER2025STAFF',
  'VIDEOTECH945',
  'OBSCONTROL123'
  // Add more staff codes as needed
];

export const isStaffAuthenticated = () => {
  const staffAuth = localStorage.getItem('staffAuthenticated');
  const authTime = localStorage.getItem('staffAuthTime');
  
  if (!staffAuth || !authTime) return false;
  
  // Check if authentication is still valid (8 hours)
  const eightHours = 8 * 60 * 60 * 1000;
  const isExpired = Date.now() - parseInt(authTime) > eightHours;
  
  return !isExpired;
};

export const authenticateStaff = (code) => {
  if (STAFF_CODES.includes(code.toUpperCase())) {
    localStorage.setItem('staffAuthenticated', 'true');
    localStorage.setItem('staffAuthTime', Date.now().toString());
    return true;
  }
  return false;
};

export const logoutStaff = () => {
  localStorage.removeItem('staffAuthenticated');
  localStorage.removeItem('staffAuthTime');
};