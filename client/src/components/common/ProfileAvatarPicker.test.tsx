import { fireEvent, render, screen } from "@testing-library/react";
import { expect, it } from "vitest";
import { ProfileAvatarImage } from "./ProfileAvatarPicker";

it("shows image loading until the new portrait loads and resets when the avatar changes", () => {
  const { container, rerender } = render(<ProfileAvatarImage avatarId="avatar-1" />);
  expect(screen.getByRole("status", { name: "Loading avatar" })).toBeInTheDocument();
  const image = container.querySelector("img")!;
  expect(image.src).toContain("/profile-avatars/avatar-1.webp");
  fireEvent.load(image);
  expect(screen.queryByRole("status", { name: "Loading avatar" })).not.toBeInTheDocument();
  rerender(<ProfileAvatarImage avatarId="avatar-2" />);
  expect(screen.getByRole("status", { name: "Loading avatar" })).toBeInTheDocument();
  fireEvent.error(container.querySelector("img")!);
  expect(screen.queryByRole("status", { name: "Loading avatar" })).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: "Avatar image unavailable" })).toBeInTheDocument();
});
