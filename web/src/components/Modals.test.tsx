// @vitest-environment jsdom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { expect, it, vi } from "vitest";
import { demoSnapshot } from "../lib/mock";
import { ConfirmCloseWorkspaceModal } from "./Modals";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

it("names the workspace, explains the effect, and requires explicit confirmation", () => {
  const container = document.createElement("div");
  document.body.append(container);
  const root = createRoot(container);
  const onClose = vi.fn(); const onConfirm = vi.fn();
  const props = { open: true, workspace: demoSnapshot.workspaces[0], disabled: false, onClose, onConfirm };
  try {
    act(() => root.render(<ConfirmCloseWorkspaceModal {...props} />));
    expect(container.querySelector('[role="dialog"]')?.textContent).toContain(props.workspace.label);
    expect(container.textContent).toContain("stops all processes");
    expect(onConfirm).not.toHaveBeenCalled();
    const buttons = () => [...container.querySelectorAll<HTMLButtonElement>("button")];
    act(() => buttons().find(b => b.textContent === "Cancel")!.click());
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
    act(() => root.render(<ConfirmCloseWorkspaceModal {...props} disabled />));
    expect(buttons().find(b => b.textContent === "Close workspace")!.disabled).toBe(true);
    act(() => root.render(<ConfirmCloseWorkspaceModal {...props} />));
    act(() => buttons().find(b => b.textContent === "Close workspace")!.click());
    expect(onConfirm).toHaveBeenCalledOnce();
  } finally {
    act(() => root.unmount()); container.remove();
  }
});
