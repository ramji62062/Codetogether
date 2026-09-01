"use client";
import { useTheme } from "next-themes";
import CommunityFeed from "@/components/CommunityFeed";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import MonacoEditor from "@monaco-editor/react";
import {
  Plus, Code2, Trash2, ArrowRight, LogOut, Clock, Users,
  BookOpen, GraduationCap, Tv, Briefcase, Hash, Search,
  Globe, Copy, Check, Layers, Zap, Folder, File, Download, X, Laptop,
  Calendar, Award, Mail, Lock, Shield, UserPlus, MessageCircle, Star
} from "lucide-react";
import AccountProfilePanel from "@/components/AccountProfilePanel";
import StudentToolsPanel from "@/components/StudentToolsPanel";

type AppUser = { id: string; name: string | null; email: string; role: string };
type Room = { id: string; name: string | null; room_code: string; language: string; created_at: string; files_json?: any[] };
type CommunityUser = { id: string; name: string | null; email: string | null; avatar_url?: string | null; role?: string | null; projectCount: number; followers: number; following: boolean; followsMe: boolean; profileVisibility: "public" | "private" };
type DirectMessage = { id: string; sender_id: string; receiver_id: string; content: string; media_url?: string | null; created_at: string; edited_at?: string | null; deleted_for_sender?: boolean; deleted_for_receiver?: boolean; deleted_for_everyone?: boolean };

const ROLE_CONFIG: Record<string, { icon: any; color: string; label: string; greeting: string }> = {
  student: { icon: GraduationCap, color: "#ffffff", label: "Student", greeting: "Ready to learn?" },
  teacher: { icon: BookOpen, color: "#e0e0e0", label: "Teacher", greeting: "Your classroom awaits" },
  youtube: { icon: Tv, color: "#cccccc", label: "Creator", greeting: "Start streaming!" },
  business: { icon: Briefcase, color: "#888888", label: "Business", greeting: "Build with your team" },
  tutor: { icon: BookOpen, color: "#e0e0e0", label: "Tutor", greeting: "Your students await" },
  freelancer: { icon: Code2, color: "#cccccc", label: "Freelancer", greeting: "Your next project awaits" },
};

const LANGS = ["javascript","typescript","python","java","cpp","c","go","rust","html","css","shell","php","ruby","csharp","kotlin","swift","r","lua"];
const CATEGORIES = ["All", "Tutorials", "Algorithms", "Templates", "Web Pages", "Others"];

