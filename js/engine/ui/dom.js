// Small helpers shared by the screens.

// Makes an element, optionally with a class and text.
export function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

// Shows one screen (by id) and hides the others.
export function showScreen(id) {
  for (const screen of document.querySelectorAll('.screen')) screen.hidden = screen.id !== id;
  window.scrollTo(0, 0);
}

// Shows a startup or story error at the top of the page, on any screen.
export function showFatalError(error) {
  console.error(error);
  const area = document.getElementById('error-area') || document.body;
  area.append(el('pre', 'error-box', `Something went wrong.\n\n${error.message}`));
}
