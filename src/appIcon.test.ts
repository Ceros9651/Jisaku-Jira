import indexHtml from '../index.html?raw';

/** public/ に置いたファイル（キーは '../public/<名前>'） */
const publicFiles = Object.keys(import.meta.glob('../public/*'));

function iconHrefs(): { rel: string; href: string }[] {
  const doc = new DOMParser().parseFromString(indexHtml, 'text/html');
  return [...doc.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]')].map((link) => ({
    rel: link.getAttribute('rel') ?? '',
    href: link.getAttribute('href') ?? '',
  }));
}

describe('アプリのアイコン', () => {
  it('空のアイコン指定（data:,）を使わない', () => {
    expect(indexHtml).not.toContain('data:,');
  });

  it('SVG・PNG・apple-touch-icon を指定する', () => {
    expect(iconHrefs()).toEqual([
      { rel: 'icon', href: '%BASE_URL%icon.svg' },
      { rel: 'icon', href: '%BASE_URL%favicon-32.png' },
      { rel: 'apple-touch-icon', href: '%BASE_URL%apple-touch-icon.png' },
    ]);
  });

  it('指定したアイコンは public/ に実在する', () => {
    for (const { href } of iconHrefs()) {
      expect(publicFiles).toContain(`../public/${href.replace('%BASE_URL%', '')}`);
    }
  });
});
