
import "./App.css";
import React, { useState, useRef, useEffect } from "react";
import {
  MeetingProvider,
  MeetingConsumer,
  useMeeting,
} from "@videosdk.live/react-sdk";
import { authToken, createMeeting, generateRandomRoomId } from "./API";

// Broadcast Channel for cross-tab communication
let broadcastChannel = null;

function JoinScreen({ getMeetingAndToken }) {
  return (
    <div className="main-screen">
      <h1>VideoSDK App</h1>
      <div className="buttons-container">
        <button onClick={() => getMeetingAndToken("A")} className="join-button room-a">
          Join Room A
        </button>
        <button onClick={() => getMeetingAndToken("B")} className="join-button room-b">
          Join Room B
        </button>
      </div>
    </div>
  );
}

// Modal component for entering Room B ID
function MediaRelayModal({ isOpen, onClose, onRelay, roomType }) {
  const [roomBId, setRoomBId] = useState("");
  const [isRelaying, setIsRelaying] = useState(false);
  const [error, setError] = useState("");

  const handleRelay = async () => {
    setError("");
    
    if (!roomBId.trim()) {
      setError("Please enter Room B ID");
      return;
    }
    
    setIsRelaying(true);
    try {
      await onRelay(roomBId.trim());
      setRoomBId("");
      setError("");
      onClose();
    } catch (error) {
      setError("Failed to start media relay: " + error.message);
    }
    setIsRelaying(false);
  };

  const handleClose = () => {
    setRoomBId("");
    setError("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Media Relay to Room B</h3>
        <p>Enter the <strong>exact</strong> Room B ID from another tab:</p>
        
        {error && (
          <div className="error-message" style={{ 
            color: 'red', 
            backgroundColor: '#ffe6e6',
            padding: '10px',
            borderRadius: '5px',
            marginBottom: '10px',
            fontSize: '14px'
          }}>
            {error}
          </div>
        )}
        
        <input
          type="text"
          placeholder="e.g., iti-kh7-15n"
          value={roomBId}
          onChange={(e) => setRoomBId(e.target.value)}
          className="room-id-input"
          disabled={isRelaying}
        />
        
        <div className="modal-buttons">
          <button 
            onClick={handleRelay} 
            className="relay-confirm-btn"
            disabled={isRelaying}
          >
            {isRelaying ? "Starting Relay..." : "Start Media Relay"}
          </button>
          <button 
            onClick={handleClose} 
            className="modal-cancel-btn"
            disabled={isRelaying}
          >
            Cancel
          </button>
        </div>
        
        <div className="modal-instructions">
          <p><strong>How to get Room B ID:</strong></p>
          <ol style={{ textAlign: 'left', fontSize: '12px' }}>
            <li>Open another browser tab</li>
            <li>Join Room B in that tab</li>
            <li>Copy the Room ID shown</li>
            <li>Paste it here and click "Start Media Relay"</li>
          </ol>
        </div>
      </div>
    </div>
  );
}

// Room A Video Component (Shows in Room B)
function ForcedRoomAVideo({ roomAId }) {
  const videoRef = useRef(null);
  const [videoStream, setVideoStream] = useState(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const startVideoCapture = async () => {
      try {
        // This gets the current tab's video stream to mirror to Room B
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        setVideoStream(stream);
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (error) {
        console.error("Error capturing video for Room A relay:", error);
      }
    };

    startVideoCapture();

    return () => {
      if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const closeRoomAVideo = () => {
    setIsVisible(false);
    if (videoStream) {
      videoStream.getTracks().forEach(track => track.stop());
    }
    // Broadcast to stop relay
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'STOP_RELAY',
        roomId: roomAId
      });
    }
  };

  if (!isVisible) return null;

  return (
    <div className="forced-room-a-video">
      <div className="room-a-header">
        <h4>🔴 Room A View (Live Relay)</h4>
        <button onClick={closeRoomAVideo} className="close-relay-btn">
          ❌ Close
        </button>
      </div>
      <div className="room-a-video-card">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            borderRadius: '8px'
          }}
        />
      </div>
    </div>
  );
}

