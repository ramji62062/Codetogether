const fs = require('fs');

let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');

const videoTileReplacement = `function VideoTile({ peer, muted, isPinned, onPin, isFullscreen }: {
  peer: ParticipantCallState;
  muted?: boolean;
  isPinned?: boolean;
  onPin?: () => void;
  isFullscreen?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const pipVideoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [trackVersion, setTrackVersion] = useState(0);
  const hasVideo = Boolean(peer.stream && (peer.cameraOn || peer.screenOn));

  // Split tracks if there are multiple (screen + camera)
  const screenTrack = peer.stream?.getVideoTracks().find(t => {
    try { return t.getSettings().displaySurface !== undefined; } catch { return false; }
  }) || (peer.screenOn ? peer.stream?.getVideoTracks()[0] : null);
  
  const cameraTrack = peer.stream?.getVideoTracks().find(t => t !== screenTrack) 
    || (peer.cameraOn && !peer.screenOn ? peer.stream?.getVideoTracks()[0] : null);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && peer.stream) {
      el.srcObject = screenTrack ? new MediaStream([screenTrack]) : (cameraTrack ? new MediaStream([cameraTrack]) : peer.stream);
      el.play().catch(() => {});
    }
  }, [peer.stream, screenTrack, cameraTrack]);

  const setPipVideoRef = useCallback((el: HTMLVideoElement | null) => {
    pipVideoRef.current = el;
    if (el && cameraTrack) {
      el.srcObject = new MediaStream([cameraTrack]);
      el.play().catch(() => {});
    }
  }, [cameraTrack]);

  // Update video srcObject when stream or tracks change
  useEffect(() => {
    const video = videoRef.current;
    if (video && peer.stream && hasVideo) {
      video.srcObject = screenTrack ? new MediaStream([screenTrack]) : (cameraTrack ? new MediaStream([cameraTrack]) : peer.stream);
      video.play().catch(() => {});
    }
    const pip = pipVideoRef.current;
    if (pip && cameraTrack && screenTrack) {
      pip.srcObject = new MediaStream([cameraTrack]);
      pip.play().catch(() => {});
    }
  }, [peer.stream, trackVersion, hasVideo, peer.cameraOn, peer.screenOn, screenTrack, cameraTrack]);

  useEffect(() => {
    const handleTrackChange = () => setTrackVersion((v) => v + 1);
    peer.stream?.addEventListener("addtrack", handleTrackChange);
    peer.stream?.addEventListener("removetrack", handleTrackChange);

    return () => {
      peer.stream?.removeEventListener("addtrack", handleTrackChange);
      peer.stream?.removeEventListener("removetrack", handleTrackChange);
    };
  }, [peer.stream, trackVersion, hasVideo, peer.cameraOn, peer.screenOn]);

  // Always play remote peer audio via a dedicated audio element to guarantee sound even when video is off
  useEffect(() => {
    if (muted) return;
    const audio = audioRef.current;
    if (!audio || !peer.stream) return;
    const audioTracks = peer.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audio.srcObject = new MediaStream(audioTracks);
      audio.play().catch(() => {});
    }
  }, [peer.stream, muted]);

  return (
    <div 
      className="pcp-video-tile"
      style={{ 
        position: "relative", width: "100%", height: "100%", background: "#111", 
        borderRadius: isFullscreen ? 0 : 8, overflow: "hidden",
        border: "1px solid rgba(255,255,255,0.05)" 
      }}
    >
      {/* Hidden audio element for remote stream to guarantee audio plays even when video is off */}
      <audio ref={audioRef} autoPlay style={{ display: "none" }} />

      {hasVideo ? (
        <>
          <video
            ref={setVideoRef}
            autoPlay
            playsInline
            muted={true} // Video element is always muted; audio is played via the dedicated <audio> element
            style={{ width: "100%", height: "100%", objectFit: peer.screenOn ? "contain" : "cover", background: "#0a0a0a" }}
          />
          {peer.screenOn && peer.cameraOn && cameraTrack && (
            <div style={{
              position: "absolute", bottom: 16, right: 16, width: "25%", minWidth: 120, aspectRatio: "16/9",
              borderRadius: 8, overflow: "hidden", border: "2px solid rgba(255,255,255,0.2)",
              boxShadow: "0 10px 30px rgba(0,0,0,0.5)", background: "#000", zIndex: 10
            }}>
              <video
                ref={setPipVideoRef}
                autoPlay
                playsInline
                muted={true}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
        </>
      ) : (
        <div style={{
          height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          background: getAvatarColor(peer.name), gap: 6,
        }}>
          <div style={{ fontSize: 32, fontWeight: 800, color: "rgba(255,255,255,0.9)", background: "rgba(0,0,0,0.2)", width: 64, height: 64, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {peer.name.charAt(0).toUpperCase()}
          </div>
        </div>
      )}

      {/* Overlays (Name, Mic, Pin) */}
      <div style={{ position: "absolute", bottom: 8, left: 8, display: "flex", alignItems: "center", gap: 6, zIndex: 20 }}>
        {onPin && (
          <button onClick={onPin} title={isPinned ? "Unpin" : "Pin"} style={{ background: "rgba(0,0,0,0.6)", border: "none", color: "#fff", padding: "4px", borderRadius: 4, cursor: "pointer", backdropFilter: "blur(4px)" }}>
            <Pin size={12} color={isPinned ? "#60a5fa" : "#fff"} />
          </button>
        )}
        <span style={{
          background: "rgba(0,0,0,0.6)", padding: "2px 8px", borderRadius: 4, 
          fontSize: 12, fontWeight: 600, color: "#fff", textShadow: "0 1px 2px rgba(0,0,0,0.8)",
          backdropFilter: "blur(4px)"
        }}>
          {peer.name}
        </span>
        <span style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 6px", backdropFilter: "blur(4px)" }}>
          {peer.micOn ? <Mic size={12} color="#22c55e" /> : <MicOff size={12} color="#ef4444" />}
          {peer.screenOn ? <ScreenShare size={12} color="#c084fc" /> : peer.cameraOn ? <Video size={12} color="#22c55e" /> : <VideoOff size={12} color="#ef4444" />}
        </span>
      </div>
    </div>
  );
}`;

code = code.replace(/function VideoTile.*?\n\s*return\s*\(\s*<div.*?\n\s*className="pcp-video-tile"[\s\S]*?\}\s*\);\s*\}/, videoTileReplacement);

// Fix replaceTrackForAllPeers to not break when screen is on
code = code.replace(
  /const sender = senders.find\(\(s\) => s.track\?\.kind === kind \|\| \(\!s.track && kind === "video"\)\);/g,
  `const sender = senders.find((s) => s.track === cameraTrackRef.current || (!s.track && kind === "video"));`
);

fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', code);
