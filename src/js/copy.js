/** Copy-to-clipboard buttons with a short confirmation state. */
function initCopy() {
  $$('[data-copy]').forEach((button) => {
    const original = button.textContent;
    button.addEventListener('click', async () => {
      const value = button.dataset.copy ?? '';
      try {
        await navigator.clipboard.writeText(value);
      } catch {
        const field = document.createElement('textarea');
        field.value = value;
        document.body.append(field);
        field.select();
        try {
          document.execCommand('copy');
        } catch {
          /* clipboard unavailable: the button still confirms, the email stays selectable */
        }
        field.remove();
      }
      button.dataset.state = 'copied';
      button.textContent = button.dataset.copied ?? 'Copied';
      setTimeout(() => {
        delete button.dataset.state;
        button.textContent = original;
      }, 1800);
    });
  });
}
