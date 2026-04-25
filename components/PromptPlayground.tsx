'use client';

import { useRef, useState, useCallback } from 'react';
import Markdown from './Markdown';

type Role = 'user' | 'assistant';
interface ChatMessage { role: Role; content: string; }

interface PromptLadder {
  theme: string;
  icon: string;
  levels: { label: string; tag: string; prompt: string; color: string }[];
}

const PROMPT_LADDERS: PromptLadder[] = [
  {
    theme: 'Bio-CNG Opportunity',
    icon: '🌿',
    levels: [
      {
        label: 'Simple',
        tag: 'L1',
        color: 'from-emerald-500 to-emerald-600',
        prompt: 'What are the emerging opportunities in Bio-CNG for industrial applications?'
      },
      {
        label: 'Detailed',
        tag: 'L2',
        color: 'from-blue-500 to-blue-600',
        prompt: 'Analyze the Bio-CNG market in India — key players, regulatory incentives, technology maturity, and estimated market size for 2025-2030. Include comparison with conventional fuels for industrial boiler applications.'
      },
      {
        label: 'Analytical',
        tag: 'L3',
        color: 'from-purple-500 to-purple-600',
        prompt: "As Thermax's strategy team, evaluate the business case for entering the Bio-CNG market. Consider: (1) market sizing and growth trajectory, (2) technology partnerships needed, (3) integration with existing boiler product line, (4) competitive landscape, (5) investment requirements and ROI timeline. Produce a structured recommendation with pros/cons and risk assessment."
      }
    ]
  },
  {
    theme: 'Hydrogen Energy',
    icon: '⚡',
    levels: [
      {
        label: 'Simple',
        tag: 'L1',
        color: 'from-emerald-500 to-emerald-600',
        prompt: 'What role can green hydrogen play in the industrial energy transition for companies like Thermax?'
      },
      {
        label: 'Detailed',
        tag: 'L2',
        color: 'from-blue-500 to-blue-600',
        prompt: 'Map the green hydrogen value chain in India — electrolysis technologies, storage and transport challenges, policy incentives (National Green Hydrogen Mission), and industrial end-use cases. Identify where Thermax\'s existing capabilities (boilers, heaters, heat exchangers) intersect with hydrogen applications.'
      },
      {
        label: 'Analytical',
        tag: 'L3',
        color: 'from-purple-500 to-purple-600',
        prompt: "Build a strategic options paper for Thermax's entry into the hydrogen economy. Evaluate: (1) hydrogen-ready boiler/heater retrofit opportunity, (2) electrolyser OEM vs partnership models, (3) hydrogen blending in existing natural gas systems, (4) competitive positioning vs L&T, Adani, and Reliance, (5) a phased 3-year roadmap with investment milestones. Include SWOT analysis and financial projections."
      }
    ]
  },
  {
    theme: 'Green Energy Solutions',
    icon: '☀️',
    levels: [
      {
        label: 'Simple',
        tag: 'L1',
        color: 'from-emerald-500 to-emerald-600',
        prompt: 'What green energy solutions can Thermax offer to help industrial customers reduce their carbon footprint?'
      },
      {
        label: 'Detailed',
        tag: 'L2',
        color: 'from-blue-500 to-blue-600',
        prompt: 'Analyze the industrial decarbonization landscape in India — solar thermal, biomass-based solutions, waste heat recovery, and electrification of process heat. Map current regulations (PAT scheme, carbon credit markets, ESG mandates) and estimate the addressable market for Thermax across cement, pharma, food processing, and textile sectors.'
      },
      {
        label: 'Analytical',
        tag: 'L3',
        color: 'from-purple-500 to-purple-600',
        prompt: "Design a comprehensive \"Green Industrial Solutions\" business unit proposal for Thermax. Cover: (1) portfolio of green offerings mapped to customer pain points, (2) bundled solutions (solar thermal + heat pump + WHR) with TCO analysis vs conventional systems, (3) financing models (ESCO, green bonds, carbon credits), (4) go-to-market strategy for top 5 industrial sectors, (5) organizational capabilities needed and build-vs-buy assessment. Deliver a board-ready recommendation with 5-year P&L projections."
      }
    ]
  }
];

