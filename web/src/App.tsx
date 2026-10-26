import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Composer } from "./components/Composer";
import {
  CommandPalette,
  ConfirmCloseModal,
  ConfirmCloseWorkspaceModal,
  CreateTabModal,
  CreateWorkspaceModal,
  SettingsModal,
} from "./components/Modals";
import { SessionView } from "./components/SessionView";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { useHerdr } from "./hooks/useHerdr";
import { useMobileSidebarGesture } from "./hooks/useMobileSidebarGesture";
import { usePushSetup } from "./hooks/usePush";
import { isReadOnly, type AgentView, type WorkspaceView } from "./lib/types";

export default function App() {
  usePushSetup();
  const herdr = useHerdr();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [compactSidebar, setCompactSidebar] = useState(() =>
    window.matchMedia("(max-width: 820px)").matches,
  );
  const [commandOpen, setCommandOpen] = useState(false);
  const [workspaceModalOpen, setWorkspaceModalOpen] = useState(false);
  const [newTabWorkspaceId, setNewTabWorkspaceId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(() => new URLSearchParams(window.location.search).has("settings"));
  const [confirmCloseTarget, setConfirmCloseTarget] = useState<{
    pane: AgentView;
    session: string | undefined;
  } | null>(null);

  const [confirmWorkspaceTarget, setConfirmWorkspaceTarget] = useState<{
    workspace: WorkspaceView;
    session: string | undefined;
  } | null>(null);

  const selectedTab = herdr.snapshot.tabs.find((tab) => tab.tabId === herdr.selectedPane?.tabId);
  const sessions = herdr.snapshot.sessions?.length
    ? herdr.snapshot.sessions
    : [
        {
          name: "default",
          isPrimary: true,
          reachable: herdr.snapshot.bridge === "connected",
          agents: herdr.snapshot.agents.length,
          working: herdr.snapshot.agents.filter((agent) => agent.status === "working").length,
          blocked: herdr.snapshot.agents.filter((agent) => agent.status === "blocked").length,
        },
      ];
  const newTabWorkspace = herdr.snapshot.workspaces.find(
    (workspace) => workspace.workspaceId === newTabWorkspaceId,
  );
  const readOnly = isReadOnly(herdr.snapshot.device);
  const update = herdr.snapshot.update;
  const { sidebarRef, swipeProgress } = useMobileSidebarGesture({
    enabled: compactSidebar && !(commandOpen || workspaceModalOpen || newTabWorkspace ||
      confirmCloseTarget || confirmWorkspaceTarget || settingsOpen),
    open: mobileSidebarOpen,
    onOpenChange: setMobileSidebarOpen,
  });

  useEffect(() => {
    const query = window.matchMedia("(max-width: 820px)");
    const sync = () => setCompactSidebar(query.matches);
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (!compactSidebar) setMobileSidebarOpen(false);
  }, [compactSidebar]);

  const openNewWorkspace = useCallback(() => {
    if (!readOnly) setWorkspaceModalOpen(true);
  }, [readOnly]);

  const openNewTab = useCallback(
    (workspaceId?: string) => {
      if (!readOnly && workspaceId) setNewTabWorkspaceId(workspaceId);
    },
    [readOnly],
  );

  useEffect(() => {
    if (!readOnly) return;
    setWorkspaceModalOpen(false);
    setNewTabWorkspaceId(null);
    setConfirmCloseTarget(null);
  }, [readOnly]);

  useEffect(() => {
    if (confirmWorkspaceTarget && (
      readOnly || herdr.session !== confirmWorkspaceTarget.session ||
      (herdr.mode !== "live" && herdr.mode !== "demo") ||
      !herdr.snapshot.workspaces.some((workspace) =>
        workspace.workspaceId === confirmWorkspaceTarget.workspace.workspaceId &&
        workspace.label === confirmWorkspaceTarget.workspace.label)
    )) setConfirmWorkspaceTarget(null);
  }, [confirmWorkspaceTarget, readOnly, herdr.session, herdr.mode, herdr.snapshot.workspaces]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "n") {
        event.preventDefault();
        if (!readOnly && herdr.selectedPane) setNewTabWorkspaceId(herdr.selectedPane.workspaceId);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [herdr.selectedPane, readOnly]);

  const appClassName = useMemo(
    () => `app-shell mode-${herdr.mode}${mobileSidebarOpen ? " sidebar-mobile-open" : ""}`,
    [herdr.mode, mobileSidebarOpen],
  );

  return (
    <div className={appClassName}>
      <Sidebar
        snapshot={herdr.snapshot}
        sidebarRef={sidebarRef}
        swipeProgress={swipeProgress}
        selectedPaneId={herdr.selectedPaneId}
        mode={herdr.mode}
        readOnly={readOnly}
        actionBusy={herdr.actionBusy}
        compact={compactSidebar}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={() => setMobileSidebarOpen(false)}
        onSelectPane={herdr.selectPane}
        onSearch={() => setCommandOpen(true)}
        onNewWorkspace={openNewWorkspace}
        onNewTab={openNewTab}
        onCloseWorkspace={(workspaceId) => {
          const workspace = herdr.snapshot.workspaces.find((item) => item.workspaceId === workspaceId);
          if (workspace && !readOnly && !herdr.actionBusy && (herdr.mode === "live" || herdr.mode === "demo")) {
            setConfirmWorkspaceTarget({ workspace, session: herdr.session });
          }
        }}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <section className="workspace-surface">
        <Topbar
          pane={herdr.selectedPane}
          tab={selectedTab}
          sessions={sessions}
          session={herdr.session}
          bridgeConnected={herdr.snapshot.bridge === "connected"}
          readOnly={readOnly}
          onSessionChange={herdr.setSession}
          onOpenSidebar={() => setMobileSidebarOpen(true)}
          onNewTab={() => openNewTab(herdr.selectedPane?.workspaceId)}
          onRefresh={() => void herdr.refreshSnapshot()}
          onClosePane={() => {
            if (!readOnly && herdr.selectedPane) {
              setConfirmCloseTarget({ pane: herdr.selectedPane, session: herdr.session });
            }
          }}
        />

        {update?.bridgeStale ? (
          <div className="update-banner update-banner-restart" role="status">
            <RefreshCw />
            <span>The bridge changed on disk and needs a restart.</span>
            <button onClick={() => setSettingsOpen(true)}>Review</button>
          </div>
        ) : update?.releaseAvailable ? (
          <div className="update-banner" role="status">
            <RefreshCw />
            <span>Herdr Control {update.latest} is available.</span>
            {update.latestUrl && (
              <a href={update.latestUrl} target="_blank" rel="noreferrer">
                View release
                <ExternalLink />
              </a>
            )}
          </div>
        ) : null}

        <SessionView
          pane={herdr.selectedPane}
          tab={selectedTab}
          output={herdr.paneOutput}
          loading={herdr.paneLoading}
          bridgeConnected={herdr.snapshot.bridge === "connected"}
          mode={herdr.mode}
        />

        <Composer
          pane={herdr.selectedPane}
          tab={selectedTab}
          session={herdr.session}
          busy={herdr.actionBusy}
          readOnly={readOnly}
          onSend={herdr.send}
          onSendKeys={(keys) => void herdr.sendKeys(keys)}
          onUpload={herdr.uploadImage}
        />
      </section>

      {herdr.notice && <div className={`toast toast-${herdr.notice.tone}`}>{herdr.notice.message}</div>}

      <CommandPalette
        open={commandOpen}
        snapshot={herdr.snapshot}
        readOnly={readOnly}
        onClose={() => setCommandOpen(false)}
        onSelect={herdr.selectPane}
        onNewWorkspace={openNewWorkspace}
      />
      <CreateWorkspaceModal
        open={workspaceModalOpen}
        onClose={() => setWorkspaceModalOpen(false)}
        onCreate={(label, cwd) => void herdr.createWorkspace(label, cwd)}
      />
      <CreateTabModal
        open={Boolean(newTabWorkspace)}
        workspaceLabel={newTabWorkspace?.label ?? "workspace"}
        onClose={() => setNewTabWorkspaceId(null)}
        onCreate={(label) => newTabWorkspace && void herdr.createTab(newTabWorkspace.workspaceId, label)}
      />
      <ConfirmCloseModal
        open={Boolean(confirmCloseTarget)}
        pane={confirmCloseTarget?.pane ?? null}
        onClose={() => setConfirmCloseTarget(null)}
        onConfirm={() => {
          const target = confirmCloseTarget;
          setConfirmCloseTarget(null);
          if (target) void herdr.closePane(target.pane.paneId, target.session);
        }}
      />
      <ConfirmCloseWorkspaceModal
        open={Boolean(confirmWorkspaceTarget)}
        workspace={confirmWorkspaceTarget?.workspace ?? null}
        disabled={readOnly || herdr.actionBusy}
        onClose={() => setConfirmWorkspaceTarget(null)}
        onConfirm={() => {
          const target = confirmWorkspaceTarget;
          setConfirmWorkspaceTarget(null);
          if (target && !readOnly && !herdr.actionBusy && target.session === herdr.session &&
            (herdr.mode === "live" || herdr.mode === "demo") &&
            herdr.snapshot.workspaces.some((workspace) => workspace.workspaceId === target.workspace.workspaceId &&
              workspace.label === target.workspace.label)) {
            void herdr.closeWorkspace(target.workspace.workspaceId, target.session);
          }
        }}
      />
      <SettingsModal
        open={settingsOpen}
        update={update}
        updateBusy={herdr.actionBusy}
        readOnly={readOnly}
        onCheckUpdates={() => void herdr.checkForUpdates()}
        onClose={() => {
          setSettingsOpen(false);
          const url = new URL(window.location.href);
          url.searchParams.delete("settings");
          window.history.replaceState(null, "", url);
        }}
      />
    </div>
  );
}
