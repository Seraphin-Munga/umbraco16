import { useEffect, useRef } from 'react';

interface NavModalProps {
  open: boolean;
  markup: string;
  onClose: () => void;
}

// The register/login modal's markup is CMS-authored (topNavigation's
// registerLogin rich-text property - see contentApi.ts) and already
// includes its own #nav-modal-overlay/#nav-modal/.nav-modal-tab structure,
// styled by the rules ported into Header.css. Since it arrives as an HTML
// string rather than JSX, showing/hiding it and switching tabs (originally
// jQuery in Navigation.cshtml) is done here via plain DOM access instead of
// React state/props on elements we don't control the markup of.
export function NavModal({ open, markup, onClose }: NavModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const overlay = container.querySelector<HTMLElement>('.nav-modal-overlay');
    const modal = container.querySelector<HTMLElement>('.nav-modal');

    if (overlay) overlay.style.display = open ? 'flex' : 'none';
    if (modal) modal.style.display = open ? 'flex' : 'none';
    document.body.style.overflow = open ? 'hidden' : '';
  }, [open, markup]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function handleClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (target.closest('#closeModalBtn')) {
        onClose();
        return;
      }

      const tab = target.closest('.nav-modal-tab');
      if (!tab || !container) return;

      const tabs = Array.from(container.querySelectorAll('.nav-modal-tab'));
      const contents = Array.from(container.querySelectorAll('.nav-modal-tab-content'));
      const index = tabs.indexOf(tab);

      tabs.forEach((t) => t.classList.remove('active'));
      contents.forEach((c) => c.classList.remove('active'));

      tab.classList.add('active');
      contents[index]?.classList.add('active');
    }

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, [markup, onClose]);

  if (!markup) return null;

  // eslint-disable-next-line react/no-danger -- CMS-authored content, not user input
  return <div ref={containerRef} dangerouslySetInnerHTML={{ __html: markup }} />;
}
