interface Player {
  rank: number;
  name: string;
  score: number;
}

const leaderboard: Player[] = [
  { rank: 1, name: "VimMaster99", score: 1234 },
  { rank: 2, name: "CodeRhythm", score: 1189 },
  { rank: 3, name: "KeyNinja", score: 889 },
  { rank: 4, name: "BeatCoder", score: 791 },
  { rank: 5, name: "RhythmDev", score: 23 },
];

function renderLeaderboard() {
  const tbody = document.querySelector<HTMLTableSectionElement>("#leaderboardTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  leaderboard.forEach((p) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${p.rank}</td>
      <td>${p.name}</td>
      <td>${p.score.toLocaleString()}</td>
    `;
    tbody.appendChild(row);
  });
}

function setupInteractions() {
  document.getElementById("mainPlayBtn")?.addEventListener("click", () => {
    alert("🎮 Starting VimBeat... Get ready to code in rhythm!");
  });

  document.getElementById("leaderboardBtn")?.addEventListener("click", () => {
    alert("🏆 Viewing full leaderboards...");
  });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    alert("⚙️ Opening settings...");
  });

  document.getElementById("aboutBtn")?.addEventListener("click", () => {
    alert("ℹ️ VimBeat: Master the Rhythm, Master the Code.");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    alert("👋 Logged out successfully.");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLeaderboard();
  setupInteractions();
});
