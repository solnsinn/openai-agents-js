export default function AgentConsole() { return null; }

const Input: React.FC<{ placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; }> = ({ placeholder, value, onChange, className = '', onKeyDown }) => (
  <input type="text" placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 ${className}`} />
);

// Simple emoji icons
const Bot = () => <span>🤖</span>;
const Settings = () => <span>⚙️</span>;
const Play = () => <span>▶️</span>;
const Pause = () => <span>⏸️</span>;
const Send = () => <span>📤</span>;
const Plus = () => <span>➕</span>;
const MessageSquare = () => <span>💬</span>;
const ArrowRightLeft = () => <span>↔️</span>;
const Loader2 = () => <span>⏳</span>;

// Data models
interface AgentInfo { id: string; name: string; model: string; status: 'Idle' | 'Running' | 'Paused'; color: string; tasksToday: number }
interface ChatMessage { role: 'user' | 'agent'; text: string }
interface Handoff { id: number; from: string; to: string; reason: string; time: string }

const initialAgents: AgentInfo[] = [
  { id: 'a1', name: 'Support Agent', model: 'gpt-4o-mini', status: 'Idle',  color: 'bg-emerald-100 text-emerald-700', tasksToday: 18 },
  { id: 'a2', name: 'Sales Agent',   model: 'gpt-4o-mini', status: 'Running', color: 'bg-blue-100 text-blue-700',     tasksToday: 32 },
  { id: 'a3', name: 'CRM Agent',     model: 'gpt-4o-mini', status: 'Paused',  color: 'bg-amber-100 text-amber-800',    tasksToday: 9 },
];
const seedMessages: ChatMessage[] = [
  { role: 'user',  text: 'مرحبا، اريد متابعة طلبي #1542' },
  { role: 'agent', text: 'أكيد! سأتأكد من الحالة عبر CRM وأعود لك.' },
];

export default function AgentConsole() {
  const [agents, setAgents] = useState(initialAgents);
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [handoffLog, setHandoffLog] = useState<Handoff[]>([]);

  // Initialize / fetch persisted history
  useEffect(() => {
    let sid = localStorage.getItem('agent-console-session-id');
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('agent-console-session-id', sid); }
    setSessionId(sid);
    (async () => {
      try {
        const resp = await fetch(`/api/history?sessionId=${encodeURIComponent(sid!)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data?.messages)) setMessages(data.messages);
        }
      } catch { /* ignore */ }
    })();
  }, []);

  function toggleAgent(id: string, to: 'Running' | 'Paused') {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: to } : a));
  }

  async function sendMessage() {
    if (!draft.trim()) return;
    const text = draft;
    setDraft('');
    setSending(true);
    setMessages(m => [...m, { role: 'user', text }]);
    try {
      const resp = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Request failed');
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else if (data.reply) {
        setMessages(m => [...m, { role: 'agent', text: data.reply }]);
      }
      if (Array.isArray(data.handoffs) && data.handoffs.length) {
        const last = data.handoffs[data.handoffs.length - 1];
        setHandoffLog(prev => [...prev, { id: Date.now(), from: last.from || 'Unknown', to: last.to || 'Unknown', reason: last.reason || 'Agent handoff', time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` }]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    if (!sessionId) return;
    try { await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); }
    finally { setMessages([]); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot />
            <span className="font-semibold">Agent Console</span>
            <Badge variant="secondary" className="ml-2 bg-emerald-900/40 text-emerald-300">Beta</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" className="bg-neutral-900 border border-neutral-800"><Settings /> Settings</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500"><Plus /> جديد</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 grid md:grid-cols-3 gap-4">
        <section className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الوكلاء</CardTitle>
              <CardDescription>تحكم بحالة الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {agents.map(a => (
                  <div key={a.id} className="rounded-xl border border-neutral-800 p-3 space-y-2 bg-neutral-950/40">
                    <div className="flex items-center justify-between"><span className="font-medium truncate">{a.name}</span><Badge className={a.color}>{a.status}</Badge></div>
                    <div className="text-xs text-neutral-400">Model: {a.model}</div>
                    <div className="text-xs text-neutral-400">Tasks today: <span className="text-neutral-200 font-medium">{a.tasksToday}</span></div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>سجل تحويل المهام</CardTitle>
              <CardDescription>أحدث التحويلات بين الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {handoffLog.length === 0 && <div className="text-neutral-500 text-xs">لا يوجد تحويلات.</div>}
                {handoffLog.map(h => (
                  <div key={h.id} className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-neutral-800">{h.from}</Badge>
                    <ArrowRightLeft />
                    <Badge className="bg-neutral-800">{h.to}</Badge>
                    <span className="text-neutral-300">— {h.reason}</span>
                    <span className="text-neutral-500 text-xs">{h.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>محادثة مباشرة</CardTitle>
              <CardDescription>اختبر الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-72 overflow-y-auto space-y-2 p-2 border border-neutral-800 rounded bg-neutral-950/40">
                  {messages.map((m, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${m.role === 'user' ? 'bg-neutral-200 text-neutral-900 ml-auto' : 'bg-neutral-800'}`}>{m.text}</div>
                  ))}
                  {messages.length === 0 && <div className="text-xs text-neutral-500">لا توجد رسائل بعد.</div>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="اكتب رسالتك…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <Button disabled={sending} onClick={sendMessage} className="bg-emerald-600 min-w-16 flex justify-center">{sending ? <Loader2 /> : <Send />}</Button>
                  <Button variant="secondary" disabled={sending || messages.length === 0} onClick={clearChat} className="border border-neutral-800">مسح</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}
import React, { useEffect, useState } from 'react';

// Minimal primitives (kept local to avoid external UI libs)
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>{children}</div>
);
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 border-b border-neutral-800 space-y-1 ${className}`}>{children}</div>
);
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-sm text-neutral-400 ${className}`}>{children}</p>
);
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
}
const Button: React.FC<ButtonProps> = ({ children, onClick, className = '', variant = 'primary', size = 'md', disabled, type = 'button' }) => {
  const base = 'inline-flex items-center gap-1 px-4 py-2 rounded-md font-medium text-sm transition-colors';
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : '';
  const variantClasses = variant === 'secondary' ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100' : 'bg-emerald-600 hover:bg-emerald-500 text-white';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${sizeClasses} ${variantClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      {children}
    </button>
  );
};

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: 'secondary' | string }> = ({ children, className = '', variant }) => {
  const variantClasses = variant === 'secondary' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-800';
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantClasses} ${className}`}>{children}</span>;
};

const Input: React.FC<{ placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>; }> = ({ placeholder, value, onChange, className = '', onKeyDown }) => (
  <input type="text" placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 ${className}`} />
);

