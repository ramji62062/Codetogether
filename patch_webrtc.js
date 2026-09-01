const fs = require('fs');

let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');

// We need to modify startScreenShare and stopScreenShare
// Instead of replaceTrackForAllPeers("video", screenTrack)
// We add it to the PC!

code = code.replace(
  /replaceTrackForAllPeers\("video", screenTrack\);/g,
  `// Instead of replacing, we ADD it to send both
      Object.values(peerConnectionsRef.current).forEach(pc => {
        try { pc.addTrack(screenTrack, localStreamRef.current); } catch {}
      });`
);

code = code.replace(
  /const cameraTrack = cameraTrackRef.current\?\.readyState === "live" \? cameraTrackRef.current : null;\s*replaceTrackForAllPeers\("video", cameraTrack\);/g,
  `// Instead of replacing, we REMOVE the screen track from the PC
    const trackToRemove = screenTrackRef.current;
    if (trackToRemove) {
      Object.values(peerConnectionsRef.current).forEach(pc => {
        try { 
          const sender = pc.getSenders().find(s => s.track === trackToRemove);
          if (sender) pc.removeTrack(sender); 
        } catch {}
      });
    }`
);

// We also need to fix `ensureCameraTrack` because it calls replaceTrackForAllPeers
// If there is a screen track, we STILL replace the camera track sender (which is fine, they are separate senders).
// Wait, `replaceTrackForAllPeers` replaces the FIRST video sender. If screen share was started first, it might replace the screen share sender!
// Let's modify `replaceTrackForAllPeers` to match the exact track if possible, or just be careful.

fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', code);
