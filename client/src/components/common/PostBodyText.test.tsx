import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { PostBodyText } from "./PostBodyText";
import { postBodyFromClipboard } from "@/utils/postBodyPaste";

afterEach(cleanup);

it("keeps pasted bold spans and line breaks while discarding HTML", () => {
  expect(postBodyFromClipboard('<p>Hello <strong>GreenWay</strong></p><p><br></p><p>Join <span style="font-weight:700">today</span>!</p>', ""))
    .toBe("Hello **GreenWay**\n\nJoin **today**!");
  expect(postBodyFromClipboard('<b style="font-weight:normal">Normal <b>bold</b></b>', "")).toBe("Normal **bold**");
});

it("uses the plain clipboard data when there is no bold formatting", () => {
  expect(postBodyFromClipboard('<div>hello</div>', "hello\nworld")).toBe("hello\nworld");
  expect(postBodyFromClipboard('', "hello")).toBe("hello");
});

it("drops executable clipboard elements and keeps only their safe surrounding text", () => {
  expect(postBodyFromClipboard('<script>alert(1)</script><strong onclick="alert(1)">Safe</strong><img src=x onerror="alert(1)">', ""))
    .toBe("**Safe**");
});

it("renders bold and Unicode hashtags without interpreting HTML", () => {
  const { container } = render(<PostBodyText text={'Hello **GreenWay** #Kalíñisan #clean_up\n<script>alert(1)</script> color#123'} />);
  expect(Array.from(container.querySelectorAll("strong")).map((node) => node.textContent)).toEqual(["GreenWay", "#Kalíñisan", "#clean_up"]);
  expect(container.querySelector("script")).toBeNull();
  expect(container.textContent).toContain("<script>alert(1)</script>");
  expect(container.textContent).toContain("color#123");
});

it("keeps incomplete bold markers and ordinary post text readable", () => {
  const { container } = render(<PostBodyText text={"Unfinished **text\nNext line"} />);
  expect(container.textContent).toBe("Unfinished **text\nNext line");
  expect(container.querySelector("strong")).toBeNull();
});
