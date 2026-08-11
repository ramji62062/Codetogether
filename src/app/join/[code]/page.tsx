"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import { supabase } from "@/lib/supabase";
import { generateGuestName } from "@/lib/utils";

type RoomLookup = {
  id: string;
  name: string | null;
  room_code: string;
  is_active: boolean | null;
};

export default function JoinByCodePage() {
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const code = useMemo(() => (params?.code || "").toUpperCase(), [params]);

  const [room, setRoom] = useState<RoomLookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    async function lookupRoom() {
      setLoading(true);
      const { data, error: roomError } = await supabase
        .from("rooms")
        .select("id, name, room_code, is_active")
        .eq("room_code", code)
        .maybeSingle();

      if (roomError || !data) {
        setError("Room not found. Check your code.");
        setLoading(false);
        return;
      }
      if (data.is_active === false) {
        setError("This session has ended. Ask the owner to create a new room.");
        setLoading(false);
        return;
      }

      setRoom(data);
      setLoading(false);
    }

    if (code) {
      lookupRoom();
    } else {
      setError("Invalid room code");
      setLoading(false);
    }
  }, [code]);

  async function joinRoom() {
    if (!room) return;
    setJoining(true);
    setError("");

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const safeName = displayName.trim() || generateGuestName();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch("/api/join-room", {
      method: "POST",
      headers,
      body: JSON.stringify({ roomCode: room.room_code, accessCode, guestName: safeName }),
    });
    const result = await res.json();

    if (!res.ok || !result.roomId) {
      setError(result.error || "Could not join this room.");
      setJoining(false);
      return;
    }

    if (!session?.user?.id) localStorage.setItem("guest_name", safeName);
    router.push(`/room/${result.roomId}`);
  }

  return (
    <div className="min-h-screen bg-white text-black font-sans">
      <Navbar />
      <main className="mx-auto max-w-2xl px-5 py-12 sm:px-8">
        {loading ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm text-center">
            <p className="text-gray-700 font-medium">Checking room code...</p>
          </div>
        ) : room ? (
          <div className="rounded-2xl border-2 border-black bg-white p-8 shadow-lg">
            <h1 className="text-2xl font-black text-black">Join Workspace Room</h1>
            <p className="mt-1 text-gray-700 font-medium">
              Room: <span className="font-bold text-black">{room.name || "Untitled"}</span> · Code: <span className="font-bold text-black font-mono">{room.room_code}</span>
            </p>

            <GuestJoinSection displayName={displayName} setDisplayName={setDisplayName} />

            <label className="mt-5 block text-sm font-bold text-black">Access code (if required)</label>
            <input
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Required for private rooms"
              className="mt-2 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-black outline-none font-medium focus:border-black"
            />

            {error ? <p className="mt-4 text-sm font-semibold text-red-600">{error}</p> : null}

            <button
              onClick={joinRoom}
              disabled={joining}
              className="mt-6 w-full rounded-xl bg-black px-6 py-3 font-extrabold text-white transition hover:bg-gray-800 disabled:opacity-70"
            >
              {joining ? "Joining Workspace..." : "Join Workspace →"}
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-red-300 bg-red-50 p-8 text-center">
            <p className="font-semibold text-red-600">{error}</p>
          </div>
        )}
      </main>
    </div>
  );
}

function GuestJoinSection({
  displayName,
  setDisplayName,
}: {
  displayName: string;
  setDisplayName: (value: string) => void;
}) {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null);

  useEffect(() => {
    async function detectSession() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      setIsLoggedIn(Boolean(session?.user));
    }
    detectSession();
  }, []);

  if (isLoggedIn === null) return null;
  if (isLoggedIn) {
    return <p className="mt-4 text-sm font-semibold text-gray-700">You are logged in and will join with your account.</p>;
  }

  return (
    <div className="mt-5 rounded-xl border border-gray-300 bg-gray-50 p-4">
      <p className="text-sm font-bold text-black">You are joining as guest.</p>
      <input
        value={displayName}
        onChange={(event) => setDisplayName(event.target.value)}
        placeholder="Display name (or we generate one)"
        className="mt-3 w-full rounded-lg border-2 border-gray-300 bg-white px-4 py-2.5 text-black font-medium outline-none focus:border-black"
      />
    </div>
  );
}
