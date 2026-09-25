"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  BookOpen, Download, Send, Pin, PinOff, Trash2, Plus, Eye, Edit3, Copy, Check,
  Globe, Image as ImageIcon, Bold, Italic, Underline, Strikethrough, Code, Type, List,
  ListOrdered, Quote, RotateCcw, Copy as CopyIcon,
  Trash2 as TrashIcon, Link as LinkIcon, Heading1, Heading2,
  Heading3, AlignLeft, AlignCenter, AlignRight, Undo2, Redo2, Palette
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type Note = {
  id: string;
  title: string;
  content: string;
  published: boolean;
  pinned: boolean;
  createdAt: number;
  color?: string;
};

const NOTE_COLORS = [
  { id: "default", label: "Default", bg: "#1a1a2e", border: "#333355", accent: "#e2e8f0" },
  { id: "yellow", label: "Yellow", bg: "#2d2613", border: "#FBBF24", accent: "#FDE68A" },
  { id: "blue", label: "Blue", bg: "#141f36", border: "#3B82F6", accent: "#93C5FD" },
  { id: "green", label: "Green", bg: "#13261a", border: "#22C55E", accent: "#86EFAC" },
  { id: "purple", label: "Purple", bg: "#231436", border: "#A855F7", accent: "#D8B4FE" },
  { id: "pink", label: "Pink", bg: "#301324", border: "#EC4899", accent: "#F9A8D4" },
  { id: "orange", label: "Orange", bg: "#301d13", border: "#F97316", accent: "#FDBA74" },
  { id: "cyan", label: "Cyan", bg: "#13242e", border: "#06B6D4", accent: "#67E8F9" },
  { id: "red", label: "Red", bg: "#301313", border: "#EF4444", accent: "#FCA5A5" },
];

function getNoteColor(id?: string) {
  return NOTE_COLORS.find((c) => c.id === id) || NOTE_COLORS[0];
}

type SharedNote = {
  id: string;
  title: string;
  content: string;
  publisherId: string;
  publisherName: string;
  createdAt: number;
};

interface TeacherNotesProps {
  roomId: string;
  currentUserId: string;
  currentUserName: string;
  isTeacher?: boolean;
}

// Converts legacy or typed markdown into real HTML so it renders formatted in the rich text editor
function markdownToHtml(md: string): string {
  if (!md) return "";
  // If it already contains HTML tags, return as-is
  if (/<(p|h1|h2|h3|ul|ol|li|blockquote|pre|b|strong|i|em|u|del|strike|div|span|img|a)\b/i.test(md)) {
    return md;
  }
  let html = md;
  // Code blocks
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Headings
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<b><i>$1</i></b>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>');
  html = html.replace(/\*(.*?)\*/g, '<i>$1</i>');
  // Strike
  html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');
  // Underline
  html = html.replace(/__(.*?)__/g, '<u>$1</u>');
  // Images
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0;" />');
  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
  // Blockquotes
  html = html.replace(/^> (.*$)/gim, '<blockquote>$1</blockquote>');
  // Lists
  html = html.replace(/^- (.*$)/gim, '<li>$1</li>');
  html = html.replace(/^\d+\. (.*$)/gim, '<li>$1</li>');
  // Newlines to break
  html = html.replace(/\n/g, '<br>');
  return html;
}