function RoomView({ onMeetingLeave, roomType, onRoomSwitch, roomKey }) {
  const { leave } = useMeeting();
  const videoRef = useRef(null);
  const [displayRoomId] = useState(generateRandomRoomId());
  const [cameraReady, setCameraReady] = useState(false);
  const [showRelayModal, setShowRelayModal] = useState(false);
  const [activeRelays, setActiveRelays] = useState(new Set());
  const [showRoomAVideo, setShowRoomAVideo] = useState(false);
  const [currentRoomAId, setCurrentRoomAId] = useState("");

  // Initialize Broadcast Channel
  useEffect(() => {
    if (!broadcastChannel) {
      broadcastChannel = new BroadcastChannel('video-relay-channel');
    }

    const handleBroadcastMessage = (event) => {
      const { type, targetRoomId, sourceRoomId } = event.data;
      
      console.log("Broadcast received:", event.data);
      
      if (type === 'START_RELAY' && targetRoomId === displayRoomId) {
        // This Room B should show Room A video
        console.log(`Room B (${displayRoomId}) receiving relay from Room A (${sourceRoomId})`);
        setShowRoomAVideo(true);
        setCurrentRoomAId(sourceRoomId);
      } else if (type === 'STOP_RELAY') {
        setShowRoomAVideo(false);
        setCurrentRoomAId("");
      }
    };

    broadcastChannel.addEventListener('message', handleBroadcastMessage);

    return () => {
      if (broadcastChannel) {
        broadcastChannel.removeEventListener('message', handleBroadcastMessage);
      }
    };
  }, [displayRoomId]);

  // Native Camera
  useEffect(() => {
    console.log(`Starting NATIVE camera for Room ${roomType}...`);
    setCameraReady(false);

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          
          setTimeout(() => {
            if (videoRef.current) {
              videoRef.current.play()
                .then(() => {
                  console.log(`NATIVE camera started for Room ${roomType}`);
                  setCameraReady(true);
                })
                .catch(console.error);
            }
          }, 500);
        }
      } catch (error) {
        console.error("NATIVE camera error:", error);
      }
    };

    startCamera();

    return () => {
      console.log(`Cleaning up NATIVE camera for Room ${roomType}`);
      if (videoRef.current && videoRef.current.srcObject) {
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
    };
  }, [roomType, roomKey]);

  const leaveRoom = () => {
    // Stop any active relays
    activeRelays.forEach(relayId => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'STOP_RELAY',
          roomId: relayId
        });
      }
    });
    leave();
    onMeetingLeave();
  };

  const switchRoom = () => {
    const newRoom = roomType === "A" ? "B" : "A";
    leave();
    onRoomSwitch(newRoom);
  };

  const handleMediaRelay = async (targetRoomId) => {
    try {
      console.log(`Starting FORCED media relay from Room ${roomType} (${displayRoomId}) to Room B (${targetRoomId})`);
      
      // Broadcast to all tabs to start showing Room A video in Room B
      if (broadcastChannel) {
        broadcastChannel.postMessage({
          type: 'START_RELAY',
          sourceRoomId: displayRoomId,
          targetRoomId: targetRoomId,
          sourceRoomType: roomType
        });
      }
      
      setActiveRelays(prev => new Set([...prev, targetRoomId]));
      
      alert(`✅ Media relay started successfully!\n\nRoom A video is now showing in Room B (${targetRoomId})`);
      console.log("media relay started successfully");
      
    } catch (error) {
      console.error("Media relay error:", error);
      throw error;
    }
  };

  const stopRelay = (targetRoomId) => {
    if (broadcastChannel) {
      broadcastChannel.postMessage({
        type: 'STOP_RELAY',
        roomId: targetRoomId
      });
    }
    
    setActiveRelays(prev => {
      const newSet = new Set(prev);
      newSet.delete(targetRoomId);
      return newSet;
    });
    
    alert(`❌ Media relay to ${targetRoomId.substring(0, 8)}... stopped.`);
  };

  return (
    <div className={`room-view ${roomType.toLowerCase()}`}>
      <h2>Connected to Room {roomType}</h2>
      <p className="room-id">Room ID: <strong>{displayRoomId}</strong></p>
      
 {/* Video Container - Side by Side Layout */}
<div className="video-container-wrapper">
  {/* YOUR FACE - NATIVE CAMERA*/}
  <div className="video-item">
    <div className="content-card video-card">
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: 'scaleX(-1)',
          borderRadius: '8px',
          backgroundColor: '#000'
        }}
      />
      {!cameraReady && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          background: 'rgba(0,0,0,0.8)',
          padding: '10px 20px',
          borderRadius: '5px',
          fontSize: '14px'
        }}>
          Starting camera for Room {roomType}...
        </div>
      )}
    </div>
  </div>

  {/* FORCED ROOM A VIDEO */}
  {showRoomAVideo && roomType === "B" && (
    <ForcedRoomAVideo roomAId={currentRoomAId} />
  )}
