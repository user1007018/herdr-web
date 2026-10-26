import {
  ChevronDown,
  ChevronRight,
  ChevronsDownUp,
  ChevronsUpDown,
  Folder,
  FolderPlus,
  PanelRightClose,
  Search,
  Settings,
  SquarePen,
  TerminalSquare,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState, type Ref } from "react";
import type { AgentView, SnapshotResponse } from "../lib/types";
import { STATUS_LABEL } from "../lib/types";
import { StatusDot } from "./StatusDot";

interface SidebarProps {
  snapshot: SnapshotResponse;
  sidebarRef?: Ref<HTMLElement>;
  swipeProgress?: number | null;
  selectedPaneId: string;
  mode: "connecting" | "live" | "offline" | "demo";
  readOnly: boolean;
  actionBusy: boolean;
  compact: boolean;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onSelectPane: (paneId: string) => void;
  onSearch: () => void;
  onNewWorkspace: () => void;
  onNewTab: (workspaceId: string) => void;
  onCloseWorkspace: (workspaceId: string) => void;
  onOpenSettings: () => void;
}

function paneTitle(pane: AgentView): string {
  if (pane.kind === "shell") return "Shell";
  return pane.agent.charAt(0).toUpperCase() + pane.agent.slice(1);
}

function relativePath(pane: AgentView): string {
  const parts = pane.cwd.split("/").filter(Boolean);
  return parts.slice(-2).join("/") || pane.cwd;
}

