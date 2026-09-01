const fs = require('fs');
let code = fs.readFileSync('src/components/ParticipantsCallPanel.tsx', 'utf8');

const oldLocalPreview = `const localPreviewStream = screenTrackRef.current
      ? new MediaStream([...Array.from(localStreamRef.current?.getAudioTracks() || []), screenTrackRef.current])
      : localStreamRef.current || undefined;`;

const newLocalPreview = `const tracks = [];
    if (localStreamRef.current) tracks.push(...localStreamRef.current.getAudioTracks());
    if (cameraTrackRef.current) tracks.push(cameraTrackRef.current);
    if (screenTrackRef.current) tracks.push(screenTrackRef.current);
    const localPreviewStream = tracks.length > 0 ? new MediaStream(tracks) : undefined;`;

code = code.replace(oldLocalPreview, newLocalPreview);

fs.writeFileSync('src/components/ParticipantsCallPanel.tsx', code);
