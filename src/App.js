import React, { useState, useEffect } from "react";
import WelcomePage from "./components/WelcomePage";
import RoleSelectPage from "./components/RoleSelectPage";
import ArtistNamePage from "./components/ArtistNamePage";
import EmailPage from "./components/EmailPage";
import AgreementPages from "./components/AgreementPages";
import PerformerFormPage from "./components/PerformerFormPage";
import OBSControl from "./components/OBSControl";
import BroadcastManager from "./components/BroadcastManager";
import StaffLogin from "./components/StaffLogin";
import SimplifiedStaffDashboard from "./components/SimplifiedStaffDashboard";
import { isStaffAuthenticated, logoutStaff } from "./utils/staffAuth";
import { containerStyle, gridBgStyle } from "./styles/styles";
import { isIntermissionSlot } from "./constants/intermissions";

const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby60OaTTZ5Ad3z-VKM5RvUKeRlsIu0-HiYm8DdYUEMMT3ZM5wtjACnuV8RHVPzg2-Kq/exec';

const TIME_SLOTS = [
  "7:30", "7:45", "8:00", "8:15", "8:30", "8:45", "9:00", "9:15", "9:30", "9:45", "10:00", "10:15"
];

function App() {
  const [currentPage, setCurrentPage] = useState('welcome');
  const [userRole, setUserRole] = useState('');
  const [artist, setArtist] = useState("");
  const [email, setEmail] = useState("");
  const [subscribeToNews, setSubscribeToNews] = useState(false);
  const [stayAgreement, setStayAgreement] = useState(null);
  const [attendanceAgreement, setAttendanceAgreement] = useState(null);
  const [smokingAgreement, setSmokingAgreement] = useState(null);
  const [songs, setSongs] = useState([
    { title: "", writer: "" },
    { title: "", writer: "" },
    { title: "", writer: "" },
    { title: "", writer: "" }
  ]);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [takenSlots, setTakenSlots] = useState([]);
  const [formSuccess, setFormSuccess] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showOBSPanel, setShowOBSPanel] = useState(false);
  const [isStaffAuth, setIsStaffAuth] = useState(false);

  useEffect(() => { 
    fetchTakenSlots(); 
    setIsStaffAuth(isStaffAuthenticated());
  }, []);

  const fetchTakenSlots = async () => {
    try {
      const res = await fetch(SCRIPT_URL + "?query=slots");
      const data = await res.json();
      console.log('Raw data from Google Sheets:', data);
      
      if (data.takenSlots) {
        // Normalize the data to ensure consistent structure
        const normalizedSlots = data.takenSlots.map(slot => {
          // Handle both string format (just time slot) and object format
          if (typeof slot === 'string') {
            // If it's just a string, create a minimal object
            return {
              timeSlot: slot,
              artist: 'TBD',
              songs: []
            };
          } else if (typeof slot === 'object') {
            // Ensure all required fields exist with defaults
            return {
              timeSlot: slot.timeSlot || '',
              artist: slot.artist || 'TBD',
              songs: slot.songs || [],
              email: slot.email || ''
            };
          }
          return null;
        }).filter(slot => slot !== null);
        
        console.log('Normalized slots:', normalizedSlots);
        setTakenSlots(normalizedSlots);
      } else {
        setTakenSlots([]);
      }
    } catch (err) {
      console.error('Error fetching slots:', err);
      setTakenSlots([]);
    }
  };

  const updateSong = (index, field, value) => {
    const newSongs = [...songs];
    newSongs[index][field] = value;
    setSongs(newSongs);
  };

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    setFormSuccess(false);

    if (!artist || !selectedSlot) {
      setError("Artist and time slot are required.");
      setSubmitting(false);
      return;
    }

    const hasAtLeastOneSong = songs.some(song => song.title.trim());
    if (!hasAtLeastOneSong) {
      setError("At least one song title is required.");
      setSubmitting(false);
      return;
    }

    const params = new URLSearchParams({
      artist,
      timeSlot: selectedSlot,
      song1Title: songs[0].title,
      song1Writer: songs[0].writer,
      song2Title: songs[1].title,
      song2Writer: songs[1].writer,
      song3Title: songs[2].title,
      song3Writer: songs[2].writer,
      song4Title: songs[3].title,
      song4Writer: songs[3].writer,
      email: email || ''
    }).toString();

    try {
      const res = await fetch(SCRIPT_URL + "?" + params);
      const data = await res.json();

      if (data.success) {
        setFormSuccess(true);
        setArtist("");
        setSongs([
          { title: "", writer: "" },
          { title: "", writer: "" },
          { title: "", writer: "" },
          { title: "", writer: "" }
        ]);
        setSelectedSlot("");
        fetchTakenSlots();
      } else {
        setError(data.error || "Submission failed.");
      }
    } catch (err) {
      setError("Network error. Please try again.");
    }
    setSubmitting(false);
  };

  // Header component
  const Header = () => (
    <div style={{ textAlign: 'center', marginBottom: '20px' }}>
      <img 
        src="https://images.squarespace-cdn.com/content/v1/65233de405f7fd7c8c64268a/a7a30e11-5a04-42d8-aa24-39f00352e1e0/MakerRadioLogo2.png?format=500w" 
        alt="Maker Radio Logo" 
        style={{ width: '220px', height: 'auto', display: 'block', margin: '0 auto' }}
      />
    </div>
  );

  const renderCurrentPage = () => {
    switch (currentPage) {
      case 'welcome':
        return <WelcomePage onNext={() => setCurrentPage('role-select')} />;
      
      case 'role-select':
        return (
          <RoleSelectPage 
            onSelectRole={(role) => {
              setUserRole(role);
              setCurrentPage(role === 'performer' ? 'artist-name' : 'email');
            }}
            onBack={() => setCurrentPage('welcome')}
          />
        );
      
      case 'artist-name':
        return (
          <ArtistNamePage 
            artist={artist}
            setArtist={setArtist}
            onNext={() => setCurrentPage('email')}
            onBack={() => setCurrentPage('role-select')}
          />
        );
      
      case 'email':
        return (
          <EmailPage 
            email={email}
            setEmail={setEmail}
            subscribeToNews={subscribeToNews}
            setSubscribeToNews={setSubscribeToNews}
            userRole={userRole}
            onNext={() => {
              if (userRole === 'performer') {
                setCurrentPage('stay-agreement');
              } else {
                alert('Thank you! Welcome to the audience.');
              }
            }}
            onBack={() => setCurrentPage(userRole === 'audience' ? 'role-select' : 'artist-name')}
          />
        );
      
      case 'stay-agreement':
      case 'attendance-agreement':
      case 'smoking-agreement':
        return (
          <AgreementPages 
            currentPage={currentPage}
            onAgree={(agreementType) => {
              if (agreementType === 'stay') {
                setStayAgreement(true);
                setCurrentPage('attendance-agreement');
              } else if (agreementType === 'attendance') {
                setAttendanceAgreement(true);
                setCurrentPage('smoking-agreement');
              } else if (agreementType === 'smoking') {
                setSmokingAgreement(true);
                setCurrentPage('performer-form');
              }
            }}
            onDisagree={(agreementType) => {
              if (agreementType === 'stay') {
                setStayAgreement(false);
                alert('We appreciate your honesty. Please consider staying to support other performers!');
              } else if (agreementType === 'attendance') {
                setAttendanceAgreement(false);
                alert('We appreciate your honesty. Please consider staying to support the full show!');
              } else if (agreementType === 'smoking') {
                setSmokingAgreement(false);
                alert('We appreciate your honesty. Please respect the scheduled intermissions!');
              }
            }}
            onBack={() => {
              if (currentPage === 'stay-agreement') setCurrentPage('email');
              else if (currentPage === 'attendance-agreement') setCurrentPage('stay-agreement');
              else if (currentPage === 'smoking-agreement') setCurrentPage('attendance-agreement');
            }}
          />
        );
      
      case 'performer-form':
        return (
          <PerformerFormPage 
            songs={songs}
            updateSong={updateSong}
            selectedSlot={selectedSlot}
            setSelectedSlot={setSelectedSlot}
            takenSlots={takenSlots}
            timeSlots={TIME_SLOTS}
            onSubmit={handleSubmit}
            submitting={submitting}
            formSuccess={formSuccess}
            error={error}
            onBack={() => setCurrentPage('smoking-agreement')}
            artist={artist}
            email={email}
          />
        );
      
      default:
        return <WelcomePage onNext={() => setCurrentPage('role-select')} />;
    }
  };

  return (
    <>
      {isStaffAuth ? (
        <SimplifiedStaffDashboard onLogout={() => setIsStaffAuth(false)} />
      ) : (
        <div style={containerStyle}>
          <div style={gridBgStyle} />
          
          <StaffLogin onAuthenticated={() => setIsStaffAuth(true)} />
          
          <div style={{ maxWidth: '800px', margin: '0 auto', padding: '40px 20px' }}>
            <Header />
            {renderCurrentPage()}
          </div>
        </div>
      )}
    </>
  );
}

export default App;