// Simple emoji icons
const Bot = () => <span>🤖</span>;
const Settings = () => <span>⚙️</span>;
const Play = () => <span>▶️</span>;
const Pause = () => <span>⏸️</span>;
const Send = () => <span>📤</span>;
const Plus = () => <span>➕</span>;
const MessageSquare = () => <span>💬</span>;
const ArrowRightLeft = () => <span>↔️</span>;
const Loader2 = () => <span>⏳</span>;

interface AgentInfo { id: string; name: string; model: string; status: 'Idle' | 'Running' | 'Paused'; color: string; tasksToday: number }
const initialAgents: AgentInfo[] = [
  { id: 'a1', name: 'Support Agent', model: 'gpt-4o-mini', status: 'Idle', color: 'bg-emerald-100 text-emerald-700', tasksToday: 18 },
  { id: 'a2', name: 'Sales Agent', model: 'gpt-4o-mini', status: 'Running', color: 'bg-blue-100 text-blue-700', tasksToday: 32 },
  { id: 'a3', name: 'CRM Agent', model: 'gpt-4o-mini', status: 'Paused', color: 'bg-amber-100 text-amber-800', tasksToday: 9 },
];
const seedMessages = [
  { role: 'user' as const, text: 'مرحبا، اريد متابعة طلبي #1542' },
  { role: 'agent' as const, text: 'أكيد! سأتأكد من الحالة عبر CRM وأعود لك.' },
];
interface ChatMessage { role: 'user' | 'agent'; text: string }
interface Handoff { id: number; from: string; to: string; reason: string; time: string }