// Converts HTML to clean Markdown for download or export
function htmlToMarkdown(html: string): string {
  if (!html) return "";
  if (typeof document === "undefined") return html;
  const temp = document.createElement("div");
  temp.innerHTML = html;

  function traverse(node: Node): string {
    if (node.nodeType === Node.TEXT_NODE) {
      return node.textContent || "";
    }
    if (node.nodeType !== Node.ELEMENT_NODE) return "";

    const el = node as HTMLElement;
    const tag = el.tagName.toLowerCase();
    let children = "";
    el.childNodes.forEach((child) => {
      children += traverse(child);
    });

    switch (tag) {
      case "h1": return `\n# ${children}\n`;
      case "h2": return `\n## ${children}\n`;
      case "h3": return `\n### ${children}\n`;
      case "b":
      case "strong": return `**${children}**`;
      case "i":
      case "em": return `*${children}*`;
      case "u": return `<u>${children}</u>`;
      case "del":
      case "s":
      case "strike": return `~~${children}~~`;
      case "blockquote": return `\n> ${children}\n`;
      case "code": return `\`${children}\``;
      case "pre": return `\n\`\`\`\n${children}\n\`\`\`\n`;
      case "li": return `\n- ${children}`;
      case "a": return `[${children}](${el.getAttribute("href") || ""})`;
      case "img": return `![${el.getAttribute("alt") || "Image"}](${el.getAttribute("src") || ""})`;
      case "br": return `\n`;
      case "p":
      case "div": return `\n${children}\n`;
      default: return children;
    }
  }

  return traverse(temp).trim().replace(/\n{3,}/g, "\n\n");
}