// Pure JS uncompressed ZIP generator helper
function downloadProjectAsZip(projectName: string, files: any[]) {
  const textEncoder = new TextEncoder();
  const zipParts: Uint8Array[] = [];
  const directory: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    if (file.isFolder) continue;
    const pathBytes = textEncoder.encode(file.path || file.name);
    const contentBytes = textEncoder.encode(file.content || "");
    const size = contentBytes.length;
    
    // Local file header signature
    const lfHeader = new Uint8Array(30 + pathBytes.length);
    const view = new DataView(lfHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 10, true);
    view.setUint16(6, 0, true);
    view.setUint16(8, 0, true); // store method
    view.setUint16(10, 0, true);
    view.setUint16(12, 0, true);
    view.setUint32(14, 0, true);
    view.setUint32(18, size, true);
    view.setUint32(22, size, true);
    view.setUint16(26, pathBytes.length, true);
    view.setUint16(28, 0, true);
    lfHeader.set(pathBytes, 30);
    
    // Central directory file header
    const cdHeader = new Uint8Array(46 + pathBytes.length);
    const cdView = new DataView(cdHeader.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 10, true);
    cdView.setUint16(8, 0, true);
    cdView.setUint16(10, 0, true);
    cdView.setUint16(12, 0, true);
    cdView.setUint16(14, 0, true);
    cdView.setUint32(16, 0, true);
    cdView.setUint32(20, size, true);
    cdView.setUint32(24, size, true);
    cdView.setUint16(28, pathBytes.length, true);
    cdView.setUint16(30, 0, true);
    cdView.setUint16(32, 0, true);
    cdView.setUint16(34, 0, true);
    cdView.setUint16(36, 0, true);
    cdView.setUint32(38, 0, true);
    cdView.setUint32(42, offset, true);
    cdHeader.set(pathBytes, 46);
    
    zipParts.push(lfHeader, contentBytes);
    directory.push(cdHeader);
    offset += lfHeader.length + contentBytes.length;
  }

  const dirOffset = offset;
  let dirSize = 0;
  for (const part of directory) {
    dirSize += part.length;
  }

  // End of central directory record
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true);
  eocdView.setUint16(6, 0, true);
  eocdView.setUint16(8, directory.length, true);
  eocdView.setUint16(10, directory.length, true);
  eocdView.setUint32(12, dirSize, true);
  eocdView.setUint32(16, dirOffset, true);
  eocdView.setUint16(20, 0, true);

  const finalBlob = new Blob([...zipParts, ...directory, eocd] as any[], { type: "application/zip" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(finalBlob);
  a.download = `${projectName.toLowerCase().replace(/\s+/g, "-")}.zip`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function getRoomDisplayName(roomName: string | null): string {
  if (!roomName) return "Untitled Workspace";
  if (typeof roomName === "string" && roomName.startsWith("{")) {
    try {
      const parsed = JSON.parse(roomName);
      if (parsed && typeof parsed === "object" && parsed.title && String(parsed.title).trim()) {
        return String(parsed.title).trim();
      }
    } catch {}
  }
  if (typeof roomName === "string" && !roomName.startsWith("{")) {
    return roomName;
  }
  return "Untitled Workspace";
}

function getRoomScheduleDetails(roomName: string | null) {
  if (roomName && roomName.startsWith("{")) {
    try {
      const parsed = JSON.parse(roomName);
      if (parsed.isScheduled) {
        return {
          isScheduled: true,
          startAt: parsed.startAt,
          endAt: parsed.endAt,
          invitedEmails: parsed.invitedEmails || [],
        };
      }
    } catch {}
  }
  return { isScheduled: false, startAt: null, endAt: null, invitedEmails: [] };
}

export default function DashboardPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const [user, setUser] = useState<AppUser | null>(null);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [libraryRooms, setLibraryRooms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [joinInput, setJoinInput] = useState("");
  const [search, setSearch] = useState("");
  const [newRoomLang, setNewRoomLang] = useState("javascript");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinAccessCode, setJoinAccessCode] = useState("");
  const [joinError, setJoinError] = useState("");
  const [communityUsers, setCommunityUsers] = useState<CommunityUser[]>([]);
  const [communitySearch, setCommunitySearch] = useState("");
  const [messageTarget, setMessageTarget] = useState<CommunityUser | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageAttachment, setMessageAttachment] = useState("");
  const [threadMessages, setThreadMessages] = useState<DirectMessage[]>([]);
  
  // Workspace Creation Modal States
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createWorkspaceTitle, setCreateWorkspaceTitle] = useState("");
  const [createWorkspaceLang, setCreateWorkspaceLang] = useState("javascript");
  const [createWorkspaceCategory, setCreateWorkspaceCategory] = useState("Tutorials");
  const [createWorkspaceType, setCreateWorkspaceType] = useState<"public" | "private">("public");
  const [createWorkspaceAccessCode, setCreateWorkspaceAccessCode] = useState("");

  // Tab State
  const [activeTab, setActiveTab] = useState<"workspaces" | "shared_library" | "private_library" | "community" | "account" | "progress">("workspaces");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get("tab");
    if (tab === "workspaces" || tab === "shared_library" || tab === "private_library" || tab === "community" || tab === "account" || tab === "progress") {
      setActiveTab(tab as any);
    }
  }, []);

  // Room Scheduling States
  const [isScheduled, setIsScheduled] = useState(false);
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [invitedEmails, setInvitedEmails] = useState("");

  // Library & Unlock States
  const [librarySearch, setLibrarySearch] = useState("");
  const [privateSearch, setPrivateSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [exploreItem, setExploreItem] = useState<any | null>(null);
  const [exploreActiveFile, setExploreActiveFile] = useState("");
  const [exploreFileContent, setExploreFileContent] = useState("");
  const [cloningProject, setCloningProject] = useState(false);

  // Private Unlock Modal
  const [unlockingItem, setUnlockingItem] = useState<any | null>(null);
  const [unlockPasscode, setUnlockPasscode] = useState("");
  const [unlockError, setUnlockError] = useState("");
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());

  const loadRooms = useCallback(async (userId: string) => {
    const { data } = await supabase.from("rooms").select("*").eq("created_by", userId).order("created_at", { ascending: false });
    if (data) setRooms(data);
  }, []);

  const loadLibraryRooms = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      const parsed = data.map((r: any) => {
        let meta: any = {};
        if (r.name && r.name.startsWith("{")) {
          try {
            meta = JSON.parse(r.name);
          } catch {
            meta = { title: r.name };
          }
        } else {
          meta = { title: r.name || "Workspace", isPrivate: false, isLibrary: false, category: "Others" };
        }
        return { ...r, meta };
      }).filter((r: any) => r.meta?.isLibrary);
      setLibraryRooms(parsed);
    }
  }, []);

  const loadCommunityUsers = useCallback(async (currentUserId: string) => {
    const { data: usersData } = await supabase
      .from("users")
      .select("id, name, email, avatar_url, role")
      .neq("id", currentUserId)
      .order("name", { ascending: true });

    if (!usersData) return;

    const [{ data: roomData }, { data: profileData }, { data: followData }, { data: followerData }] = await Promise.all([
      supabase.from("rooms").select("created_by, name"),
      supabase.from("tutor_profiles").select("user_id, availability_json"),
      supabase.from("follows").select("following_id").eq("follower_id", currentUserId),
      supabase.from("follows").select("follower_id, following_id"),
    ]);

    const following = new Set((followData || []).map((f: any) => f.following_id));
    const followsMe = new Set((followerData || []).filter((f: any) => f.following_id === currentUserId).map((f: any) => f.follower_id));
    const visibilityByUser = new Map<string, "public" | "private">();
    const projectCounts = new Map<string, number>();
    const followerCounts = new Map<string, number>();

    (profileData || []).forEach((profile: any) => {
      const visibility = profile.availability_json?.profileVisibility === "private" ? "private" : "public";
      visibilityByUser.set(profile.user_id, visibility);
    });
    (roomData || []).forEach((room: any) => {
      const meta = room.name?.startsWith("{") ? (() => { try { return JSON.parse(room.name); } catch { return {}; } })() : {};
      if (room.created_by && !meta.isLibrary) projectCounts.set(room.created_by, (projectCounts.get(room.created_by) || 0) + 1);
    });
    (followerData || []).forEach((follow: any) => {
      followerCounts.set(follow.following_id, (followerCounts.get(follow.following_id) || 0) + 1);
    });

    setCommunityUsers(usersData.map((person: any) => ({
      ...person,
      projectCount: projectCounts.get(person.id) || 0,
      followers: followerCounts.get(person.id) || 0,
      following: following.has(person.id),
      followsMe: followsMe.has(person.id),
      profileVisibility: visibilityByUser.get(person.id) || "public",
    })));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) { router.replace("/login"); return; }
      const { data: profile } = await supabase.from("users").select("*").eq("id", session.user.id).maybeSingle();
      const fallbackProfile = {
        id: session.user.id,
        name: session.user.user_metadata?.name || session.user.email?.split("@")[0] || "User",
        email: session.user.email || "",
        role: session.user.user_metadata?.role || "student",
      };
      const appProfile = profile || fallbackProfile;
      if (!profile) {
        await supabase.from("users").upsert(appProfile, { onConflict: "id" });
      }
      setUser(appProfile);
      await loadRooms(appProfile.id);
      await loadLibraryRooms();
      await loadCommunityUsers(appProfile.id);
      setLoading(false);
    })();
  }, [router, loadRooms, loadLibraryRooms, loadCommunityUsers]);

  async function handleCreate() {
    if (!user) return;
    setCreating(true);

    const title = createWorkspaceTitle.trim() || `${user.name || "My"}'s Workspace`;

    if (createWorkspaceType === "private" && !createWorkspaceAccessCode.trim()) {
      alert("Please specify an Access Code for your Private Workspace.");
      setCreating(false);
      return;
    }

    if (isScheduled && (!startAt || !endAt)) {
      alert("Please provide both start and end times for the scheduled room.");
      setCreating(false);
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) {
      headers["Authorization"] = `Bearer ${session.access_token}`;
    }

    const res = await fetch("/api/create-room", {
      method: "POST",
      headers,
      body: JSON.stringify({
        createdBy: user.id,
        roomName: title,
        language: createWorkspaceLang,
        category: createWorkspaceCategory,
        isPrivate: createWorkspaceType === "private",
        accessCode: createWorkspaceAccessCode.trim(),
        authorName: user.name || user.email?.split("@")[0] || "User",
        isLibrary: false,
      }),
    });
    const room = await res.json();
    if (res.ok && room.id) {
      setShowCreateModal(false);
      setCreateWorkspaceTitle("");
      setCreateWorkspaceAccessCode("");
      router.push(`/room/${room.id}`);
    } else {
      alert(room.error || "Failed to create workspace.");
    }
    setCreating(false);
  }

  async function handleJoin() {
    const roomCode = joinInput.trim().toUpperCase();
    if (!roomCode) return;
    setJoinError("");

    const { data: { session } } = await supabase.auth.getSession();
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`;

    const res = await fetch("/api/join-room", {
      method: "POST",
      headers,
      body: JSON.stringify({ roomCode, accessCode: joinAccessCode.trim() }),
    });
    const result = await res.json();

    if (res.ok && result.roomId) {
      setJoinInput("");
      setJoinAccessCode("");
      router.push(`/room/${result.roomId}`);
    } else {
      setJoinError(result.error || "Room not found. Check the room code and access code.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this workspace?")) return;
    await supabase.from("rooms").delete().eq("id", id);
    setRooms(p => p.filter(r => r.id !== id));
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function toggleFollow(person: CommunityUser) {
    if (!user) return;
    if (person.following) {
      await supabase.from("follows").delete().eq("follower_id", user.id).eq("following_id", person.id);
    } else {
      await supabase.from("follows").insert({ follower_id: user.id, following_id: person.id });
    }
    setCommunityUsers((prev) => prev.map((p) => p.id === person.id ? {
      ...p,
      following: !p.following,
      followers: p.following ? Math.max(0, p.followers - 1) : p.followers + 1,
    } : p));
  }

  async function sendDirectMessage(person: CommunityUser) {
    if (!user) return;
    const canMessage = person.profileVisibility === "public" || (person.following && person.followsMe);
    if (!canMessage) {
      alert("This is a private profile. You can message only after you both follow each other or they give access.");
      return;
    }
    setMessageTarget(person);
    await loadMessageThread(person.id);
  }

  async function loadMessageThread(otherUserId: string) {
    if (!user) return;
    const { data } = await supabase
      .from("direct_messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
      .order("created_at", { ascending: true });
    setThreadMessages(data || []);
  }

  async function submitDirectMessage() {
    if (!user || !messageTarget) return;
    const content = messageText.trim();
    const mediaUrl = messageAttachment.trim();
    if (!content && !mediaUrl) return;
    const { error } = await supabase.from("direct_messages").insert({
      sender_id: user.id,
      receiver_id: messageTarget.id,
      content,
      media_url: mediaUrl || null,
    });
    if (error) {
      alert("Message table is not ready yet. Add direct_messages in Supabase to enable inbox messages.");
      return;
    }
    setMessageText("");
    setMessageAttachment("");
    await loadMessageThread(messageTarget.id);
  }

  async function editMessage(message: DirectMessage) {
    const next = prompt("Edit message", message.content);
    if (next === null) return;
    const { error } = await supabase.from("direct_messages").update({ content: next.trim(), edited_at: new Date().toISOString() }).eq("id", message.id);
    if (error) alert("Messages can only be edited by the sender within 5 minutes.");
    else if (messageTarget) await loadMessageThread(messageTarget.id);
  }

  async function deleteMessage(message: DirectMessage, scope: "mine" | "theirs" | "both") {
    if (!user) return;
    const update =
      scope === "both"
        ? { deleted_for_everyone: true }
        : message.sender_id === user.id
          ? { deleted_for_sender: true }
          : { deleted_for_receiver: true };
    const { error } = await supabase.from("direct_messages").update(update).eq("id", message.id);
    if (error) alert("Could not delete this message.");
    else if (messageTarget) await loadMessageThread(messageTarget.id);
  }

  async function leaveReview(person: CommunityUser) {
    if (!user) return;
    const content = prompt(`Review ${person.name || person.email || "user"}`);
    if (!content?.trim()) return;
    const { error } = await supabase.from("profile_reviews").insert({
      reviewer_id: user.id,
      reviewed_user_id: person.id,
      rating: 5,
      content: content.trim(),
    });
    alert(error ? "Review table is not ready yet. Add profile_reviews in Supabase to enable reviews." : "Review posted.");
  }

  const openLibraryItem = (item: any) => {
    setExploreItem(item);
    const firstFile = (item.files_json || []).find((f: any) => !f.isFolder);
    if (firstFile) {
      setExploreActiveFile(firstFile.path || firstFile.name);
      setExploreFileContent(firstFile.content || "");
    } else {
      setExploreActiveFile("");
      setExploreFileContent("");
    }
  };

  const handleAccessPrivateItem = (item: any) => {
    const followsAuthor = communityUsers.some((person) => person.id === item.created_by && person.following);
    if (item.created_by === user?.id || unlockedIds.has(item.id) || followsAuthor || !item.meta?.isPrivate) {
      openLibraryItem(item);
      return;
    }
    setUnlockingItem(item);
    setUnlockPasscode("");
    setUnlockError("");
  };

  const handleUnlockPrivateSubmit = () => {
    if (!unlockingItem) return;
    const expected = String(unlockingItem.meta?.accessCode || "").trim().toLowerCase();
    const entered = unlockPasscode.trim().toLowerCase();
    if (entered && (entered === expected || expected === "")) {
      setUnlockedIds(prev => new Set(prev).add(unlockingItem.id));
      const target = unlockingItem;
      setUnlockingItem(null);
      openLibraryItem(target);
    } else {
      setUnlockError("Incorrect access code. Please verify the code with the owner.");
    }
  };

  // Clone action for shared library items
  async function handleCloneProject(item: any) {
    if (!user) return;
    setCloningProject(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please sign in again to clone a project.");

      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${session.access_token}` },
        body: JSON.stringify({
          createdBy: user.id,
          roomName: `${item.meta?.title || "Cloned Workspace"}`,
          language: item.language,
          files: item.files_json,
        }),
      });
      const room = await res.json();
      if (res.ok && room.id) {
        router.push(`/room/${room.id}`);
      } else {
        alert(room.error || "Failed to clone project.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during cloning.");
    } finally {
      setCloningProject(false);
    }
  }

  // Download individual file
  function handleDownloadFile(fileName: string, content: string) {
    const isBase64 = content.startsWith("data:");
    const blob = isBase64
      ? (fetch(content).then(r => r.blob()))
      : new Blob([content], { type: "text/plain" });

    if (isBase64) {
      (blob as Promise<Blob>).then(b => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(b);
        a.download = fileName.split("/").pop() || fileName;
        a.click();
        URL.revokeObjectURL(a.href);
      });
    } else {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob as Blob);
      a.download = fileName.split("/").pop() || fileName;
      a.click();
      URL.revokeObjectURL(a.href);
    }
  }

  const cfg = ROLE_CONFIG[user?.role || "student"] || ROLE_CONFIG.student;
  const RoleIcon = cfg.icon;
  const tabClass = (tab: string) =>
    `cursor-pointer rounded-lg px-[18px] py-2.5 text-[13px] font-bold transition-all duration-200 ${
      activeTab === tab
        ? "border border-white/20 bg-gray-800 text-white shadow-lg"
        : "border border-transparent bg-transparent text-gray-400 hover:text-white hover:bg-white/5"
    }`;
  const userName = user?.name || "there";
  const filtered = rooms.filter((r) =>
    getRoomDisplayName(r.name).toLowerCase().includes(search.toLowerCase()) ||
    r.room_code.toLowerCase().includes(search.toLowerCase())
  );

  const sharedLibraryRooms = libraryRooms.filter((item) => !item.meta?.isPrivate);
  const privateLibraryRooms = libraryRooms.filter((item) => item.meta?.isPrivate);

  const filteredSharedLibrary = sharedLibraryRooms.filter((item) => {
    const title = item.meta?.title || item.name || "";
    const description = item.meta?.description || "";
    const category = item.meta?.category || "Others";
    const author = item.meta?.authorName || "Anonymous";
    const lang = item.language || "";

    const matchesSearch =
      title.toLowerCase().includes(librarySearch.toLowerCase()) ||
      description.toLowerCase().includes(librarySearch.toLowerCase()) ||
      author.toLowerCase().includes(librarySearch.toLowerCase()) ||
      lang.toLowerCase().includes(librarySearch.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" ||
      category.toLowerCase() === selectedCategory.toLowerCase();

    return matchesSearch && matchesCategory;
  });

  const filteredPrivateLibrary = privateLibraryRooms.filter((item) => {
    const title = item.meta?.title || item.name || "";
    const description = item.meta?.description || "";
    const category = item.meta?.category || "Others";
    const author = item.meta?.authorName || "Anonymous";
    const lang = item.language || "";

    const matchesSearch =
      title.toLowerCase().includes(privateSearch.toLowerCase()) ||
      description.toLowerCase().includes(privateSearch.toLowerCase()) ||
      author.toLowerCase().includes(privateSearch.toLowerCase()) ||
      lang.toLowerCase().includes(privateSearch.toLowerCase());

    return matchesSearch;
  });

  const filteredCommunityUsers = communityUsers.filter((person) => {
    const needle = communitySearch.toLowerCase();
    return (
      (person.name || "").toLowerCase().includes(needle) ||
      (person.email || "").toLowerCase().includes(needle) ||
      (person.role || "").toLowerCase().includes(needle)
    );
  });

  const LANG_COLORS: Record<string, string> = { javascript: "#f1e05a", typescript: "#ffffff", python: "#000000", java: "#b07219", go: "#ffffff", rust: "#dea584", html: "#e34c26", css: "#563d7c", cpp: "#f34b7d" };

  const STEPS = [
    { id: "create", title: "Create Project", desc: "Start a new workspace", icon: <Plus size={24} color="#ffffff" /> },
    { id: "code", title: "Write Code", desc: "Monaco Editor + AI", icon: <Code2 size={24} color="#ffffff" /> },
    { id: "collaborate", title: "Collaborate", desc: "Real-time with team", icon: <Users size={24} color="#10B981" /> },
    { id: "preview", title: "Live Preview", desc: "See changes instantly", icon: <Zap size={24} color="#F59E0B" /> },
    { id: "share", title: "Share", desc: "Deploy anywhere", icon: <Globe size={24} color="#EF4444" /> },
  ];

function AnimatedCard({ step, delay }: { step: { id: string; title: string; desc: string; icon: React.ReactNode }; delay: number }) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      setOffset({
        x: ((e.clientX / innerWidth) - 0.5) * 10,
        y: ((e.clientY / innerHeight) - 0.5) * 10,
      });
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  return (
    <div
      className="group"
      style={{
        animation: `fadeUp 0.8s ease-out ${delay}s forwards`,
        opacity: 0,
        transform: `perspective(1000px) rotateX(${offset.y}deg) rotateY(${offset.x}deg)`,
        transition: "transform 0.1s ease-out",
      }}
    >
      <div className="flex h-full cursor-grab select-none flex-col gap-3.5 rounded-[20px] border border-ct-border bg-black p-8 text-center transition-all duration-300 hover:border-ct-subtle hover:shadow-[0_0_30px_rgba(255,255,255,0.15)]">
        <div className="mx-auto flex h-[70px] w-[70px] items-center justify-center rounded-full border border-white/25 bg-white/20">
          {step.icon}
        </div>
        <h3 className="m-0 text-base font-bold text-white">{step.title}</h3>
        <p className="m-0 text-[13px] leading-normal text-[#888]">{step.desc}</p>
      </div>
    </div>
  );
}

