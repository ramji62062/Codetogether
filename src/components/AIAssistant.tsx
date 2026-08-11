"use client";

import { useState, useRef, useEffect } from "react";
import { Send, User, Zap, Code2, Lightbulb, Bug, StopCircle, Trash2, Paperclip, X, Check, Copy, FileCode, CheckCircle2 } from "lucide-react";
import type { FileItem } from "@/components/FileExplorer";

type Message = { role: "user" | "assistant"; content: string; ts: number };

type AttachmentPreview = {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  kind: "image" | "video" | "file";
};

const QUICK = [
  { icon: <Bug size={12}/>, label: "Find bugs", prompt: "Review this code and find all bugs across the project:" },
  { icon: <Lightbulb size={12}/>, label: "Explain project", prompt: "Explain what this full project does step by step:" },
  { icon: <Zap size={12}/>, label: "Optimize", prompt: "Optimize this code for better performance and readability:" },
  { icon: <Code2 size={12}/>, label: "Refactor", prompt: "Refactor and improve the architecture of this codebase:" },
];

const TEXT_FILE_EXTENSIONS = new Set([".txt", ".md", ".json", ".yaml", ".yml", ".js", ".jsx", ".ts", ".tsx", ".py", ".java", ".cpp", ".c", ".cs", ".go", ".rs", ".php", ".rb", ".html", ".css", ".scss", ".sql", ".sh", ".bash", ".env", ".ini", ".toml"]);

function getFileExtension(name: string) {
  const lower = name.toLowerCase();
  const dot = lower.lastIndexOf(".");
  return dot >= 0 ? lower.slice(dot) : "";
}

function isTextFile(attachment: AttachmentPreview) {
  if (attachment.type.startsWith("text/") || attachment.type.includes("json") || attachment.type.includes("xml") || attachment.type.includes("javascript") || attachment.type.includes("typescript")) {
    return true;
  }
  return TEXT_FILE_EXTENSIONS.has(getFileExtension(attachment.name));
}

function decodeDataUrl(dataUrl: string) {
  const [, payload] = dataUrl.split(",");
  if (!payload) return "";
  const normalized = payload.replace(/\s/g, "");
  return typeof window !== "undefined" ? window.atob(normalized) : Buffer.from(normalized, "base64").toString("binary");
}

function buildAttachmentInsights(attachments: AttachmentPreview[]) {
  if (!attachments.length) return "";

  return attachments.map((attachment) => {
    if (attachment.kind === "image") {
      return `Image attachment: ${attachment.name} (${attachment.type || "image"}). Describe what is shown and explain it clearly.`;
    }

    if (isTextFile(attachment)) {
      try {
        const text = decodeDataUrl(attachment.dataUrl);
        const snippet = text.slice(0, 12000);
        return `Attached file: ${attachment.name}\nContent:\n${snippet}`;
      } catch {
        return `Attached file: ${attachment.name} (${attachment.type || "file"}). Read and analyze its contents if possible.`;
      }
    }

    return `Attached file: ${attachment.name} (${attachment.type || "file"}). Analyze it based on the filename and available metadata; if it is a compressed archive or binary, explain what it likely contains and ask for a clearer extraction if needed.`;
  }).join("\n\n");
}

function buildProjectContext(files: FileItem[], activeFileName?: string) {
  if (!files || files.length === 0) return "";
  const codeFiles = files.filter(f => !f.isFolder && f.content);
  if (codeFiles.length === 0) return "";

  let context = "\n\n=== FULL PROJECT FILES & ARCHITECTURE ===\n";
  codeFiles.forEach((file) => {
    const path = file.path || file.name;
    const isActive = path === activeFileName ? " (active editor file)" : "";
    const content = (file.content || "").slice(0, 4000);
    context += `\n--- File: ${path}${isActive} ---\n\`\`\`${file.language || "text"}\n${content}\n\`\`\`\n`;
  });
  context += "=== END OF PROJECT FILES ===\n";
  return context;
}

// Mini Robot SVG Logo
function RobotIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="12" y1="2" x2="12" y2="5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round"/>
      <circle cx="12" cy="1.5" r="1" fill="#fff"/>
      <rect x="5" y="5" width="14" height="10" rx="3" fill="#fff" fillOpacity="0.95"/>
      <circle cx="9" cy="10" r="1.8" fill="#7C3AED"/>
      <circle cx="15" cy="10" r="1.8" fill="#7C3AED"/>
      <circle cx="9.6" cy="9.4" r="0.6" fill="#fff"/>
      <circle cx="15.6" cy="9.4" r="0.6" fill="#fff"/>
      <rect x="9" y="12.5" width="6" height="1" rx="0.5" fill="#7C3AED" fillOpacity="0.7"/>
      <rect x="7" y="16" width="10" height="6" rx="2" fill="#fff" fillOpacity="0.9"/>
      <rect x="3" y="17" width="3" height="4" rx="1.5" fill="#fff" fillOpacity="0.9"/>
      <rect x="10" y="18" width="4" height="2.5" rx="1" fill="#7C3AED" fillOpacity="0.5"/>
    </svg>
  );
}

