import { useEffect, useRef, useState } from "react";
import { Bot, LoaderCircle, RotateCcw, Send, Sparkles, Trash2, X } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { requestAgentReply, type AgentApiMessage, type AgentContext } from "../agent";

type UiMessage = AgentApiMessage & { id: string };

const initialMessage: UiMessage = {
  id: "welcome",
  role: "assistant",
  content: "您好，我是京发智配融资顾问。可以帮您梳理当前客户资料、说明产品匹配依据，或整理一份可直接转发的融资建议。",
};

const quickQuestions = ["整理客户缺失项", "解释当前匹配结果", "生成客户转发方案"];

function createMessage(role: UiMessage["role"], content: string): UiMessage {
  return { id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, role, content };
}

export function AgentDock({ open, onOpenChange, context }: { open: boolean; onOpenChange: (open: boolean) => void; context: AgentContext }) {
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState<UiMessage[]>([initialMessage]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<{ message: string; failedText: string } | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const requestSequence = useRef(0);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending, error, open]);

  useEffect(() => () => {
    requestSequence.current += 1;
    controllerRef.current?.abort("unmount");
  }, []);

  const submit = async (rawValue: string, appendUser = true) => {
    const value = rawValue.trim();
    if (!value || pending) return;

    const nextMessages = appendUser ? [...messages, createMessage("user", value)] : messages;
    const sequence = requestSequence.current + 1;
    const controller = new AbortController();
    requestSequence.current = sequence;
    controllerRef.current = controller;
    setMessages(nextMessages);
    setDraft("");
    setError(null);
    setPending(true);

    const timeout = window.setTimeout(() => controller.abort("timeout"), 65_000);
    try {
      const reply = await requestAgentReply(
        nextMessages.filter((item) => item.id !== "welcome").map(({ role, content }) => ({ role, content })),
        context,
        controller.signal,
      );
      if (requestSequence.current === sequence) {
        setMessages((current) => [...current, createMessage("assistant", reply.message)]);
      }
    } catch (requestError) {
      if (requestSequence.current !== sequence || controller.signal.reason === "unmount" || controller.signal.reason === "cleared") return;
      const message = controller.signal.reason === "timeout"
        ? "智能体响应超时，请稍后重试。"
        : requestError instanceof Error ? requestError.message : "发送失败，请稍后重试。";
      setError({ message, failedText: value });
    } finally {
      window.clearTimeout(timeout);
      if (requestSequence.current === sequence) {
        setPending(false);
        controllerRef.current = null;
      }
    }
  };

  const clearConversation = () => {
    requestSequence.current += 1;
    controllerRef.current?.abort("cleared");
    controllerRef.current = null;
    setMessages([initialMessage]);
    setError(null);
    setPending(false);
    setDraft("");
    window.setTimeout(() => inputRef.current?.focus(), 0);
  };

  if (!open) {
    return <button className="agent-launcher" onClick={() => onOpenChange(true)} aria-expanded="false" aria-controls="agent-window"><Bot size={19} /><span>智能体顾问</span><i /></button>;
  }

  return <section id="agent-window" className="agent-window" aria-label="智能体顾问窗口">
    <header>
      <span className="agent-avatar"><Bot size={18} /></span>
      <div><strong>京发智能顾问</strong><small><i />已安全接入 · Jfclaw-1.0</small></div>
      <button className="icon-button" onClick={clearConversation} aria-label="清空对话" title="清空对话"><Trash2 size={17} /></button>
      <button className="icon-button" onClick={() => onOpenChange(false)} aria-label="关闭智能体窗口"><X size={18} /></button>
    </header>

    <div className="agent-context" aria-label="当前咨询客户">
      <Sparkles size={15} />
      <span>正在分析</span>
      <strong>{context.client.name || "待补全客户"}</strong>
      <em>{context.productMatches.length} 款产品</em>
    </div>

    <div className="agent-body" ref={bodyRef} role="log" aria-live="polite" aria-busy={pending}>
      {messages.map((item) => item.role === "assistant"
        ? <article className="agent-message" key={item.id}><ReactMarkdown remarkPlugins={[remarkGfm]} components={{ a: ({ children }) => <span>{children}</span> }}>{item.content}</ReactMarkdown></article>
        : <div className="user-message" key={item.id}>{item.content}</div>)}
      {pending ? <div className="agent-message agent-loading"><LoaderCircle size={15} /><span>正在结合客户资料与产品规则分析…</span></div> : null}
      {error ? <div className="agent-error" role="alert"><span>{error.message}</span><button onClick={() => submit(error.failedText, false)} disabled={pending}><RotateCcw size={14} />重新发送</button></div> : null}
    </div>

    {messages.length === 1 && !pending ? <div className="agent-quick-actions" aria-label="快捷提问">{quickQuestions.map((question) => <button key={question} onClick={() => submit(question)}>{question}</button>)}</div> : null}

    <footer>
      <textarea
        ref={inputRef}
        value={draft}
        maxLength={4000}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Escape") onOpenChange(false);
          if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
            event.preventDefault();
            submit(draft);
          }
        }}
        placeholder="输入客户情况或融资问题…"
        aria-label="输入给智能体的消息"
        rows={2}
      />
      <button onClick={() => submit(draft)} aria-label={pending ? "智能体正在回复" : "发送消息"} disabled={!draft.trim() || pending}>{pending ? <LoaderCircle className="spin" size={17} /> : <Send size={17} />}</button>
    </footer>
    <p>Enter 发送 · Shift + Enter 换行 · 请勿输入无关敏感信息</p>
  </section>;
}
