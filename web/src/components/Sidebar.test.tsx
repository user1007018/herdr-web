// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { demoSnapshot } from "../lib/mock";
import { Sidebar } from "./Sidebar";

(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;
const props = {
  snapshot: demoSnapshot,
  selectedPaneId: demoSnapshot.agents[0].paneId,
  mode: "demo" as const,
  readOnly: false,
  compact: false,
  mobileOpen: false,
  onMobileClose: vi.fn(),
  onSelectPane: vi.fn(),
  onSearch: vi.fn(),
  onNewWorkspace: vi.fn(),
  onNewTab: vi.fn(),
  onOpenSettings: vi.fn(),
  onCloseWorkspace: vi.fn(),
  actionBusy: false,
};
const button = (label: string) => {
  const result = container.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
  expect(result, label).not.toBeNull();
  return result!;
};
const toggles = () => [...container.querySelectorAll<HTMLButtonElement>(".workspace-toggle")];
const click = (element: HTMLButtonElement) => act(() => element.click());

beforeEach(() => {
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});
afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("workspace heading toggle", () => {
  it("collapses all groups, retains workspace names, and stays collapsed after refresh", () => {
    act(() => root.render(<Sidebar {...props} />));
    click(button("Collapse all workspaces"));
    expect(toggles().every((item) => item.getAttribute("aria-expanded") === "false")).toBe(true);
    expect(toggles()).toHaveLength(demoSnapshot.workspaces.length);
    expect(container.querySelector(".pane-list")).toBeNull();
    act(() => root.render(<Sidebar {...props} snapshot={structuredClone(demoSnapshot)} />));
    expect(toggles().every((item) => item.getAttribute("aria-expanded") === "false")).toBe(true);
    click(button("Expand all workspaces"));
    expect(toggles().every((item) => item.getAttribute("aria-expanded") === "true")).toBe(true);
  });

  it("collapses partially expanded groups and opens the selected group when selection changes", () => {
    act(() => root.render(<Sidebar {...props} />));
    click(toggles()[0]);
    click(button("Collapse all workspaces"));
    expect(toggles().every((item) => item.getAttribute("aria-expanded") === "false")).toBe(true);
    const next = demoSnapshot.agents.find((pane) => pane.workspaceId !== demoSnapshot.agents[0].workspaceId)!;
    act(() => root.render(<Sidebar {...props} selectedPaneId={next.paneId} />));
    const expanded = toggles().filter((item) => item.getAttribute("aria-expanded") === "true");
    expect(expanded).toHaveLength(1);
    expect(expanded[0].textContent).toContain(next.workspaceLabel);
  });

  it("allows read-only navigation and disables the toggle when there are no workspaces", () => {
    act(() => root.render(<Sidebar {...props} readOnly />));
    expect(button("Collapse all workspaces").disabled).toBe(false);
    act(() => root.render(<Sidebar {...props} snapshot={{ ...demoSnapshot, workspaces: [] }} />));
    expect(button("Collapse all workspaces").disabled).toBe(true);
  });
});


describe("workspace close control", () => {
  it("targets only the chosen workspace without selecting a pane", () => {
    props.onCloseWorkspace.mockClear();
    props.onSelectPane.mockClear();
    act(() => root.render(<Sidebar {...props} />));
    const workspace = demoSnapshot.workspaces[1];
    click(button(`Close workspace ${workspace.label}`));
    expect(props.onCloseWorkspace).toHaveBeenCalledExactlyOnceWith(workspace.workspaceId);
    expect(props.onSelectPane).not.toHaveBeenCalled();
  });

  it("disables closing for read-only, busy, and offline states", () => {
    for (const overrides of [{ readOnly: true }, { actionBusy: true }, { mode: "offline" as const }]) {
      act(() => root.render(<Sidebar {...props} {...overrides} />));
      expect(button(`Close workspace ${demoSnapshot.workspaces[0].label}`).disabled).toBe(true);
    }
  });
});
