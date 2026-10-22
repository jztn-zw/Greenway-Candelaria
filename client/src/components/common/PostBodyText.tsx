import { Fragment } from "react";

/** Deliberately supports only bold text and hashtags, never arbitrary HTML. */
export function PostBodyText({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*\n]+\*\*|(?<![\p{L}\p{N}_])#[\p{L}\p{N}_]+)/gu).map((part, index) => (
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : /^#[\p{L}\p{N}_]+$/u.test(part)
        ? <strong key={index}>{part}</strong>
        : <Fragment key={index}>{part}</Fragment>
  ))}</>;
}
