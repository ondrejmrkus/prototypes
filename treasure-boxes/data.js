// Data collection module for Treasure Boxes curiosity game
// Based on Blanco & Sloutsky (2020)

const DataCollector = (() => {
  const sessionId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  const sessionStart = Date.now();
  let lastClickTime = sessionStart;
  const events = [];

  function logClick(round, phase, chestId, gemsAwarded, totalRounds) {
    const now = Date.now();
    const entry = {
      sessionId,
      round,
      totalRounds,
      phase,
      chestId,
      gemsAwarded,
      timestamp: now,
      elapsedMs: now - sessionStart,
      timeSinceLastClickMs: now - lastClickTime,
    };
    events.push(entry);
    lastClickTime = now;

    // Auto-save to localStorage
    try {
      localStorage.setItem('treasure_boxes_' + sessionId, JSON.stringify(getSummary()));
    } catch (e) { /* localStorage may be unavailable */ }

    return entry;
  }

  function getSummary() {
    const learningClicks = events.filter(e => e.phase === 'learning');
    const testClicks = events.filter(e => e.phase === 'testing');

    const chestCounts = (list) => {
      const counts = { A: 0, B: 0, C: 0, D: 0 };
      list.forEach(e => counts[e.chestId]++);
      return counts;
    };

    const testCounts = chestCounts(testClicks);
    const totalTest = testClicks.length || 1;

    return {
      sessionId,
      startTime: new Date(sessionStart).toISOString(),
      totalEvents: events.length,
      events,
      metrics: {
        exploitationRate: testCounts.A / totalTest,
        explorationBreadth: Object.values(testCounts).filter(v => v > 0).length / 4,
        mysteryPreference: testCounts.D / totalTest,
        learningCounts: chestCounts(learningClicks),
        testCounts,
        discoveredOptimal: learningClicks.some(e => e.chestId === 'A'),
        avgTimeBetweenClicks: events.length > 1
          ? events.reduce((sum, e) => sum + e.timeSinceLastClickMs, 0) / events.length
          : 0,
      },
    };
  }

  function exportJSON() {
    const data = getSummary();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `curiosity_game_${sessionId}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return { logClick, getSummary, exportJSON, sessionId };
})();

// Wire up export button
document.getElementById('export-btn').addEventListener('click', (e) => {
  e.stopPropagation();
  DataCollector.exportJSON();
});
