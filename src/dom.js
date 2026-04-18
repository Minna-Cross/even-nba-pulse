export function mountDom() {
  return {
    connectionStatus: document.querySelector('#connection-status'),
    selectedGame: document.querySelector('#selected-game'),
    selectedMeta: document.querySelector('#selected-meta'),
    timeline: document.querySelector('#timeline'),
    pageStatus: document.querySelector('#page-status'),
    errorStatus: document.querySelector('#error-status'),
    refreshButton: document.querySelector('#refresh-btn'),
    nextGameButton: document.querySelector('#next-game-btn'),
    toggleSortButton: document.querySelector('#toggle-sort-btn'),
    // Exit confirmation dialog and buttons
    exitDialog: document.querySelector('#exit-dialog'),
    exitCancelButton: document.querySelector('#exit-cancel-btn'),
    exitConfirmButton: document.querySelector('#exit-confirm-btn')
  };
}
