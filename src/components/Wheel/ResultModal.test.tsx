// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import ResultModal from "./ResultModal";
import type { WheelItem } from "../../types";

vi.mock("canvas-confetti", () => ({ default: vi.fn() }));

const result: WheelItem = {
  id: "winner",
  text: "Pizza",
  weight: 1,
  color: "#f87171",
  colorClass: "color-red",
  hidden: false,
  count: 0,
};

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
});

describe("ResultModal", () => {
  it("focuses the dialog, closes on Escape, and restores focus", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    const trigger = document.createElement("button");
    trigger.textContent = "Spin";
    document.body.append(trigger);
    trigger.focus();

    const view = render(<ResultModal result={result} onClose={onClose} />);
    const dialog = screen.getByRole("dialog", { name: "Pizza" });

    expect(document.activeElement).toBe(dialog);
    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledOnce();

    view.unmount();
    expect(document.activeElement).toBe(trigger);
  });

  it("keeps keyboard focus inside the dialog", async () => {
    const user = userEvent.setup();
    render(<ResultModal result={result} onClose={vi.fn()} />);

    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
    await user.tab();
    expect(document.activeElement).toBe(closeButton);
  });
});