export default function AgentConsole() {
  const [agents, setAgents] = useState(initialAgents);
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [handoffLog, setHandoffLog] = useState<Handoff[]>([]);

  // Initialize / fetch history
  useEffect(() => {
    let sid = localStorage.getItem('agent-console-session-id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('agent-console-session-id', sid);
    }
    setSessionId(sid);
    (async () => {
      try {
        const resp = await fetch(`/api/history?sessionId=${encodeURIComponent(sid!)}`);
        if (resp.ok) {
          const data = await resp.json();
            if (Array.isArray(data?.messages)) setMessages(data.messages);
        }
      } catch {}
    })();
  }, []);

  function toggleAgent(id: string, to: 'Running' | 'Paused') {
    setAgents(prev => prev.map(a => a.id === id ? { ...a, status: to } : a));
  }

  async function sendMessage() {
    if (!draft.trim()) return;
    setSending(true);
    const text = draft;
    setDraft('');
    setMessages(m => [...m, { role: 'user', text }]);
    try {
      const resp = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Request failed');
      if (Array.isArray(data.messages)) setMessages(data.messages); else if (data.reply) setMessages(m => [...m, { role: 'agent', text: data.reply }]);
      if (Array.isArray(data.handoffs) && data.handoffs.length > 0) {
        const last = data.handoffs[data.handoffs.length - 1];
        setHandoffLog(prev => [...prev, { id: Date.now(), from: last.from || 'Unknown', to: last.to || 'Unknown', reason: last.reason || 'Agent handoff', time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch (e: any) {
      setMessages(m => [...m, { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` }]);
    } finally { setSending(false); }
  }

  async function clearChat() {
    if (!sessionId) return;
    try { await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); } finally { setMessages([]); }
  }

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-5xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot />
            <span className="font-semibold">Agent Console</span>
            <Badge variant="secondary" className="ml-2 bg-emerald-900/40 text-emerald-300">Beta</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="secondary" className="bg-neutral-900 border border-neutral-800"><Settings /> Settings</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500"><Plus /> جديد</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6 grid md:grid-cols-3 gap-4">
        <section className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>الوكلاء</CardTitle>
              <CardDescription>تحكم بحالة الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 gap-3">
                {agents.map(a => (
                  <div key={a.id} className="rounded-xl border border-neutral-800 p-3 space-y-2 bg-neutral-950/40">
                    <div className="flex items-center justify-between"><span className="font-medium truncate">{a.name}</span><Badge className={a.color}>{a.status}</Badge></div>
                    <div className="text-xs text-neutral-400">Model: {a.model}</div>
                    <div className="text-xs text-neutral-400">Tasks today: <span className="text-neutral-200 font-medium">{a.tasksToday}</span></div>
                    <div className="flex gap-2 pt-1">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>سجل تحويل المهام</CardTitle>
              <CardDescription>أحدث التحويلات بين الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                {handoffLog.length === 0 && <div className="text-neutral-500 text-xs">لا يوجد تحويلات.</div>}
                {handoffLog.map(h => (
                  <div key={h.id} className="flex flex-wrap items-center gap-2">
                    <Badge className="bg-neutral-800">{h.from}</Badge>
                    <ArrowRightLeft />
                    <Badge className="bg-neutral-800">{h.to}</Badge>
                    <span className="text-neutral-300">— {h.reason}</span>
                    <span className="text-neutral-500 text-xs">{h.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
        <aside className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>محادثة مباشرة</CardTitle>
              <CardDescription>اختبر الوكلاء.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-72 overflow-y-auto space-y-2 p-2 border border-neutral-800 rounded bg-neutral-950/40">
                  {messages.map((m, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${m.role === 'user' ? 'bg-neutral-200 text-neutral-900 ml-auto' : 'bg-neutral-800'}`}>{m.text}</div>
                  ))}
                  {messages.length === 0 && <div className="text-xs text-neutral-500">لا توجد رسائل بعد.</div>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="اكتب رسالتك…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <Button disabled={sending} onClick={sendMessage} className="bg-emerald-600 min-w-16 flex justify-center">{sending ? <Loader2 /> : <Send />}</Button>
                  <Button variant="secondary" disabled={sending || messages.length === 0} onClick={clearChat} className="border border-neutral-800">مسح</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}// Clean implementation replacing previous corrupted file.
import React, { useEffect, useState } from 'react';

// --- Simple UI primitives ---
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>{children}</div>;
const CardHeader = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`p-4 border-b border-neutral-800 space-y-1 ${className}`}>{children}</div>;
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>;
const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <p className={`text-sm text-neutral-400 ${className}`}>{children}</p>;
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`p-4 pt-0 ${className}`}>{children}</div>;

interface ButtonProps { children: React.ReactNode; onClick?: () => void; className?: string; variant?: 'secondary' | 'primary'; size?: 'sm' | 'md'; disabled?: boolean; type?: 'button' | 'submit' }
const Button = ({ children, onClick, className = '', variant = 'primary', size = 'md', disabled, type = 'button' }: ButtonProps) => {
  const base = 'inline-flex items-center gap-1 rounded-md font-medium text-sm transition-colors';
  const pad = size === 'sm' ? 'px-3 py-1 text-xs' : 'px-4 py-2';
  const variantCls = variant === 'secondary' ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100' : 'bg-emerald-600 hover:bg-emerald-500 text-white';
  return <button type={type} onClick={onClick} disabled={disabled} className={`${base} ${pad} ${variantCls} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>{children}</button>;
};
const Badge = ({ children, className = '', variant }: { children: React.ReactNode; className?: string; variant?: 'secondary' | string }) => {
  const variantCls = variant === 'secondary' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-800/60 text-neutral-200';
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantCls} ${className}`}>{children}</span>;
};
const Input = ({ placeholder, value, onChange, className = '', onKeyDown }: { placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> }) => (
  <input type="text" placeholder={placeholder} value={value} onChange={onChange} onKeyDown={onKeyDown} className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 focus:outline-none focus:ring-1 focus:ring-emerald-600 ${className}`} />
);

// Tabs
interface TabsCtx { value: string; onValueChange: (v: string) => void }
const TabsContext = React.createContext<TabsCtx | null>(null);
const Tabs = ({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: React.ReactNode }) => <TabsContext.Provider value={{ value, onValueChange }}><div>{children}</div></TabsContext.Provider>;
const TabsList = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => <div className={`flex space-x-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 ${className}`}>{children}</div>;
const TabsTrigger = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => { const ctx = React.useContext(TabsContext); const sel = ctx?.value === value; return <button onClick={() => ctx?.onValueChange(value)} aria-selected={sel} className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${sel ? 'bg-neutral-800 text-neutral-100' : 'text-neutral-400 hover:text-neutral-200'} ${className}`}>{children}</button>; };
const TabsContent = ({ value, children, className = '' }: { value: string; children: React.ReactNode; className?: string }) => { const ctx = React.useContext(TabsContext); if (!ctx) return null; return ctx.value === value ? <div className={className}>{children}</div> : null; };

// Icons (emoji placeholders)
const Bot = () => <span>🤖</span>; const Settings = () => <span>⚙️</span>; const Play = () => <span>▶️</span>; const Pause = () => <span>⏸️</span>; const Send = () => <span>📤</span>; const Plus = () => <span>➕</span>; const MessageSquare = () => <span>💬</span>; const CloudSun = () => <span>🌤️</span>; const Terminal = () => <span>💻</span>; const Plug = () => <span>🔌</span>; const ArrowRightLeft = () => <span>↔️</span>; const Loader2 = () => <span>⏳</span>; const FileClock = () => <span>📋</span>; const ShieldCheck = () => <span>🛡️</span>;

interface AgentInfo { id: string; name: string; model: string; status: 'Idle' | 'Running' | 'Paused'; color: string; tasksToday: number }
interface ChatMessage { role: 'user' | 'agent'; text: string }
const initialAgents: AgentInfo[] = [
  { id: 'a1', name: 'Support Agent', model: 'gpt-4o-mini', status: 'Idle', color: 'bg-emerald-100 text-emerald-700', tasksToday: 18 },
  { id: 'a2', name: 'Sales Agent', model: 'gpt-4o-mini', status: 'Running', color: 'bg-blue-100 text-blue-700', tasksToday: 32 },
  { id: 'a3', name: 'CRM Agent', model: 'gpt-4o-mini', status: 'Paused', color: 'bg-amber-100 text-amber-800', tasksToday: 9 },
];
const tools = [
  { id: 't1', name: 'Weather', icon: CloudSun, desc: 'Current weather & forecast.' },
  { id: 't2', name: 'HTTP Fetch', icon: Terminal, desc: 'Call external REST APIs.' },
  { id: 't3', name: 'Database', icon: Plug, desc: 'Read/write to SQL store.' },
];
const seedMessages: ChatMessage[] = [
  { role: 'user', text: 'مرحبا، اريد متابعة طلبي #1542' },
  { role: 'agent', text: 'أكيد! سأتأكد من الحالة عبر CRM وأعود لك.' },
];

export default function AgentConsole() {
  const [agents, setAgents] = useState(initialAgents);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('agents');
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [handoffLog, setHandoffLog] = useState<Array<{ id: number; from: string; to: string; reason: string; time: string }>>([]);

  useEffect(() => {
    let sid = localStorage.getItem('agent-console-session-id');
    if (!sid) { sid = crypto.randomUUID(); localStorage.setItem('agent-console-session-id', sid); }
    setSessionId(sid);
    (async () => {
      try {
        const resp = await fetch(`/api/history?sessionId=${encodeURIComponent(sid!)}`);
        if (resp.ok) { const data = await resp.json(); if (Array.isArray(data?.messages)) setMessages(data.messages); }
      } catch { /* ignore */ }
    })();
  }, []);

  function toggleAgent(id: string, to: 'Running' | 'Paused') { setAgents(prev => prev.map(a => a.id === id ? { ...a, status: to } : a)); }

  async function sendMessage() {
    if (!draft.trim()) return;
    const text = draft; setDraft(''); setSending(true);
    setMessages(m => [...m, { role: 'user', text }]);
    try {
      const resp = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Request failed');
      if (Array.isArray(data.messages)) setMessages(data.messages); else if (data.reply) setMessages(m => [...m, { role: 'agent', text: data.reply }]);
      if (Array.isArray(data.handoffs) && data.handoffs.length) {
        const last = data.handoffs[data.handoffs.length - 1];
        setHandoffLog(prev => [...prev, { id: Date.now(), from: last.from || 'Unknown', to: last.to || 'Unknown', reason: last.reason || 'Agent handoff', time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch (e: any) { setMessages(m => [...m, { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` }]); } finally { setSending(false); }
  }

  async function clearChat() { if (!sessionId) return; try { await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); } finally { setMessages([]); } }

  const filtered = agents.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot />
            <span className="font-semibold">Agent Console</span>
            <Badge variant="secondary" className="ml-2 bg-emerald-900/40 text-emerald-300">Beta</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="ابحث عن وكيل…" value={query} onChange={e => setQuery(e.target.value)} className="w-56 bg-neutral-900 border-neutral-800" />
            <Button variant="secondary" className="bg-neutral-900 border border-neutral-800"><Settings /> Settings</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500"><Plus /> وكيل جديد</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="agents">الوكلاء</TabsTrigger>
              <TabsTrigger value="tools">الأدوات</TabsTrigger>
              <TabsTrigger value="handoffs">تحويل المهام</TabsTrigger>
            </TabsList>
            <TabsContent value="agents" className="mt-4 grid md:grid-cols-2 gap-4">
              {filtered.map(a => (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base"><span className="truncate">{a.name}</span><Badge className={a.color}>{a.status}</Badge></CardTitle>
                    <CardDescription className="text-neutral-400">Model: {a.model}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-neutral-400">Tasks today: <span className="text-neutral-200 font-medium">{a.tasksToday}</span></div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                      <Button size="sm" className="bg-emerald-600"><MessageSquare /> محادثة</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="tools" className="mt-4 grid md:grid-cols-2 gap-4">
              {tools.map(t => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><t.icon /> {t.name}</CardTitle>
                    <CardDescription className="text-neutral-400">{t.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Button size="sm" className="bg-emerald-600">سماح للوكيل</Button>
                    <Button size="sm" variant="secondary">اختبار</Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="handoffs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft /> سجل تحويل المهام</CardTitle>
                  <CardDescription className="text-neutral-400">متى ولماذا تم تحويل المحادثة بين الوكلاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {handoffLog.map(h => (
                      <div key={h.id} className="grid grid-cols-12 items-center gap-2 text-sm">
                        <div className="col-span-2 text-neutral-400">{h.time}</div>
                        <div className="col-span-10 flex flex-wrap items-center gap-2">
                          <Badge className="bg-neutral-800">{h.from}</Badge>
                          <ArrowRightLeft />
                          <Badge className="bg-neutral-800">{h.to}</Badge>
                          <span className="text-neutral-300">— {h.reason}</span>
                        </div>
                      </div>
                    ))}
                    {handoffLog.length === 0 && <div className="text-sm text-neutral-500">لا توجد تحويلات بعد.</div>}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
        <aside className="col-span-12 lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileClock /> حالة النظام</CardTitle>
              <CardDescription className="text-neutral-400">تشغيل/إيقاف الوكلاء ومراقبة الصحة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {agents.map(a => (
                  <div key={a.id} className="rounded-2xl border border-neutral-800 p-3">
                    <div className="flex items-center justify-between"><div className="font-medium">{a.name}</div><Badge className={a.color}>{a.status}</Badge></div>
                    <div className="mt-2 text-xs text-neutral-400">Model: {a.model}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck /> سياسات الوصول</CardTitle>
              <CardDescription className="text-neutral-400">تفعيل الأذونات لكل أداة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map(t => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-800 p-3">
                  <div className="flex items-center gap-2"><t.icon /> <span>{t.name}</span></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">Allow</Button>
                    <Button size="sm" variant="secondary">Deny</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare /> محادثة مباشرة</CardTitle>
              <CardDescription className="text-neutral-400">اختبر الوكلاء مباشرة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-48 overflow-y-auto space-y-2 p-2 border border-neutral-800 rounded bg-neutral-950/40">
                  {messages.map((m, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${m.role === 'user' ? 'bg-neutral-200 text-neutral-900 ml-auto' : 'bg-neutral-800'}`}>{m.text}</div>
                  ))}
                  {messages.length === 0 && <div className="text-xs text-neutral-500">لا توجد رسائل بعد.</div>}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="اكتب رسالتك…" value={draft} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }} />
                  <Button disabled={sending} onClick={sendMessage} className="bg-emerald-600 min-w-16 flex justify-center">{sending ? <Loader2 /> : <Send />}</Button>
                  <Button variant="secondary" disabled={sending || messages.length === 0} onClick={clearChat} className="border border-neutral-800">مسح</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}


// --- Minimal primitive components ---
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>{children}</div>
);
const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 border-b border-neutral-800 space-y-1 ${className}`}>{children}</div>
);
const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
const CardDescription: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <p className={`text-sm text-neutral-400 ${className}`}>{children}</p>
);
const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
}
const Button: React.FC<ButtonProps> = ({
  children,
  onClick,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled,
  type = 'button',
}) => {
  const base = 'inline-flex items-center gap-1 px-4 py-2 rounded-md font-medium text-sm transition-colors';
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : '';
  const variantClasses =
    variant === 'secondary'
      ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
      : 'bg-emerald-600 hover:bg-emerald-500 text-white';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeClasses} ${variantClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Badge: React.FC<{ children: React.ReactNode; className?: string; variant?: 'secondary' | string }> = ({ children, className = '', variant }) => {
  const variantClasses = variant === 'secondary' ? 'bg-neutral-800 text-neutral-100' : 'bg-neutral-800';
  return <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantClasses} ${className}`}>{children}</span>;
};

const Input: React.FC<{
  placeholder?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>;
}> = ({ placeholder, value, onChange, className = '', onKeyPress }) => (
  <input
    type="text"
    placeholder={placeholder}
    value={value}
    onChange={onChange}
    onKeyPress={onKeyPress}
    className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 ${className}`}
  />
);

// Tabs Implementation
interface TabsCtx { value: string; onValueChange: (v: string) => void }
const TabsContext = React.createContext<TabsCtx | null>(null);
const Tabs: React.FC<{ value: string; onValueChange: (v: string) => void; children: React.ReactNode }> = ({ value, onValueChange, children }) => (
  <TabsContext.Provider value={{ value, onValueChange }}>
    <div>{children}</div>
  </TabsContext.Provider>
);
const TabsList: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`flex space-x-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 ${className}`}>{children}</div>
);
const TabsTrigger: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className = '' }) => {
  const ctx = React.useContext(TabsContext);
  const selected = ctx?.value === value;
  return (
    <button
      onClick={() => ctx?.onValueChange(value)}
      aria-selected={selected}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${selected ? 'bg-neutral-800' : ''} ${className}`}
    >
      {children}
    </button>
  );
};
const TabsContent: React.FC<{ value: string; children: React.ReactNode; className?: string }> = ({ value, children, className = '' }) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) return null;
  return ctx.value === value ? <div className={className}>{children}</div> : null;
};

// Simple emoji icons
const Bot = () => <span>🤖</span>;
const Settings = () => <span>⚙️</span>;
const Play = () => <span>▶️</span>;
const Pause = () => <span>⏸️</span>;
const Send = () => <span>📤</span>;
const Plus = () => <span>➕</span>;
const MessageSquare = () => <span>💬</span>;
const CloudSun = () => <span>🌤️</span>;
const Terminal = () => <span>💻</span>;
const Plug = () => <span>🔌</span>;
const ArrowRightLeft = () => <span>↔️</span>;
const Loader2 = () => <span>⏳</span>;
const FileClock = () => <span>📋</span>;
const ShieldCheck = () => <span>🛡️</span>;

interface AgentInfo { id: string; name: string; model: string; status: 'Idle' | 'Running' | 'Paused'; color: string; tasksToday: number }
const initialAgents: AgentInfo[] = [
  { id: 'a1', name: 'Support Agent', model: 'gpt-4o-mini', status: 'Idle', color: 'bg-emerald-100 text-emerald-700', tasksToday: 18 },
  { id: 'a2', name: 'Sales Agent', model: 'gpt-4o-mini', status: 'Running', color: 'bg-blue-100 text-blue-700', tasksToday: 32 },
  { id: 'a3', name: 'CRM Agent', model: 'gpt-4o-mini', status: 'Paused', color: 'bg-amber-100 text-amber-800', tasksToday: 9 },
];
const tools = [
  { id: 't1', name: 'Weather', icon: CloudSun, desc: 'Current weather & forecast.' },
  { id: 't2', name: 'HTTP Fetch', icon: Terminal, desc: 'Call external REST APIs.' },
  { id: 't3', name: 'Database', icon: Plug, desc: 'Read/write to SQL store.' },
];
const seedMessages = [
  { role: 'user', text: 'مرحبا، اريد متابعة طلبي #1542' },
  { role: 'agent', text: 'أكيد! سأتأكد من الحالة عبر CRM وأعود لك.' },
];
interface ChatMessage { role: 'user' | 'agent'; text: string }

export default function AgentConsole() {
  const [agents, setAgents] = useState(initialAgents);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('agents');
  const [messages, setMessages] = useState<ChatMessage[]>(seedMessages);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [handoffLog, setHandoffLog] = useState<any[]>([]);

  useEffect(() => {
    let sid = localStorage.getItem('agent-console-session-id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('agent-console-session-id', sid);
    }
    setSessionId(sid);
    (async () => {
      try {
        const resp = await fetch(`/api/history?sessionId=${encodeURIComponent(sid!)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data?.messages)) setMessages(data.messages);
        }
      } catch {}
    })();
  }, []);

  function toggleAgent(id: string, to: 'Running' | 'Paused') {
    setAgents((prev) => prev.map((a) => (a.id === id ? { ...a, status: to } : a)));
  }

  async function sendMessage() {
    if (!draft.trim()) return;
    setSending(true);
    const text = draft;
    setDraft('');
    setMessages((m) => [...m, { role: 'user', text }]);
    try {
      const resp = await fetch('/api/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message: text, sessionId }) });
      const data = await resp.json();
      if (!resp.ok) throw new Error(data?.error || 'Request failed');
      if (Array.isArray(data.messages)) setMessages(data.messages); else if (data.reply) setMessages((m) => [...m, { role: 'agent', text: data.reply }]);
      if (Array.isArray(data.handoffs) && data.handoffs.length > 0) {
        const last = data.handoffs[data.handoffs.length - 1];
        setHandoffLog((prev) => [...prev, { id: Date.now(), from: last.from || 'Unknown', to: last.to || 'Unknown', reason: last.reason || 'Agent handoff', time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) }]);
      }
    } catch (e: any) {
      setMessages((m) => [...m, { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` }]);
    } finally { setSending(false); }
  }

  async function clearChat() {
    if (!sessionId) return;
    try { await fetch('/api/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sessionId }) }); } finally { setMessages([]); }
  }

  const filtered = agents.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <header className="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot />
            <span className="font-semibold">Agent Console</span>
            <Badge variant="secondary" className="ml-2 bg-emerald-900/40 text-emerald-300">Beta</Badge>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Input placeholder="ابحث عن وكيل…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56 bg-neutral-900 border-neutral-800" />
            <Button variant="secondary" className="bg-neutral-900 border border-neutral-800"><Settings /> Settings</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-500"><Plus /> وكيل جديد</Button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-4">
        <section className="col-span-12 lg:col-span-7 space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-neutral-900 border border-neutral-800">
              <TabsTrigger value="agents">الوكلاء</TabsTrigger>
              <TabsTrigger value="tools">الأدوات</TabsTrigger>
              <TabsTrigger value="handoffs">تحويل المهام</TabsTrigger>
            </TabsList>
            <TabsContent value="agents" className="mt-4 grid md:grid-cols-2 gap-4">
              {filtered.map((a) => (
                <Card key={a.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base"><span className="truncate">{a.name}</span><Badge className={a.color}>{a.status}</Badge></CardTitle>
                    <CardDescription className="text-neutral-400">Model: {a.model}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-neutral-400">Tasks today: <span className="text-neutral-200 font-medium">{a.tasksToday}</span></div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                      <Button size="sm" className="bg-emerald-600"><MessageSquare /> محادثة</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="tools" className="mt-4 grid md:grid-cols-2 gap-4">
              {tools.map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base"><t.icon /> {t.name}</CardTitle>
                    <CardDescription className="text-neutral-400">{t.desc}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Button size="sm" className="bg-emerald-600">سماح للوكيل</Button>
                    <Button size="sm" variant="secondary">اختبار</Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
            <TabsContent value="handoffs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><ArrowRightLeft /> سجل تحويل المهام</CardTitle>
                  <CardDescription className="text-neutral-400">متى ولماذا تم تحويل المحادثة بين الوكلاء</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {handoffLog.map((h) => (
                      <div key={h.id} className="grid grid-cols-12 items-center gap-2 text-sm">
                        <div className="col-span-2 text-neutral-400">{h.time}</div>
                        <div className="col-span-10 flex flex-wrap items-center gap-2">
                          <Badge className="bg-neutral-800">{h.from}</Badge>
                          <ArrowRightLeft />
                          <Badge className="bg-neutral-800">{h.to}</Badge>
                          <span className="text-neutral-300">— {h.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
        <aside className="col-span-12 lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><FileClock /> حالة النظام</CardTitle>
              <CardDescription className="text-neutral-400">تشغيل/إيقاف الوكلاء ومراقبة الصحة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((a) => (
                  <div key={a.id} className="rounded-2xl border border-neutral-800 p-3">
                    <div className="flex items-center justify-between"><div className="font-medium">{a.name}</div><Badge className={a.color}>{a.status}</Badge></div>
                    <div className="mt-2 text-xs text-neutral-400">Model: {a.model}</div>
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Running')}><Play /> تشغيل</Button>
                      <Button size="sm" variant="secondary" onClick={() => toggleAgent(a.id, 'Paused')}><Pause /> إيقاف</Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><ShieldCheck /> سياسات الوصول</CardTitle>
              <CardDescription className="text-neutral-400">تفعيل الأذونات لكل أداة</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map((t) => (
                <div key={t.id} className="flex items-center justify-between rounded-xl border border-neutral-800 p-3">
                  <div className="flex items-center gap-2"><t.icon /> <span>{t.name}</span></div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">Allow</Button>
                    <Button size="sm" variant="secondary">Deny</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2"><MessageSquare /> محادثة مباشرة</CardTitle>
              <CardDescription className="text-neutral-400">اختبر الوكلاء مباشرة</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-48 overflow-y-auto space-y-2 p-2 border border-neutral-800 rounded">
                  {messages.map((m, i) => (
                    <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${m.role === 'user' ? 'bg-neutral-200 text-neutral-900 ml-auto' : 'bg-neutral-800'}`}>{m.text}</div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input placeholder="اكتب رسالتك…" value={draft} onChange={(e) => setDraft(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && sendMessage()} />
                  <Button disabled={sending} onClick={sendMessage} className="bg-emerald-600">{sending ? <Loader2 /> : <Send />}</Button>
                  <Button variant="secondary" disabled={sending || messages.length === 0} onClick={clearChat} className="border border-neutral-800">مسح</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}import React, { useState, useEffect } from 'react';

// ---- Minimal UI primitives ----
const Card = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`bg-neutral-900 border border-neutral-800 rounded-lg ${className}`}>{children}</div>
);
const CardHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="p-4 border-b border-neutral-800 space-y-1">{children}</div>
);
const CardTitle = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <h3 className={`font-semibold leading-none tracking-tight ${className}`}>{children}</h3>
);
const CardDescription = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <p className={`text-sm text-neutral-400 ${className}`}>{children}</p>
);
const CardContent = ({ children, className = '' }: { children: React.ReactNode; className?: string }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);

interface ButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  variant?: 'secondary' | string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  type?: 'button' | 'submit';
}
const Button = ({ children, onClick, className = '', variant, size = 'md', disabled, type = 'button' }: ButtonProps) => {
  const base = 'inline-flex items-center gap-1 px-4 py-2 rounded-md font-medium text-sm transition-colors';
  const sizeClasses = size === 'sm' ? 'px-3 py-1 text-xs' : '';
  const variantClasses = variant === 'secondary'
    ? 'bg-neutral-800 hover:bg-neutral-700 text-neutral-100'
    : 'bg-emerald-600 hover:bg-emerald-500 text-white';
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${sizeClasses} ${variantClasses} ${className} ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      {children}
    </button>
  );
};

const Badge = ({ children, className = '', variant = '' }: { children: React.ReactNode; className?: string; variant?: 'secondary' | string }) => {
  const variantClasses = variant === 'secondary' ? 'bg-neutral-800 text-neutral-100' : '';
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${variantClasses} ${className}`}>{children}</span>
  );
};

const Input = ({ placeholder, value, onChange, className = '', onKeyPress, onKeyDown }: { placeholder?: string; value?: string; onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void; className?: string; onKeyPress?: React.KeyboardEventHandler<HTMLInputElement>; onKeyDown?: React.KeyboardEventHandler<HTMLInputElement> }) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      onKeyPress={onKeyPress}
      onKeyDown={onKeyDown}
      className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 ${className}`}
    />
  );
};

const Textarea = ({ placeholder, className = '' }: { placeholder?: string; className?: string }) => {
  return (
    <textarea
      placeholder={placeholder}
      className={`px-3 py-2 bg-neutral-900 border border-neutral-800 rounded-md text-neutral-100 placeholder-neutral-500 ${className}`}
    />
  );
};

const TabsContext = React.createContext<{
  value: string;
  onValueChange: (v: string) => void;
} | null>(null);

const Tabs = ({
  children,
  value,
  onValueChange,
}: {
  children: React.ReactNode;
  value: string;
  onValueChange: (value: string) => void;
}) => {
  return (
    <TabsContext.Provider value={{ value, onValueChange }}>
      <div>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`flex space-x-1 bg-neutral-900 border border-neutral-800 rounded-lg p-1 ${className}`}
  >
    {children}
  </div>
);

const TabsTrigger = ({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = React.useContext(TabsContext);
  const selected = ctx?.value === value;
  return (
    <button
      onClick={() => ctx?.onValueChange(value)}
      aria-selected={selected}
      className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${selected ? 'bg-neutral-800' : ''} ${className}`}
    >
      {children}
    </button>
  );
};

const TabsContent = ({
  value,
  children,
  className = '',
}: {
  value: string;
  children: React.ReactNode;
  className?: string;
}) => {
  const ctx = React.useContext(TabsContext);
  if (!ctx) {
    return null;
  }
  return ctx.value === value ? <div className={className}>{children}</div> : null;
};

// Icons (simplified)
const Bot = () => <span>🤖</span>;
const Settings = () => <span>⚙️</span>;
const Play = () => <span>▶️</span>;
const Pause = () => <span>⏸️</span>;
const Send = () => <span>📤</span>;
const Plus = () => <span>➕</span>;
const MessageSquare = () => <span>💬</span>;
const CloudSun = () => <span>🌤️</span>;
const Globe = () => <span>🌐</span>;
const Terminal = () => <span>💻</span>;
const Plug = () => <span>🔌</span>;
const Activity = () => <span>📊</span>;
const ShieldCheck = () => <span>🛡️</span>;
const FileClock = () => <span>📋</span>;
const ArrowRightLeft = () => <span>↔️</span>;
const Loader2 = () => <span>⏳</span>;

// Note: We keep the UI data and mock stats, but real LLM calls happen via /api.

interface AgentInfo {
  id: string;
  name: string;
  model: string;
  status: 'Idle' | 'Running' | 'Paused';
  color: string;
  tasksToday: number;
}

const initialAgents: AgentInfo[] = [
  {
    id: 'a1',
    name: 'Support Agent',
    model: 'gpt-4o-mini',
    status: 'Idle',
    color: 'bg-emerald-100 text-emerald-700',
    tasksToday: 18,
  },
  {
    id: 'a2',
    name: 'Sales Agent',
    model: 'gpt-4o-mini',
    status: 'Running',
    color: 'bg-blue-100 text-blue-700',
    tasksToday: 32,
  },
  {
    id: 'a3',
    name: 'CRM Agent',
    model: 'gpt-4o-mini',
    status: 'Paused',
    color: 'bg-amber-100 text-amber-800',
    tasksToday: 9,
  },
];

const tools = [
  {
    id: 't1',
    name: 'Weather',
    icon: CloudSun,
    desc: 'Current weather & forecast.',
  },
  {
    id: 't2',
    name: 'HTTP Fetch',
    icon: Globe,
    desc: 'Call external REST APIs.',
  },
  {
    id: 't3',
    name: 'Database',
    icon: Terminal,
    desc: 'Read/write to SQL store.',
  },
  {
    id: 't4',
    name: 'Payments',
    icon: Plug,
    desc: 'Trigger payment workflows.',
  },
];

const conversationsSeed = [
  { role: 'user', text: 'مرحبا، اريد متابعة طلبي #1542' },
  { role: 'agent', text: 'أكيد! سأتأكد من الحالة عبر CRM وأعود لك.' },
];

export default function AgentConsole() {
  const [agents, setAgents] = useState(initialAgents);
  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState('agents');
  const [messages, setMessages] = useState(conversationsSeed);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');
  const [sessionId, setSessionId] = useState<string>('');
  const [handoffLog, setHandoffLog] = useState([
    {
      id: 1,
      from: 'Support Agent',
      to: 'CRM Agent',
      reason: 'Requires CRM lookup',
      time: '09:11',
    },
    {
      id: 2,
      from: 'Sales Agent',
      to: 'Support Agent',
      reason: 'Post‑sale question',
      time: '10:03',
    },
    {
      id: 3,
      return (
      to: 'Sales Agent',
      reason: 'Upgrade offer',
      time: '12:27',
    },
  ]);

  function toggleAgent(id: string, to: 'Running' | 'Paused') {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, status: to } : a)),
    );
  }

  // Initialize sessionId and fetch history
  useEffect(() => {
    let sid = localStorage.getItem('agent-console-session-id');
    if (!sid) {
      sid = crypto.randomUUID();
      localStorage.setItem('agent-console-session-id', sid);
    }
    setSessionId(sid);
    (async () => {
      try {
        const resp = await fetch(`/api/history?sessionId=${encodeURIComponent(sid!)}`);
        if (resp.ok) {
          const data = await resp.json();
          if (Array.isArray(data?.messages)) {
            setMessages(data.messages);
          }
        }
      } catch {}
    })();
  }, []);

  async function sendMessage() {
    if (!draft.trim()) {
      return;
    }
    setSending(true);
    const text = draft;
    setDraft('');
    setMessages((m) => [...m, { role: 'user', text }]);

    try {
      const resp = await fetch('/api/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data?.error || 'Request failed');
      }
      if (Array.isArray(data.messages)) {
        setMessages(data.messages);
      } else if (data.reply) {
        setMessages((m) => [...m, { role: 'agent', text: data.reply }]);
      }

      if (Array.isArray(data.handoffs) && data.handoffs.length > 0) {
        const last = data.handoffs[data.handoffs.length - 1];
        setHandoffLog((prev) => [
          ...prev,
          {
            id: Date.now(),
            from: last.from || 'Unknown',
            to: last.to || 'Unknown',
            reason: last.reason || 'Agent handoff',
            time: new Date().toLocaleTimeString('en-US', {
              hour12: false,
              hour: '2-digit',
              minute: '2-digit',
            }),
          },
        ]);
      }
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function clearChat() {
    if (!sessionId) {
      return;
    }
    try {
      await fetch('/api/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });
    } finally {
      setMessages([]);
    }
  }

  const filtered = agents.filter((a) =>
    a.name.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-neutral-800 backdrop-blur supports-[backdrop-filter]:bg-neutral-950/70">
        <div className="mx-auto max-w-7xl px-4 py-3 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Bot />
            <span className="font-semibold">Agent Console</span>
            <Badge
                  <Button disabled={sending} onClick={sendMessage} className="bg-emerald-600">
                    {sending ? <Loader2 /> : <Send />}
                  </Button>
                  <Button variant="secondary" disabled={sending || messages.length === 0} onClick={clearChat} className="border border-neutral-800">
                    مسح
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
                    <CardTitle className="flex items-center justify-between text-base">
                      <span className="truncate">{a.name}</span>
                      <Badge className={`${a.color}`}>{a.status}</Badge>
                    </CardTitle>
                    <CardDescription className="text-neutral-400">
                      Model: {a.model}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <div className="text-sm text-neutral-400">
                      Tasks today:{' '}
                      <span className="text-neutral-200 font-medium">
                        {a.tasksToday}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleAgent(a.id, 'Running')}
                      >
                        <Play />
                        تشغيل
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleAgent(a.id, 'Paused')}
                      >
                        <Pause />
                        إيقاف
                      </Button>
                      <Button size="sm" className="bg-emerald-600">
                        <MessageSquare />
                        محادثة
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Tools Tab */}
            <TabsContent
              value="tools"
              className="mt-4 grid md:grid-cols-2 gap-4"
            >
              {tools.map((t) => (
                <Card key={t.id}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <t.icon /> {t.name}
                    </CardTitle>
                    <CardDescription className="text-neutral-400">
                      {t.desc}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="flex items-center justify-between">
                    <Button size="sm" className="bg-emerald-600">
                      سماح للوكيل
                    </Button>
                    <Button size="sm" variant="secondary">
                      اختبار
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {/* Handoffs Tab */}
            <TabsContent value="handoffs" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <ArrowRightLeft />
                    سجل تحويل المهام
                  </CardTitle>
                  <CardDescription className="text-neutral-400">
                    متى ولماذا تم تحويل المحادثة بين الوكلاء
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {handoffLog.map((h) => (
                      <div
                        key={h.id}
                        className="grid grid-cols-12 items-center gap-2 text-sm"
                      >
                        <div className="col-span-2 text-neutral-400">
                          {h.time}
                        </div>
                        <div className="col-span-10 flex flex-wrap items-center gap-2">
                          <Badge className="bg-neutral-800">{h.from}</Badge>
                          <ArrowRightLeft />
                          <Badge className="bg-neutral-800">{h.to}</Badge>
                          <span className="text-neutral-300">— {h.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Right: Live Preview / Status */}
        <aside className="col-span-12 lg:col-span-5 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileClock />
                حالة النظام
              </CardTitle>
              <CardDescription className="text-neutral-400">
                تشغيل/إيقاف الوكلاء ومراقبة الصحة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3">
                {agents.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl border border-neutral-800 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{a.name}</div>
                      <Badge className={`${a.color}`}>{a.status}</Badge>
                    </div>
                    <div className="mt-2 text-xs text-neutral-400">
                      Model: {a.model}
                    </div>
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleAgent(a.id, 'Running')}
                      >
                        <Play />
                        تشغيل
                      </Button>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => toggleAgent(a.id, 'Paused')}
                      >
                        <Pause />
                        إيقاف
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ShieldCheck />
                سياسات الوصول
              </CardTitle>
              <CardDescription className="text-neutral-400">
                تفعيل الأذونات لكل أداة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {tools.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-xl border border-neutral-800 p-3"
                >
                  <div className="flex items-center gap-2">
                    <t.icon />
                    <span>{t.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="secondary">
                      Allow
                    </Button>
                    <Button size="sm" variant="secondary">
                      Deny
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Chat Interface */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare />
                محادثة مباشرة
              </CardTitle>
              <CardDescription className="text-neutral-400">
                اختبر الوكلاء مباشرة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-48 overflow-y-auto space-y-2 p-2 border border-neutral-800 rounded">
                  {messages.map((m, i) => (
                    <div
                      key={i}
                      className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow ${
                        m.role === 'user'
                          ? 'bg-neutral-200 text-neutral-900 ml-auto'
                          : 'bg-neutral-800'
                      }`}
                    >
                      {m.text}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    placeholder="اكتب رسالتك…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  />
                  <Button
                    disabled={sending}
                    async function sendMessage() {
                    className="bg-emerald-600"
                  >
                    {sending ? <Loader2 /> : <Send />}

                      try {
                        const resp = await fetch('/api/run', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ message: draft }),
                        });
                        const data = await resp.json();
                        if (!resp.ok) {
                          throw new Error(data?.error || 'Request failed');
                        }

                        setMessages((m) => [...m, { role: 'agent', text: data.reply }]);

                        if (Array.isArray(data.handoffs) && data.handoffs.length > 0) {
                          const last = data.handoffs[data.handoffs.length - 1];
                          setHandoffLog((prev) => [
                            ...prev,
                            {
                              id: Date.now(),
                              from: last.from || 'Unknown',
                              to: last.to || 'Unknown',
                              reason: last.reason || 'Agent handoff',
                              time: new Date().toLocaleTimeString('en-US', {
                                hour12: false,
                                hour: '2-digit',
                                minute: '2-digit',
                              }),
                            },
                          ]);
                        }
                      } catch (e: any) {
                        setMessages((m) => [
                          ...m,
                          { role: 'agent', text: `خطأ في الخادم: ${e?.message ?? 'غير معروف'}` },
                        ]);
                      } finally {
                        setSending(false);
                        setDraft('');
                      }
      </footer>
