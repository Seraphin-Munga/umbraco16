import { useEffect } from 'react';
import './KaraboChat.css';

// Ported from master.cshtml's own Karabo implementation, which is NOT a
// hand-written button/iframe - it's a single third-party script tag near
// the end of <body>:
//   <script defer src="https://karabo-chatbot.s3.eu-west-1.amazonaws.com/script/mvskarabo.js"></script>
// That script injects its own widget DOM at runtime (a #openChatButton
// bubble with a #chatIconImg icon, and its own chat iframe/speech-bubble
// tooltip carrying the id #iframe-karaboChat-speechBubble) - master.cshtml
// never declares that markup itself, only CSS overrides targeting those
// script-created ids (confirmed by _pageModernHeaderv2.cshtml separately
// hiding #chatIconImg/#iframe-karaboChat-speechBubble with display:none,
// which only makes sense if a script put them there, not this app).
//
// An earlier version of this component guessed at hand-built markup (its
// own <iframe>/<button>) instead of loading the real script - wrong, since
// nothing in the CMS-derived source ever authors that markup directly.
// This component instead just loads the same script once at the app root
// (see App.tsx) and lets it manage its own DOM; KaraboChat.css carries the
// positioning overrides ported from master.cshtml's <style> blocks for the
// ids that script actually creates.
const DEFAULT_KARABO_SCRIPT_URL =
  'https://karabo-chatbot.s3.eu-west-1.amazonaws.com/script/mvskarabo.js';

const KARABO_SCRIPT_URL = import.meta.env.VITE_KARABO_CHAT_URL || DEFAULT_KARABO_SCRIPT_URL;

export function KaraboChat() {
  useEffect(() => {
    if (document.querySelector(`script[src="${KARABO_SCRIPT_URL}"]`)) {
      return;
    }

    const script = document.createElement('script');
    script.src = KARABO_SCRIPT_URL;
    script.defer = true;
    document.body.appendChild(script);

    // Deliberately not removed on unmount - this component only ever
    // mounts once at the app root (see App.tsx) for the lifetime of the
    // page, matching master.cshtml loading it once per page load.
  }, []);

  return null;
}
