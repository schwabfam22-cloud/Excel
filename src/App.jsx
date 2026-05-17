import { useState, useEffect, useRef, useCallback } from "react";

// ── Helpers ──────────────────────────────────────────────────────────────────
const AUTH_KEY = "docvault_auth";
const DOCS_KEY = "docvault_docs";
const CHAT_KEY = "docvault_chat";
const SIX_MONTHS = 6 * 30 * 24 * 60 * 60 * 1000;

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.loginTime > SIX_MONTHS) { localStorage.removeItem(AUTH_KEY); return null; }
    return parsed;
  } catch { return null; }
}
function saveAuth(user) { localStorage.setItem(AUTH_KEY, JSON.stringify({ ...user, loginTime: Date.now() })); }
function loadDocs() { try { return JSON.parse(localStorage.getItem(DOCS_KEY) || "[]"); } catch { return []; } }
function saveDocs(docs) { localStorage.setItem(DOCS_KEY, JSON.stringify(docs)); }
function loadChat() { try { return JSON.parse(localStorage.getItem(CHAT_KEY) || "[]"); } catch { return []; } }
function saveChat(msgs) { localStorage.setItem(CHAT_KEY, JSON.stringify(msgs)); }

function readFileAsBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}
function readFileAsText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}
function downloadBlob(content, filename, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function downloadAllData(user, docs, chatHistory) {
  const data = { user, docs, chatHistory, exportedAt: new Date().toISOString() };
  downloadBlob(JSON.stringify(data, null, 2), "docvault_backup.json", "application/json");
}

const FILE_ICONS = {
  xlsx: "📊", xls: "📊", csv: "📊",
  docx: "📝", doc: "📝", txt: "📝",
  pdf: "📄",
  pptx: "📊", ppt: "📊",
  png: "🖼️", jpg: "🖼️", jpeg: "🖼️", gif: "🖼️",
  default: "📁"
};
function fileIcon(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  return FILE_ICONS[ext] || FILE_ICONS.default;
}
function isTextFile(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  return ["txt", "csv", "json", "md", "html", "css", "js"].includes(ext);
}
function isImageFile(name) {
  const ext = (name || "").split(".").pop().toLowerCase();
  return ["png", "jpg", "jpeg", "gif", "webp", "svg"].includes(ext);
}

// ── Claude API ────────────────────────────────────────────────────────────────
async function callClaude(messages, systemPrompt) {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: systemPrompt,
      messages
    })
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message);
  return data.content.map(b => b.text || "").join("");
}

