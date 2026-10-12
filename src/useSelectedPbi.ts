import { useCallback, useEffect, useState } from 'react';
import { formatPbiId, parsePbiId } from './backlog/model';

function readHash(): number | null {
  return parsePbiId(decodeURIComponent(window.location.hash.slice(1)));
}

/** 選択中の PBI を URL ハッシュ（`#PBI-3`）と同期する */
export function useSelectedPbi(): [number | null, (number: number | null) => void] {
  const [selected, setSelected] = useState(readHash);

  useEffect(() => {
    const onHashChange = () => setSelected(readHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const select = useCallback((number: number | null) => {
    setSelected(number);
    const { pathname, search } = window.location;
    const url = number === null ? pathname + search : `${pathname}${search}#${formatPbiId(number)}`;
    window.history.replaceState(null, '', url);
  }, []);

  return [selected, select];
}
