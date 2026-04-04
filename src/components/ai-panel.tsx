"use client"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"

type Message = {
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

type AlertLevel = "BLOQUANT" | "AVERTISSEMENT" | "SUGGESTION"

interface AIPanelProps {
  module?: string
  marcheId?: string
  marche?: { ref: string; objet: string; statut: string; mode: string }
}

export function AIPanel({ module = "dashboard", marcheId, marche }: AIPanelProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(true)
  const scrollRef = useRef<HTMLDivElement>(null)

  const suggestedQuestions = [
    "Quels sont les delais legaux pour ce marche ?",
    "Comment detecter un fractionnement ?",
    "Quel organe de controle est competent ?",
    "Quelles sont les sanctions applicables ?",
  ]

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage(text: string) {
    if (!text.trim() || loading) return

    const userMessage: Message = { role: "user", content: text, timestamp: new Date() }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setLoading(true)

    const assistantMessage: Message = { role: "assistant", content: "", timestamp: new Date() }
    setMessages(prev => [...prev, assistantMessage])

    try {
      const res = await fetch("/api/ai/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          marcheId,
          module,
          contexte: { module, ...(marche || {}) },
          conversationHistory: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      if (!res.ok) throw new Error("Erreur API")

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6)) as { type?: string; text?: string }
              if (data.type === "text" && data.text) {
                setMessages(prev => {
                  const updated = [...prev]
                  const last = updated[updated.length - 1]
                  if (!last) return updated
                  updated[updated.length - 1] = {
                    ...last,
                    content: last.content + data.text,
                  }
                  return updated
                })
              }
            } catch {
              // ignore parse errors
            }
          }
        }
      }
    } catch {
      setMessages(prev => {
        const updated = [...prev]
        const last = updated[updated.length - 1]
        if (!last) return updated
        updated[updated.length - 1] = {
          ...last,
          content: "Erreur de connexion au conseiller IA. Verifiez la cle API DeepSeek.",
        }
        return updated
      })
    } finally {
      setLoading(false)
    }
  }

  function parseAlertLevel(content: string): AlertLevel | null {
    if (content.includes("BLOQUANT")) return "BLOQUANT"
    if (content.includes("AVERTISSEMENT")) return "AVERTISSEMENT"
    if (content.includes("SUGGESTION")) return "SUGGESTION"
    return null
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-0 top-1/2 -translate-y-1/2 bg-[#008751] text-white px-2 py-4 rounded-l-lg shadow-lg text-sm font-medium hover:bg-[#006b40] transition-colors z-10"
        style={{ writingMode: "vertical-rl" }}
      >
        Conseiller IA
      </button>
    )
  }

  return (
    <div className="w-80 flex-shrink-0 border-l bg-white flex flex-col h-screen">
      {/* Header */}
      <div className="bg-[#008751] text-white p-3 flex items-center justify-between flex-shrink-0">
        <div>
          <div className="font-semibold text-sm flex items-center gap-2">
            <span className="w-2 h-2 bg-green-300 rounded-full animate-pulse inline-block"></span>
            Conseiller IA — PRMP-Pro
          </div>
          <div className="text-xs text-green-200 mt-0.5">DeepSeek · Loi 2020-26 Benin</div>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="text-green-200 hover:text-white text-lg leading-none"
        >
          ×
        </button>
      </div>

      {/* Context banner */}
      {marche && (
        <div className="bg-green-50 border-b border-green-200 p-2 text-xs flex-shrink-0">
          <div className="font-medium text-green-800">{marche.ref}</div>
          <div className="text-green-600 truncate">{marche.objet}</div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.length === 0 && (
          <div className="space-y-3">
            <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600">
              Je suis votre conseiller juridique IA specialise en marches publics au Benin.
              Je cite toujours les articles de loi et signale les risques.
            </div>
            <div className="space-y-1">
              <div className="text-xs font-medium text-gray-500">Questions frequentes :</div>
              {suggestedQuestions.map((q, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(q)}
                  className="w-full text-left text-xs bg-white border border-gray-200 rounded p-2 hover:border-[#008751] hover:bg-green-50 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[90%] rounded-lg p-2.5 text-xs ${
                msg.role === "user"
                  ? "bg-[#008751] text-white"
                  : "bg-gray-50 text-gray-800 border border-gray-200"
              }`}
            >
              {msg.role === "assistant" && (() => {
                const level = parseAlertLevel(msg.content)
                return level ? (
                  <div
                    className={`text-xs font-bold mb-1 ${
                      level === "BLOQUANT"
                        ? "text-red-600"
                        : level === "AVERTISSEMENT"
                        ? "text-orange-600"
                        : "text-blue-600"
                    }`}
                  >
                    {level === "BLOQUANT" ? "🔴" : level === "AVERTISSEMENT" ? "🟡" : "🔵"} {level}
                  </div>
                ) : null
              })()}
              <div className="whitespace-pre-wrap leading-relaxed">
                {msg.content || (loading && i === messages.length - 1 ? "..." : "")}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t bg-gray-50 flex-shrink-0">
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                sendMessage(input)
              }
            }}
            placeholder="Question juridique... (Entree pour envoyer)"
            className="text-xs resize-none min-h-[60px] max-h-[120px]"
            disabled={loading}
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            size="sm"
            className="bg-[#008751] hover:bg-[#006b40] self-end"
          >
            {loading ? "..." : "→"}
          </Button>
        </div>
        <div className="text-xs text-gray-400 mt-1">Cite toujours la source legale</div>
      </div>
    </div>
  )
}
