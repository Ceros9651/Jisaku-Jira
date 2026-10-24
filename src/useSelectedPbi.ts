import { useCallback, useEffect, useState } from 'react';
import { type PbiRef, type SelectedRef, parsePbiId } from './backlog/model';
import { pbiHash } from './backlog/share';

/** `#2/PBI-3` → プロジェクト 2 の PBI-3。以前の形式の `#PBI-3` → 最初のプロジェクトの PBI-3 */
function readHash(): SelectedRef | null {
  const hash = decodeURIComponent(window.location.hash.slice(1));
  const match = /^([1-9]\d*)\/(.+)$/.exec(hash);
  const number = parsePbiId(match ? match[2] : hash);
  if (number === null) return null;
  return match ? { projectId: Number(match[1]), number } : { projectId: 'first', number };
}

/**
 * 選択中の PBI を URL ハッシュ（`#2/PBI-3`）と同期する。
 * 以前の形式のハッシュで開いたときは書き換えず、選び直したときに新しい形式で書く。
 */
export function useSelectedPbi(): [SelectedRef | null, (ref: PbiRef | null) => void] {
  const [selected, setSelected] = useState(readHash);

  useEffect(() => {
    const onHashChange = () => setSelected(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const select = useCallback((ref: PbiRef | null) => {
    setSelected(ref);
    const { pathname, search } = window.location;
    const url = ref === null ? pathname + search : `${pathname}${search}#${pbiHash(ref)}`;
    window.history.replaceState(null, '', url);
  }, []);

  return [selected, select];
}
