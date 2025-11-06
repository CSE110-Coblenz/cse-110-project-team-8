export interface PlayerData {
  rank: number;
  name: string;
  score: number;
}

export class Player {
  rank: number;
  name: string;
  score: number;

  constructor(data: PlayerData) {
    this.rank = data.rank;
    this.name = data.name;
    this.score = data.score;
  }

  renderRow(): HTMLTableRowElement {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${this.rank}</td>
      <td>${this.name}</td>
      <td>${this.score.toLocaleString()}</td>
    `;
    return row;
  }
}