function formatMessageTime(ts: number): string {
  return new Date(ts).toLocaleString([], {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseMessagePayload(content: string) {
  try {
    const parsed = JSON.parse(content);
    if (parsed && typeof parsed === "object" && Array.isArray(parsed.attachments)) {
      return {
        text: typeof parsed.text === "string" ? parsed.text : "",
        attachments: parsed.attachments as AttachmentPreview[],
      };
    }
  } catch {
    // fall back to plain text
  }
  return { text: content, attachments: [] as AttachmentPreview[] };
}

interface AIAssistantProps {
  currentCode: string;
  language: string;
  roomId?: string;
  files?: FileItem[];
  activeFileName?: string;
  onApplyCode?: (code: string, fileName?: string) => void;
}

const DEFAULT_WELCOME: Message = {
  role: "assistant",
  content: "👾 Hey! I'm your AI code assistant powered by **Groq**.\n\nI can read your **entire project**, write/apply code directly into your workspace files, debug, and explain architecture.\n\nAsk me anything about your project or request code changes!",
  ts: Date.now()
};

export default function AIAssistant({ currentCode, language, roomId = "default", files = [], activeFileName = "", onApplyCode }: AIAssistantProps) {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window === "undefined") return [DEFAULT_WELCOME];
    try {
      const saved = localStorage.getItem(`codetogether_ai_chat_${roomId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [DEFAULT_WELCOME];
  });

  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [loading, setLoading] = useState(false);
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [abortCtrl, setAbortCtrl] = useState<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Save messages to localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && messages.length > 0) {
      try {
        localStorage.setItem(`codetogether_ai_chat_${roomId}`, JSON.stringify(messages));
      } catch {}
    }
  }, [messages, roomId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input, attachments]);

  const handleFileSelection = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        const dataUrl = reader.result as string;
        const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : "file";
        setAttachments((prev) => [
          ...prev,
          {
            id: `${file.name}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl,
            kind,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });

    event.target.value = "";
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((attachment) => attachment.id !== id));
  };

  const clearChat = () => {
    setMessages([DEFAULT_WELCOME]);
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem(`codetogether_ai_chat_${roomId}`);
      } catch {}
    }
  };

  async function send(text: string) {
    const draftText = text.trim();
    if ((!draftText && attachments.length === 0) || loading) return;
    const userMsg: Message = {
      role: "user",
      content: attachments.length ? JSON.stringify({ text: draftText, attachments: attachments.map((attachment) => ({ ...attachment })) }) : draftText,
      ts: Date.now(),
    };
    const plTs = Date.now() + 1;
    setMessages((p) => [...p, userMsg, { role: "assistant", content: "▋", ts: plTs }]);
    setInput("");
    setAttachments([]);
    setLoading(true);

    const ctrl = new AbortController();
    setAbortCtrl(ctrl);

    const fullProjectCtx = buildProjectContext(files, activeFileName);
    const codeCtx = currentCode ? `\nActive Editor File (${activeFileName || language}):\n\`\`\`${language}\n${currentCode.slice(0, 3000)}\n\`\`\`` : "";
    const history = [...messages.slice(-8).map((m) => ({ role: m.role, content: parseMessagePayload(m.content).text }))];
    const hasImage = attachments.some((attachment) => attachment.kind === "image");
    const model = hasImage ? "llama-3.2-90b-vision-preview" : "llama-3.3-70b-versatile";
    const attachmentContext = buildAttachmentInsights(attachments);
    const userContent = attachments.length
      ? [
          { type: "text", text: `${draftText}\n\n${attachmentContext}`.trim() },
          ...attachments.filter((attachment) => attachment.kind === "image").map((attachment) => ({ type: "image_url", image_url: { url: attachment.dataUrl } })),
        ]
      : draftText;

    try {
      const res = await fetch("/api/ai-assist", {
        method: "POST", signal: ctrl.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          max_tokens: 2500,
          messages: [
            { role: "system", content: `You are an expert full-stack AI coding assistant for CodeTogether. You have full access to read and understand the entire workspace codebase, write code, refactor multi-file projects, and fix bugs. When writing code, output clean code blocks using triple backticks so the user can apply them directly to their workspace files.${codeCtx}${fullProjectCtx}` },
            ...history,
            { role: "user", content: userContent }
          ]
        })
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`API Error ${res.status}: ${errText.slice(0, 200)}`);
      }
      const data = await res.json();
      const reply = data.choices?.[0]?.message?.content || "Sorry, I couldn't generate a response.";
      setMessages((p) => p.map((m) => m.ts === plTs ? { ...m, content: reply } : m));
    } catch (err: any) {
      const msg = err.name === "AbortError" ? "*(stopped)*" : `⚠️ Error: ${err.message?.slice(0, 200) || "Unknown error"}`;
      setMessages((p) => p.map((m) => m.ts === plTs ? { ...m, content: msg } : m));
    } finally { setLoading(false); setAbortCtrl(null); }
  }

  function handleApplyCode(codeSnippet: string, idx: number) {
    if (onApplyCode) {
      onApplyCode(codeSnippet, activeFileName);
      setAppliedIndex(idx);
      setTimeout(() => setAppliedIndex(null), 2500);
    }
  }

  function handleCopyCode(codeSnippet: string, idx: number) {
    navigator.clipboard.writeText(codeSnippet);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function fmt(content: string) {
    const parts = content.split(/(```[\s\S]*?```)/g);
    return parts.map((part, i) => {
      if (part.startsWith("```")) {
        const lines = part.split("\n");
        const lang = lines[0].replace("```", "").trim();
        const codeSnippet = lines.slice(1, -1).join("\n");
        const codeIdx = i;

        return (
          <div key={i} style={{ margin: "10px 0", borderRadius: 8, overflow: "hidden", border: "1px solid #334155", background: "#0d0d0d" }}>
            <div style={{ padding: "6px 12px", background: "#1e293b", fontSize: 11, color: "#cbd5e1", borderBottom: "1px solid #334155", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontFamily: "monospace", color: "#c4b5fd" }}>{lang || language || "code"}</span>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <button
                  onClick={() => handleCopyCode(codeSnippet, codeIdx)}
                  style={{ background: "#0f172a", border: "1px solid #334155", borderRadius: 4, padding: "3px 8px", color: "#e2e8f0", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}
                >
                  {copiedIndex === codeIdx ? <Check size={11} color="#4ade80"/> : <Copy size={11}/>}
                  {copiedIndex === codeIdx ? "Copied" : "Copy"}
                </button>

                {onApplyCode && (
                  <button
                    onClick={() => handleApplyCode(codeSnippet, codeIdx)}
                    style={{ background: appliedIndex === codeIdx ? "#166534" : "#7C3AED", border: "none", borderRadius: 4, padding: "3px 10px", color: "#ffffff", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", gap: 4, fontWeight: 800 }}
                  >
                    {appliedIndex === codeIdx ? <CheckCircle2 size={11}/> : <FileCode size={11}/>}
                    {appliedIndex === codeIdx ? "Applied!" : "Apply to Workspace"}
                  </button>
                )}
              </div>
            </div>
            <pre style={{ margin: 0, padding: "12px", background: "#09090b", overflowX: "auto", fontSize: 12, lineHeight: 1.6, color: "#f8fafc" }}>
              <code>{codeSnippet}</code>
            </pre>
          </div>
        );
      }
      const html = part
        .replace(/\*\*(.*?)\*\*/g, "<strong style='color:#ffffff'>$1</strong>")
        .replace(/`([^`]+)`/g, '<code style="background:#1e293b;padding:2px 6px;border-radius:4px;font-size:12px;color:#c4b5fd;font-family:monospace">$1</code>');
      return <span key={i} dangerouslySetInnerHTML={{ __html: html.replace(/\n/g, "<br/>") }} />;
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#0d0d0d", color: "#f8fafc", fontFamily: "Inter, sans-serif" }}>
      <div style={{ padding: "12px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10, background: "#111827", flexShrink: 0 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: "linear-gradient(135deg,#7C3AED,#5b21b6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 0 12px rgba(124,58,237,0.4)" }}>
          <RobotIcon size={20}/>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>AI Code Assistant</div>
          <div style={{ fontSize: 11, color: "#cbd5e1" }}>Groq · Reading {files.filter(f=>!f.isFolder).length} workspace files</div>
        </div>
        <button onClick={clearChat} title="Clear chat history" style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", padding: 4 }}>
          <Trash2 size={15}/>
        </button>
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "12px 0" }}>
        {messages.map((msg, i) => {
          const { text: messageText, attachments: messageAttachments } = parseMessagePayload(msg.content);
          return (
            <div key={i} style={{ padding: "6px 14px 4px" }}>
              <div style={{ display: "flex", gap: 10, flexDirection: msg.role === "user" ? "row-reverse" : "row", alignItems: "flex-start" }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: msg.role === "user" ? "#7C3AED" : "linear-gradient(135deg,#7C3AED,#5b21b6)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: msg.role === "assistant" ? "0 0 8px rgba(124,58,237,0.3)" : "none" }}>
                  {msg.role === "user" ? <User size={14} color="#fff"/> : <RobotIcon size={15}/>} 
                </div>
                <div style={{ maxWidth: "88%", fontSize: 13, lineHeight: 1.6, padding: "10px 14px", borderRadius: msg.role === "user" ? "14px 4px 14px 14px" : "4px 14px 14px 14px", background: msg.role === "user" ? "#7C3AED33" : "#111827", border: `1px solid ${msg.role === "user" ? "#7C3AED55" : "#1e293b"}`, color: "#ffffff" }}>
                  {msg.content === "▋" ? <span style={{ animation: "blink 1s infinite" }}>▋</span> : (
                    <>
                      {messageAttachments.length > 0 && (
                        <div style={{ display: "grid", gap: 6, marginBottom: 6 }}>
                          {messageAttachments.map((attachment) => (
                            <div key={attachment.id || attachment.name} style={{ border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, overflow: "hidden", background: "rgba(0,0,0,0.18)" }}>
                              {attachment.kind === "image" ? (
                                <img src={attachment.dataUrl} alt={attachment.name} style={{ display: "block", maxWidth: "100%", maxHeight: 180, objectFit: "cover" }} />
                              ) : attachment.kind === "video" ? (
                                <video src={attachment.dataUrl} controls style={{ display: "block", width: "100%", maxHeight: 180, background: "#000" }} />
                              ) : (
                                <div style={{ padding: "8px 10px", display: "flex", alignItems: "center", gap: 8, color: "#c4b5fd" }}>
                                  <span>📎</span>
                                  <span style={{ fontSize: 12 }}>{attachment.name}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      {messageText ? fmt(messageText) : null}
                      <div style={{ fontSize: 10, color: "#94a3b8", marginTop: 8, fontWeight: 500 }}>{formatMessageTime(msg.ts)}</div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef}/>
      </div>

      {!loading && (
        <div style={{ padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid #1e293b", flexShrink: 0 }}>
          {QUICK.map((a) => (
            <button key={a.label} onClick={() => send(a.prompt)}
              style={{ display: "flex", alignItems: "center", gap: 4, padding: "4px 10px", background: "#111827", border: "1px solid #334155", borderRadius: 20, cursor: "pointer", fontSize: 11, color: "#cbd5e1", fontWeight: 600, transition: "all 0.15s" }}
              onMouseOver={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#7C3AED"; (e.currentTarget as HTMLElement).style.color = "#c4b5fd"; }}
              onMouseOut={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "#334155"; (e.currentTarget as HTMLElement).style.color = "#cbd5e1"; }}>
              {a.icon} {a.label}
            </button>
          ))}
        </div>
      )}

      <div style={{ padding: "12px 14px", borderTop: "1px solid #1e293b", background: "#111827", flexShrink: 0 }}>
        {attachments.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {attachments.map((attachment) => (
              <div key={attachment.id} style={{ display: "flex", alignItems: "center", gap: 6, padding: "4px 8px", borderRadius: 999, background: "rgba(124,58,237,0.25)", color: "#d8b4fe", fontSize: 11, fontWeight: 600 }}>
                <span>{attachment.name}</span>
                <button onClick={() => removeAttachment(attachment.id)} style={{ background: "none", border: "none", color: "inherit", cursor: "pointer", padding: 0 }}>
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, alignItems: "flex-end", background: "#0d0d0d", border: "1px solid #334155", borderRadius: 10, padding: "8px 12px" }}>
          <button
            onClick={() => fileInputRef.current?.click()}
            style={{ background: "none", border: "none", color: "#cbd5e1", cursor: "pointer", fontSize: 16, padding: "2px 4px", lineHeight: 1 }}
            title="Attach image, video or file"
          >
            <Paperclip size={16} />
          </button>
          <input ref={fileInputRef} type="file" multiple accept="image/*,video/*,.pdf,.txt,.doc,.docx,.zip" onChange={handleFileSelection} style={{ display: "none" }} />
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }}
            placeholder="Ask about your project... (Enter to send)"
            rows={1}
            style={{ flex: 1, background: "transparent", border: "none", outline: "none", color: "#f8fafc", fontSize: 13, resize: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto", fontFamily: "inherit", fontWeight: 500 }}
          />
          {loading ? (
            <button onClick={() => abortCtrl?.abort()} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: "pointer", background: "#f4474725", color: "#f47", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <StopCircle size={15}/>
            </button>
          ) : (
            <button onClick={() => send(input)} disabled={!input.trim() && attachments.length === 0} style={{ width: 32, height: 32, borderRadius: 8, border: "none", cursor: input.trim() || attachments.length ? "pointer" : "default", background: input.trim() || attachments.length ? "#7C3AED" : "#334155", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, transition: "all 0.15s" }}>
              <Send size={14}/>
            </button>
          )}
        </div>
      </div>

      <style>{`@keyframes blink { 0%,100% { opacity:1 } 50% { opacity:0 } }`}</style>
    </div>
  );
}
