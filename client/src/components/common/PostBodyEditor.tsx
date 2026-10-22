import { useLayoutEffect, useRef } from "react";
import { fieldStyles } from "@/components/ui/fieldStyles";
import { cn } from "@/lib/utils";
import { postBodyFromClipboard, postBodyFromHtml } from "@/utils/postBodyPaste";
import "./postBodyEditor.css";

function formattedNodes(value: string) {
  const fragment = document.createDocumentFragment();
  for (const part of value.split(/(\*\*[^*\n]+\*\*)/g)) {
    if (part.startsWith("**") && part.endsWith("**")) {
      const bold = document.createElement("strong");
      bold.textContent = part.slice(2, -2);
      fragment.append(bold);
    } else fragment.append(document.createTextNode(part));
  }
  return fragment;
}

interface PostBodyEditorProps {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  className?: string;
}

/** Keeps a small, text-and-bold-only document while the existing API stores text. */
export default function PostBodyEditor({ value, onChange, invalid, describedBy, className }: PostBodyEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>();
  useLayoutEffect(() => {
    if (lastValue.current === value) return;
    editorRef.current?.replaceChildren(formattedNodes(value));
    lastValue.current = value;
  }, [value]);

  function update() {
    const next = postBodyFromHtml(editorRef.current?.innerHTML || "");
    lastValue.current = next;
    onChange(next);
  }

  function insert(text: string) {
    const editor = editorRef.current!;
    const selection = window.getSelection();
    let range = selection?.rangeCount ? selection.getRangeAt(0) : null;
    if (!range || !editor.contains(range.commonAncestorContainer)) {
      editor.focus();
      range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    const nodes = formattedNodes(text);
    const safeContent = document.createElement("div");
    safeContent.append(nodes);
    // Native insertion keeps the browser's undo history when supported.
    if (!document.execCommand?.("insertHTML", false, safeContent.innerHTML)) {
      const lastNode = safeContent.lastChild;
      range.deleteContents();
      const fragment = document.createDocumentFragment();
      fragment.append(...Array.from(safeContent.childNodes));
      range.insertNode(fragment);
      if (lastNode) range.setStartAfter(lastNode);
      range.collapse(true);
      selection?.removeAllRanges();
      selection?.addRange(range);
    }
    update();
  }

  return <div
    ref={editorRef}
    id="post-body"
    role="textbox"
    aria-label="Post Body"
    aria-multiline="true"
    aria-invalid={invalid}
    aria-describedby={describedBy}
    contentEditable
    suppressContentEditableWarning
    data-empty={value.length === 0}
    data-empty-placeholder="Write the full post announcement, guidelines, or event details here. Separate paragraphs with an empty line..."
    className={cn(fieldStyles.surface, "gw-post-body-editor relative min-h-64 max-h-96 w-full overflow-y-auto whitespace-pre-wrap break-words p-3.5 text-sm leading-relaxed", className)}
    onInput={update}
    onPaste={(event) => {
      event.preventDefault();
      insert(postBodyFromClipboard(event.clipboardData.getData("text/html"), event.clipboardData.getData("text/plain")));
    }}
    onDrop={(event) => { event.preventDefault(); }}
  />;
}
