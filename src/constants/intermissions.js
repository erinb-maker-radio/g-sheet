// src/constants/intermissions.js
export const INTERMISSION_SLOTS = ['8:30', '9:30', '8:30 PM', '9:30 PM'];

export const isIntermissionSlot = (slot) => {
  return INTERMISSION_SLOTS.includes(slot);
};

export const INTERMISSION_CONFIG = {
  slots: INTERMISSION_SLOTS,
  duration: 15, // minutes
  displayName: '🎭 INTERMISSION',
  color: '#FF6B6B',
  backgroundColor: 'rgba(255, 107, 107, 0.2)',
  borderColor: '#FF6B6B'
};