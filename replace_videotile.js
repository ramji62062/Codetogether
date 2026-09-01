const fs = require('fs');
let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');
const lines = code.split('\n');

const newVideoTile = `
function VideoTile({ peer, muted, isPinned, onPin, isFullscreen }: {
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
  const [isCameraMain, setIsCameraMain] = useState(false); // SWAP STATE

  const hasVideo = Boolean(peer.stream && (peer.cameraOn || peer.screenOn));

  // Determine tracks
  const screenTrack = peer.stream?.getVideoTracks().find(t => {
    try { return t.getSettings().displaySurface !== undefined; } catch { return false; }
  }) || (peer.screenOn ? peer.stream?.getVideoTracks()[0] : null);
  
  const cameraTrack = peer.stream?.getVideoTracks().find(t => t !== screenTrack) 
    || (peer.cameraOn && !peer.screenOn ? peer.stream?.getVideoTracks()[0] : null);

  const mainTrack = isCameraMain && cameraTrack ? cameraTrack : (screenTrack || cameraTrack);
  const pipTrack = isCameraMain && cameraTrack ? screenTrack : (screenTrack ? cameraTrack : null);

  const setVideoRef = useCallback((el: HTMLVideoElement | null) => {
    videoRef.current = el;
    if (el && mainTrack) {
      el.srcObject = new MediaStream([mainTrack]);
      el.play().catch(() => {});
    }
  }, [mainTrack]);

  const setPipVideoRef = useCallback((el: HTMLVideoElement | null) => {
    pipVideoRef.current = el;
    if (el && pipTrack) {
      el.srcObject = new MediaStream([pipTrack]);
      el.play().catch(() => {});
    }
  }, [pipTrack]);

  useEffect(() => {
    if (videoRef.current && mainTrack) {
      videoRef.current.srcObject = new MediaStream([mainTrack]);
      videoRef.current.play().catch(() => {});
    }
    if (pipVideoRef.current && pipTrack) {
      pipVideoRef.current.srcObject = new MediaStream([pipTrack]);
      pipVideoRef.current.play().catch(() => {});
    }
  }, [mainTrack, pipTrack, trackVersion]);

  useEffect(() => {
    const handleTrackChange = () => setTrackVersion(v => v + 1);
    peer.stream?.addEventListener("addtrack", handleTrackChange);
    peer.stream?.addEventListener("removetrack", handleTrackChange);
    return () => {
      peer.stream?.removeEventListener("addtrack", handleTrackChange);
      peer.stream?.removeEventListener("removetrack", handleTrackChange);
    };
  }, [peer.stream, trackVersion, hasVideo, peer.cameraOn, peer.screenOn]);

  useEffect(() => {
    if (muted || !peer.stream) return;
    const audio = audioRef.current;
    if (!audio) return;
    const audioTracks = peer.stream.getAudioTracks();
    if (audioTracks.length > 0) {
      audio.srcObject = new MediaStream(audioTracks);
      audio.play().catch(() => {});
    }
  }, [peer.stream, muted, trackVersion]);

  const initials = peer.name.replace(/\\s*\\(Me\\)$/, "").slice(0, 2).toUpperCase();

  return (
    <div
      className="pcp-video-tile"
      style={{
        position: "relative", minHeight: 0, overflow: "hidden", borderRadius: 8,
        background: "#1a1a1a", flex: isPinned ? undefined : "1 1 0%",
        height: "100%", width: "100%",
        border: peer.isSpeaking ? "2px solid #22c55e" : isPinned ? "2px solid #4285f4" : "1px solid #2a2a2a",
        animation: peer.isSpeaking ? "pcp-ring 1.5s infinite" : undefined,
      }}
    >
      <audio ref={audioRef} autoPlay playsInline style={{ display: "none" }} />

      {hasVideo ? (
        <>
          <video
            ref={setVideoRef}
            autoPlay playsInline muted={true}
            style={{ width: "100%", height: "100%", objectFit: (mainTrack === screenTrack) ? "contain" : "cover", background: "#0a0a0a" }}
          />
          
          {pipTrack && (
            <div 
              onClick={(e) => { e.stopPropagation(); setIsCameraMain(!isCameraMain); }}
              title="Click to swap videos"
              style={{
                position: "absolute", top: 16, right: 16, width: "25%", minWidth: 100, maxWidth: 200, aspectRatio: "16/9",
                borderRadius: 8, overflow: "hidden", border: "2px solid rgba(255,255,255,0.4)",
                boxShadow: "0 10px 30px rgba(0,0,0,0.8)", background: "#000", zIndex: 10, cursor: "pointer",
                transition: "transform 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.05)"}
              onMouseLeave={(e) => e.currentTarget.style.transform = "scale(1)"}
            >
              <video
                ref={setPipVideoRef}
                autoPlay playsInline muted={true}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </div>
          )}
        </>
      ) : (
        <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: getAvatarColor(peer.name), gap: 6 }}>
          <div style={{ width: isFullscreen ? 64 : 36, height: isFullscreen ? 64 : 36, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isFullscreen ? 24 : 14, fontWeight: 700, color: "#fff", border: peer.isSpeaking ? "2px solid #22c55e" : "2px solid rgba(255,255,255,0.3)" }}>
            {initials}
          </div>
        </div>
      )}

      {/* Muted mic indicator overlay */}
      {!peer.micOn && (
        <div style={{ position: "absolute", top: 6, left: 6, background: "rgba(239,68,68,0.85)", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <MicOff size={12} color="#fff" />
        </div>
      )}

      {/* Connection state indicator */}
      {peer.connectionState && peer.connectionState !== "connected" && peer.socketId !== "local" && (
        <div style={{ position: "absolute", top: 32, left: 6, display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.7)", borderRadius: 4, padding: "2px 6px", fontSize: 9, color: peer.connectionState === "connecting" || peer.connectionState === "new" ? "#fbbf24" : "#f87171" }}>
          {peer.connectionState === "connecting" || peer.connectionState === "new" ? <Wifi size={9} /> : <WifiOff size={9} />}
          {peer.connectionState}
        </div>
      )}

      {/* Bottom info bar */}
      <div style={{ position: "absolute", left: 6, bottom: 6, right: 6, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
        <span style={{ minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", background: "rgba(0,0,0,0.6)", color: "#fff", borderRadius: 4, padding: "3px 8px", fontSize: 11, backdropFilter: "blur(4px)", fontWeight: 500 }}>
          {peer.name}
        </span>
        <span style={{ display: "flex", gap: 4, background: "rgba(0,0,0,0.6)", borderRadius: 4, padding: "3px 6px", backdropFilter: "blur(4px)" }}>
          {onPin && (
            <button onClick={(e) => { e.stopPropagation(); onPin(); }} title={isPinned ? "Unpin" : "Pin"} style={{ background: "transparent", border: "none", color: "#fff", padding: 0, cursor: "pointer", display: "flex" }}>
              <Pin size={12} color={isPinned ? "#60a5fa" : "#fff"} />
            </button>
          )}
          {peer.micOn ? <Mic size={12} color="#22c55e" /> : <MicOff size={12} color="#ef4444" />}
          {peer.screenOn ? <ScreenShare size={12} color="#c084fc" /> : peer.cameraOn ? <Video size={12} color="#22c55e" /> : <VideoOff size={12} color="#ef4444" />}
        </span>
      </div>
    </div>
  );
}
`;

const before = lines.slice(0, 1554).join('\n');
const after = lines.slice(1696).join('\n');

fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', before + '\n' + newVideoTile + '\n' + after);
