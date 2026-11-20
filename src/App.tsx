import { useState, useMemo, useCallback } from 'react';
import {
  Lock,
  Unlock,
  ArrowRightLeft,
  Copy,
  Check,
  AlertCircle,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Trash2,
} from 'lucide-react';
import {
  CIPHER_METHODS,
  encrypt as doEncrypt,
  decrypt as doDecrypt,
  type CipherMethod,
} from '@/lib/ciphers';

type Mode = 'encrypt' | 'decrypt';

export default function App() {
  const [method, setMethod] = useState<CipherMethod>('aes-gcm');
  const [mode, setMode] = useState<Mode>('encrypt');
  const [input, setInput] = useState('');
  const [key, setKey] = useState('');
  const [output, setOutput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const info = useMemo(() => CIPHER_METHODS.find((m) => m.id === method)!, [method]);

  const handleRun = useCallback(async () => {
    if (!input.trim()) {
      setError('Please enter some text first.');
      setOutput('');
      return;
    }
    setError('');
    setBusy(true);
    try {
      const result = mode === 'encrypt' ? await doEncrypt(method, input, key) : await doDecrypt(method, input, key);
      setOutput(result);
    } catch (e) {
      setOutput('');
      setError(e instanceof Error ? e.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }, [mode, method, input, key]);

  const swap = () => {
    if (method === 'rot13') return; // same operation both ways
    setMode((m) => (m === 'encrypt' ? 'decrypt' : 'encrypt'));
    setInput(output);
    setOutput('');
    setError('');
  };

  const handleCopy = async () => {
    if (!output) return;
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const clearAll = () => {
    setInput('');
    setOutput('');
    setError('');
    setKey('');
  };

  return (
    <div className="min-h-screen bg-[#0a0e1a] text-slate-100 selection:bg-cyan-500/30">
      {/* Ambient background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -left-40 w-[40rem] h-[40rem] rounded-full bg-cyan-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -right-40 w-[40rem] h-[40rem] rounded-full bg-blue-600/10 blur-[120px]" />
        <div className="absolute top-1/3 left-1/2 w-[30rem] h-[30rem] rounded-full bg-teal-500/5 blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto px-5 sm:px-6 py-10 sm:py-16">
        {/* Header */}
        <header className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 shadow-lg shadow-cyan-500/30 mb-5">
            <Lock className="w-7 h-7 text-white" strokeWidth={2.2} />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent">
            Cipher Vault
          </h1>
          <p className="mt-3 text-slate-400 max-w-lg mx-auto text-sm sm:text-base leading-relaxed">
            Encrypt and decrypt text with real AES-GCM encryption or explore classic
            ciphers — all running locally in your browser. Your text never leaves your device.
          </p>
        </header>

        {/* Method selector */}
        <section className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3">
            Choose a method
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {CIPHER_METHODS.map((m) => {
              const active = m.id === method;
              return (
                <button
                  key={m.id}
                  onClick={() => {
                    setMethod(m.id);
                    setOutput('');
                    setError('');
                    if (m.id === 'rot13') setKey('');
                  }}
                  className={`group relative flex items-center gap-2.5 rounded-xl border px-3.5 py-3 text-left transition-all duration-200 ${
                    active
                      ? 'border-cyan-400/60 bg-cyan-500/10 shadow-lg shadow-cyan-500/10'
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  {m.secure ? (
                    <ShieldCheck className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-300' : 'text-emerald-400/70'}`} />
                  ) : (
                    <ShieldAlert className={`w-4 h-4 shrink-0 ${active ? 'text-cyan-300' : 'text-amber-400/60'}`} />
                  )}
                  <span className={`text-xs font-medium leading-tight ${active ? 'text-white' : 'text-slate-300'}`}>
                    {m.label}
                  </span>
                </button>
              );
            })}
          </div>
          <div className={`mt-3 flex items-start gap-2 rounded-lg border px-3.5 py-2.5 text-xs leading-relaxed ${
            info.secure
              ? 'border-emerald-500/20 bg-emerald-500/5 text-emerald-200/80'
              : 'border-amber-500/20 bg-amber-500/5 text-amber-200/80'
          }`}>
            {info.secure ? (
              <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-400" />
            ) : (
              <ShieldAlert className="w-3.5 h-3.5 mt-0.5 shrink-0 text-amber-400" />
            )}
            <span>{info.description}</span>
          </div>
        </section>

        {/* Mode toggle */}
        <section className="mb-6">
          <div className="inline-flex rounded-xl border border-white/10 bg-white/[0.03] p-1">
            <button
              onClick={() => { setMode('encrypt'); setOutput(''); setError(''); }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                mode === 'encrypt' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lock className="w-4 h-4" /> Encrypt
            </button>
            <button
              onClick={() => { setMode('decrypt'); setOutput(''); setError(''); }}
              className={`flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-medium transition-all ${
                mode === 'decrypt' ? 'bg-cyan-500 text-white shadow-md shadow-cyan-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Unlock className="w-4 h-4" /> Decrypt
            </button>
          </div>
        </section>

        {/* Key field */}
        {info.needsKey && (
          <section className="mb-5">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
              <KeyRound className="w-3.5 h-3.5" />
              {info.keyLabel}
            </label>
            <input
              type={method === 'aes-gcm' ? 'password' : 'text'}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleRun()}
              placeholder={info.keyPlaceholder}
              className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20"
            />
          </section>
        )}

        {/* Input */}
        <section className="mb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              {mode === 'encrypt' ? 'Plaintext' : 'Ciphertext'}
            </label>
            {input && (
              <button
                onClick={clearAll}
                className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            rows={5}
            placeholder={mode === 'encrypt' ? 'Type the text you want to encrypt…' : 'Paste the encrypted text here…'}
            className="w-full resize-y rounded-xl border border-white/10 bg-white/[0.04] px-4 py-3.5 text-sm text-slate-100 placeholder:text-slate-600 outline-none transition-all focus:border-cyan-400/50 focus:bg-white/[0.06] focus:ring-2 focus:ring-cyan-500/20 font-mono leading-relaxed"
          />
        </section>

        {/* Action button */}
        <button
          onClick={handleRun}
          disabled={busy}
          className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/25 transition-all hover:shadow-xl hover:shadow-cyan-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
        >
          {busy ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Working…
            </>
          ) : (
            <>
              {mode === 'encrypt' ? <Lock className="w-4.5 h-4.5" /> : <Unlock className="w-4.5 h-4.5" />}
              {mode === 'encrypt' ? 'Encrypt Text' : 'Decrypt Text'}
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <AlertCircle className="w-4.5 h-4.5 mt-0.5 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {/* Output */}
        {output && (
          <section className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {mode === 'encrypt' ? 'Encrypted output' : 'Decrypted output'}
              </label>
              <div className="flex items-center gap-3">
                {method !== 'rot13' && (
                  <button
                    onClick={swap}
                    className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                  >
                    <ArrowRightLeft className="w-3.5 h-3.5" /> Use & swap
                  </button>
                )}
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-cyan-300 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
            <div className="relative rounded-xl border border-cyan-500/20 bg-cyan-500/[0.04] px-4 py-3.5">
              <pre className="text-sm text-cyan-100 font-mono leading-relaxed whitespace-pre-wrap break-all max-h-72 overflow-y-auto">
                {output}
              </pre>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="mt-12 text-center">
          <p className="text-xs text-slate-600 leading-relaxed">
            All processing happens in your browser. Nothing is uploaded or stored.
            <br className="hidden sm:block" />
            Only AES-GCM is suitable for protecting real secrets.
          </p>
        </footer>
      </div>
    </div>
  );
}
