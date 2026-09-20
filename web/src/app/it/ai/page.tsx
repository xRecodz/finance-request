"use client";

import { FormEvent, useEffect, useState } from "react";
import { Bot, Send } from "lucide-react";
import { api, ApiError } from "@/lib/api";

type Message = { role: "user" | "assistant"; text: string };

export default function ItAiPage() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [provider, setProvider] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { void api<{ data: { configured: boolean; provider: string | null } }>("/api/ai/status").then(result => { setConfigured(result.data.configured); setProvider(result.data.provider); }).catch(() => setConfigured(false)); }, []);
  async function send(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;
    const history = messages.slice(-8);
    setMessages([...messages, { role: "user", text: message }]); setInput(""); setBusy(true); setError("");
    try {
      const result = await api<{ data: { answer: string } }>("/api/ai/chat", { method: "POST", body: JSON.stringify({ message, history }) });
      setMessages(prev => [...prev, { role: "assistant", text: result.data.answer }]);
    } catch (err) { setError(err instanceof ApiError ? err.message : "Gagal menghubungi AI"); }
    finally { setBusy(false); }
  }
  return <div className="mx-auto flex min-h-[70vh] max-w-4xl flex-col gap-4 px-4 py-6 md:px-6">
    <header className="flex items-center gap-3"><div className="rounded-2xl bg-sli-red-soft p-3 text-sli-red"><Bot size={26}/></div><div><h1 className="text-2xl font-bold text-sli-ink">Asisten AI Portal IT</h1><p className="text-sm text-sli-muted">Bantuan analisis pengajuan dan panduan pengaturan. Perubahan data dilakukan lewat menu Portal IT.</p></div></header>
    {configured === false && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">AI belum terhubung. Administrator server dapat mengisi AI_PROVIDER, AI_MODEL, AI_API_KEY, dan AI_API_URL bila memakai 9Router pada berkas .env.</div>}
    {configured && <p className="text-xs text-sli-muted">Terhubung ke {provider === "gemini" ? "Gemini" : "9Router"}. Ringkasan jumlah user dan antrean diberikan sebagai konteks; AI tidak mengubah data.</p>}
    <div className="panel min-h-[320px] flex-1 space-y-4 overflow-y-auto rounded-2xl p-4 md:p-6" aria-live="polite">{messages.length === 0 && <p className="text-sm text-sli-muted">Contoh: “Mengapa pengajuan divisi Operasional belum masuk antrean manager?”</p>}{messages.map((item, index) => <div key={index} className={`max-w-[90%] whitespace-pre-wrap rounded-2xl p-3 text-sm ${item.role === "user" ? "ml-auto bg-sli-red text-white" : "bg-slate-100 text-sli-ink"}`}>{item.text}</div>)}{busy && <p className="text-sm text-sli-muted">AI sedang menjawab...</p>}</div>
    {error && <p className="rounded-xl bg-sli-red-soft p-3 text-sm text-sli-red">{error}</p>}
    <form className="flex gap-2" onSubmit={send}><input className="input flex-1" value={input} onChange={event => setInput(event.target.value)} placeholder="Tulis pertanyaan untuk asisten..." maxLength={3000} disabled={!configured || busy} aria-label="Pesan untuk asisten AI" /><button type="submit" className="btn-primary flex items-center gap-2 rounded-xl px-4" disabled={!configured || busy || !input.trim()}><Send size={16}/><span className="hidden sm:inline">Kirim</span></button></form>
  </div>;
}
