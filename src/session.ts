/**
 * Local-only reducer helpers for the design prototype.
 * Not an authorization or networking layer.
 */
export type Participant = { id: string; label: string; device: string };
export type Event = { message: string; at: string };
export type Session = {
  participants: Participant[];
  presenting: string | null;
  requests: string[];
  history: Event[];
};

const guests: Participant[] = [
  { id: 'mikey', label: 'Mikey', device: 'Desktop' },
  { id: 'buddy-phone', label: 'Buddy 1', device: 'Phone' },
  { id: 'buddy-laptop', label: 'Buddy 2', device: 'Laptop' },
];

function record(state: Session, message: string): Event[] {
  return [{ message, at: new Date().toLocaleTimeString() }, ...state.history].slice(0, 8);
}

export function makeSession(): Session {
  return {
    participants: guests.map((guest) => ({ ...guest })),
    presenting: 'mikey',
    requests: [],
    history: [{ message: 'Demo session initialized', at: new Date().toLocaleTimeString() }],
  };
}

export function requestControl(state: Session, id: string): Session {
  const guest = state.participants.find((p) => p.id === id);
  if (!guest || state.presenting === id || state.requests.includes(id)) return state;
  return {
    ...state,
    requests: [...state.requests, id],
    history: record(state, guest.label + ' requested the screen'),
  };
}

export function approveNext(state: Session): Session {
  if (!state.requests.length) return state;
  const [next, ...rest] = state.requests;
  const guest = state.participants.find((p) => p.id === next);
  if (!guest) return { ...state, requests: rest };
  return {
    ...state,
    presenting: next,
    requests: rest,
    history: record(state, 'Screen granted to ' + guest.label),
  };
}

export function takeScreen(state: Session, id: string): Session {
  const guest = state.participants.find((p) => p.id === id);
  if (!guest || state.presenting === id) return state;
  return {
    ...state,
    presenting: id,
    requests: state.requests.filter((item) => item !== id),
    history: record(state, 'Host switched to ' + guest.label),
  };
}

export function releaseScreen(state: Session): Session {
  if (!state.presenting) return state;
  return {
    ...state,
    presenting: null,
    history: record(state, 'Screen released'),
  };
}
