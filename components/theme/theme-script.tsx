// Runs before paint to apply the persisted theme and avoid FOUC.
export function ThemeScript() {
  const script = `
    (function() {
      try {
        var stored = localStorage.getItem('distill_theme');
        var theme = stored || 'system';
        var root = document.documentElement;
        root.classList.remove('dark', 'sepia');
        if (theme === 'system') {
          var dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
          if (dark) root.classList.add('dark');
        } else if (theme === 'dark') {
          root.classList.add('dark');
        } else if (theme === 'sepia') {
          root.classList.add('sepia');
        }
      } catch (e) {}
    })();
  `;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