// ── SIGN IN PAGE ──────────────────────────────────────────────────────────────
function SignInPage({ onAuth }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [error, setError] = useState("");

  const USERS_KEY = "docvault_users";
  function getUsers() { try { return JSON.parse(localStorage.getItem(USERS_KEY) || "{}"); } catch { return {}; } }

  function handle() {
    setError("");
    if (!email || !pw) { setError("Please fill all fields."); return; }
    const users = getUsers();
    if (mode === "signup") {
      if (!name) { setError("Name required."); return; }
      if (users[email]) { setError("Email already registered."); return; }
      const user = { name, email, createdAt: new Date().toISOString() };
      users[email] = { ...user, pw };
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      saveAuth(user); onAuth(user);
    } else {
      const found = users[email];
      if (!found || found.pw !== pw) { setError("Invalid email or password."); return; }
      const user = { name: found.name, email: found.email, createdAt: found.createdAt };
      saveAuth(user); onAuth(user);
    }
  }

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontFamily: "'Georgia', serif"
    }}>
      <div style={{
        background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 16,
        padding: "48px 40px", width: 400, boxShadow: "0 32px 80px rgba(0,0,0,0.6)"
      }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🗂️</div>
          <h1 style={{ color: "#e8e0d0", fontSize: 26, fontWeight: 700, margin: 0 }}>DocVault</h1>
          <p style={{ color: "#6a6a7a", fontSize: 13, margin: "8px 0 0" }}>Your intelligent document workspace</p>
        </div>

        <div style={{ display: "flex", background: "#0a0a0f", borderRadius: 8, padding: 3, marginBottom: 28 }}>
          {["login", "signup"].map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              flex: 1, padding: "8px 0", border: "none", borderRadius: 6,
              background: mode === m ? "#4f46e5" : "transparent",
              color: mode === m ? "#fff" : "#6a6a7a", cursor: "pointer",
              fontSize: 13, fontWeight: 600, transition: "all .2s"
            }}>{m === "login" ? "Sign In" : "Create Account"}</button>
          ))}
        </div>

        {mode === "signup" && (
          <div style={{ marginBottom: 16 }}>
            <label style={{ color: "#8a8a9a", fontSize: 12, letterSpacing: 1 }}>FULL NAME</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith"
              style={inputStyle} />
          </div>
        )}
        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#8a8a9a", fontSize: 12, letterSpacing: 1 }}>EMAIL</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@email.com"
            style={inputStyle} />
        </div>
        <div style={{ marginBottom: 8 }}>
          <label style={{ color: "#8a8a9a", fontSize: 12, letterSpacing: 1 }}>PASSWORD</label>
          <input type="password" value={pw} onChange={e => setPw(e.target.value)} placeholder="••••••••"
            style={inputStyle} onKeyDown={e => e.key === "Enter" && handle()} />
        </div>

        {error && <p style={{ color: "#f87171", fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <button onClick={handle} style={{
          width: "100%", padding: "13px 0", marginTop: 16,
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)", color: "#fff",
          border: "none", borderRadius: 9, fontSize: 15, fontWeight: 700,
          cursor: "pointer", letterSpacing: 0.5
        }}>{mode === "login" ? "Sign In" : "Create Account"}</button>

        <p style={{ color: "#4a4a5a", fontSize: 11, textAlign: "center", marginTop: 20 }}>
          Sessions last 6 months • All data stored locally
        </p>
      </div>
    </div>
  );
}
const inputStyle = {
  display: "block", width: "100%", marginTop: 6, padding: "11px 14px",
  background: "#0d0d14", border: "1px solid #2a2a3a", borderRadius: 8,
  color: "#e8e0d0", fontSize: 14, outline: "none", boxSizing: "border-box"
};

