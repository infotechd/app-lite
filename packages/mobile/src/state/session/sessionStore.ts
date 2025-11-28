// packages/mobile/src/state/session/sessionStore.ts
// Armazena flags simples de sessão em memória (não persistente).

let checklistDismissed = false;

export const sessionStore = {
  get profileChecklistDismissed() {
    return checklistDismissed;
  },
  dismissProfileChecklist() {
    checklistDismissed = true;
  },
  reset() {
    checklistDismissed = false;
  },
};

export default sessionStore;
