import { render } from '@testing-library/react';
import { App } from '../App';
import type { BacklogRemote } from '../backlog/remote';

/** テスト用。偽の共有データにつないで App を描く。storage を省くと jsdom の localStorage を使う */
export function renderApp(remote: BacklogRemote, storage?: Storage | null) {
  return render(<App remote={remote} storage={storage} />);
}
