const leaderboard = [
    { rank: 1, name: "VimMaster99", score: 1234 },
    { rank: 2, name: "CodeRhythm", score: 1189 },
    { rank: 3, name: "KeyNinja", score: 889 },
    { rank: 4, name: "BeatCoder", score: 791 },
    { rank: 5, name: "RhythmDev", score: 23 },
];
function renderLeaderboard() {
    const tbody = document.querySelector("#leaderboardTable tbody");
    if (!tbody)
        return;
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
    var _a, _b, _c, _d, _e;
    (_a = document.getElementById("mainPlayBtn")) === null || _a === void 0 ? void 0 : _a.addEventListener("click", () => {
        alert("🎮 Starting VimBeat... Get ready to code in rhythm!");
    });
    (_b = document.getElementById("leaderboardBtn")) === null || _b === void 0 ? void 0 : _b.addEventListener("click", () => {
        alert("🏆 Viewing full leaderboards...");
    });
    (_c = document.getElementById("settingsBtn")) === null || _c === void 0 ? void 0 : _c.addEventListener("click", () => {
        alert("⚙️ Opening settings...");
    });
    (_d = document.getElementById("aboutBtn")) === null || _d === void 0 ? void 0 : _d.addEventListener("click", () => {
        alert("ℹ️ VimBeat: Master the Rhythm, Master the Code.");
    });
    (_e = document.getElementById("logoutBtn")) === null || _e === void 0 ? void 0 : _e.addEventListener("click", () => {
        alert("👋 Logged out successfully.");
    });
}
document.addEventListener("DOMContentLoaded", () => {
    renderLeaderboard();
    setupInteractions();
});
export {};
//# sourceMappingURL=main.js.map