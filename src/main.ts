import { Player } from "./player.ts";

const leaderboard: Player[] = [
  new Player({ rank: 1, name: "VimMaster99", score: 1234 }),
  new Player({ rank: 2, name: "CodeRhythm", score: 1189 }),
  new Player({ rank: 3, name: "KeyNinja", score: 889 }),
  new Player({ rank: 4, name: "BeatCoder", score: 791 }),
  new Player({ rank: 5, name: "RhythmDev", score: 23 }),
];

function renderLeaderboard() {
  const tbody = document.querySelector<HTMLTableSectionElement>("#leaderboardTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  leaderboard.forEach((p) => {
    tbody.appendChild(p.renderRow());
  });
}

function setupInteractions() {
  document.getElementById("mainPlayBtn")?.addEventListener("click", () => {
    alert("Starting game");
  });

  document.getElementById("leaderboardBtn")?.addEventListener("click", () => {
    alert("Viewing full leaderboards");
  });

  document.getElementById("settingsBtn")?.addEventListener("click", () => {
    alert("Opening settings");
  });

  document.getElementById("aboutBtn")?.addEventListener("click", () => {
    alert("Game introduction");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    alert("Logged out successfully");
  });
}

document.addEventListener("DOMContentLoaded", () => {
  renderLeaderboard();
  setupInteractions();
});