function WorkspaceCard({
  room,
  displayName,
  schedule,
  LANG_COLORS,
  copiedCode,
  onCopy,
  onDelete,
  onOpen,
}: {
  room: Room;
  displayName: string;
  schedule: { isScheduled: boolean; startAt?: string; endAt?: string; invitedEmails: string[] };
  LANG_COLORS: Record<string, string>;
  copiedCode: string | null;
  onCopy: (code: string) => void;
  onDelete: (id: string) => void;
  onOpen: () => void;
}) {
  return (
    <div
      className="group flex cursor-pointer flex-col gap-3.5 rounded-2xl border border-[#111] bg-black p-5 transition-all duration-200 hover:-translate-y-1 hover:border-ct-subtle"
    >
      <div className="flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-1.5">
            <h3 className="m-0 text-[15px] font-bold text-white">{displayName}</h3>
            {schedule.isScheduled && (
              <span className="rounded bg-white/10 px-1.5 py-px text-[10px] font-bold text-white">
                Scheduled
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: LANG_COLORS[room.language] || "#888" }}/>
            <span className="text-xs text-[#777]">{room.language}</span>
          </div>
        </div>
        <button onClick={() => onDelete(room.id)} className="cursor-pointer rounded-md border-none bg-transparent p-1 text-[#444] transition-colors hover:text-[#ff6b6b]">
          <Trash2 size={14}/>
        </button>
      </div>

      <div className="flex items-center gap-1.5 rounded-lg border border-[#111] bg-[#0a0a0a] px-2.5 py-1.5">
        <Hash size={11} color="#555"/>
        <span className="font-mono text-xs font-bold tracking-[2px] text-[#777]">{room.room_code}</span>
        <button onClick={(e) => { e.stopPropagation(); onCopy(room.room_code); }} className={`cursor-pointer border-none bg-transparent p-0 ${copiedCode === room.room_code ? "text-[#4ade80]" : "text-[#555]"}`}>
          {copiedCode === room.room_code ? <Check size={11}/> : <Copy size={11}/>}
        </button>
      </div>

      <button onClick={onOpen}
        className="flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border border-[#222] bg-[#111] p-2.5 text-[13px] font-bold text-white transition-colors hover:bg-[#222]"
      >
        <ArrowRight size={14}/> Open Workspace
      </button>
    </div>
  );
}

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center bg-[#080810]">
      <div className="text-center">
        <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-[3px] border-white/20 border-t-white" />
        <p className="text-sm text-[#666]">Loading your dashboard...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#080810] font-inter text-[#e0e0e0]">
      {/* Top navbar */}
      <header className="glass-header sticky top-0 z-[100] flex h-[60px] animate-slide-up items-center justify-between border-b border-ct-border px-7">
        <Link href="/" className="text-xl font-black text-white no-underline">
          Code<span className="text-white">Together</span>
        </Link>
        <div className="flex items-center gap-4">
          <div style={{ display: "flex", alignItems: "center", gap: 8, background: cfg.color + "15", border: `1px solid ${cfg.color}30`, borderRadius: 20, padding: "5px 12px" }}>
            <RoleIcon size={14} color={cfg.color}/>
            <span className="text-[12px] font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
          </div>
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-gradient-to-br from-white to-[#cccccc] text-[13px] font-extrabold text-black">
            {(user?.name || user?.email || "U").charAt(0).toUpperCase()}
          </div>
          
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="flex items-center gap-[6px] px-[12px] py-[6px] border border-[#222] bg-transparent text-[#aaa] rounded-[8px] cursor-pointer hover:text-white transition-colors text-[13px]"
          >
            {mounted ? (theme === "dark" ? "☀️ Light" : "🌙 Dark") : "🌓 Theme"}
          </button>

          <button onClick={async () => { await supabase.auth.signOut(); router.push("/"); }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#222] bg-transparent px-3 py-1.5 text-[13px] text-[#666]">
            <LogOut size={14}/> Logout
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-6 py-10">
        {/* Welcome */}
        <div className="mb-[30px] animate-slide-up">
          <h1 className="text-[clamp(24px,4vw,36px)] font-black">
            {cfg.greeting}, <span style={{ color: cfg.color }}>{user?.name?.split(" ")[0] || "there"}</span> <span className="animate-float" style={{ display: "inline-block" }}>👋</span>
          </h1>
          <p className="mt-1.5 text-[15px] text-[#555]">
            {user?.email} · {rooms.length} workspace{rooms.length !== 1 ? "s" : ""}
          </p>
        </div>

        {/* Tab Selection */}
        <div className="mb-[30px] flex animate-slide-up flex-wrap gap-2 border-b border-ct-border pb-3 delay-100">
          <button
            onClick={() => setActiveTab("workspaces")}
            className={tabClass("workspaces")}
          >
            My Workspaces
          </button>
          <button
            onClick={() => setActiveTab("shared_library")}
            className={tabClass("shared_library")}
          >
            🌐 Shared Library (Public)
          </button>
          <button
            onClick={() => setActiveTab("private_library")}
            className={tabClass("private_library")}
          >
            🔒 Private Library (Access Code)
          </button>
          <button
            onClick={() => setActiveTab("community")}
            className={tabClass("community")}
          >
            Community
          </button>
          <button
            onClick={() => setActiveTab("account")}
            className={tabClass("account")}
          >
            My Profile
          </button>
          <button
            onClick={() => setActiveTab("progress")}
            className={tabClass("progress")}
          >
            Progress Tracking
          </button>
        </div>

        {activeTab === "workspaces" && (
          <>
            {/* Quick actions row */}
            <div className="animate-slide-up delay-200 gap-[16px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", marginBottom: 40 }}>
              {/* Create room trigger card */}
              <div className="glass-panel hover-card-glow rounded-[20px] p-[24px] flex flex-col gap-[12px] justify-between">
                <div className="flex items-center gap-[10px]">
                  <div className="rounded-[10px] flex items-center justify-center" style={{ width: 36, height: 36, background: "#fff" }}>
                    <Plus size={18} color="#000"/>
                  </div>
                  <h3 className="text-[16px] font-bold" style={{ margin: 0 }}>Create Workspace</h3>
                </div>

                <button onClick={() => setShowCreateModal(true)}
                  className="w-full p-[11px] rounded-[10px] text-[14px] font-extrabold cursor-pointer flex items-center justify-center gap-[8px]" style={{ background: "#fff", border: "1px solid #fff", color: "#000" }}>
                  <Plus size={16} /> + New Workspace
                </button>
              </div>

              {/* Join room card */}
              <div className="glass-panel hover-card-glow rounded-[20px] p-[24px]">
                <div className="flex items-center gap-[10px]" style={{ marginBottom: 16 }}>
                  <div className="rounded-[10px] flex items-center justify-center" style={{ width: 36, height: 36, background: "#fff" }}>
                    <Hash size={18} color="#000"/>
                  </div>
                  <h3 className="text-[16px] font-bold" style={{ margin: 0 }}>Join via Code</h3>
                </div>
                <input value={joinInput} onChange={e => setJoinInput(e.target.value.toUpperCase())} onKeyDown={e => e.key === "Enter" && handleJoin()}
                  placeholder="Enter code e.g. XK9P2M"
                  className="w-full rounded-[8px] p-[8px] text-[14px] font-bold" style={{ background: "#111", border: "1px solid #222", color: "#fff", letterSpacing: 2, outline: "none", marginBottom: 12, boxSizing: "border-box" }}
                />
                <input value={joinAccessCode} onChange={e => setJoinAccessCode(e.target.value)} onKeyDown={e => e.key === "Enter" && handleJoin()}
                  placeholder="Access code for private rooms"
                  className="w-full rounded-[8px] p-[8px] text-[13px]" style={{ background: "#111", border: "1px solid #222", color: "#fff", outline: "none", marginBottom: 10, boxSizing: "border-box" }}
                />
                {joinError && <p className="text-[12px]" style={{ color: "#f87171", margin: "0 0 10px" }}>{joinError}</p>}
                <button onClick={handleJoin}
                  className="w-full p-[10px] rounded-[10px] text-[14px] font-extrabold cursor-pointer" style={{ background: "#000", border: "1px solid #fff", color: "#fff" }}>
                  Join Room →
                </button>
              </div>

              {/* Stats card */}
              <div className="glass-panel hover-card-glow rounded-[20px] p-[24px]">
                <h3 className="text-[14px] font-bold" style={{ color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 20 }}>Your Stats</h3>
                {[
                  { label: "Workspaces", value: rooms.length, color: "#ffffff" },
                  { label: "Account Type", value: cfg.label, color: cfg.color },
                  { label: "Status", value: "Active", color: "#4ade80" },
                ].map(s => (
                  <div key={s.label} className="flex justify-between items-center p-[8px]" style={{ borderBottom: "1px solid #111" }}>
                    <span className="text-[13px]" style={{ color: "#666" }}>{s.label}</span>
                    <span className="font-bold text-[14px]" style={{ color: s.color }}>{s.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Workspace list */}
            <div className="animate-slide-up delay-300">
              <div className="flex items-center justify-between gap-[12px]" style={{ marginBottom: 20, flexWrap: "wrap" }}>
                <h2 className="text-[20px] font-extrabold">My Workspaces</h2>
                <div className="flex items-center gap-[10px] rounded-[10px] p-[8px]" style={{ background: "#0d0d1a", border: "1px solid #1a1a2e" }}>
                  <Search size={14} color="#555"/>
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search workspaces..."
                    className="border-none text-[13px]" style={{ background: "none", outline: "none", color: "#ccc", width: 180 }}
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="p-[60px] rounded-[20px]" style={{ textAlign: "center", background: "#0d0d1a", border: "1px dashed #1a1a2e" }}>
                  <Layers size={40} color="#333" style={{ margin: "0 auto 16px" }}/>
                  <p className="text-[15px]" style={{ color: "#555", marginBottom: 16 }}>No workspaces yet</p>
                  <button onClick={() => setShowCreateModal(true)} className="p-[10px] rounded-[10px] font-extrabold cursor-pointer" style={{ background: "#fff", border: "1px solid #fff", color: "#000" }}>
                    Create your first room
                  </button>
                </div>
              ) : (
                <div className="gap-[16px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                  {filtered.map((room, index) => {
                    const schedule = getRoomScheduleDetails(room.name);
                    const displayName = getRoomDisplayName(room.name);

                    return (
                      <div key={room.id} className="glass-panel hover-card-glow animate-slide-up" style={{ animationDelay: `${300 + index * 50}ms`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 14, cursor: "pointer", position: "relative" }}>
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center gap-[6px]" style={{ marginBottom: 4, flexWrap: "wrap" }}>
                              <h3 className="font-bold text-[15px]" style={{ margin: 0 }}>{displayName}</h3>
                              {schedule.isScheduled && (
                                <span className="text-[10px] p-[1px] rounded-[4px] font-bold" style={{ background: "#ffffff20", color: "#ffffff" }}>
                                  Scheduled
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-[8px]">
                              <span className="rounded-[50px]" style={{ width: 8, height: 8, background: LANG_COLORS[room.language] || "#888", display: "inline-block" }}/>
                              <span className="text-[12px]" style={{ color: "#555" }}>{room.language}</span>
                            </div>
                          </div>
                          <button onClick={() => handleDelete(room.id)} className="border-none cursor-pointer p-[4px] rounded-[6px]" style={{ background: "none", color: "#333", transition: "color 0.15s" }}
                            onMouseOver={e => (e.currentTarget as HTMLElement).style.color = "#f47"}
                            onMouseOut={e => (e.currentTarget as HTMLElement).style.color = "#333"}>
                            <Trash2 size={14}/>
                          </button>
                        </div>

                        {schedule.isScheduled && (
                          <div className="flex flex-col gap-[4px] p-[10px] rounded-[10px] text-[11px]" style={{ background: "#111", border: "1px solid #222", color: "#aaa" }}>
                            <div className="flex items-center gap-[6px]">
                              <Calendar size={11} color="#ffffff" />
                              <span>Starts: {new Date(schedule.startAt!).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-[6px]">
                              <Clock size={11} color="#ffffff" />
                              <span>Ends: {new Date(schedule.endAt!).toLocaleString()}</span>
                            </div>
                            {schedule.invitedEmails.length > 0 && (
                              <div className="flex gap-[4px] items-center" style={{ flexWrap: "wrap", marginTop: 4 }}>
                                <Mail size={10} color="#555" />
                                {schedule.invitedEmails.map((email: string) => (
                                  <span key={email} className="text-[9px] p-[1px] rounded-[4px]" style={{ background: "#222", color: "#888" }}>
                                    {email}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-[6px] rounded-[8px] p-[5px]" style={{ background: "#111", border: "1px solid #1a1a2e" }}>
                            <Hash size={11} color="#555"/>
                            <span className="text-[12px] font-bold" style={{ fontFamily: "monospace", letterSpacing: 2, color: "#ccc" }}>{room.room_code}</span>
                            <button onClick={() => copyCode(room.room_code)} className="border-none cursor-pointer p-[0px] flex" style={{ background: "none", color: "#555" }}>
                              {copiedCode === room.room_code ? <Check size={11} color="#4ade80"/> : <Copy size={11}/>}
                            </button>
                          </div>
                          <div className="flex items-center gap-[5px] text-[11px]" style={{ color: "#555" }}>
                            <Clock size={11}/>
                            {new Date(room.created_at).toLocaleDateString()}
                          </div>
                        </div>

                        <button onClick={() => router.push(`/room/${room.id}`)}
                          className="p-[9px] rounded-[10px] text-[13px] font-extrabold cursor-pointer flex items-center justify-center gap-[8px]" style={{ background: "#fff", border: "1px solid #fff", color: "#000", transition: "all 0.15s" }}
                          onMouseOver={e => { (e.currentTarget as HTMLElement).style.background = "#000"; (e.currentTarget as HTMLElement).style.color = "#fff"; (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}
                          onMouseOut={e => { (e.currentTarget as HTMLElement).style.background = "#fff"; (e.currentTarget as HTMLElement).style.color = "#000"; (e.currentTarget as HTMLElement).style.borderColor = "#fff"; }}>
                          <Code2 size={14}/> Open Workspace <ArrowRight size={13}/>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === "shared_library" && (
          /* Shared Library (Public) Tab */
          <div className="animate-slide-up delay-200">
            <div className="flex items-center justify-between gap-[12px]" style={{ marginBottom: 20, flexWrap: "wrap" }}>
              <div>
                <h2 className="text-[22px] font-extrabold" style={{ color: "#fff", margin: 0 }}>🌐 Shared Public Library</h2>
                <p className="text-[13px]" style={{ color: "#777", marginTop: 4 }}>Explore public projects, templates, media files & code samples</p>
              </div>

              {/* Search Bar for Shared Library by Name, Author, Category */}
              <div className="flex items-center gap-[10px] rounded-[12px] p-[10px] w-full" style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", maxWidth: 320 }}>
                <Search size={15} color="#666"/>
                <input value={librarySearch} onChange={e => setLibrarySearch(e.target.value)} placeholder="Search by workspace name..."
                  className="border-none text-[13px] w-full" style={{ background: "none", outline: "none", color: "#fff" }}
                />
              </div>
            </div>

            {/* Predefined Categories Filter */}
            <div className="flex gap-[8px]" style={{ overflowX: "auto", paddingBottom: 14, marginBottom: 20 }}>
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "6px 14px",
                    background: selectedCategory === cat ? "#ffffff" : "#0d0d1a",
                    border: selectedCategory === cat ? "1px solid #ffffff" : "1px solid #1a1a2e",
                    borderRadius: 20,
                    color: selectedCategory === cat ? "#fff" : "#888",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s"
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {filteredSharedLibrary.length === 0 ? (
              <div className="p-[60px] rounded-[20px]" style={{ textAlign: "center", background: "#0d0d1a", border: "1px dashed #1a1a2e" }}>
                <Layers size={40} color="#333" style={{ margin: "0 auto 16px" }}/>
                <p className="text-[15px]" style={{ color: "#555" }}>No matching public library workspaces found.</p>
              </div>
            ) : (
              <div className="gap-[16px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {filteredSharedLibrary.map((item, index) => (
                  <div
                    key={item.id}
                    className="glass-panel hover-card-glow animate-slide-up" style={{ animationDelay: `${200 + index * 50}ms`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer" }}
                    onClick={() => openLibraryItem(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[10px] p-[2px] rounded-[10px] font-bold" style={{ background: "#ffffff20", color: "#ffffff", textTransform: "uppercase" }}>
                          {item.meta?.category || "Project"}
                        </span>
                        <h3 className="font-extrabold text-[16px]" style={{ marginTop: 6, color: "#ffffff" }}>
                          {getRoomDisplayName(item.meta?.title || item.name)}
                        </h3>
                      </div>
                      <div className="flex items-center gap-[4px]">
                        <span className="rounded-[50px]" style={{ width: 8, height: 8, background: LANG_COLORS[item.language] || "#888" }}/>
                        <span className="text-[12px]" style={{ color: "#94a3b8" }}>{item.language}</span>
                      </div>
                    </div>

                    <p className="text-[13px] overflow-hidden" style={{ color: "#cbd5e1", lineHeight: 1.5, margin: "4px 0 8px", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", height: 38 }}>
                      {item.meta?.description || "Public workspace project with code and media files."}
                    </p>

                    <div className="flex justify-between items-center" style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 4 }}>
                      <span className="text-[11px]" style={{ color: "#94a3b8" }}>by <strong style={{ color: "#e2e8f0" }}>{item.meta?.authorName || "Anonymous"}</strong></span>
                      <span className="text-[11px] font-bold" style={{ color: "#34d399" }}>Open & Explore →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "private_library" && (
          /* Private Library (Access Code) Tab */
          <div className="animate-slide-up delay-200">
            <div className="flex items-center justify-between gap-[12px]" style={{ marginBottom: 20, flexWrap: "wrap" }}>
              <div>
                <h2 className="text-[22px] font-extrabold" style={{ color: "#fff", margin: 0 }}>🔒 Private Library (Access Code Required)</h2>
                <p className="text-[13px]" style={{ color: "#777", marginTop: 4 }}>Access code protected private workspaces & media libraries</p>
              </div>

              {/* Search Bar for Private Library by Name */}
              <div className="flex items-center gap-[10px] rounded-[12px] p-[10px] w-full" style={{ background: "#0d0d1a", border: "1px solid #1a1a2e", maxWidth: 320 }}>
                <Search size={15} color="#666"/>
                <input value={privateSearch} onChange={e => setPrivateSearch(e.target.value)} placeholder="Search private workspaces..."
                  className="border-none text-[13px] w-full" style={{ background: "none", outline: "none", color: "#fff" }}
                />
              </div>
            </div>

            {filteredPrivateLibrary.length === 0 ? (
              <div className="p-[60px] rounded-[20px]" style={{ textAlign: "center", background: "#0d0d1a", border: "1px dashed #1a1a2e" }}>
                <Lock size={40} color="#555" style={{ margin: "0 auto 16px" }}/>
                <p className="text-[15px]" style={{ color: "#555" }}>No private library workspaces found.</p>
              </div>
            ) : (
              <div className="gap-[16px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))" }}>
                {filteredPrivateLibrary.map((item, index) => {
                  const isUnlocked = item.created_by === user?.id || unlockedIds.has(item.id);

                  return (
                    <div
                      key={item.id}
                      className="glass-panel hover-card-glow animate-slide-up" style={{ animationDelay: `${200 + index * 50}ms`, borderRadius: 16, padding: 20, display: "flex", flexDirection: "column", gap: 12, cursor: "pointer", border: isUnlocked ? "1px solid #10b98144" : "1px solid #f43f5e33" }}
                      onClick={() => handleAccessPrivateItem(item)}
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span style={{ fontSize: 10, background: isUnlocked ? "#10b98120" : "#f43f5e20", color: isUnlocked ? "#34d399" : "#f87171", padding: "2px 8px", borderRadius: 10, fontWeight: 700, textTransform: "uppercase" }}>
                            {isUnlocked ? "Unlocked" : "🔒 Private"}
                          </span>
                          <h3 className="font-extrabold text-[16px]" style={{ marginTop: 6, color: "#ffffff" }}>
                            {getRoomDisplayName(item.meta?.title || item.name)}
                          </h3>
                        </div>
                        <div className="flex items-center gap-[4px]">
                          <span className="rounded-[50px]" style={{ width: 8, height: 8, background: LANG_COLORS[item.language] || "#888" }}/>
                          <span className="text-[12px]" style={{ color: "#94a3b8" }}>{item.language}</span>
                        </div>
                      </div>

                      <p className="text-[13px] overflow-hidden" style={{ color: "#cbd5e1", lineHeight: 1.5, margin: "4px 0 8px", textOverflow: "ellipsis", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", height: 38 }}>
                        {item.meta?.description || "Private workspace containing media files and source code."}
                      </p>

                      <div className="flex justify-between items-center" style={{ borderTop: "1px solid #1e293b", paddingTop: 10, marginTop: 4 }}>
                        <span className="text-[11px]" style={{ color: "#94a3b8" }}>by <strong style={{ color: "#e2e8f0" }}>{item.meta?.authorName || "Anonymous"}</strong></span>
                        <span style={{ fontSize: 12, color: isUnlocked ? "#34d399" : "#f87171", fontWeight: 700 }}>
                          {isUnlocked ? "Open Workspace →" : "Enter Passcode 🔒"}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}


        {activeTab === "community" && (
          <div className="animate-slide-up delay-200">
            {/* The new unified Community Feed & Live Hub Component */}
            <CommunityFeed currentUserId={user?.id || ""} />
          </div>
        )}

        {activeTab === "account" && (
          /* My Profile Tab */
          <div className="animate-slide-up delay-200 flex gap-[24px] items-start" style={{ flexWrap: "wrap" }}>
            {/* Left Column: Account Profile Editor */}
            <div className="glass-panel rounded-[20px] overflow-hidden" style={{ flex: 1, minWidth: 320 }}>
              <AccountProfilePanel />
            </div>

            {/* Right Column: Gamified Coding Progress Tracker */}
            <div className="glass-panel w-full rounded-[20px] p-[24px] flex flex-col gap-[20px]" style={{ maxWidth: 440 }}>
              <div className="flex items-center gap-[8px]" style={{ borderBottom: "1px solid #1a1a2e", paddingBottom: 12 }}>
                <Award size={20} color="#ffd93d" />
                <h2 className="text-[18px] font-extrabold" style={{ color: "#fff", margin: 0 }}>My Personal Progress</h2>
              </div>

              {/* Rank / Level */}
              {(() => {
                const totalProjects = rooms.length;
                let levelName = "Novice Developer";
                let currentTarget = 3;
                let prevTarget = 0;
                let levelNum = 1;
                let badgeColor = "#9b5de5";

                if (totalProjects < 3) {
                  levelName = "Novice Developer";
                  currentTarget = 3;
                  prevTarget = 0;
                  levelNum = 1;
                  badgeColor = "#9b5de5";
                } else if (totalProjects < 7) {
                  levelName = "Code Explorer";
                  currentTarget = 7;
                  prevTarget = 3;
                  levelNum = 2;
                  badgeColor = "#00bbf9";
                } else if (totalProjects < 15) {
                  levelName = "Collaborative Specialist";
                  currentTarget = 15;
                  prevTarget = 7;
                  levelNum = 3;
                  badgeColor = "#00f5d4";
                } else {
                  levelName = "Code Master";
                  currentTarget = totalProjects;
                  prevTarget = 15;
                  levelNum = 4;
                  badgeColor = "#ff007f";
                }

                const levelProgress = totalProjects >= 15 ? 100 : ((totalProjects - prevTarget) / (currentTarget - prevTarget)) * 100;

                // Check achievements
                const hasFirstCommit = totalProjects >= 1;
                const hasScheduledRoom = rooms.some(r => {
                  try {
                    const parsed = JSON.parse(r.name || "");
                    return parsed.isScheduled && parsed.invitedEmails?.length > 0;
                  } catch {}
                  return false;
                });
                const hasPublishedProject = libraryRooms.some(r => r.created_by === user?.id);
                const hasVeteran = totalProjects >= 10;

                return (
                  <div className="flex flex-col gap-[16px]">
                    <div className="flex items-center gap-[16px]">
                      <div style={{
                        width: 60, height: 60, borderRadius: "50%", background: `linear-gradient(135deg, ${badgeColor}, #0d0d1a)`,
                        border: `2px solid ${badgeColor}`, display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 22, fontWeight: 900, color: "#fff", boxShadow: `0 0 15px ${badgeColor}33`
                      }}>
                        {levelNum}
                      </div>
                      <div>
                        <div className="text-[13px] font-semibold" style={{ color: "#666" }}>CURRENT RANK</div>
                        <div className="text-[18px] font-black" style={{ color: "#fff" }}>{levelName}</div>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div>
                      <div className="flex justify-between text-[12px]" style={{ color: "#888", marginBottom: 6 }}>
                        <span>Level Progress ({totalProjects} / {totalProjects >= 15 ? "Max" : currentTarget} projects)</span>
                        <span>{Math.round(levelProgress)}%</span>
                      </div>
                      <div className="rounded-[99px] overflow-hidden" style={{ height: 8, background: "#111", border: "1px solid #222" }}>
                        <div style={{ height: "100%", width: `${levelProgress}%`, background: `linear-gradient(90deg, ${badgeColor}, #7c3aed)`, borderRadius: 99 }} />
                      </div>
                      {totalProjects < 15 && (
                        <div className="text-[11px]" style={{ color: "#555", marginTop: 6, textAlign: "right" }}>
                          {currentTarget - totalProjects} more project{currentTarget - totalProjects !== 1 ? "s" : ""} to reach Level {levelNum + 1}
                        </div>
                      )}
                    </div>

                    {/* Achievements Checklist */}
                    <div className="flex flex-col gap-[10px]" style={{ marginTop: 10 }}>
                      <div className="text-[12px] font-bold" style={{ color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>Achievements</div>
                      
                      {[
                        { title: "First Commit", desc: "Create your first collaborative workspace", done: hasFirstCommit },
                        { title: "Team Scheduler", desc: "Create a custom timer room and invite users by email", done: hasScheduledRoom },
                        { title: "Library Contributor", desc: "Publish a project template to the Shared Library", done: hasPublishedProject },
                        { title: "Workspace Veteran", desc: "Develop 10 or more workspace rooms", done: hasVeteran }
                      ].map((ach, idx) => (
                        <div key={idx} style={{
                          display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", borderRadius: 10,
                          background: ach.done ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.01)",
                          border: `1px solid ${ach.done ? "rgba(16,185,129,0.2)" : "#1a1a2e"}`
                        }}>
                          <div style={{
                            width: 20, height: 20, borderRadius: "50%", background: ach.done ? "#10b981" : "#222",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 11, fontWeight: "bold"
                          }}>
                            {ach.done ? "✓" : "?"}
                          </div>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700, color: ach.done ? "#10b981" : "#ccc" }}>{ach.title}</div>
                            <div className="text-[11px]" style={{ color: "#666" }}>{ach.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {activeTab === "progress" && (
          <div className="animate-slide-up delay-200 flex flex-col gap-[20px]">
            <div className="gap-[14px]" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
              {[
                { label: "Total Workspaces", value: rooms.length, color: "#ffffff" },
                { label: "Shared Templates", value: libraryRooms.filter(r => r.created_by === user?.id).length, color: "#10b981" },
                { label: "Languages Used", value: new Set(rooms.map(r => r.language)).size, color: "#ffffff" },
                { label: "Student Status", value: cfg.label, color: cfg.color },
              ].map((stat) => (
                <div key={stat.label} className="glass-panel hover-card-glow rounded-[16px] p-[18px]">
                  <div className="text-[11px] font-extrabold" style={{ color: "#666", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>{stat.label}</div>
                  <div className="text-[26px] font-black" style={{ color: stat.color }}>{stat.value}</div>
                </div>
              ))}
            </div>
            <StudentToolsPanel rooms={rooms} libraryRooms={libraryRooms} userId={user?.id || ""} />
          </div>
        )}
      </div>

      {/* Explore Dialog Modal (Monaco Read-Only + Zip support) */}
      {exploreItem && (
        <div className="flex items-center justify-center p-[20px]" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", zIndex: 9999 }}>
          <div className="rounded-[16px] w-full flex flex-col overflow-hidden" style={{ background: "#1e1e1e", border: "1px solid #333", maxWidth: 1000, height: "85vh", boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)" }}>
            
            {/* Modal Header */}
            <div className="flex items-center justify-between p-[0px]" style={{ height: 56, borderBottom: "1px solid #2b2b2b", background: "#252526" }}>
              <div className="flex items-center gap-[10px]">
                <span className="text-[10px] p-[2px] rounded-[10px] font-bold" style={{ background: "#ffffff20", color: "#ffffff", textTransform: "uppercase" }}>
                  {exploreItem.meta?.category || "Project"}
                </span>
                <span className="text-[15px] font-extrabold" style={{ color: "#fff" }}>
                  {getRoomDisplayName(exploreItem.meta?.title || exploreItem.name)}
                </span>
                <span className="text-[12px]" style={{ color: "#94a3b8" }}>by {exploreItem.meta?.authorName || "Anonymous"}</span>
              </div>
              <div className="flex items-center gap-[8px]">
                <button
                  disabled={cloningProject}
                  onClick={() => downloadProjectAsZip(exploreItem.meta?.title || "project", exploreItem.files_json || [])}
                  className="p-[6px] rounded-[8px] text-[12px] font-semibold cursor-pointer flex items-center gap-[5px]" style={{ background: "#2a2a2a", border: "1px solid #444", color: "#ccc" }}
                >
                  <Download size={13} /> Download ZIP
                </button>
                <button
                  onClick={() => handleCloneProject(exploreItem)}
                  disabled={cloningProject}
                  style={{ padding: "6px 16px", background: "linear-gradient(135deg,#ffffff,#cccccc)", border: "none", borderRadius: 8, color: "#000", fontSize: 12, fontWeight: 700, cursor: cloningProject ? "default" : "pointer", display: "flex", alignItems: "center", gap: 5 }}
                >
                  {cloningProject ? "Cloning..." : <><Zap size={13} /> Clone Project</>}
                </button>
                <button
                  onClick={() => setExploreItem(null)}
                  className="border-none cursor-pointer flex p-[4px]" style={{ background: "none", color: "#666" }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="flex" style={{ flex: 1, minHeight: 0 }}>
              
              {/* Explorer Sidebar */}
              <div className="flex flex-col p-[12px]" style={{ width: 220, background: "#252526", borderRight: "1px solid #2d2d2d", overflowY: "auto" }}>
                <div className="text-[10px] font-bold flex items-center gap-[4px]" style={{ color: "#555", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>
                  <Folder size={11}/> Project Files
                </div>
                
                <div className="flex flex-col gap-[2px]">
                  {exploreItem.files_json && exploreItem.files_json.filter((f: any) => !f.isFolder).map((file: any) => {
                    const path = file.path || file.name;
                    return (
                      <div
                        key={path}
                        onClick={() => {
                          setExploreActiveFile(path);
                          setExploreFileContent(file.content || "");
                        }}
                        style={{
                          padding: "6px 10px",
                          borderRadius: 6,
                          cursor: "pointer",
                          background: exploreActiveFile === path ? "#ffffff22" : "transparent",
                          color: exploreActiveFile === path ? "#ffffff" : "#aaa",
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s"
                        }}
                      >
                        <File size={12} color={exploreActiveFile === path ? "#ffffff" : "#666"} />
                        <span className="overflow-hidden" style={{ textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {path}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex flex-col relative" style={{ flex: 1, background: "#1e1e1e" }}>
                {exploreActiveFile ? (
                  <>
                    <div className="flex items-center justify-between p-[0px]" style={{ height: 28, background: "#2d2d2d", borderBottom: "1px solid #252526" }}>
                      <span className="text-[11px]" style={{ color: "#888", fontFamily: "monospace" }}>{exploreActiveFile}</span>
                      <button
                        onClick={() => handleDownloadFile(exploreActiveFile, exploreFileContent)}
                        title="Download file"
                        className="border-none cursor-pointer flex p-[2px]" style={{ background: "none", color: "#555" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = "#ccc"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = "#555"}
                      >
                        <Download size={12} />
                      </button>
                    </div>
                    <div style={{ flex: 1 }}>
                      <MonacoEditor
                        height="100%"
                        language={exploreActiveFile.split(".").pop() || "javascript"}
                        value={exploreFileContent}
                        theme="vs-dark"
                        options={{
                          readOnly: true,
                          minimap: { enabled: false },
                          fontSize: 13,
                          fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                          scrollbar: {
                            verticalScrollbarSize: 8,
                            horizontalScrollbarSize: 8
                          }
                        }}
                      />
                    </div>
                  </>
                ) : (
                  <div className="flex items-center justify-center flex-col gap-[10px]" style={{ flex: 1, color: "#444" }}>
                    <Laptop size={32} />
                    <span className="text-[13px]">Select a file to preview code</span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ── Workspace Creation Modal ── */}
      {showCreateModal && (
        <div className="flex items-center justify-center p-[20px]" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.85)", zIndex: 9999 }}>
          <div className="rounded-[20px] w-full p-[32px]" style={{ background: "#0d0d18", border: "1px solid #1a1a2e", maxWidth: 520, boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)", animation: "pcp-fadeIn 0.2s ease-out" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 24 }}>
              <h2 className="text-[22px] font-black" style={{ color: "#fff", margin: 0 }}>✨ Create New Workspace</h2>
              <button onClick={() => setShowCreateModal(false)} className="border-none cursor-pointer" style={{ background: "none", color: "#666" }}><X size={22} /></button>
            </div>

            <div className="flex flex-col gap-[16px]">
              {/* Workspace Name */}
              <div>
                <label className="text-[11px] font-bold" style={{ color: "#888", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Workspace Name</label>
                <input value={createWorkspaceTitle} onChange={e => setCreateWorkspaceTitle(e.target.value)} placeholder="My Awesome Project" className="w-full rounded-[10px] p-[10px] text-[14px]" style={{ background: "#111", border: "1px solid #222", color: "#fff", outline: "none", boxSizing: "border-box" }} />
              </div>

              {/* Language */}
              <div>
                <label className="text-[11px] font-bold" style={{ color: "#888", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Language</label>
                <select value={createWorkspaceLang} onChange={e => setCreateWorkspaceLang(e.target.value)} className="w-full rounded-[10px] p-[10px] text-[13px]" style={{ background: "#111", border: "1px solid #222", color: "#ccc", outline: "none" }}>
                  {LANGS.map(l => <option key={l} value={l}>{l.charAt(0).toUpperCase() + l.slice(1)}</option>)}
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="text-[11px] font-bold" style={{ color: "#888", textTransform: "uppercase", display: "block", marginBottom: 6 }}>Category</label>
                <select value={createWorkspaceCategory} onChange={e => setCreateWorkspaceCategory(e.target.value)} className="w-full rounded-[10px] p-[10px] text-[13px]" style={{ background: "#111", border: "1px solid #222", color: "#ccc", outline: "none" }}>
                  {CATEGORIES.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Type: Public / Private */}
              <div>
                <label className="text-[11px] font-bold" style={{ color: "#888", textTransform: "uppercase", display: "block", marginBottom: 8 }}>Visibility</label>
                <div className="flex gap-[10px]">
                  <button onClick={() => setCreateWorkspaceType("public")} style={{ flex: 1, padding: "12px", background: createWorkspaceType === "public" ? "#10b98120" : "#111", border: createWorkspaceType === "public" ? "2px solid #10b981" : "1px solid #222", borderRadius: 12, color: createWorkspaceType === "public" ? "#34d399" : "#888", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                    <Globe size={16} /> 🌐 Public (Shared)
                  </button>
                  <button onClick={() => setCreateWorkspaceType("private")} style={{ flex: 1, padding: "12px", background: createWorkspaceType === "private" ? "#f43f5e20" : "#111", border: createWorkspaceType === "private" ? "2px solid #f43f5e" : "1px solid #222", borderRadius: 12, color: createWorkspaceType === "private" ? "#f87171" : "#888", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s" }}>
                    <Lock size={16} /> 🔒 Private (Access Code)
                  </button>
                </div>
              </div>

              {/* Access Code (only for Private) */}
              {createWorkspaceType === "private" && (
                <div>
                  <label className="text-[11px] font-bold" style={{ color: "#f87171", textTransform: "uppercase", display: "block", marginBottom: 6 }}>🔑 Access Code (Required)</label>
                  <input value={createWorkspaceAccessCode} onChange={e => setCreateWorkspaceAccessCode(e.target.value)} placeholder="Enter a passcode e.g. MYCODE123" className="w-full rounded-[10px] p-[10px] text-[14px]" style={{ background: "#111", border: "1px solid #f43f5e44", color: "#fff", outline: "none", boxSizing: "border-box", letterSpacing: 1 }} />
                  <p className="text-[11px]" style={{ color: "#777", marginTop: 6 }}>Share this code with users who need access to your private workspace.</p>
                </div>
              )}

              {/* Create Button */}
              <button onClick={handleCreate} disabled={creating} style={{ width: "100%", padding: "13px", background: creating ? "#333" : "linear-gradient(135deg,#ffffff,#cccccc)", border: "none", borderRadius: 12, color: creating ? "#fff" : "#000", fontSize: 15, fontWeight: 800, cursor: creating ? "default" : "pointer", marginTop: 8, transition: "all 0.2s" }}>
                {creating ? "Creating..." : "Create Workspace →"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Private Unlock Modal ── */}
      {unlockingItem && (
        <div className="flex items-center justify-center p-[20px]" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.88)", zIndex: 9999 }}>
          <div className="rounded-[20px] w-full p-[32px]" style={{ background: "#0d0d18", border: "1px solid #f43f5e33", maxWidth: 440, boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)", textAlign: "center", animation: "pcp-fadeIn 0.2s ease-out" }}>
            <div className="rounded-[50px] flex items-center justify-center" style={{ width: 64, height: 64, background: "#f43f5e15", border: "2px solid #f43f5e44", margin: "0 auto 16px" }}>
              <Shield size={28} color="#f87171" />
            </div>
            <h2 className="text-[20px] font-black" style={{ color: "#fff", marginBottom: 6 }}>🔒 Private Workspace</h2>
            <h3 className="text-[15px] font-semibold" style={{ color: "#ffffff", marginBottom: 4 }}>
              {getRoomDisplayName(unlockingItem.meta?.title || unlockingItem.name)}
            </h3>
            <p className="text-[13px]" style={{ color: "#888", marginBottom: 20 }}>by {unlockingItem.meta?.authorName || "the owner"}</p>
            <p className="text-[13px]" style={{ color: "#aaa", marginBottom: 16 }}>Enter the access code provided by the workspace owner to unlock and view the contents.</p>

            <input
              value={unlockPasscode}
              onChange={e => { setUnlockPasscode(e.target.value); setUnlockError(""); }}
              onKeyDown={e => e.key === "Enter" && handleUnlockPrivateSubmit()}
              placeholder="Enter access code..."
              style={{ width: "100%", background: "#111", border: unlockError ? "2px solid #f43f5e" : "1px solid #333", borderRadius: 10, padding: "12px 16px", color: "#fff", fontSize: 15, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 2, fontWeight: 700, marginBottom: 8 }}
            />

            {unlockError && (
              <p className="text-[12px] font-semibold" style={{ color: "#f87171", marginBottom: 12 }}>{unlockError}</p>
            )}

            <div className="flex gap-[10px]" style={{ marginTop: 16 }}>
              <button onClick={() => setUnlockingItem(null)} className="p-[11px] rounded-[10px] text-[13px] font-bold cursor-pointer" style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#aaa" }}>
                Cancel
              </button>
              <button onClick={handleUnlockPrivateSubmit} className="p-[11px] border-none rounded-[10px] text-[13px] font-bold cursor-pointer" style={{ flex: 1, background: "linear-gradient(135deg, #ffffff, #cccccc)", color: "#000" }}>
                🔓 Unlock
              </button>
            </div>
          </div>
        </div>
      )}

      {messageTarget && (
        <div className="flex items-center justify-center p-[20px]" style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.88)", zIndex: 9999 }}>
          <div className="rounded-[20px] w-full p-[28px]" style={{ background: "#0d0d18", border: "1px solid #1a1a2e", maxWidth: 460, boxShadow: "0 24px 64px rgba(0, 0, 0, 0.8)" }}>
            <div className="flex justify-between items-center" style={{ marginBottom: 18 }}>
              <h2 className="text-[18px] font-black" style={{ margin: 0, color: "#fff" }}>Message {messageTarget.name || messageTarget.email || "User"}</h2>
              <button onClick={() => setMessageTarget(null)} className="border-none cursor-pointer" style={{ background: "none", color: "#666" }}><X size={20}/></button>
            </div>
            <div className="flex flex-col gap-[8px]" style={{ maxHeight: 260, overflowY: "auto", marginBottom: 12, paddingRight: 4 }}>
              {threadMessages.filter((msg) => {
                if (msg.deleted_for_everyone) return false;
                if (msg.sender_id === user?.id && msg.deleted_for_sender) return false;
                if (msg.receiver_id === user?.id && msg.deleted_for_receiver) return false;
                return true;
              }).map((msg) => {
                const mine = msg.sender_id === user?.id;
                const canEdit = mine && Date.now() - new Date(msg.created_at).getTime() < 5 * 60 * 1000;
                return (
                  <div key={msg.id} style={{ alignSelf: mine ? "flex-end" : "flex-start", maxWidth: "86%", background: mine ? "#ffffff22" : "#111", border: mine ? "1px solid #ffffff44" : "1px solid #222", borderRadius: 12, padding: 10 }}>
                    {msg.content && <div className="text-[13px]" style={{ color: "#e5e7eb", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{msg.content}</div>}
                    {msg.media_url && (
                      msg.media_url.match(/\.(png|jpg|jpeg|gif|webp)$/i) || msg.media_url.startsWith("data:image") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={msg.media_url} alt="" className="w-full rounded-[8px]" style={{ marginTop: 8, border: "1px solid #222" }} />
                      ) : (
                        <a href={msg.media_url} target="_blank" rel="noreferrer" className="text-[12px]" style={{ display: "block", color: "#93c5fd", marginTop: 8 }}>Open media</a>
                      )
                    )}
                    <div className="flex gap-[8px] justify-end text-[10px]" style={{ marginTop: 6, color: "#666" }}>
                      {msg.edited_at && <span>edited</span>}
                      {canEdit && <button onClick={() => editMessage(msg)} className="border-none cursor-pointer text-[10px]" style={{ background: "none", color: "#ffffff" }}>Edit</button>}
                      <button onClick={() => deleteMessage(msg, "mine")} className="border-none cursor-pointer text-[10px]" style={{ background: "none", color: "#888" }}>Delete mine</button>
                      {mine && <button onClick={() => deleteMessage(msg, "both")} className="border-none cursor-pointer text-[10px]" style={{ background: "none", color: "#f87171" }}>Delete both</button>}
                    </div>
                  </div>
                );
              })}
            </div>
            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              placeholder="Write a message..."
              rows={4}
              className="w-full rounded-[10px] text-[13px] p-[12px]" style={{ background: "#111", border: "1px solid #333", color: "#fff", outline: "none", resize: "none", boxSizing: "border-box", marginBottom: 10 }}
            />
            <input
              value={messageAttachment}
              onChange={(e) => setMessageAttachment(e.target.value)}
              placeholder="Optional media URL or uploaded media data"
              className="w-full rounded-[10px] text-[13px] p-[10px]" style={{ background: "#111", border: "1px solid #333", color: "#fff", outline: "none", boxSizing: "border-box" }}
            />
            <p className="text-[11px]" style={{ color: "#777", margin: "8px 0 16px" }}>Messages can be edited for 5 minutes. Deleting can be from your side, their side, or both once the inbox view is added.</p>
            <div className="flex gap-[10px]">
              <button onClick={() => setMessageTarget(null)} className="p-[11px] rounded-[10px] font-bold cursor-pointer" style={{ flex: 1, background: "#222", border: "1px solid #333", color: "#aaa" }}>Cancel</button>
              <button onClick={submitDirectMessage} className="p-[11px] border-none rounded-[10px] font-extrabold cursor-pointer" style={{ flex: 1, background: "linear-gradient(135deg, #ffffff, #cccccc)", color: "#000" }}>Send</button>
            </div>
          </div>
        </div>
      )}
    
    <style jsx global>{`
      @keyframes float-y {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-20px) scale(1.02); }
      }
      @keyframes fade-up {
        from { opacity: 0; transform: translateY(40px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes bounce {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-10px) scale(1.03); }
      }
      .animate-bounce { animation: bounce 2s ease-in-out infinite; }
      .animate-fade-up { animation: fade-up 0.8s ease-out forwards; opacity: 0; }
      .workspace-card { opacity: 0; animation: fade-up 0.8s ease-out forwards; }
    `}</style>
    </div>
  );
}