export default function PromptPlayground() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const streamThrottleRef = useRef<number>(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const transcript: ChatMessage[] =
    streaming && streamBuffer
      ? [...messages, { role: 'assistant', content: streamBuffer }]
      : messages;

  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  async function send(textOverride?: string) {
    const text = (textOverride ?? input).trim();
    if (!text || streaming) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setStreaming(true);
    setStreamBuffer('');
    setTimeout(scrollToBottom, 50);

    try {
      const res = await fetch('/api/chat-prompting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next.map(m => ({ role: m.role, content: m.content }))
        })
      });

      if (!res.ok || !res.body) {
        const errText = await res.text().catch(() => 'Request failed');
        setMessages([...next, { role: 'assistant', content: `*Error: ${errText}*` }]);
        setStreaming(false);
        return;
      }

      await readSSE(res.body, next);
    } catch (err) {
      setMessages([...next, { role: 'assistant', content: `*Network error: ${err instanceof Error ? err.message : 'unknown'}*` }]);
    } finally {
      setStreaming(false);
      setStreamBuffer('');
    }
  }

  async function readSSE(body: ReadableStream<Uint8Array>, prev: ChatMessage[]) {
    const reader = body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let assembled = '';

    const flushStream = () => {
      setStreamBuffer(assembled);
      streamThrottleRef.current = 0;
      scrollToBottom();
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      let currentEvent = '';
      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim();
        } else if (line.startsWith('data: ')) {
          const raw = line.slice(6);
          try {
            const data = JSON.parse(raw);
            switch (currentEvent) {
              case 'text_delta':
                assembled += data;
                if (!streamThrottleRef.current) {
                  streamThrottleRef.current = requestAnimationFrame(flushStream);
                }
                break;
              case 'error':
                assembled += `\n\n*Error: ${data.message}*`;
                setStreamBuffer(assembled);
                break;
              case 'done':
                break;
            }
          } catch { /* skip malformed SSE lines */ }
          currentEvent = '';
        }
      }
    }
    if (streamThrottleRef.current) cancelAnimationFrame(streamThrottleRef.current);
    setMessages([...prev, { role: 'assistant', content: assembled }]);
    setTimeout(scrollToBottom, 100);
  }

  function clearChat() {
    setMessages([]);
    setStreamBuffer('');
    setInput('');
  }

  function handlePromptClick(prompt: string) {
    setInput(prompt);
    inputRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0f1e] to-[#111827]">
      {/* Hero Header */}
      <section className="bg-gradient-to-br from-[#0c1222] via-[#111d35] to-[#0f172a] border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex items-center justify-between">
            <div>
              <div className="inline-flex items-center gap-2 bg-white/5 backdrop-blur px-3 py-1 rounded-full text-[11px] font-mono text-teal-400 mb-4">
                <span className="w-1.5 h-1.5 bg-teal-400 rounded-full animate-pulse" />
                Prompt Engineering Playground
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                Prompting Mode
              </h1>
              <p className="mt-2 text-white/50 text-sm max-w-xl leading-relaxed">
                Explore ideas, research markets, and build structured thinking through progressively
                detailed prompts. Learn how prompt quality shapes AI output quality.
              </p>
            </div>
            <div className="hidden md:flex items-center gap-3">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="text-xs font-semibold text-white/60 hover:text-white border border-white/10 hover:border-white/30 px-3 py-2 rounded-lg transition"
              >
                {sidebarOpen ? 'Hide' : 'Show'} Prompt Library
              </button>
              {messages.length > 0 && (
                <button
                  onClick={clearChat}
                  disabled={streaming}
                  className="text-xs font-semibold text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 px-3 py-2 rounded-lg transition disabled:opacity-40"
                >
                  Clear Chat
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-6">
        <div className={`grid gap-6 ${sidebarOpen ? 'lg:grid-cols-[320px_1fr]' : 'grid-cols-1'}`}>

          {/* Sidebar - Prompt Library */}
          {sidebarOpen && (
            <aside className="space-y-4">
              <div className="bg-[#131b2e] border border-white/5 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-white/[0.02]">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-teal-400">
                    Prompt Ladder Library
                  </h3>
                  <p className="text-[10px] text-white/40 mt-1 leading-snug">
                    Click any prompt to load it. Each ladder progresses from simple to analytical.
                  </p>
                </div>

                <div className="p-3 space-y-4">
                  {PROMPT_LADDERS.map((ladder, li) => (
                    <div key={li} className="space-y-2">
                      <div className="flex items-center gap-2 px-1">
                        <span className="text-base">{ladder.icon}</span>
                        <span className="text-[11px] font-bold text-white/80">{ladder.theme}</span>
                      </div>

                      {ladder.levels.map((level, lvi) => (
                        <button
                          key={lvi}
                          onClick={() => handlePromptClick(level.prompt)}
                          className="w-full text-left group"
                        >
                          <div className="rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.06] hover:border-white/10 transition p-3">
                            <div className="flex items-center gap-2 mb-1.5">
                              <span className={`text-[9px] font-bold text-white px-1.5 py-0.5 rounded bg-gradient-to-r ${level.color}`}>
                                {level.tag}
                              </span>
                              <span className="text-[10px] font-semibold text-white/60 group-hover:text-white/80 transition">
                                {level.label}
                              </span>
                            </div>
                            <p className="text-[11px] text-white/40 group-hover:text-white/60 leading-snug transition line-clamp-3">
                              {level.prompt}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  ))}
                </div>

                <div className="px-4 py-3 border-t border-white/5 bg-white/[0.02]">
                  <div className="flex items-start gap-2">
                    <span className="text-amber-400 text-xs mt-0.5 shrink-0">*</span>
                    <p className="text-[10px] text-white/30 leading-snug">
                      <strong className="text-white/50">Prompt Ladder Concept:</strong> Start with L1 (simple) to explore a topic, then refine with L2 (detailed) for depth, and finally use L3 (analytical) for structured strategic output. Each level builds on the prior response.
                    </p>
                  </div>
                </div>
              </div>
            </aside>
          )}

          {/* Chat Area */}
          <section className="flex flex-col min-h-[calc(100vh-280px)]">
            {/* Messages */}
            <div className="flex-1 bg-[#131b2e] border border-white/5 rounded-xl overflow-hidden flex flex-col">
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {transcript.length === 0 && !streaming && (
                  <div className="flex flex-col items-center justify-center h-full text-center py-16">
                    <div className="text-5xl mb-4">🧪</div>
                    <h3 className="text-lg font-bold text-white/80">Prompt Engineering Playground</h3>
                    <p className="text-sm text-white/40 max-w-md mt-2 leading-relaxed">
                      Type a prompt below or pick one from the Prompt Ladder Library.
                      Build on prior responses to explore topics in depth.
                    </p>
                    <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg">
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-center">
                        <div className="text-emerald-400 font-bold text-lg mb-1">L1</div>
                        <div className="text-[10px] text-white/40">Simple</div>
                        <div className="text-[9px] text-white/25 mt-1">Explore the topic</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-center">
                        <div className="text-blue-400 font-bold text-lg mb-1">L2</div>
                        <div className="text-[10px] text-white/40">Detailed</div>
                        <div className="text-[9px] text-white/25 mt-1">Add depth & data</div>
                      </div>
                      <div className="bg-white/[0.03] border border-white/5 rounded-lg p-3 text-center">
                        <div className="text-purple-400 font-bold text-lg mb-1">L3</div>
                        <div className="text-[10px] text-white/40">Analytical</div>
                        <div className="text-[9px] text-white/25 mt-1">Strategic output</div>
                      </div>
                    </div>
                  </div>
                )}

                {transcript.map((msg, i) => (
                  <ChatBubble key={i} message={msg} isStreaming={streaming && msg.role === 'assistant' && i === transcript.length - 1} />
                ))}

                {streaming && !streamBuffer && (
                  <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-teal-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-white/40 font-mono">AI is thinking...</span>
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>

              {/* Input Area */}
              <div className="border-t border-white/5 bg-[#0f172a] p-4">
                <div className="flex gap-3">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter your prompt here... (Ctrl/Cmd+Enter to send)"
                    rows={3}
                    disabled={streaming}
                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/25 resize-y focus:outline-none focus:border-teal-500/50 focus:ring-2 focus:ring-teal-500/20 disabled:opacity-40 transition"
                  />
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => send()}
                      disabled={streaming || !input.trim()}
                      className="flex-1 bg-gradient-to-r from-teal-500 to-blue-500 hover:from-teal-400 hover:to-blue-400 text-white font-semibold px-6 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition text-sm"
                    >
                      Send
                    </button>
                    {messages.length > 0 && (
                      <button
                        onClick={clearChat}
                        disabled={streaming}
                        className="text-[10px] font-semibold text-white/30 hover:text-red-400 transition disabled:opacity-40"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-[10px] text-white/25">
                    {messages.length > 0
                      ? `${Math.ceil(messages.filter(m => m.role === 'user').length)} turn${messages.filter(m => m.role === 'user').length !== 1 ? 's' : ''} in conversation`
                      : 'Start a new conversation or pick a prompt from the library'}
                  </p>
                  <p className="text-[10px] text-white/20 font-mono">
                    Ctrl/Cmd + Enter to send
                  </p>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ message, isStreaming }: { message: ChatMessage; isStreaming: boolean }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gradient-to-r from-blue-600/80 to-blue-500/80 backdrop-blur text-white rounded-2xl rounded-tr-md px-4 py-3 text-sm leading-relaxed shadow-lg shadow-blue-500/10">
          <div className="whitespace-pre-wrap">{message.content}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] w-full bg-white/[0.04] border border-white/5 rounded-2xl rounded-tl-md px-5 py-4 text-sm">
        <div className="flex items-center gap-2 mb-2">
          <span className="w-1.5 h-1.5 bg-teal-400 rounded-full" />
          <span className="text-[10px] font-mono text-teal-400/70 uppercase tracking-wider">AI Research Assistant</span>
        </div>
        <div className="text-white/80 leading-relaxed prompt-markdown">
          <Markdown>{message.content}</Markdown>
        </div>
        {isStreaming && (
          <div className="mt-3 flex items-center gap-2">
            <div className="h-1 w-20 bg-white/5 rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-teal-400 to-blue-400 rounded-full animate-pulse" style={{ width: '60%' }} />
            </div>
            <span className="text-[10px] text-white/30 font-mono">streaming...</span>
          </div>
        )}
      </div>
    </div>
  );
}
