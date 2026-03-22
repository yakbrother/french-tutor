import { useState, useRef, useEffect } from "react";

const LEVELS = ["A2", "B1", "B1+", "B2"];

const MODE_CONFIG = {
  grammar: {
    label: "Grammaire",
    icon: "⚙️",
    color: "#c8a96e",
    description: "Conjugation, tenses, agreements",
    systemPrompt: (level) => `You are a French grammar tutor helping an English-speaking adult reach ${level} level.
Your student knows basic French (A2) and is progressing toward B2. They are learning French partly for citizenship purposes.

Teach strictly standard mainland French (français standard). Do not reference or introduce regional variants.

Give grammar exercises appropriate for ${level}: conjugations, subjunctive, conditional, agreements, relative pronouns, etc.
When the student answers:
- Correct errors clearly, show the correct form
- Give a 1-sentence rule explanation in English
- Encourage with brief, warm feedback
- End each correction with a new exercise at the same or slightly harder level

Format corrections like:
❌ [what they wrote]
✅ [correct version]
📌 Règle: [brief explanation]

Then give the next exercise. Keep exercises short (1-2 sentences). Be warm but precise.`,
  },
  conversation: {
    label: "Conversation",
    icon: "💬",
    color: "#7eb8a4",
    description: "Dialogue, expression, fluency",
    systemPrompt: (level) => `You are a French conversation partner helping an English-speaking adult reach ${level} level.
Your student has A2 French and is building toward B2.

Speak and teach strictly standard mainland French (français standard). No regional variants.

Hold natural conversations appropriate for ${level}. Topics: daily life, travel, culture, cinema, food, current events, etc.
When they write in French:
- Respond naturally IN FRENCH first (a sentence or two)
- Then add a small "Coach note" in English at the bottom noting 1-2 things they did well and 1-2 improvements
- Occasionally introduce new vocabulary or idioms appropriate to their level
- If they write in English, gently redirect them to try in French

Keep the conversation warm, interesting, and progressing.`,
  },
  spelling: {
    label: "Orthographe",
    icon: "✍️",
    color: "#a47eb8",
    description: "Dictée, spelling, accents",
    systemPrompt: (level) => `You are a French spelling and dictation tutor helping a student reach ${level} level.
Your student is an English speaker at A2 progressing to B2. They struggle with accents, agreements, homophones, and spelling conventions.

Teach strictly standard mainland French (français standard). No regional variants.

Run dictation exercises (dictée) appropriate for ${level}:
- Give them a sentence to write from memory/hearing description (describe it in English, they write it in French)
- Or give them a French sentence with errors to correct
- Or give a fill-in-the-blank for accent marks or agreement

When they submit:
- Mark each error with ❌ and show the correction with ✅
- Explain the accent rule or spelling convention briefly
- Give a score like "4/5 ✨"
- Then give the next exercise

Be precise about accents (é, è, ê, ë, à, â, ô, û, ù, î, ï, ç). These matter for language certification exams. Be encouraging but thorough.`,
  },
};

const WELCOME_MESSAGES = {
  grammar: "Bonjour ! Let's work on your grammar. I'll give you an exercise — just answer in French and I'll correct and explain. Ready? Here's your first exercise:\n\n**Conjuguez au présent :** « Vous ___ (être) en retard aujourd'hui. »",
  conversation: "Bonjour ! I'm your conversation partner. Let's chat in French — don't worry about mistakes, that's how we learn. 😊\n\nTo start: **Comment s'est passée votre semaine ?** (How was your week?) — répondez en français !",
  spelling: "Bonjour ! Time for some orthographe practice. I'll describe a sentence and you write it in French — accents and all.\n\n**Exercice 1 :** Write this in French: *\"The little girl is eating a green apple in the garden.\"*\n\n(Think about agreements and the accent on *à* vs *a*!)",
};

