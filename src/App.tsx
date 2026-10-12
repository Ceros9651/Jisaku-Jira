import { useRef, useState } from 'react';
import { type Backlog, STATUSES, STATUS_LABELS, countItems, findPbi } from './backlog/model';
import { readBacklogFile, downloadBacklog } from './backlog/transfer';
import { useBacklog } from './backlog/useBacklog';
import styles from './App.module.css';
import { BacklogTable } from './components/BacklogTable';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CreatePbiForm } from './components/CreatePbiForm';
import { DetailPanel } from './components/DetailPanel';
import { ProjectNameForm } from './components/ProjectNameForm';
import { PROJECT_PANEL_ID, ProjectTabs, projectTabId } from './components/ProjectTabs';
import { useActiveProject } from './useActiveProject';
import { useSelectedPbi } from './useSelectedPbi';

type Props = {
  storage?: Storage | null;
};

const now = () => new Date().toISOString();

/** 「2 プロジェクト・12 件」 */
function describeBacklog(backlog: Backlog): string {
  return `${backlog.projects.length} プロジェクト・${countItems(backlog)} 件`;
}

export function App({ storage }: Props) {
  const { backlog, dispatch, loadError, saveFailed, startEmpty, replace } = useBacklog(storage);
  const [selected, select] = useSelectedPbi();
  const [project, setActiveProject] = useActiveProject(backlog, selected, loadError === null, storage);
  const [renaming, setRenaming] = useState(false);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ backlog: Backlog; fileName: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = project.items;
  const selectedPbi = selected === null ? null : (findPbi(backlog, selected)?.pbi ?? null);
  const totalPoints = items.reduce((sum, p) => sum + (p.storyPoints ?? 0), 0);
  const pointsByStatus = STATUSES.map((status) => ({
    status,
    points: items.filter((p) => p.status === status).reduce((sum, p) => sum + (p.storyPoints ?? 0), 0),
  }));

  /** タブの切り替え。開いていた詳細パネルと名前の変更は閉じる */
  function switchProject(id: number) {
    select(null);
    setRenaming(false);
    setActiveProject(id);
  }

  function deleteProject() {
    const index = backlog.projects.findIndex((p) => p.id === project.id);
    const neighbor = backlog.projects[index - 1] ?? backlog.projects[index + 1];
    dispatch({ type: 'deleteProject', id: project.id });
    setConfirmingDeleteProject(false);
    switchProject(neighbor.id);
  }

  async function handleFile(file: File) {
    const result = await readBacklogFile(file);
    if (result.ok) {
      setImportError(null);
      setPendingImport({ backlog: result.backlog, fileName: file.name });
    } else {
      setImportError(`「${file.name}」を読み込めませんでした: ${result.reason}`);
    }
  }

  const openImport = () => fileInputRef.current?.click();

  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <span className={styles.appName}>Jisaku Jira</span>
        <div className={styles.headerActions}>
          <button type="button" className={styles.secondary} onClick={() => downloadBacklog(backlog)} disabled={loadError !== null}>
            エクスポート
          </button>
          <button type="button" className={styles.secondary} onClick={openImport}>
            インポート
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            hidden
            data-testid="import-file"
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void handleFile(file);
            }}
          />
        </div>
      </header>

      {loadError === null && (
        <ProjectTabs
          projects={backlog.projects}
          activeId={project.id}
          onSelect={switchProject}
          onCreate={(name) => {
            // 作成される id は dispatch 前の nextProjectId
            const id = backlog.nextProjectId;
            dispatch({ type: 'createProject', name });
            switchProject(id);
          }}
        />
      )}

      {saveFailed && loadError === null && (
        <div role="alert" className={styles.warning}>
          <span>
            ブラウザに保存できませんでした。この画面を閉じると変更が失われるため、エクスポートしてファイルに退避してください。
          </span>
          <button type="button" className={styles.secondary} onClick={() => downloadBacklog(backlog)}>
            エクスポート
          </button>
        </div>
      )}

      {importError && (
        <div role="alert" className={styles.error}>
          <span>{importError}</span>
          <button type="button" className={styles.textButton} onClick={() => setImportError(null)}>
            閉じる
          </button>
        </div>
      )}

      {loadError !== null ? (
        <main className={styles.loadError}>
          <h1 className={styles.heading}>保存データを読み込めませんでした</h1>
          <p className={styles.reason}>{loadError}</p>
          <p>
            保存データはまだ上書きしていません。エクスポートしたファイルがあればインポートして復元できます。空のバックログで始めると、保存データは上書きされます。
          </p>
          <div className={styles.loadErrorActions}>
            <button type="button" className={styles.primary} onClick={openImport}>
              インポート
            </button>
            <button type="button" className={styles.secondary} onClick={() => setConfirmingStartEmpty(true)}>
              空で始める
            </button>
          </div>
        </main>
      ) : (
        <main className={selectedPbi ? styles.withPanel : styles.main}>
          <section
            id={PROJECT_PANEL_ID}
            role="tabpanel"
            className={styles.backlog}
            aria-labelledby={projectTabId(project.id)}
          >
            <div className={styles.titleRow}>
              {renaming ? (
                <ProjectNameForm
                  label="プロジェクト名"
                  size="heading"
                  initialName={project.name}
                  onSubmit={(name) => {
                    dispatch({ type: 'renameProject', id: project.id, name });
                    setRenaming(false);
                  }}
                  onCancel={() => setRenaming(false)}
                />
              ) : (
                <h1 id="backlog-heading" className={styles.heading}>
                  {project.name}
                </h1>
              )}
              <p className={styles.summary} data-testid="backlog-summary">
                <span>{items.length} 件</span>
                <span>{totalPoints} pt</span>
              </p>
              <ul className={styles.statusPoints} aria-label="ステータス別の SP">
                {pointsByStatus.map(({ status, points }) => (
                  <li key={status} className={styles[status]} title={STATUS_LABELS[status]}>
                    <span className="visually-hidden">{STATUS_LABELS[status]} </span>
                    {points}
                  </li>
                ))}
              </ul>
              <div className={styles.projectActions}>
                <button
                  type="button"
                  className={styles.quiet}
                  aria-label="プロジェクトの名前を変更"
                  onClick={() => setRenaming(true)}
                  disabled={renaming}
                >
                  名前を変更
                </button>
                <button
                  type="button"
                  className={styles.quiet}
                  aria-label="プロジェクトを削除"
                  onClick={() => setConfirmingDeleteProject(true)}
                  disabled={backlog.projects.length <= 1}
                  title={backlog.projects.length <= 1 ? 'プロジェクトが1つだけのときは削除できません' : undefined}
                >
                  削除
                </button>
              </div>
            </div>

            <CreatePbiForm
              onCreate={(title) => dispatch({ type: 'create', projectId: project.id, title, now: now() })}
            />

            {items.length === 0 ? (
              <p className={styles.empty}>PBI はまだありません。上の入力欄にタイトルを入れて作成してください。</p>
            ) : (
              <BacklogTable
                items={items}
                selected={selectedPbi?.number ?? null}
                onSelect={select}
                onStatusChange={(number, status) => dispatch({ type: 'update', number, changes: { status }, now: now() })}
                onMove={(number, toIndex) => dispatch({ type: 'move', number, toIndex })}
              />
            )}
          </section>

          {selectedPbi && (
            <DetailPanel
              key={selectedPbi.number}
              pbi={selectedPbi}
              onSave={(changes) => dispatch({ type: 'update', number: selectedPbi.number, changes, now: now() })}
              onStatusChange={(status) =>
                dispatch({ type: 'update', number: selectedPbi.number, changes: { status }, now: now() })
              }
              onDelete={() => {
                dispatch({ type: 'delete', number: selectedPbi.number });
                select(null);
              }}
              onClose={() => select(null)}
            />
          )}
        </main>
      )}

      {pendingImport && (
        <ConfirmDialog
          title="バックログを置き換えますか？"
          confirmLabel="置き換える"
          danger
          onConfirm={() => {
            replace(pendingImport.backlog);
            setPendingImport(null);
            switchProject(pendingImport.backlog.projects[0].id);
          }}
          onCancel={() => setPendingImport(null)}
        >
          <p>
            {loadError === null ? `現在のデータ（${describeBacklog(backlog)}）を、` : '保存データを、'}
            「{pendingImport.fileName}」の内容（{describeBacklog(pendingImport.backlog)}）で置き換えます。
          </p>
        </ConfirmDialog>
      )}

      {confirmingDeleteProject && (
        <ConfirmDialog
          title="プロジェクトを削除しますか？"
          confirmLabel="削除する"
          danger
          onConfirm={deleteProject}
          onCancel={() => setConfirmingDeleteProject(false)}
        >
          <p>
            「{project.name}」と PBI {items.length} 件を削除します。元に戻せません。
          </p>
        </ConfirmDialog>
      )}

      {confirmingStartEmpty && (
        <ConfirmDialog
          title="空のバックログで始めますか？"
          confirmLabel="空で始める"
          danger
          onConfirm={() => {
            setConfirmingStartEmpty(false);
            startEmpty();
          }}
          onCancel={() => setConfirmingStartEmpty(false)}
        >
          <p>読み込めなかった保存データは上書きされ、元に戻せません。</p>
        </ConfirmDialog>
      )}
    </div>
  );
}
