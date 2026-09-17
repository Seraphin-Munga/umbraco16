import { useState } from 'react';
import './KaraboChat.css';

// Floating "Karabo" chat widget, rendered once at the app root (see
// App.tsx) so it stays fixed over every page. Ported from a static snippet
// (button + iframe, no toggle script or iframe src included in it) - open
// state is plain React state here instead, sliding the iframe on/off
// screen with the same translateY transform the snippet already showed in
// its "open" state (translateY(0px)).
//
// VITE_KARABO_CHAT_URL (see .env.example) is not set yet - the iframe
// renders with no src until that's configured.
const CHAT_SRC = import.meta.env.VITE_KARABO_CHAT_URL || undefined;

export function KaraboChat() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <iframe
        width={320}
        height={500}
        frameBorder={0}
        allowFullScreen
        name="karabo-chat"
        id="iframe-karabochat"
        title="Karabo Chat"
        src={CHAT_SRC}
        style={{ transform: isOpen ? 'translateY(0px)' : 'translateY(120%)' }}
      />
      <button aria-label="Open Chat" id="openChatButton" onClick={() => setIsOpen((open) => !open)}>
        <img id="chatIconImg" src="https://karabo-chatbot-prod.s3.eu-west-1.amazonaws.com/script/midlow.gif" alt="Chat Icon" />
      </button>
    </>
  );
}
