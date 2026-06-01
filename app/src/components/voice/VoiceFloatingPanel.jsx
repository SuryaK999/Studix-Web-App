import { useVoiceSession } from "@/store/voiceSessionStore";
import { useAuth } from "@/context/AuthContext";
import "./voiceFloat.css";

export default function VoiceFloatingPanel() {
  const {
    connected,
    muted,
    participants,
    leaveVoice,
    setMuted
  } = useVoiceSession();
  
  const { user } = useAuth(); // needed for our own visual state? Or are we the activeUser?

  if (!connected) return null;

  // Render the current user or primary speaker (activeUser) avatar if no one is mapped. 
  // Given participants list, we can just grab the first one or the user's own avatar if they are connected.
  const activeUser = Object.values(participants).find(p => p.isSpeaking) 
    || Object.values(participants)[0]
    || { avatarUrl: user?.photoURL || 'https://api.dicebear.com/7.x/initials/svg?seed=Me' };

  return (
    <div className="voice-float">
      <div className="voice-card">
        <img
          src={activeUser?.avatarUrl || activeUser?.avatar || 'https://api.dicebear.com/7.x/initials/svg?seed=U'}
          className="voice-avatar"
          alt="Voice Avatar"
        />

        <div className="voice-info">
          <span className="voice-title">Lounge connected</span>
          <span className="voice-status">
            <span className="voice-dot"></span> Live
          </span>
        </div>

        <div className="voice-actions">
          <button
            className="voice-btn mute"
            onClick={() => setMuted(!muted)}
          >
            {muted ? "Unmute" : "Mute"}
          </button>

          <button
            className="voice-btn leave"
            onClick={leaveVoice}
          >
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
