// App.js - Fixed Main Entry Point
import React, { useState, useEffect } from 'react';
import WelcomePage from './components/WelcomePage';
import RoleSelectPage from './components/RoleSelectPage';
import ArtistNamePage from './components/ArtistNamePage';
import EmailPage from './components/EmailPage';
import AgreementPages from './components/AgreementPages';
import PerformerFormPage from './components/PerformerFormPage';
import StaffLogin from './components/StaffLogin';
import StaffDashboard from './components/SimplifiedStaffDashboard';
import { containerStyle, gridBgStyle } from './styles/styles';
import { isStaffAuthenticated } from './utils/staffAuth';

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

// Time slots for the show
const TIME_SLOTS = [
  '7:30', '7:45', '8:00', '8:15',
  '8:30', // Intermission
  '8:45', '9:00', '9:15', 
  '9:30', // Intermission  
  '9:45', '10:00', '10:15'
];

function App() {
  // State management
  const [currentPage, setCurrentPage] = useState('welcome');
  const [userRole, setUserRole] = useState('');
  const [artist, setArtist] = useState('');
  const [email, setEmail] = useState('');
  const [subscribeToNews, setSubscribeToNews] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [takenSlots, setTakenSlots] = useState([]);
  const [agreementStep, setAgreementStep] = useState('stay-agreement');
  const [completedAgreements, setCompletedAgreements] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [formSuccess, setFormSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showStaffDashboard, setShowStaffDashboard] = useState(false);

  // Songs state (up to 4 songs)
  const [songs, setSongs] = useState([
    { title: '', writer: '' },
    { title: '', writer: '' },
    { title: '', writer: '' },
    { title: '', writer: '' }
  ]);

  // Check for staff authentication on load
  useEffect(() => {
    if (isStaffAuthenticated()) {
      setShowStaffDashboard(true);
    }
  }, []);

  // Fetch taken slots when component mounts
  useEffect(() => {
    fetchTakenSlots();
  }, []);

  const fetchTakenSlots = async () => {
    try {
      const response = await fetch(SCRIPT_URL + "?query=slots");
      const data = await response.json();
      
      if (data.takenSlots) {
        // Handle both old format (array of strings) and new format (array of objects)
        if (data.takenSlots.length > 0 && typeof data.takenSlots[0] === 'object') {
          // New format - extract just the time slots
          setTakenSlots(data.takenSlots.map(slot => slot.timeSlot).filter(Boolean));
        } else {
          // Old format - already strings
          setTakenSlots(data.takenSlots);
        }
      }
    } catch (err) {
      console.error('Error fetching taken slots:', err);
    }
  };

  // Update song data
  const updateSong = (index, field, value) => {
    const newSongs = [...songs];
    newSongs[index] = { ...newSongs[index], [field]: value };
    setSongs(newSongs);
  };

  // Handle agreement responses
  const handleAgreement = (agreementType) => {
    const newCompleted = [...completedAgreements, agreementType];
    setCompletedAgreements(newCompleted);

    if (agreementType === 'stay') {
      setAgreementStep('attendance-agreement');
    } else if (agreementType === 'attendance') {
      setAgreementStep('smoking-agreement');
    } else if (agreementType === 'smoking') {
      // All agreements completed
      setCurrentPage('performer-form');
    }
  };

  const handleDisagreement = () => {
    alert('We understand. Thank you for your interest in What Is Art?');
    resetToWelcome();
  };

  // Submit form
  const submitForm = async () => {
    setSubmitting(true);
    setError('');

    try {
      // Prepare song data - only include songs with titles
      const validSongs = songs.filter(song => song.title.trim());
      
      const formData = {
        artist: artist,
        email: email,
        subscribeToNews: subscribeToNews,
        timeSlot: selectedSlot,
        songs: validSongs
      };

      // Send to Google Apps Script
      const queryParams = new URLSearchParams();
      queryParams.append('artist', artist);
      queryParams.append('email', email);
      queryParams.append('subscribeToNews', subscribeToNews);
      queryParams.append('timeSlot', selectedSlot);
      
      // Add songs as separate parameters
      validSongs.forEach((song, index) => {
        queryParams.append(`song${index + 1}`, song.title);
        queryParams.append(`writer${index + 1}`, song.writer);
      });

      // Use image technique for Google Apps Script
      const img = new Image();
      img.src = `${SCRIPT_URL}?${queryParams.toString()}`;
      
      // Wait a moment for the request to process
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setFormSuccess(true);
      setSubmitting(false);
      
      // Reset form after success
      setTimeout(() => {
        resetToWelcome();
      }, 3000);

    } catch (err) {
      setError('Submission failed. Please try again.');
      setSubmitting(false);
    }
  };

  // Reset to welcome page
  const resetToWelcome = () => {
    setCurrentPage('welcome');
    setUserRole('');
    setArtist('');
    setEmail('');
    setSubscribeToNews(false);
    setSelectedSlot('');
    setAgreementStep('stay-agreement');
    setCompletedAgreements([]);
    setSongs([
      { title: '', writer: '' },
      { title: '', writer: '' },
      { title: '', writer: '' },
      { title: '', writer: '' }
    ]);
    setFormSuccess(false);
    setError('');
  };

  // Handle staff authentication
  const handleStaffAuthenticated = () => {
    setShowStaffDashboard(true);
  };

  const handleStaffLogout = () => {
    setShowStaffDashboard(false);
  };

  // Show staff dashboard if authenticated
  if (showStaffDashboard) {
    return <StaffDashboard onLogout={handleStaffLogout} />;
  }

  return (
    <div style={containerStyle}>
      <div style={gridBgStyle} />
      
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        padding: '20px'
      }}>
        <div style={{ width: '100%', maxWidth: '800px' }}>
          
          {/* Welcome Page */}
          {currentPage === 'welcome' && (
            <WelcomePage onNext={() => setCurrentPage('role-select')} />
          )}

          {/* Role Selection */}
          {currentPage === 'role-select' && (
            <RoleSelectPage
              onSelectRole={(role) => {
                setUserRole(role);
                if (role === 'performer') {
                  setCurrentPage('artist-name');
                } else {
                  setCurrentPage('email');
                }
              }}
              onBack={() => setCurrentPage('welcome')}
            />
          )}

          {/* Artist Name (Performers Only) */}
          {currentPage === 'artist-name' && (
            <ArtistNamePage
              artist={artist}
              setArtist={setArtist}
              onNext={() => setCurrentPage('email')}
              onBack={() => setCurrentPage('role-select')}
            />
          )}

          {/* Email Collection */}
          {currentPage === 'email' && (
            <EmailPage
              email={email}
              setEmail={setEmail}
              subscribeToNews={subscribeToNews}
              setSubscribeToNews={setSubscribeToNews}
              userRole={userRole}
              onNext={() => {
                if (userRole === 'performer') {
                  setCurrentPage('agreements');
                } else {
                  // Audience members go straight to success
                  setFormSuccess(true);
                  setTimeout(() => {
                    resetToWelcome();
                  }, 3000);
                }
              }}
              onBack={() => {
                if (userRole === 'performer') {
                  setCurrentPage('artist-name');
                } else {
                  setCurrentPage('role-select');
                }
              }}
            />
          )}

          {/* Agreement Pages (Performers Only) */}
          {currentPage === 'agreements' && (
            <AgreementPages
              currentPage={agreementStep}
              onAgree={handleAgreement}
              onDisagree={handleDisagreement}
              onBack={() => setCurrentPage('email')}
            />
          )}

          {/* Performer Form */}
          {currentPage === 'performer-form' && (
            <PerformerFormPage
              songs={songs}
              updateSong={updateSong}
              selectedSlot={selectedSlot}
              setSelectedSlot={setSelectedSlot}
              takenSlots={takenSlots}
              timeSlots={TIME_SLOTS}
              onSubmit={submitForm}
              submitting={submitting}
              formSuccess={formSuccess}
              error={error}
              onBack={() => setCurrentPage('agreements')}
              artist={artist}
              email={email}
            />
          )}

        </div>
      </div>

      {/* Staff Access */}
      <StaffLogin onAuthenticated={handleStaffAuthenticated} />
    </div>
  );
}

export default App;