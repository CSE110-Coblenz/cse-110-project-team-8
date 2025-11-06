import { Player } from "./player.js";

export class Homepage {
  private players: Player[];

  constructor(players: Player[]) {
    this.players = players;
  }

  init(): void {
    this.renderLeaderboard();
    this.setupInteractions();
  }

  renderLeaderboard(): void {
    const tbody = document.querySelector<HTMLTableSectionElement>("#leaderboardTable tbody");
    if (!tbody) return;
    tbody.innerHTML = "";
    this.players.forEach((p) => {
      tbody.appendChild(p.renderRow());
    });
  }

  setupInteractions(): void {
    const btn = (id: string) => document.getElementById(id);

    btn("mainPlayBtn")?.addEventListener("click", () => this.onPlay());
    btn("leaderboardBtn")?.addEventListener("click", () => this.onViewLeaderboards());
    btn("settingsBtn")?.addEventListener("click", () => this.onSettings());
    btn("aboutBtn")?.addEventListener("click", () => this.onAbout());
    btn("logoutBtn")?.addEventListener("click", () => this.onLogout());
    btn("viewAllBtn")?.addEventListener("click", () => this.onViewAll());
  }

  protected onPlay(): void {
    alert("Starting game");
  }

  protected onViewLeaderboards(): void {
    alert("Viewing full leaderboards");
  }

  protected onSettings(): void {
    alert("Opening settings");
  }

  protected onAbout(): void {
    alert("Game introduction");
  }

  protected onLogout(): void {
    alert("Logged out successfully");
  }

  protected onViewAll(): void {
    alert("Viewing all leaderboards");
  }
}