export default function FrenchTutor() {
  const [mode, setMode] = useState(null);
  const [level, setLevel] = useState("B1");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sessionStats, setSessionStats] = useState({ exchanges: 0, corrections: 0 });
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startMode = (m) => {
    setMode(m);
    setError(null);
    setMessages([{ role: "assistant", content: WELCOME_MESSAGES[m] }]);
    setSessionStats({ exchanges: 0, corrections: 0 });
    setTimeout(() => textareaRef.current?.focus(), 100);
  };

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setError(null);

    const config = MODE_CONFIG[mode];
    const apiMessages = newMessages.map((m) => ({ role: m.role, content: m.content }));

    try {
      const res = await fetch("/.netlify/functions/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system: config.systemPrompt(level),
          messages: apiMessages,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || `Server error ${res.status}`);
      }

      const reply = data.content?.[0]?.text || "Désolé, une erreur s'est produite.";
      setMessages((prev) => [...prev, { role: "assistant", content: reply }]);
      const hasCorrection = reply.includes("❌") || reply.includes("✅");
      setSessionStats((s) => ({
        exchanges: s.exchanges + 1,
        corrections: s.corrections + (hasCorrection ? 1 : 0),
      }));
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const insertChar = (char) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart;
    const end = el.selectionEnd;
    const newVal = input.slice(0, start) + char + input.slice(end);
    setInput(newVal);
    setTimeout(() => {
      el.setSelectionRange(start + char.length, start + char.length);
      el.focus();
    }, 0);
  };

  const SPECIAL_CHARS = ["é", "è", "ê", "à", "â", "ô", "û", "ù", "î", "ï", "ç", "É", "œ", "«", "»"];

  const renderMessage = (msg, i) => {
    const isUser = msg.role === "user";
    return (
      <div key={i} style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "14px",
        animation: "fadeUp 0.3s ease",
      }}>
        {!isUser && (
          <div style={{
            width: 32, height: 32, borderRadius: "50%",
            background: MODE_CONFIG[mode]?.color || "#c8a96e",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, marginRight: 10, flexShrink: 0, marginTop: 2,
          }}>
            {MODE_CONFIG[mode]?.icon}
          </div>
        )}
        <div style={{
          maxWidth: "75%",
          background: isUser ? "rgba(200,169,110,0.15)" : "rgba(255,255,255,0.05)",
          border: isUser ? "1px solid rgba(200,169,110,0.3)" : "1px solid rgba(255,255,255,0.08)",
          borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "12px 16px",
          fontSize: 14,
          lineHeight: 1.6,
          color: "#e8e0d0",
          whiteSpace: "pre-wrap",
        }}>
          {formatContent(msg.content)}
        </div>
      </div>
    );
  };

  const formatContent = (text) => {
    return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return <strong key={i} style={{ color: "#f0d080" }}>{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  if (!mode) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#0f0e0c",
        backgroundImage: "radial-gradient(ellipse at 20% 50%, rgba(40,30,15,0.8) 0%, transparent 60%), radial-gradient(ellipse at 80% 20%, rgba(15,25,30,0.6) 0%, transparent 50%)",
        fontFamily: "'Georgia', 'Times New Roman', serif",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        padding: "40px 20px",
        color: "#e8e0d0",
      }}>
        <style>{`
          @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
          .mode-card:hover { transform: translateY(-3px); border-color: rgba(255,255,255,0.2) !important; }
          .mode-card { transition: transform 0.2s, border-color 0.2s; cursor: pointer; }
        `}</style>

        <div style={{ textAlign: "center", marginBottom: 48, animation: "fadeUp 0.6s ease" }}>
          <div style={{ fontSize: 13, letterSpacing: "0.3em", color: "#8a7a5a", textTransform: "uppercase", marginBottom: 12 }}>
            Ton professeur particulier
          </div>
          <h1 style={{ fontSize: "clamp(36px, 6vw, 64px)", fontWeight: 400, margin: "0 0 8px", letterSpacing: "-0.02em", color: "#f5edd8" }}>
            Le Français
          </h1>
          <div style={{ fontSize: 15, color: "#7a8a7a", fontStyle: "italic" }}>A2 → B2 · Grammar · Conversation · Orthographe</div>
        </div>

        <div style={{ display: "flex", gap: 16, marginBottom: 40, flexWrap: "wrap", justifyContent: "center", animation: "fadeUp 0.6s ease 0.1s both" }}>
          <div style={{ fontSize: 13, color: "#7a7060", marginRight: 8, alignSelf: "center" }}>Niveau cible :</div>
          {LEVELS.map((l) => (
            <button key={l} onClick={() => setLevel(l)} style={{
              padding: "8px 20px", border: "1px solid",
              borderColor: level === l ? "#c8a96e" : "rgba(255,255,255,0.1)",
              background: level === l ? "rgba(200,169,110,0.15)" : "transparent",
              color: level === l ? "#c8a96e" : "#8a8070",
              borderRadius: 20, cursor: "pointer", fontSize: 13, letterSpacing: "0.05em",
              transition: "all 0.2s",
            }}>
              {l}
            </button>
          ))}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20, maxWidth: 800, width: "100%", animation: "fadeUp 0.6s ease 0.2s both" }}>
          {Object.entries(MODE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="mode-card" onClick={() => startMode(key)} style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "28px 24px",
              display: "flex", flexDirection: "column", gap: 12,
            }}>
              <div style={{ fontSize: 32 }}>{cfg.icon}</div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 400, color: cfg.color, marginBottom: 4 }}>{cfg.label}</div>
                <div style={{ fontSize: 13, color: "#7a7060", lineHeight: 1.5 }}>{cfg.description}</div>
              </div>
              <div style={{ marginTop: "auto", fontSize: 12, color: "#5a5040", letterSpacing: "0.05em" }}>
                Niveau : {level} →
              </div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 48, fontSize: 12, color: "#4a4030", animation: "fadeUp 0.6s ease 0.4s both" }}>
          Shift+Enter for new line · Enter to send
        </div>
      </div>
    );
  }

  const cfg = MODE_CONFIG[mode];

  return (
    <div style={{
      height: "100vh", display: "flex", flexDirection: "column",
      background: "#0f0e0c",
      fontFamily: "'Georgia', 'Times New Roman', serif",
      color: "#e8e0d0",
    }}>
      <style>{`
        @keyframes fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pulse { 0%,100%{opacity:0.4} 50%{opacity:1} }
        textarea:focus { outline: none; }
        textarea { resize: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }
        .char-btn:hover { background: rgba(255,255,255,0.12) !important; }
        .send-btn:hover { opacity: 0.85; }
      `}</style>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        background: "rgba(0,0,0,0.3)",
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button onClick={() => setMode(null)} style={{
            background: "none", border: "1px solid rgba(255,255,255,0.1)",
            color: "#7a7060", cursor: "pointer", borderRadius: 8, padding: "4px 10px", fontSize: 12,
          }}>← Retour</button>
          <div style={{ fontSize: 18, color: cfg.color }}>{cfg.icon} {cfg.label}</div>
          <div style={{
            fontSize: 11, padding: "2px 8px", borderRadius: 10,
            background: "rgba(200,169,110,0.1)", color: "#c8a96e", letterSpacing: "0.05em",
          }}>{level}</div>
        </div>
        <div style={{ display: "flex", gap: 16, fontSize: 12, color: "#5a5040" }}>
          <span>💬 {sessionStats.exchanges} échanges</span>
          {mode !== "conversation" && <span>📝 {sessionStats.corrections} corrections</span>}
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: "auto",
        padding: "20px 20px 10px",
        maxWidth: 760, width: "100%", margin: "0 auto", alignSelf: "stretch",
        boxSizing: "border-box",
      }}>
        {messages.map(renderMessage)}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 0", color: "#5a5040" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: cfg.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>{cfg.icon}</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.color, animation: `pulse 1.2s ease ${i*0.2}s infinite` }} />)}
            </div>
          </div>
        )}
        {error && (
          <div style={{
            margin: "8px 0", padding: "10px 14px", borderRadius: 10,
            background: "rgba(180,60,60,0.15)", border: "1px solid rgba(180,60,60,0.3)",
            color: "#e08080", fontSize: 13,
          }}>
            ⚠️ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div style={{
        maxWidth: 760, width: "100%", margin: "0 auto", padding: "0 20px",
        display: "flex", gap: 6, flexWrap: "wrap",
      }}>
        {SPECIAL_CHARS.map((c) => (
          <button key={c} className="char-btn" onClick={() => insertChar(c)} style={{
            padding: "4px 9px", background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#a09080", borderRadius: 6, cursor: "pointer",
            fontSize: 14, fontFamily: "inherit", transition: "background 0.15s",
          }}>{c}</button>
        ))}
      </div>

      <div style={{
        padding: "12px 20px 20px",
        maxWidth: 760, width: "100%", margin: "0 auto", boxSizing: "border-box",
      }}>
        <div style={{
          display: "flex", gap: 10, alignItems: "flex-end",
          background: "rgba(255,255,255,0.04)",
          border: "1px solid rgba(255,255,255,0.1)",
          borderRadius: 14, padding: "10px 12px",
        }}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Écrivez en français ici… (Enter pour envoyer)"
            rows={2}
            style={{
              flex: 1, background: "none", border: "none",
              color: "#e8e0d0", fontSize: 14, lineHeight: 1.6,
              fontFamily: "inherit", maxHeight: 120, overflowY: "auto",
            }}
          />
          <button className="send-btn" onClick={sendMessage} disabled={loading || !input.trim()} style={{
            width: 38, height: 38, borderRadius: 10, flexShrink: 0,
            background: input.trim() ? cfg.color : "rgba(255,255,255,0.05)",
            border: "none", cursor: input.trim() ? "pointer" : "default",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, transition: "background 0.2s, opacity 0.2s",
            color: "#0f0e0c",
          }}>→</button>
        </div>
        <div style={{ textAlign: "center", fontSize: 11, color: "#3a3020", marginTop: 6 }}>
          Shift+Enter pour une nouvelle ligne
        </div>
      </div>
    </div>
  );
}
