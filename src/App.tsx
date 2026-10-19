import { useRef, useState } from 'react';
import {
  type Backlog,
  type Pbi,
  type Status,
  STATUS_LABELS,
  countItems,
  findPbi,
  resolveRef,
} from './backlog/model';
import type { BacklogRemote } from './backlog/remote';
import { getStorage, loadLegacyBacklog, removeLegacyBacklog } from './backlog/storage';
import { readBacklogFile, downloadBacklog } from './backlog/transfer';
import { useBacklog } from './backlog/useBacklog';
import styles from './App.module.css';
import { BacklogTable } from './components/BacklogTable';
import { ConfirmDialog } from './components/ConfirmDialog';
import { CreatePbiForm } from './components/CreatePbiForm';
import { DetailPanel } from './components/DetailPanel';
import { ProjectNameForm } from './components/ProjectNameForm';
import { ProjectActionsMenu } from './components/ProjectActionsMenu';
import { ProjectSwitcher } from './components/ProjectSwitcher';
import { useActiveProject } from './useActiveProject';
import { useSelectedPbi } from './useSelectedPbi';

type Props = {
  /** 共有データの窓口。main.tsx で Firestore の実装を渡す */
  remote: BacklogRemote;
  storage?: Storage | null;
};

/** 置き換えの確認に出す、置き換え後の内容。source は「「backup.json」の内容」など */
type PendingImport = { backlog: Backlog; source: string; legacy: boolean };

const now = () => new Date().toISOString();

const sumPoints = (items: Pbi[]) => items.reduce((sum, p) => sum + (p.storyPoints ?? 0), 0);

const pointsByStatus = (items: Pbi[], statuses: Status[]) =>
  statuses.map((status) => ({ status, points: sumPoints(items.filter((p) => p.status === status)) }));

/** 「2 プロジェクト・12 件」 */
function describeBacklog(backlog: Backlog): string {
  return `${backlog.projects.length} プロジェクト・${countItems(backlog)} 件`;
}