// ── DOCUMENT VIEWER / EDITOR ──────────────────────────────────────────────────
function DocViewer({ doc, onClose, onSave, highlights }) {
  const [content, setContent] = useState(doc.textContent || "");
  const [saved, setSaved] = useState(false);
  const textRef = useRef(null);

  function handleSave() {
    onSave({ ...doc, textContent: content, updatedAt: new Date().toISOString() });
    setSaved(true); setTimeout(() => setSaved(false), 2000);
  }

  function highlightedHtml() {
    if (!highlights || highlights.length === 0) return content;
    let html = content;
    highlights.forEach(h => {
      html = html.replace(new RegExp(h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        m => `<mark style="background:#fbbf24;color:#000;border-radius:3px;padding:0 2px">${m}</mark>`);
    });
    return html;
  }

  const canEdit = isTextFile(doc.name);
  const canView = isImageFile(doc.name) || canEdit;

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 100,
      display: "flex", alignItems: "center", justifyContent: "center"
    }}>
      <div style={{
        background: "#13131a", border: "1px solid #2a2a3a", borderRadius: 16,
        width: "min(860px,95vw)", maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 100px rgba(0,0,0,0.8)"
      }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "18px 24px", borderBottom: "1px solid #1e1e2e"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>{fileIcon(doc.name)}</span>
            <div>
              <div style={{ color: "#e8e0d0", fontWeight: 700, fontSize: 15 }}>{doc.name}</div>
              <div style={{ color: "#4a4a5a", fontSize: 11 }}>
                Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                {doc.updatedAt && ` · Edited ${new Date(doc.updatedAt).toLocaleDateString()}`}
              </div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            {canEdit && (
              <button onClick={handleSave} style={{
                padding: "7px 16px", background: saved ? "#10b981" : "#4f46e5",
                color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600
              }}>{saved ? "✓ Saved" : "Save"}</button>
            )}
            <button onClick={() => downloadBlob(content || doc.name, doc.name)} style={{
              padding: "7px 14px", background: "#1e1e2e", color: "#e8e0d0",
              border: "1px solid #2a2a3a", borderRadius: 7, cursor: "pointer", fontSize: 13
            }}>⬇ Download</button>
            <button onClick={onClose} style={{
              padding: "7px 12px", background: "#1e1e2e", color: "#6a6a7a",
              border: "1px solid #2a2a3a", borderRadius: 7, cursor: "pointer", fontSize: 13
            }}>✕</button>
          </div>
        </div>

        <div style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {isImageFile(doc.name) ? (
            <img src={doc.dataUrl} alt={doc.name} style={{ maxWidth: "100%", borderRadius: 8 }} />
          ) : canEdit ? (
            highlights && highlights.length > 0 ? (
              <div dangerouslySetInnerHTML={{ __html: highlightedHtml() }}
                style={{
                  background: "#0a0a0f", borderRadius: 8, padding: 20,
                  color: "#d4ccc0", fontFamily: "monospace", fontSize: 13,
                  lineHeight: 1.7, whiteSpace: "pre-wrap", minHeight: 300
                }} />
            ) : (
              <textarea ref={textRef} value={content} onChange={e => setContent(e.target.value)}
                style={{
                  width: "100%", minHeight: 360, background: "#0a0a0f",
                  border: "1px solid #2a2a3a", borderRadius: 8, padding: 20,
                  color: "#d4ccc0", fontFamily: "monospace", fontSize: 13,
                  lineHeight: 1.7, resize: "vertical", outline: "none", boxSizing: "border-box"
                }} />
            )
          ) : (
            <div style={{
              textAlign: "center", color: "#4a4a5a", padding: 60,
              background: "#0a0a0f", borderRadius: 8
            }}>
              <div style={{ fontSize: 48 }}>{fileIcon(doc.name)}</div>
              <div style={{ marginTop: 16, fontSize: 14 }}>
                This file type ({doc.name.split(".").pop()}) cannot be previewed directly.<br />
                Download it to open in the appropriate application.
              </div>
              <button onClick={() => downloadBlob(atob(doc.dataUrl?.split(",")[1] || ""), doc.name)}
                style={{
                  marginTop: 20, padding: "10px 24px", background: "#4f46e5", color: "#fff",
                  border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14
                }}>⬇ Download File</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── DOCUMENTS PAGE ────────────────────────────────────────────────────────────
function DocsPage({ docs, setDocs, user, highlightedDocId, highlightTerms }) {
  const [viewDoc, setViewDoc] = useState(null);
  const [search, setSearch] = useState("");
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  const filtered = docs.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  async function handleFiles(files) {
    const newDocs = [];
    for (const file of files) {
      const dataUrl = await readFileAsBase64(file);
      let textContent = "";
      if (isTextFile(file.name)) textContent = await readFileAsText(file);
      newDocs.push({
        id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        name: file.name, size: file.size, type: file.type,
        uploadedAt: new Date().toISOString(), dataUrl, textContent
      });
    }
    const updated = [...docs, ...newDocs];
    setDocs(updated); saveDocs(updated);
  }

  function deleteDoc(id) {
    const updated = docs.filter(d => d.id !== id);
    setDocs(updated); saveDocs(updated);
  }

  function saveDoc(updated) {
    const newDocs = docs.map(d => d.id === updated.id ? updated : d);
    setDocs(newDocs); saveDocs(newDocs);
    setViewDoc(updated);
  }

  const viewingDoc = viewDoc ? docs.find(d => d.id === viewDoc.id) || viewDoc : null;

  return (
    <div style={{ padding: "32px 40px", flex: 1, overflow: "auto" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h2 style={{ color: "#e8e0d0", margin: 0, fontSize: 24, fontWeight: 700 }}>Documents</h2>
          <p style={{ color: "#4a4a5a", margin: "4px 0 0", fontSize: 13 }}>{docs.length} files stored</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search files…"
            style={{ ...inputStyle, width: 220, marginTop: 0 }} />
          <button onClick={() => fileRef.current.click()} style={{
            padding: "10px 20px", background: "#4f46e5", color: "#fff",
            border: "none", borderRadius: 9, cursor: "pointer", fontWeight: 700, fontSize: 14
          }}>+ Upload</button>
          <input ref={fileRef} type="file" multiple style={{ display: "none" }}
            onChange={e => handleFiles(Array.from(e.target.files))} />
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(Array.from(e.dataTransfer.files)); }}
        style={{
          border: `2px dashed ${dragging ? "#4f46e5" : "#2a2a3a"}`,
          borderRadius: 12, padding: "28px 0", textAlign: "center", marginBottom: 28,
          background: dragging ? "#0d0d20" : "transparent",
          transition: "all .2s", cursor: "pointer"
        }}
        onClick={() => fileRef.current.click()}
      >
        <div style={{ fontSize: 28 }}>📂</div>
        <p style={{ color: "#4a4a5a", margin: "8px 0 0", fontSize: 13 }}>
          Drop files here or click to upload · Excel, Word, PDF, images, and more
        </p>
      </div>

      {/* File Grid */}
      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", color: "#3a3a4a", padding: 60, fontSize: 14 }}>
          No documents yet. Upload your first file above.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
          {filtered.map(doc => (
            <div key={doc.id} onClick={() => setViewDoc(doc)}
              style={{
                background: highlightedDocId === doc.id ? "#1a1a10" : "#13131a",
                border: `1px solid ${highlightedDocId === doc.id ? "#fbbf24" : "#2a2a3a"}`,
                borderRadius: 12, padding: "20px 16px", cursor: "pointer",
                transition: "all .2s", position: "relative",
                boxShadow: highlightedDocId === doc.id ? "0 0 20px rgba(251,191,36,0.2)" : "none"
              }}>
              {highlightedDocId === doc.id && (
                <div style={{
                  position: "absolute", top: 8, right: 8,
                  background: "#fbbf24", color: "#000", fontSize: 9, fontWeight: 800,
                  padding: "2px 6px", borderRadius: 4, letterSpacing: 0.5
                }}>AI FOUND</div>
              )}
              <div style={{ fontSize: 36, marginBottom: 10 }}>{fileIcon(doc.name)}</div>
              <div style={{ color: "#d4ccc0", fontSize: 13, fontWeight: 600, wordBreak: "break-word" }}>{doc.name}</div>
              <div style={{ color: "#4a4a5a", fontSize: 11, marginTop: 6 }}>
                {new Date(doc.uploadedAt).toLocaleDateString()}<br />
                {(doc.size / 1024).toFixed(1)} KB
              </div>
              <button onClick={e => { e.stopPropagation(); deleteDoc(doc.id); }}
                style={{
                  position: "absolute", bottom: 10, right: 10,
                  background: "transparent", border: "none", color: "#3a3a4a",
                  cursor: "pointer", fontSize: 16, padding: 4
                }}>🗑</button>
            </div>
          ))}
        </div>
      )}

      {viewingDoc && (
        <DocViewer
          doc={viewingDoc}
          onClose={() => setViewDoc(null)}
          onSave={saveDoc}
          highlights={highlightedDocId === viewingDoc.id ? highlightTerms : []}
        />
      )}
    </div>
  );
}

// ── AI CHATBOT PAGE ───────────────────────────────────────────────────────────
function ChatPage({ docs, setDocs, user }) {
  const [messages, setMessages] = useState(() => loadChat());
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [highlightTerms, setHighlightTerms] = useState([]);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [viewDoc, setViewDoc] = useState(null);
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  function buildSystemPrompt() {
    const docList = docs.map(d => ({
      id: d.id, name: d.name, uploadedAt: d.uploadedAt,
      textPreview: d.textContent ? d.textContent.slice(0, 3000) : "[binary/non-text file]"
    }));
    return `You are DocVault AI, an intelligent assistant for ${user.name}'s document workspace.

The user has the following documents stored:
${JSON.stringify(docList, null, 2)}

You can help the user by:
1. READING documents to answer questions (quote relevant parts)
2. EDITING text documents (respond with JSON action)
3. CREATING new documents (respond with JSON action)
4. SEARCHING across all documents for specific info
5. ASKING before deleting anything

When you find an answer in a document, always cite which document and what text proves it.
When you edit or create a document, respond with a JSON block like:
<action>{"type":"edit","docId":"...","newContent":"...","highlights":["term1","term2"]}</action>
or
<action>{"type":"create","name":"filename.txt","content":"...","highlights":[]}</action>
or
<action>{"type":"delete_request","docId":"...","docName":"..."}</action>

Outside of action blocks, respond naturally in plain text. Be specific, cite sources.
If highlighting specific terms/phrases that answer the user's question, include them in highlights array.`;
  }

  async function sendMessage() {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs); saveChat(newMsgs);
    setInput(""); setLoading(true);
    setHighlightedDocId(null); setHighlightTerms([]);

    try {
      const history = newMsgs.map(m => ({ role: m.role, content: m.content }));
      const raw = await callClaude(history, buildSystemPrompt());

      // Parse action blocks
      const actionMatch = raw.match(/<action>([\s\S]*?)<\/action>/);
      let displayText = raw.replace(/<action>[\s\S]*?<\/action>/g, "").trim();
      let action = null;
      if (actionMatch) { try { action = JSON.parse(actionMatch[1]); } catch { } }

      if (action) {
        if (action.type === "edit" && action.docId && action.newContent !== undefined) {
          const target = docs.find(d => d.id === action.docId);
          if (target) {
            const updated = { ...target, textContent: action.newContent, updatedAt: new Date().toISOString() };
            const newDocs = docs.map(d => d.id === updated.id ? updated : d);
            setDocs(newDocs); saveDocs(newDocs);
            setHighlightedDocId(action.docId);
            setHighlightTerms(action.highlights || []);
            displayText += `\n\n✅ Edited **${target.name}**`;
            if (action.highlights?.length) {
              displayText += ` and highlighted: ${action.highlights.join(", ")}`;
              setTimeout(() => { setViewDoc(updated); }, 400);
            }
          }
        } else if (action.type === "create") {
          const newDoc = {
            id: `doc_${Date.now()}_${Math.random().toString(36).slice(2)}`,
            name: action.name, size: action.content.length, type: "text/plain",
            uploadedAt: new Date().toISOString(), textContent: action.content, dataUrl: ""
          };
          const newDocs = [...docs, newDoc];
          setDocs(newDocs); saveDocs(newDocs);
          setHighlightedDocId(newDoc.id);
          setHighlightTerms(action.highlights || []);
          displayText += `\n\n✅ Created new document **${action.name}**`;
          setTimeout(() => { setViewDoc(newDoc); }, 400);
        } else if (action.type === "delete_request") {
          setPendingDelete({ id: action.docId, name: action.docName });
          displayText += `\n\n⚠️ I want to delete **${action.docName}**. Please confirm below.`;
        }
      } else if (raw.includes("docId") || raw.includes('"id"')) {
        // Try to detect which doc was referenced
        docs.forEach(d => {
          if (raw.includes(d.id) || raw.toLowerCase().includes(d.name.toLowerCase())) {
            setHighlightedDocId(d.id);
          }
        });
      }

      const assistantMsg = { role: "assistant", content: displayText || raw };
      const finalMsgs = [...newMsgs, assistantMsg];
      setMessages(finalMsgs); saveChat(finalMsgs);
    } catch (err) {
      const errMsg = { role: "assistant", content: `⚠️ Error: ${err.message}` };
      const finalMsgs = [...newMsgs, errMsg];
      setMessages(finalMsgs); saveChat(finalMsgs);
    }
    setLoading(false);
  }

  function confirmDelete(yes) {
    if (yes && pendingDelete) {
      const newDocs = docs.filter(d => d.id !== pendingDelete.id);
      setDocs(newDocs); saveDocs(newDocs);
      const msg = { role: "assistant", content: `🗑️ Deleted **${pendingDelete.name}**.` };
      const updated = [...messages, msg]; setMessages(updated); saveChat(updated);
    } else {
      const msg = { role: "assistant", content: `👍 Kept **${pendingDelete?.name}**. No changes made.` };
      const updated = [...messages, msg]; setMessages(updated); saveChat(updated);
    }
    setPendingDelete(null);
  }

  const suggestions = [
    "How much did I spend overall on this event?",
    "Did John ever end up buying the property on 123 Main Street?",
    "How much do I owe to John Doe?",
    "Summarize all my documents",
    "Create a new document called Meeting Notes.txt"
  ];

  function renderMessage(text) {
    return text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br/>');
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", padding: "0 0 0 0" }}>
      {/* Chat header */}
      <div style={{
        padding: "20px 40px 16px", borderBottom: "1px solid #1e1e2e",
        display: "flex", alignItems: "center", gap: 12
      }}>
        <div style={{
          width: 36, height: 36, borderRadius: "50%",
          background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
          display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18
        }}>🤖</div>
        <div>
          <div style={{ color: "#e8e0d0", fontWeight: 700, fontSize: 16 }}>DocVault AI</div>
          <div style={{ color: "#4a4a5a", fontSize: 12 }}>
            Searches, reads, edits, and creates your documents · {docs.length} files available
          </div>
        </div>
        {highlightedDocId && (
          <div style={{
            marginLeft: "auto", background: "#1a1a10", border: "1px solid #fbbf24",
            borderRadius: 8, padding: "6px 12px", fontSize: 12, color: "#fbbf24"
          }}>
            📎 {docs.find(d => d.id === highlightedDocId)?.name}
            <button onClick={() => setViewDoc(docs.find(d => d.id === highlightedDocId))}
              style={{
                marginLeft: 8, background: "#fbbf24", color: "#000",
                border: "none", borderRadius: 4, padding: "2px 8px",
                cursor: "pointer", fontSize: 11, fontWeight: 700
              }}>View</button>
          </div>
        )}
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: "auto", padding: "24px 40px" }}>
        {messages.length === 0 && (
          <div>
            <p style={{ color: "#4a4a5a", fontSize: 14, marginBottom: 20, textAlign: "center" }}>
              Ask me anything about your documents. I can search, read, edit, create, and answer questions.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => setInput(s)} style={{
                  padding: "8px 14px", background: "#13131a", border: "1px solid #2a2a3a",
                  borderRadius: 20, color: "#8a8a9a", cursor: "pointer", fontSize: 12,
                  transition: "all .2s"
                }}>{s}</button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{
            display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            marginBottom: 16
          }}>
            <div style={{
              maxWidth: "72%", padding: "12px 18px", borderRadius: 14,
              background: m.role === "user"
                ? "linear-gradient(135deg,#4f46e5,#7c3aed)"
                : "#13131a",
              border: m.role === "assistant" ? "1px solid #2a2a3a" : "none",
              color: "#e8e0d0", fontSize: 14, lineHeight: 1.65
            }}
              dangerouslySetInnerHTML={{ __html: renderMessage(m.content) }} />
          </div>
        ))}

        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start", marginBottom: 16 }}>
            <div style={{
              padding: "12px 20px", background: "#13131a", border: "1px solid #2a2a3a",
              borderRadius: 14, color: "#4a4a5a", fontSize: 14
            }}>
              <span style={{ animation: "pulse 1s infinite" }}>Searching your documents</span>
              <span style={{ display: "inline-block", animation: "ellipsis 1.5s infinite" }}>...</span>
            </div>
          </div>
        )}

        {pendingDelete && (
          <div style={{
            background: "#1a0a0a", border: "1px solid #ef4444", borderRadius: 12,
            padding: "16px 20px", marginBottom: 16
          }}>
            <p style={{ color: "#fca5a5", margin: "0 0 12px", fontSize: 14 }}>
              ⚠️ Are you sure you want to permanently delete <strong>{pendingDelete.name}</strong>?
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button onClick={() => confirmDelete(true)} style={{
                padding: "8px 20px", background: "#ef4444", color: "#fff",
                border: "none", borderRadius: 7, cursor: "pointer", fontWeight: 700
              }}>Yes, Delete</button>
              <button onClick={() => confirmDelete(false)} style={{
                padding: "8px 20px", background: "#1e1e2e", color: "#e8e0d0",
                border: "1px solid #2a2a3a", borderRadius: 7, cursor: "pointer"
              }}>No, Keep It</button>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{
        padding: "16px 40px 24px", borderTop: "1px solid #1e1e2e",
        display: "flex", gap: 10
      }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
          placeholder="Ask about your documents, request edits, or create new files…"
          style={{ ...inputStyle, flex: 1, marginTop: 0, fontSize: 14 }}
        />
        <button onClick={sendMessage} disabled={loading || !input.trim()} style={{
          padding: "11px 22px", background: loading ? "#2a2a3a" : "#4f46e5",
          color: loading ? "#4a4a5a" : "#fff", border: "none", borderRadius: 9,
          cursor: loading ? "not-allowed" : "pointer", fontWeight: 700, fontSize: 15,
          transition: "all .2s"
        }}>→</button>
      </div>

      {/* Doc viewer with highlights triggered by AI */}
      {viewDoc && (
        <DocViewer
          doc={viewDoc}
          onClose={() => setViewDoc(null)}
          onSave={updated => {
            const newDocs = docs.map(d => d.id === updated.id ? updated : d);
            setDocs(newDocs); saveDocs(newDocs); setViewDoc(updated);
          }}
          highlights={highlightedDocId === viewDoc.id ? highlightTerms : []}
        />
      )}
      <style>{`@keyframes ellipsis { 0%,100%{content:'...'} 33%{content:'.'} 66%{content:'..'}}`}</style>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(() => loadAuth());
  const [page, setPage] = useState("docs");
  const [docs, setDocs] = useState(() => loadDocs());
  const [highlightedDocId, setHighlightedDocId] = useState(null);
  const [highlightTerms, setHighlightTerms] = useState([]);

  if (!user) return <SignInPage onAuth={u => { setUser(u); }} />;

  function signOut() {
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
  }

  const initials = user.name?.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "U";

  return (
    <div style={{
      minHeight: "100vh", background: "#0a0a0f",
      fontFamily: "'Georgia', serif", display: "flex", flexDirection: "column"
    }}>
      {/* Top nav */}
      <nav style={{
        background: "#0d0d14", borderBottom: "1px solid #1e1e2e",
        display: "flex", alignItems: "center", padding: "0 32px", height: 60
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 40 }}>
          <span style={{ fontSize: 22 }}>🗂️</span>
          <span style={{ color: "#e8e0d0", fontWeight: 800, fontSize: 18, letterSpacing: -0.5 }}>DocVault</span>
        </div>

        <div style={{ display: "flex", gap: 4 }}>
          {[["docs", "📄 Documents"], ["chat", "🤖 AI Assistant"]].map(([id, label]) => (
            <button key={id} onClick={() => setPage(id)} style={{
              padding: "8px 16px", background: page === id ? "#1e1e2e" : "transparent",
              color: page === id ? "#e8e0d0" : "#4a4a5a",
              border: page === id ? "1px solid #2a2a3a" : "1px solid transparent",
              borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, transition: "all .2s"
            }}>{label}</button>
          ))}
        </div>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => downloadAllData(user, docs, loadChat())} style={{
            padding: "7px 14px", background: "#13131a", color: "#8a8a9a",
            border: "1px solid #2a2a3a", borderRadius: 7, cursor: "pointer", fontSize: 12
          }}>⬇ Export All Data</button>
          <div style={{
            width: 34, height: 34, borderRadius: "50%",
            background: "linear-gradient(135deg,#4f46e5,#7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontSize: 13, fontWeight: 800
          }}>{initials}</div>
          <div>
            <div style={{ color: "#d4ccc0", fontSize: 13, fontWeight: 600 }}>{user.name}</div>
            <button onClick={signOut} style={{
              background: "none", border: "none", color: "#4a4a5a",
              cursor: "pointer", fontSize: 11, padding: 0
            }}>Sign out</button>
          </div>
        </div>
      </nav>

      {/* Page content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        {page === "docs" ? (
          <DocsPage
            docs={docs} setDocs={setDocs} user={user}
            highlightedDocId={highlightedDocId} highlightTerms={highlightTerms}
          />
        ) : (
          <ChatPage docs={docs} setDocs={setDocs} user={user} />
        )}
      </div>
    </div>
  );
}