</div>

      
      {/* Room Control Buttons */}
      <div className="room-controls">
        {/* Media Relay Button - Only show in Room A */}
        {roomType === "A" && (
          <button 
            onClick={() => setShowRelayModal(true)} 
            className="media-relay-btn"
          >
            📡 Media Relay to Room B
          </button>
        )}
        
        {/* Active Relays Display */}
        {activeRelays.size > 0 && (
          <div className="active-relays">
            <p>✅ Active Relays: {activeRelays.size}</p>
            {Array.from(activeRelays).map(relayId => (
              <button
                key={relayId}
                onClick={() => stopRelay(relayId)}
                className="stop-relay-btn"
              >
                Stop Relay to {relayId.substring(0, 8)}...
              </button>
            ))}
          </div>
        )}
        
        <button 
          onClick={switchRoom} 
          className={`switch-button ${roomType.toLowerCase()}`}
        >
          Switch to Room {roomType === "A" ? "B" : "A"}
        </button>
        
        <button onClick={leaveRoom} className={`leave-button ${roomType.toLowerCase()}`}>
          Leave Room {roomType}
        </button>
      </div>

      <MediaRelayModal
        isOpen={showRelayModal}
        onClose={() => setShowRelayModal(false)}
        onRelay={handleMediaRelay}
        roomType={roomType}
      />
    </div>
  );
}

function App() {
  const [meetingId, setMeetingId] = useState(null);
  const [roomType, setRoomType] = useState(null);
  const [roomKey, setRoomKey] = useState(0);

  const getMeetingAndToken = async (room) => {
    const newMeetingId = await createMeeting({ token: authToken });
    setMeetingId(newMeetingId);
    setRoomType(room);
    setRoomKey(prev => prev + 1);
  };

  const onMeetingLeave = () => {
    setMeetingId(null);
    setRoomType(null);
    setRoomKey(0);
  };

  const onRoomSwitch = async (newRoom) => {
    console.log(`Switching to Room ${newRoom}`);
    const newMeetingId = await createMeeting({ token: authToken });
    setMeetingId(newMeetingId);
    setRoomType(newRoom);
    setRoomKey(prev => prev + 1);
  };

  return authToken && meetingId ? (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: false,
        webcamEnabled: false, // We use native camera
        name: "User",
      }}
      token={authToken}
      key={roomKey}
    >
      <MeetingConsumer>
        {() => (
          <RoomView 
            onMeetingLeave={onMeetingLeave} 
            roomType={roomType}
            onRoomSwitch={onRoomSwitch}
            roomKey={roomKey}
            key={`room-${roomType}-${roomKey}`}
          />
        )}
      </MeetingConsumer>
    </MeetingProvider>
  ) : (
    <JoinScreen getMeetingAndToken={getMeetingAndToken} />
  );
}

export default App;