export function App({ remote, storage: storageProp }: Props) {
  const [storage] = useState(() => (storageProp === undefined ? getStorage() : storageProp));
  const { backlog, dispatch, status, connectionError, loadError, saveFailed, dismissSaveFailed, startEmpty, replace } =
    useBacklog(remote);
  const ready = status === 'ready';
  const [selected, select] = useSelectedPbi();
  const [project, setActiveProject] = useActiveProject(backlog, selected, ready && loadError === null, storage);
  // 見出しの位置の名前の入力欄。名前の変更と、プロジェクトの作成で使う
  const [nameEdit, setNameEdit] = useState<'rename' | 'create' | null>(null);
  const switcherRef = useRef<HTMLButtonElement>(null);
  const [confirmingDeleteProject, setConfirmingDeleteProject] = useState(false);
  // このブラウザに残った以前のデータ。読めるときだけ知らせ、読めないデータには触れない
  const [legacy, setLegacy] = useState(() => {
    const result = loadLegacyBacklog(storage);
    return result.kind === 'loaded' ? result.backlog : null;
  });
  const [confirmingRemoveLegacy, setConfirmingRemoveLegacy] = useState(false);
  const [pendingImport, setPendingImport] = useState<PendingImport | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [confirmingStartEmpty, setConfirmingStartEmpty] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const items = project.items;
  // 開いている PBI のプロジェクトは、useActiveProject が選ぶ project と同じになる
  const selectedPbi = selected === null ? null : (findPbi(backlog, resolveRef(backlog, selected))?.pbi ?? null);
  const selectedRef = selectedPbi && { projectId: project.id, number: selectedPbi.number };
  // 並び順は items のまま、未完了と Done に分けて表示する
  const activeItems = items.filter((p) => p.status !== 'done');
  const doneItems = items.filter((p) => p.status === 'done');
  const activePoints = sumPoints(activeItems);
  const donePoints = sumPoints(doneItems);
  // ステータス別の SP は区画ごとに、その区画の PBI だけで数える（バッジの合計が区画の pt と一致する）
  const activePointsByStatus = pointsByStatus(activeItems, ['todo', 'in_progress']);
  const donePointsByStatus = pointsByStatus(doneItems, ['done']);

  function changeStatus(number: number, status: Status) {
    dispatch({ type: 'update', projectId: project.id, number, changes: { status }, now: now() });
  }

  function selectPbi(number: number) {
    select({ projectId: project.id, number });
  }

  /** プロジェクトの切り替え。開いていた詳細パネルと名前の入力欄は閉じる */
  function switchProject(id: number) {
    select(null);
    setNameEdit(null);
    setActiveProject(id);
  }

  /** 作成の入力欄を閉じたあと、切り替えのボタンにフォーカスを戻す */
  function focusSwitcher() {
    requestAnimationFrame(() => switcherRef.current?.focus());
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
      setPendingImport({ backlog: result.backlog, source: `「${file.name}」の内容`, legacy: false });
    } else {
      setImportError(`「${file.name}」を読み込めませんでした: ${result.reason}`);
    }
  }

  const openImport = () => fileInputRef.current?.click();

  async function confirmImport({ backlog: next, legacy: fromLegacy }: PendingImport) {
    setPendingImport(null);
    switchProject(next.projects[0].id);
    // 以前のデータは、共有データに保存できたときだけ消す
    if ((await replace(next)) && fromLegacy) {
      removeLegacyBacklog(storage);
      setLegacy(null);
    }
  }

  function removeLegacy() {
    removeLegacyBacklog(storage);
    setLegacy(null);
    setConfirmingRemoveLegacy(false);
  }

  return (
    <div className={styles.app}>
      <header className={styles.topNav}>
        <span className={styles.brand}>
          <img src={`${import.meta.env.BASE_URL}icon.svg`} alt="" width={24} height={24} />
          <span className={styles.appName}>Jisaku Jira</span>
        </span>
        {ready && (
          <div className={styles.headerActions}>
            <button
              type="button"
              className={styles.subtle}
              onClick={() => downloadBacklog(backlog)}
              disabled={loadError !== null}
            >
              エクスポート
            </button>
            <button type="button" className={styles.subtle} onClick={openImport}>
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
        )}
      </header>

      {status === 'loading' && (
        <main className={styles.loadError}>
          <p role="status">読み込み中…</p>
        </main>
      )}

      {status === 'error' && (
        <main className={styles.loadError}>
          <h1 className={styles.heading}>共有データを読み込めませんでした</h1>
          <p className={styles.reason}>{connectionError}</p>
          <p>接続を確認して、再読み込みしてください。</p>
          <div className={styles.loadErrorActions}>
            <button type="button" className={styles.primary} onClick={() => window.location.reload()}>
              再読み込み
            </button>
          </div>
        </main>
      )}

      {ready && legacy && (
        <div className={styles.warning} data-testid="legacy-backlog">
          <span>このブラウザに以前のデータ（{describeBacklog(legacy)}）が残っています。</span>
          <span className={styles.bannerActions}>
            <button
              type="button"
              className={styles.textButton}
              onClick={() => setPendingImport({ backlog: legacy, source: 'このブラウザの以前のデータ', legacy: true })}
            >
              共有データに取り込む
            </button>
            <button type="button" className={styles.textButton} onClick={() => downloadBacklog(legacy)}>
              ファイルに書き出す
            </button>
            <button type="button" className={styles.textButton} onClick={() => setConfirmingRemoveLegacy(true)}>
              このブラウザから消す
            </button>
          </span>
        </div>
      )}

      {saveFailed && (
        <div role="alert" className={styles.warning}>
          <span>変更を保存できませんでした。接続を確認して、もう一度操作してください。</span>
          <button type="button" className={styles.textButton} onClick={dismissSaveFailed}>
            閉じる
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

      {!ready ? null : loadError !== null ? (
        <main className={styles.loadError}>
          <h1 className={styles.heading}>共有データを読み込めませんでした</h1>
          <p className={styles.reason}>{loadError}</p>
          <p>
            共有データはまだ上書きしていません。エクスポートしたファイルがあればインポートして復元できます。空のバックログで始めると、共有データは上書きされます。
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
          <div className={styles.content}>
            <div className={styles.pageHeader}>
              <nav aria-label="パンくず">
                <ol className={styles.breadcrumbs}>
                  <li>プロジェクト</li>
                  <li>
                    <span aria-current="page">{project.name}</span>
                  </li>
                </ol>
              </nav>

              <div className={styles.titleRow}>
                {nameEdit === 'rename' ? (
                  <ProjectNameForm
                    label="プロジェクト名"
                    initialName={project.name}
                    onSubmit={(name) => {
                      dispatch({ type: 'renameProject', id: project.id, name });
                      setNameEdit(null);
                    }}
                    onCancel={() => setNameEdit(null)}
                  />
                ) : nameEdit === 'create' ? (
                  <ProjectNameForm
                    label="新しいプロジェクトの名前"
                    onSubmit={(name) => {
                      // 作成される id は dispatch 前の nextProjectId
                      const id = backlog.nextProjectId;
                      dispatch({ type: 'createProject', name });
                      switchProject(id);
                      focusSwitcher();
                    }}
                    onCancel={() => {
                      setNameEdit(null);
                      focusSwitcher();
                    }}
                  />
                ) : (
                  <h1 id="backlog-heading" className={styles.heading}>
                    {project.name}
                  </h1>
                )}
                <ProjectSwitcher
                  projects={backlog.projects}
                  activeId={project.id}
                  onSelect={switchProject}
                  onAdd={() => setNameEdit('create')}
                  buttonRef={switcherRef}
                />
                <ProjectActionsMenu
                  canDelete={backlog.projects.length > 1}
                  onRename={() => setNameEdit('rename')}
                  onDelete={() => setConfirmingDeleteProject(true)}
                />
              </div>

              {/* ビューはバックログだけ。押しても画面は変わらないので、リンクにしない */}
              <nav aria-label="ビュー">
                <ul className={styles.views}>
                  <li>
                    <span className={styles.view} aria-current="page">
                      バックログ
                    </span>
                  </li>
                </ul>
              </nav>
            </div>

            <section className={styles.section} aria-labelledby="active-heading">
              <div className={styles.sectionHeader}>
                <h2 id="active-heading" className={styles.sectionHeading}>
                  バックログ
                </h2>
                <p className={styles.summary} data-testid="backlog-summary">
                  <span>{activeItems.length} 件の PBI</span>
                  <span>{activePoints} pt</span>
                </p>
                <StatusPoints points={activePointsByStatus} />
              </div>

              {items.length === 0 ? (
                <p className={styles.empty}>PBI はまだありません。下の「作成」にタイトルを入れて作成してください。</p>
              ) : activeItems.length === 0 ? (
                <p className={styles.empty}>未完了の PBI はありません。</p>
              ) : (
                <BacklogTable
                  projectId={project.id}
                  items={activeItems}
                  label="未完了の PBI"
                  selected={selectedPbi?.number ?? null}
                  onSelect={selectPbi}
                  onStatusChange={changeStatus}
                  onMove={(number, overNumber) => {
                    // 表の中の位置ではなく、Done も含めたバックログ全体の位置に置き換える
                    const toIndex = items.findIndex((p) => p.number === overNumber);
                    if (toIndex !== -1) dispatch({ type: 'move', projectId: project.id, number, toIndex });
                  }}
                />
              )}

              <CreatePbiForm
                onCreate={(title) => dispatch({ type: 'create', projectId: project.id, title, now: now() })}
              />
            </section>

            {doneItems.length > 0 && (
              <section className={styles.section} aria-labelledby="done-heading">
                <div className={styles.sectionHeader}>
                  <h2 id="done-heading" className={styles.sectionHeading}>
                    Done
                  </h2>
                  <p className={styles.summary} data-testid="done-summary">
                    <span>{doneItems.length} 件の PBI</span>
                    <span>{donePoints} pt</span>
                  </p>
                  <StatusPoints points={donePointsByStatus} />
                </div>
                <BacklogTable
                  projectId={project.id}
                  items={doneItems}
                  sortable={false}
                  labelledBy="done-heading"
                  selected={selectedPbi?.number ?? null}
                  onSelect={selectPbi}
                  onStatusChange={changeStatus}
                />
              </section>
            )}
          </div>

          {selectedPbi && selectedRef && (
            <DetailPanel
              key={`${selectedRef.projectId}/${selectedRef.number}`}
              pbi={selectedPbi}
              onSave={(changes) => dispatch({ type: 'update', ...selectedRef, changes, now: now() })}
              onStatusChange={(status) => dispatch({ type: 'update', ...selectedRef, changes: { status }, now: now() })}
              onDelete={() => {
                dispatch({ type: 'delete', ...selectedRef });
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
          onConfirm={() => void confirmImport(pendingImport)}
          onCancel={() => setPendingImport(null)}
        >
          <p>
            {loadError === null ? `現在の共有データ（${describeBacklog(backlog)}）を、` : '共有データを、'}
            {pendingImport.source}（{describeBacklog(pendingImport.backlog)}）で置き換えます。
          </p>
          <p>他の人の画面の内容も置き換わります。</p>
        </ConfirmDialog>
      )}

      {confirmingRemoveLegacy && legacy && (
        <ConfirmDialog
          title="以前のデータを消しますか？"
          confirmLabel="消す"
          danger
          onConfirm={removeLegacy}
          onCancel={() => setConfirmingRemoveLegacy(false)}
        >
          <p>
            このブラウザに残っている以前のデータ（{describeBacklog(legacy)}
            ）を消します。共有データは変わりません。元に戻せないため、必要ならファイルに書き出してから消してください。
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
            void startEmpty();
          }}
          onCancel={() => setConfirmingStartEmpty(false)}
        >
          <p>読み込めなかった共有データは上書きされ、元に戻せません。他の人の画面も空のバックログになります。</p>
        </ConfirmDialog>
      )}
    </div>
  );
}

/** 区画の見出しの行の右端の、ステータス別の SP のバッジ。色はステータスのラベルと揃える */
function StatusPoints({ points }: { points: { status: Status; points: number }[] }) {
  return (
    <ul className={styles.statusPoints} aria-label="ステータス別の SP">
      {points.map(({ status, points }) => (
        <li key={status} className={styles[status]} title={STATUS_LABELS[status]}>
          <span className="visually-hidden">{STATUS_LABELS[status]} </span>
          {points}
        </li>
      ))}
    </ul>
  );
}