export default function TeacherNotes({ roomId, currentUserId, currentUserName, isTeacher = false }: TeacherNotesProps) {
  const [notes, setNotes] = useState<Note[]>([]);
  const [sharedNotes, setSharedNotes] = useState<SharedNote[]>([]);
  const [activeNote, setActiveNote] = useState<string | null>(null);
  const [isActiveShared, setIsActiveShared] = useState(false);
  
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [imageUrlInput, setImageUrlInput] = useState("");
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkUrl, setLinkUrl] = useState("");
  const [linkText, setLinkText] = useState("");
  const [showColorPicker, setShowColorPicker] = useState(false);

  // Active toolbar formats state for active button indicators
  const [activeFormats, setActiveFormats] = useState<{ [key: string]: boolean }>({});

  const editorRef = useRef<HTMLDivElement | null>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Sync toolbar active states from current selection
  const updateActiveFormats = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      const isBold = document.queryCommandState("bold");
      const isItalic = document.queryCommandState("italic");
      const isUnderline = document.queryCommandState("underline");
      const isStrike = document.queryCommandState("strikeThrough");
      const isUl = document.queryCommandState("insertUnorderedList");
      const isOl = document.queryCommandState("insertOrderedList");
      const isLeft = document.queryCommandState("justifyLeft");
      const isCenter = document.queryCommandState("justifyCenter");
      const isRight = document.queryCommandState("justifyRight");
      
      let block = "";
      try {
        block = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      } catch {}

      setActiveFormats({
        bold: isBold,
        italic: isItalic,
        underline: isUnderline,
        strikethrough: isStrike,
        bullet: isUl,
        numbered: isOl,
        "align-left": isLeft,
        "align-center": isCenter,
        "align-right": isRight,
        h1: block === "h1",
        h2: block === "h2",
        h3: block === "h3",
        quote: block === "blockquote",
        codeblock: block === "pre",
      });
    } catch {}
  }, []);

  useEffect(() => {
    const handleSelectionChange = () => {
      updateActiveFormats();
    };
    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, [updateActiveFormats]);

  const saveToStorage = (updatedNotes: Note[]) => {
    const key = `notes_${roomId}_${currentUserId}`;
    try {
      localStorage.setItem(key, JSON.stringify(updatedNotes));
    } catch {}
  };

  // Populate editor DOM when active note changes
  const loadNoteIntoEditor = (content: string) => {
    const html = markdownToHtml(content || "");
    setEditContent(html);
    if (editorRef.current) {
      editorRef.current.innerHTML = html;
    }
  };

  // Load from localStorage on mount & auto-select first note
  useEffect(() => {
    const key = `notes_${roomId}_${currentUserId}`;
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: Note[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setNotes(parsed);
          setActiveNote(parsed[0].id);
          setIsActiveShared(false);
          setEditTitle(parsed[0].title);
          loadNoteIntoEditor(parsed[0].content || "");
        }
      }
    } catch {}
  }, [roomId, currentUserId]);

  // Real-time broadcast for classroom shared notes
  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`notes:${roomId}`);
    channelRef.current = channel;

    channel
      .on("broadcast", { event: "notes-update" }, ({ payload }: any) => {
        const { note } = payload;
        if (note) {
          setSharedNotes((prev) => {
            const exists = prev.some((n) => n.id === note.id);
            if (exists) {
              return prev.map((n) => (n.id === note.id ? note : n));
            } else {
              return [note, ...prev];
            }
          });
        }
      })
      .on("broadcast", { event: "notes-delete" }, ({ payload }: { payload: { noteId: string } }) => {
        const { noteId } = payload;
        if (noteId) {
          setSharedNotes((prev) => prev.filter((n) => n.id !== noteId));
          setActiveNote((curr) => {
            if (curr === noteId) {
              setEditTitle("");
              setEditContent("");
              if (editorRef.current) editorRef.current.innerHTML = "";
              return null;
            }
            return curr;
          });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);

  const handleTitleChange = (newTitle: string) => {
    setEditTitle(newTitle);
    if (activeNote && !isActiveShared) {
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === activeNote ? { ...n, title: newTitle } : n));
        saveToStorage(updated);
        return updated;
      });
    }
  };

  const handleEditorInput = () => {
    if (!editorRef.current) return;
    const html = editorRef.current.innerHTML;
    setEditContent(html);
    if (activeNote && !isActiveShared) {
      setNotes((prev) => {
        const updated = prev.map((n) => (n.id === activeNote ? { ...n, content: html } : n));
        saveToStorage(updated);
        return updated;
      });
    }
    updateActiveFormats();
  };

  const saveActiveNote = () => {
    if (!activeNote || isActiveShared) return;
    setSaving(true);
    const html = editorRef.current ? editorRef.current.innerHTML : editContent;
    const updated = notes.map((n) => {
      if (n.id === activeNote) {
        const noteObj = { ...n, title: editTitle.trim() || "Untitled Note", content: html };
        if (n.published && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "notes-update",
            payload: {
              note: {
                id: noteObj.id,
                title: noteObj.title,
                content: noteObj.content,
                publisherId: currentUserId,
                publisherName: currentUserName,
                createdAt: noteObj.createdAt,
              },
            },
          });
        }
        return noteObj;
      }
      return n;
    });
    setNotes(updated);
    saveToStorage(updated);
    setTimeout(() => setSaving(false), 300);
  };

  const createNote = () => {
    // Flush current note edits
    if (activeNote && !isActiveShared && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      setNotes((prev) => {
        const flushed = prev.map((n) =>
          n.id === activeNote ? { ...n, title: editTitle.trim() || "Untitled Note", content: currentHtml } : n
        );
        saveToStorage(flushed);
        return flushed;
      });
    }

    const newNote: Note = {
      id: Date.now().toString(),
      title: "Untitled Note",
      content: "",
      published: false,
      pinned: false,
      createdAt: Date.now(),
      color: "default",
    };

    setNotes((prev) => {
      const updated = [newNote, ...prev];
      saveToStorage(updated);
      return updated;
    });

    setActiveNote(newNote.id);
    setIsActiveShared(false);
    setEditTitle(newNote.title);
    loadNoteIntoEditor("");
    setTimeout(() => {
      if (editorRef.current) editorRef.current.focus();
    }, 0);
  };

  const selectPrivateNote = (note: Note) => {
    if (activeNote === note.id && !isActiveShared) return;

    if (activeNote && !isActiveShared && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === activeNote ? { ...n, title: editTitle.trim() || "Untitled Note", content: currentHtml } : n
        );
        saveToStorage(updated);
        return updated;
      });
    }

    setActiveNote(note.id);
    setIsActiveShared(false);
    setEditTitle(note.title || "Untitled Note");
    loadNoteIntoEditor(note.content || "");
  };

  const selectSharedNote = (note: SharedNote) => {
    if (activeNote === note.id && isActiveShared) return;

    if (activeNote && !isActiveShared && editorRef.current) {
      const currentHtml = editorRef.current.innerHTML;
      setNotes((prev) => {
        const updated = prev.map((n) =>
          n.id === activeNote ? { ...n, title: editTitle.trim() || "Untitled Note", content: currentHtml } : n
        );
        saveToStorage(updated);
        return updated;
      });
    }

    setActiveNote(note.id);
    setIsActiveShared(true);
    setEditTitle(note.title);
    loadNoteIntoEditor(note.content || "");
  };

  const togglePin = (id: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n));
    setNotes(updated);
    saveToStorage(updated);
  };

  const togglePublish = (id: string) => {
    const updated = notes.map((n) => {
      if (n.id === id) {
        const nextPub = !n.published;
        if (nextPub && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "notes-update",
            payload: {
              note: {
                id: n.id,
                title: n.title,
                content: n.content,
                publisherId: currentUserId,
                publisherName: currentUserName,
                createdAt: n.createdAt,
              },
            },
          });
        } else if (!nextPub && channelRef.current) {
          channelRef.current.send({
            type: "broadcast",
            event: "notes-delete",
            payload: { noteId: n.id },
          });
        }
        return { ...n, published: nextPub };
      }
      return n;
    });
    setNotes(updated);
    saveToStorage(updated);
  };

  const setNoteColor = (id: string, colorId: string) => {
    const updated = notes.map((n) => (n.id === id ? { ...n, color: colorId } : n));
    setNotes(updated);
    saveToStorage(updated);
    setShowColorPicker(false);
  };

  const deleteNote = (id: string) => {
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    saveToStorage(updated);
    if (activeNote === id) {
      if (updated.length > 0) {
        setActiveNote(updated[0].id);
        setIsActiveShared(false);
        setEditTitle(updated[0].title);
        loadNoteIntoEditor(updated[0].content || "");
      } else {
        setActiveNote(null);
        setEditTitle("");
        setEditContent("");
        if (editorRef.current) editorRef.current.innerHTML = "";
      }
    }
  };

  const downloadNote = () => {
    const md = htmlToMarkdown(editContent);
    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${(editTitle || "note").toLowerCase().replace(/\s+/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = () => {
    const md = htmlToMarkdown(editContent);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Toggle inline code formatting
  const toggleInlineCode = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let parent: Node | null = range.commonAncestorContainer;
    if (parent.nodeType === Node.TEXT_NODE) parent = parent.parentNode;

    if (parent && (parent as HTMLElement).tagName === "CODE") {
      const textNode = document.createTextNode(parent.textContent || "");
      parent.parentNode?.replaceChild(textNode, parent);
    } else {
      const selectedText = range.toString();
      const codeEl = document.createElement("code");
      codeEl.textContent = selectedText || "code";
      range.deleteContents();
      range.insertNode(codeEl);
      range.selectNodeContents(codeEl);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  // WYSIWYG Format Applicator using document.execCommand
  const applyFormat = (format: string, value?: string) => {
    if (!editorRef.current) return;
    editorRef.current.focus();

    switch (format) {
      case "bold":
        document.execCommand("bold", false, undefined);
        break;
      case "italic":
        document.execCommand("italic", false, undefined);
        break;
      case "underline":
        document.execCommand("underline", false, undefined);
        break;
      case "strikethrough":
        document.execCommand("strikeThrough", false, undefined);
        break;
      case "h1":
        document.execCommand("formatBlock", false, activeFormats.h1 ? "<p>" : "<h1>");
        break;
      case "h2":
        document.execCommand("formatBlock", false, activeFormats.h2 ? "<p>" : "<h2>");
        break;
      case "h3":
        document.execCommand("formatBlock", false, activeFormats.h3 ? "<p>" : "<h3>");
        break;
      case "quote":
        document.execCommand("formatBlock", false, activeFormats.quote ? "<p>" : "<blockquote>");
        break;
      case "codeblock":
        document.execCommand("formatBlock", false, activeFormats.codeblock ? "<p>" : "<pre>");
        break;
      case "bullet":
        document.execCommand("insertUnorderedList", false, undefined);
        break;
      case "numbered":
        document.execCommand("insertOrderedList", false, undefined);
        break;
      case "align-left":
        document.execCommand("justifyLeft", false, undefined);
        break;
      case "align-center":
        document.execCommand("justifyCenter", false, undefined);
        break;
      case "align-right":
        document.execCommand("justifyRight", false, undefined);
        break;
      case "undo":
        document.execCommand("undo", false, undefined);
        break;
      case "redo":
        document.execCommand("redo", false, undefined);
        break;
      case "code":
        toggleInlineCode();
        break;
      case "link":
        if (value) document.execCommand("createLink", false, value);
        break;
      case "image":
        if (value) {
          const imgHtml = `<img src="${value}" alt="Note Image" style="max-width:100%;border-radius:8px;margin:8px 0;display:block;" />`;
          document.execCommand("insertHTML", false, imgHtml);
        }
        break;
      default:
        break;
    }

    handleEditorInput();
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of Array.from(items)) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        const file = item.getAsFile();
        if (file) {
          const reader = new FileReader();
          reader.onload = (ev) => {
            const dataUrl = ev.target?.result as string;
            applyFormat("image", dataUrl);
          };
          reader.readAsDataURL(file);
        }
        return;
      }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      applyFormat("image", dataUrl);
      setShowImageModal(false);
      setImageUrlInput("");
      e.target.value = "";
    };
    reader.readAsDataURL(file);
  };

  const handleLinkInsert = () => {
    if (linkUrl) {
      applyFormat("link", linkUrl);
      setShowLinkModal(false);
      setLinkUrl("");
      setLinkText("");
    }
  };

  const sortedNotes = [...notes].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0));
  const activePrivate = notes.find((n) => n.id === activeNote);
  const activeShared = sharedNotes.find((n) => n.id === activeNote);
  const hasActive = activeNote !== null;
  const activeColor = getNoteColor(activePrivate?.color);

  // 18 Format Buttons in toolbar
  const formatButtons = [
    { id: "h1", icon: <Heading1 size={14} />, title: "Heading 1", shortcut: "H1" },
    { id: "h2", icon: <Heading2 size={14} />, title: "Heading 2", shortcut: "H2" },
    { id: "h3", icon: <Heading3 size={14} />, title: "Heading 3", shortcut: "H3" },
    { id: "bold", icon: <Bold size={14} />, title: "Bold", shortcut: "Ctrl+B" },
    { id: "italic", icon: <Italic size={14} />, title: "Italic", shortcut: "Ctrl+I" },
    { id: "underline", icon: <Underline size={14} />, title: "Underline", shortcut: "Ctrl+U" },
    { id: "strikethrough", icon: <Strikethrough size={14} />, title: "Strikethrough" },
    { id: "code", icon: <Code size={14} />, title: "Inline Code" },
    { id: "codeblock", icon: <Type size={14} />, title: "Code Block" },
    { id: "quote", icon: <Quote size={14} />, title: "Blockquote" },
    { id: "bullet", icon: <List size={14} />, title: "Bullet List" },
    { id: "numbered", icon: <ListOrdered size={14} />, title: "Numbered List" },
    { id: "link", icon: <LinkIcon size={14} />, title: "Insert Link" },
    { id: "image", icon: <ImageIcon size={14} />, title: "Insert Image" },
    { id: "align-left", icon: <AlignLeft size={14} />, title: "Align Left" },
    { id: "align-center", icon: <AlignCenter size={14} />, title: "Align Center" },
    { id: "align-right", icon: <AlignRight size={14} />, title: "Align Right" },
    { id: "undo", icon: <Undo2 size={14} />, title: "Undo", shortcut: "Ctrl+Z" },
    { id: "redo", icon: <Redo2 size={14} />, title: "Redo", shortcut: "Ctrl+Y" },
  ];

  return (
    <>
    <div className="flex h-full w-full bg-ct-dark-black text-gray-200 font-inter overflow-hidden select-none">
      {/* Sidebar List (Notes selector) */}
      <div className="w-[220px] min-w-[220px] border-r border-[#222222] flex flex-col bg-ct-dark-black h-full overflow-hidden">
        <div className="p-3 border-b border-[#222222] flex items-center justify-between shrink-0">
          <div className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <BookOpen size={13}/> Notes
          </div>
          <button 
            onClick={createNote} 
            title="New note" 
            className="p-1 px-2.5 bg-white text-black font-semibold text-xs border-none rounded cursor-pointer hover:bg-gray-200 transition-colors flex items-center gap-1"
          >
            <Plus size={13}/> New
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 flex flex-col gap-1">
          {/* Private Notes */}
          <div className="text-[10px] text-gray-400 uppercase tracking-wider px-2 py-1 font-bold">My Notes ({sortedNotes.length})</div>
          {sortedNotes.length === 0 && (
            <div className="text-[11px] text-gray-500 px-2 py-3 italic">No notes yet. Click + New to create one.</div>
          )}
          {sortedNotes.map((note) => {
            const noteColor = getNoteColor(note.color);
            const isSelected = activeNote === note.id && !isActiveShared;
            return (
              <div
                key={note.id}
                onClick={() => selectPrivateNote(note)}
                className={`p-2.5 rounded-lg cursor-pointer transition-all border-l-4 ${
                  isSelected ? "bg-white/10 shadow-sm" : "hover:bg-white/5 text-gray-300"
                }`}
                style={{
                  borderLeftColor: noteColor.border,
                  backgroundColor: isSelected ? noteColor.bg : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-semibold truncate flex-1 mr-1 ${isSelected ? "text-white" : "text-gray-300"}`} style={{ color: isSelected ? noteColor.accent : undefined }}>
                    {note.title || "Untitled Note"}
                  </span>
                  {note.pinned && <Pin size={11} className="shrink-0 text-amber-400" />}
                </div>
                <div className="flex justify-between items-center text-[9px] text-gray-500 mt-1.5">
                  <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                  {note.published && <span className="text-emerald-400 font-medium">Shared</span>}
                </div>
              </div>
            );
          })}

          {/* Shared Classroom Notes */}
          {sharedNotes.length > 0 && (
            <>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider px-2 pt-3 pb-1 font-bold flex items-center gap-1 border-t border-white/5 mt-2">
                <Globe size={11}/> Classroom Notes ({sharedNotes.length})
              </div>
              {sharedNotes.map((note) => {
                const isSelected = activeNote === note.id && isActiveShared;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectSharedNote(note)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-all border-l-4 border-l-emerald-500 ${
                      isSelected ? "bg-white/15 text-white shadow-sm" : "hover:bg-white/5 text-gray-300"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold truncate flex-1 mr-1">{note.title || "Untitled Note"}</span>
                    </div>
                    <div className="flex justify-between items-center text-[9px] text-gray-400 mt-1.5">
                      <span>by {note.publisherName}</span>
                      <span>{new Date(note.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Editor area - Takes full height of screen */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {hasActive ? (
          <>
            {/* Top WYSIWYG Toolbar */}
            <div className="p-2 border-b border-[#222222] flex items-center gap-1 flex-wrap bg-ct-dark-black shrink-0 z-10">
              <div className="flex gap-0.5 items-center mr-2">
                {formatButtons.map((btn) => {
                  const isActive = Boolean(activeFormats[btn.id]);
                  return (
                    <button
                      key={btn.id}
                      onMouseDown={(e) => {
                        // Prevent editor from losing selection/focus
                        e.preventDefault();
                        if (btn.id === "link") setShowLinkModal(true);
                        else if (btn.id === "image") setShowImageModal(true);
                        else applyFormat(btn.id);
                      }}
                      title={`${btn.title}${btn.shortcut ? ` (${btn.shortcut})` : ""}`}
                      className={`p-1.5 rounded transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer ${
                        isActive 
                          ? "bg-white/25 text-white font-bold shadow-inner" 
                          : "text-gray-400 hover:bg-white/10 hover:text-white"
                      }`}
                      disabled={isActiveShared}
                    >
                      {btn.icon}
                    </button>
                  );
                })}
              </div>

              {/* Color Picker Toggle */}
              {!isActiveShared && activePrivate && (
                <div className="relative mr-2">
                  <button
                    onClick={() => setShowColorPicker(!showColorPicker)}
                    title="Change Note Color"
                    className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <Palette size={14} style={{ color: activeColor.border }} />
                  </button>
                  {showColorPicker && (
                    <div className="absolute top-full left-0 mt-1 p-2 bg-[#161622] border border-white/20 rounded-xl shadow-2xl z-50 flex gap-1.5">
                      {NOTE_COLORS.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => setNoteColor(activePrivate.id, c.id)}
                          title={c.label}
                          className={`w-5 h-5 rounded-full border-2 transition-transform cursor-pointer ${
                            activePrivate.color === c.id ? "scale-125 border-white shadow-lg" : "border-transparent opacity-70 hover:opacity-100 hover:scale-110"
                          }`}
                          style={{ backgroundColor: c.border }}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
              
              {/* Title input */}
              <div className="flex-1 min-w-[140px] flex items-center gap-2">
                {isActiveShared ? (
                  <div className="flex-1 text-sm font-bold text-white flex items-center gap-1.5 truncate">
                    <Globe size={14} className="text-emerald-400 shrink-0" />
                    <span className="truncate">{editTitle}</span>
                    <span className="text-[10px] text-gray-400 font-normal shrink-0">by {activeShared?.publisherName}</span>
                  </div>
                ) : (
                  <input
                    value={editTitle}
                    onChange={(e) => handleTitleChange(e.target.value)}
                    onBlur={saveActiveNote}
                    placeholder="Note title..."
                    className="w-full bg-transparent border-none outline-none text-sm font-bold text-white focus:ring-0 placeholder-gray-500"
                  />
                )}
              </div>

              {/* Action buttons */}
              <div className="flex gap-1.5 items-center">
                {isActiveShared ? (
                  <>
                    <button onClick={copyToClipboard} title="Copy Markdown"
                      className="px-2.5 py-1 border border-[#333] rounded-md bg-transparent text-gray-300 cursor-pointer text-xs flex items-center gap-1 hover:text-white">
                      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />} {copied ? "Copied" : "Copy"}
                    </button>
                    <button onClick={downloadNote} title="Download Markdown"
                      className="px-2.5 py-1 border border-[#333] rounded-md bg-transparent text-gray-300 cursor-pointer text-xs flex items-center gap-1 hover:text-white">
                      <Download size={12} /> Save
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => activePrivate && togglePin(activePrivate.id)} title={activePrivate?.pinned ? "Unpin Note" : "Pin Note"} className="bg-transparent border-none p-1.5 cursor-pointer rounded hover:bg-white/10">
                      {activePrivate?.pinned ? <PinOff size={14} className="text-amber-400" /> : <Pin size={14} className="text-gray-500 hover:text-white" />}
                    </button>
                    <button onClick={downloadNote} title="Download Markdown"
                      className="p-1.5 border border-[#333] rounded-md bg-transparent text-gray-400 cursor-pointer hover:text-white">
                      <Download size={13} />
                    </button>
                    {(isTeacher || activePrivate?.published) && activePrivate && (
                      <button onClick={() => togglePublish(activePrivate.id)} title="Publish to classroom"
                        className={`px-2.5 py-1 border rounded-md text-xs flex items-center gap-1 cursor-pointer transition-colors ${
                          activePrivate.published ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "border-[#333] bg-transparent text-gray-400 hover:text-white"
                        }`}>
                        <Send size={12} /> {activePrivate.published ? "Shared" : "Share"}
                      </button>
                    )}
                    <button onClick={() => activePrivate && deleteNote(activePrivate.id)} title="Delete Note"
                      className="p-1.5 border border-[#333] rounded-md bg-transparent text-red-400 cursor-pointer hover:bg-red-500/20">
                      <Trash2 size={13} />
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* WYSIWYG Content Area - 100% height */}
            <div 
              className="flex-1 flex flex-col h-full min-h-0 overflow-hidden relative cursor-text" 
              style={{ backgroundColor: activeColor.bg }}
              onClick={() => {
                if (editorRef.current && !isActiveShared) {
                  editorRef.current.focus();
                }
              }}
            >
              <div
                ref={editorRef}
                contentEditable={!isActiveShared}
                suppressContentEditableWarning
                onInput={handleEditorInput}
                onKeyUp={updateActiveFormats}
                onMouseUp={updateActiveFormats}
                onPaste={handlePaste}
                onBlur={saveActiveNote}
                data-placeholder="Start typing your notes here..."
                data-empty={!editContent || editContent === "<br>" || editContent === "<div><br></div>" ? "true" : undefined}
                className="rich-editor w-full flex-1 h-full min-h-0 outline-none text-gray-200 text-sm leading-relaxed p-6 overflow-y-auto box-border select-text font-sans"
                style={{ color: activeColor.accent }}
              />
            </div>

            {/* Status bar */}
            <div className="px-4 py-1.5 border-t border-[#222222] text-[10px] text-gray-500 flex justify-between shrink-0 select-none" style={{ backgroundColor: activeColor.bg }}>
              <div className="flex items-center gap-2">
                <span>{isActiveShared ? "Shared Classroom Note (Read Only)" : saving ? "Saving..." : "Saved"} · Rich Text</span>
              </div>
              <div className="flex items-center gap-2">
                <span>{editContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length} words</span>
                <span>·</span>
                <span>{editContent.replace(/<[^>]*>/g, "").length} chars</span>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center flex-col gap-3 text-gray-500">
            <BookOpen size={40} className="opacity-25" />
            <p className="text-xs">No note selected</p>
            <button 
              onClick={createNote}
              className="px-5 py-2 bg-white border-none rounded-lg text-black cursor-pointer text-xs font-bold hover:bg-gray-200 transition-colors shadow-md"
            >
              + Create Note
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Image Upload Modal */}
    {showImageModal && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-ct-dark-black border border-white/20 rounded-xl p-6 w-full max-w-md">
          <h3 className="font-bold text-white mb-4 text-sm">Insert Image</h3>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full mb-4 p-3 bg-[#111] border border-[#333] rounded-lg text-white text-xs cursor-pointer"
          />
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-2">Or paste image URL</label>
            <input
              type="url"
              value={imageUrlInput}
              onChange={(e) => setImageUrlInput(e.target.value)}
              placeholder="https://example.com/image.png"
              className="w-full p-2.5 bg-[#111] border border-[#333] rounded-lg text-white outline-none focus:border-white/50 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => {
              if (imageUrlInput) {
                applyFormat("image", imageUrlInput);
                setShowImageModal(false);
                setImageUrlInput("");
              }
            }} className="flex-1 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 text-xs cursor-pointer">Insert</button>
            <button onClick={() => { setShowImageModal(false); setImageUrlInput(""); }} className="flex-1 py-2 border border-[#333] text-gray-400 rounded-lg hover:bg-white/5 text-xs cursor-pointer">Cancel</button>
          </div>
        </div>
      </div>
    )}

    {/* Link Insert Modal */}
    {showLinkModal && (
      <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
        <div className="bg-ct-dark-black border border-white/20 rounded-xl p-6 w-full max-w-md">
          <h3 className="font-bold text-white mb-4 text-sm">Insert Link</h3>
          <div className="mb-4">
            <label className="text-xs text-gray-400 block mb-1.5">URL</label>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://example.com"
              className="w-full p-2.5 bg-[#111] border border-[#333] rounded-lg text-white outline-none focus:border-white/50 text-xs"
            />
          </div>
          <div className="flex gap-2">
            <button onClick={handleLinkInsert} className="flex-1 py-2 bg-white text-black font-bold rounded-lg hover:bg-gray-200 text-xs cursor-pointer">Insert Link</button>
            <button onClick={() => { setShowLinkModal(false); setLinkUrl(""); setLinkText(""); }} className="flex-1 py-2 border border-[#333] text-gray-400 rounded-lg hover:bg-white/5 text-xs cursor-pointer">Cancel</button>
          </div>
        </div>
      </div>
    )}
    </>
  );
}