export function Sidebar({
  snapshot,
  sidebarRef,
  swipeProgress,
  selectedPaneId,
  mode,
  readOnly,
  actionBusy,
  compact,
  mobileOpen,
  onMobileClose,
  onSelectPane,
  onSearch,
  onNewWorkspace,
  onNewTab,
  onCloseWorkspace,
  onOpenSettings,
}: SidebarProps) {
  const allPanes = useMemo(() => [...snapshot.agents, ...snapshot.shellPanes], [snapshot]);
  const selectedPane = allPanes.find((pane) => pane.paneId === selectedPaneId);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const selectedWorkspaceId = selectedPane?.workspaceId;
  const dragging = compact && swipeProgress != null;
  const allCollapsed = snapshot.workspaces.length > 0 &&
    snapshot.workspaces.every((workspace) => collapsed.has(workspace.workspaceId));
  const toggleAllLabel = allCollapsed ? "Expand all workspaces" : "Collapse all workspaces";

  useEffect(() => {
    if (!selectedWorkspaceId) return;
    setCollapsed((current) => {
      if (!current.has(selectedWorkspaceId)) return current;
      const next = new Set(current);
      next.delete(selectedWorkspaceId);
      return next;
    });
  }, [selectedPaneId, selectedWorkspaceId]);

  const toggleWorkspace = (workspaceId: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(workspaceId)) next.delete(workspaceId);
      else next.add(workspaceId);
      return next;
    });
  };

  return (
    <>
      <button
        className={`sidebar-scrim${mobileOpen || dragging ? " is-visible" : ""}`}
        style={dragging ? { opacity: swipeProgress!, transition: "none" } : undefined}
        aria-label="Close sidebar"
        aria-hidden={!mobileOpen}
        tabIndex={mobileOpen ? 0 : -1}
        onClick={onMobileClose}
      />
      <aside
        ref={sidebarRef}
        className={`sidebar${mobileOpen ? " is-open" : ""}${dragging ? " is-dragging" : ""}`}
        style={dragging ? { transform: `translateX(${(1 - swipeProgress!) * 100}%)`, transition: "none" } : undefined}
        aria-label="Herdr workspaces"
        aria-hidden={compact && !mobileOpen}
        inert={compact && !mobileOpen}
      >
        <header className="sidebar-header">
          <div className="brand-lockup">
            <img src="/herdr.svg" width="32" height="32" alt="" />
            <span className="brand-name">Herdr</span>
            <span className="brand-stage">WEB</span>
          </div>
          <button className="icon-button sidebar-close" onClick={onMobileClose} title="Close sidebar">
            <PanelRightClose />
          </button>
        </header>

        <div className="sidebar-search-row">
          <button className="search-button" onClick={onSearch}>
            <Search />
            <span>Search</span>
            <kbd>⌘K</kbd>
          </button>
        </div>

        <div className="sidebar-section-heading">
          <span>Workspaces</span>
          <div className="sidebar-heading-actions">
            <button
              className="mini-icon-button"
              onClick={() => setCollapsed(allCollapsed
                ? new Set()
                : new Set(snapshot.workspaces.map((workspace) => workspace.workspaceId)))}
              disabled={snapshot.workspaces.length === 0}
              aria-label={toggleAllLabel}
              aria-expanded={!allCollapsed}
              aria-controls="workspace-list"
              title={toggleAllLabel}
            >
              {allCollapsed ? <ChevronsUpDown aria-hidden="true" /> : <ChevronsDownUp aria-hidden="true" />}
            </button>
            <button
              className="mini-icon-button"
              onClick={onNewWorkspace}
              disabled={readOnly}
              aria-label="New workspace"
              title={readOnly ? "Read-only access" : "New workspace"}
            >
              <FolderPlus />
            </button>
          </div>
        </div>

        <div className="workspace-list" id="workspace-list">
          {snapshot.workspaces.map((workspace) => {
            const workspacePanes = allPanes.filter((pane) => pane.workspaceId === workspace.workspaceId);
            const workspaceStatus =
              workspacePanes.find((pane) => pane.status === "blocked")?.status ??
              workspacePanes.find((pane) => pane.status === "working")?.status ??
              workspacePanes.find((pane) => pane.status === "done")?.status ??
              "idle";
            const isCollapsed = collapsed.has(workspace.workspaceId);
            return (
              <section className="workspace-group" key={workspace.workspaceId}>
                <div className="workspace-row">
                  <button
                    className="workspace-toggle"
                    onClick={() => toggleWorkspace(workspace.workspaceId)}
                    aria-expanded={!isCollapsed}
                  >
                    {isCollapsed ? <ChevronRight /> : <ChevronDown />}
                    <span className="workspace-symbol" aria-hidden="true">
                      <Folder />
                    </span>
                    <span className="workspace-label">{workspace.label}</span>
                    <StatusDot status={workspaceStatus} pulse={workspaceStatus === "working"} />
                  </button>
                  <button
                    className="mini-icon-button workspace-add"
                    onClick={() => onNewTab(workspace.workspaceId)}
                    disabled={readOnly}
                    aria-label={`New tab in ${workspace.label}`}
                    title={readOnly ? "Read-only access" : `New tab in ${workspace.label}`}
                  >
                    <SquarePen />
                  </button>
                  <button
                    className="mini-icon-button workspace-close"
                    onClick={() => onCloseWorkspace(workspace.workspaceId)}
                    disabled={readOnly || actionBusy || (mode !== "live" && mode !== "demo")}
                    aria-label={`Close workspace ${workspace.label}`}
                    title={readOnly ? "Read-only access" : `Close workspace ${workspace.label}`}
                  >
                    <X aria-hidden="true" />
                  </button>
                </div>

                {!isCollapsed && (
                  <div className="pane-list">
                    {workspacePanes.length === 0 && <div className="empty-workspace-row">No panes</div>}
                    {workspacePanes.map((pane) => (
                      <button
                        className={`pane-row${pane.paneId === selectedPaneId ? " is-active" : ""}`}
                        key={pane.paneId}
                        onClick={() => {
                          onSelectPane(pane.paneId);
                          onMobileClose();
                        }}
                      >
                        <span className="pane-row-icon" aria-hidden="true">
                          {pane.kind === "shell" ? <TerminalSquare /> : <StatusDot status={pane.status} pulse={pane.status === "working"} />}
                        </span>
                        <span className="pane-row-copy">
                          <span className="pane-row-title">
                            <strong>{paneTitle(pane)}</strong>
                            <span>{STATUS_LABEL[pane.status]}</span>
                          </span>
                          <span className="pane-row-path">{relativePath(pane)}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>

        <footer className="sidebar-footer">
          <button className="settings-button" onClick={onOpenSettings}>
            <Settings />
            <span>Settings</span>
          </button>
          <div className="bridge-mode" title={mode === "demo" ? "Using the built-in demo transport" : "Connected to the Herdr bridge"}>
            <span className={`bridge-mode-dot mode-${mode}`} />
            <span>{mode === "demo" ? "Demo" : mode === "live" ? "Live" : mode === "offline" ? "Offline" : "Connecting"}</span>
          </div>
        </footer>
      </aside>
    </>
  );
}
