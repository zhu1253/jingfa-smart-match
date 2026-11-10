import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Trash2 } from "lucide-react";
import type { ClientRecord } from "../types";

export function DeleteClientDialog({ record, onDelete, onCancel }: { record: ClientRecord; onDelete: (id: string) => boolean; onCancel: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [error, setError] = useState("");
  useEffect(() => { const dialog = dialogRef.current; dialog?.showModal(); return () => dialog?.close(); }, []);
  return createPortal(<dialog ref={dialogRef} className="delete-client-dialog" aria-labelledby="delete-client-title" aria-describedby="delete-client-description" onCancel={onCancel} onClose={onCancel}>
    <span className="delete-client-icon"><Trash2 size={23} /></span>
    <h2 id="delete-client-title">确认删除客户？</h2>
    <p id="delete-client-description">即将删除“<strong>{record.profile.companyName || "未命名客户"}</strong>”。该客户将从客户管理、工作台和智能体当前客户资料中移除，删除后无法恢复。</p>
    {error ? <p className="delete-client-error" role="alert">{error}</p> : null}
    <footer><button type="button" className="button secondary" autoFocus onClick={onCancel}>取消</button><button type="button" className="button danger" onClick={() => { if (onDelete(record.id)) onCancel(); else setError("删除未保存，请检查浏览器存储后重试。客户资料仍保留。"); }}><Trash2 size={15} />确认删除</button></footer>
  </dialog>, document.body);
}
