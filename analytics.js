const STORAGE_KEY = "dd_events";
const MAX_EVENTS = 500;
let currentWordView = null;

function getSessionId() {
  const key = "dd_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

export function logEvent(name, data = {}) {
  try {
    const events = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    const event = {
      id: `e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      ts: Date.now(),
      sessionId: getSessionId(),
      data
    };
    events.push(event);
    if (events.length > MAX_EVENTS) {
      events.splice(0, events.length - MAX_EVENTS);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch (err) {
    console.error("logEvent failed", err);
  }
}

export function readEvents() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch (err) {
    console.error("readEvents failed", err);
    return [];
  }
}

export function startWordView(wordId) {
  currentWordView = { wordId, startTs: Date.now() };
  logEvent("word_view_start", { wordId });
}

export function endWordView(reason = "unknown") {
  if (!currentWordView) return;
  const durationMs = Date.now() - currentWordView.startTs;
  logEvent("word_view_end", {
    wordId: currentWordView.wordId,
    durationMs,
    reason
  });
  currentWordView = null;
}
