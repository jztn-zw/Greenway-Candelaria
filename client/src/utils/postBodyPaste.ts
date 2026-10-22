/** Keep clipboard text, line breaks and bold only. HTML is never inserted into the page. */
export function postBodyFromClipboard(html: string, plainText: string): string {
  if (!html) return plainText;
  const { result, hasBold } = readPostBodyHtml(html);
  return hasBold ? result : plainText;
}

export function postBodyFromHtml(html: string): string {
  return readPostBodyHtml(html).result;
}

function readPostBodyHtml(html: string) {
  const document = new DOMParser().parseFromString(html, "text/html");
  let hasBold = false;
  const isBlock = (node: Node) => node instanceof HTMLElement && /^(P|DIV|LI|H[1-6]|BLOCKQUOTE|TR)$/.test(node.tagName);
  function readChildren(node: Node, insideBold = false): string {
    let text = "";
    for (const child of Array.from(node.childNodes)) {
      if (isBlock(child) && text && !text.endsWith("\n")) text += "\n";
      text += read(child, insideBold);
    }
    return text;
  }
  function read(node: Node, insideBold = false): string {
    if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
    if (!(node instanceof HTMLElement)) return "";
    if (["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"].includes(node.tagName)) return "";
    if (node.tagName === "BR") return "\n";
    const weight = node.style.fontWeight;
    const bold = weight ? weight === "bold" || Number(weight) >= 600 : ["B", "STRONG"].includes(node.tagName);
    const content = readChildren(node, insideBold || bold);
    const value = bold && !insideBold && content.trim()
      ? content.replace(/\S[^\n]*\S|\S/g, (line) => { hasBold = true; return `**${line}**`; })
      : content;
    return isBlock(node) && !value.endsWith("\n") ? `${value}\n` : value;
  }
  const result = readChildren(document.body).replace(/\n+$/, "");
  return { result, hasBold };
}
