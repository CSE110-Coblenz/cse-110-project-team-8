import { Player } from "./player.js";
import { Homepage } from "./homepage.js";

const leaderboard: Player[] = [
  new Player({ rank: 1, name: "VimMaster99", score: 1234 }),
  new Player({ rank: 2, name: "CodeRhythm", score: 1189 }),
  new Player({ rank: 3, name: "KeyNinja", score: 889 }),
  new Player({ rank: 4, name: "BeatCoder", score: 791 }),
  new Player({ rank: 5, name: "RhythmDev", score: 23 }),
];

document.addEventListener("DOMContentLoaded", () => {
  const homepage = new Homepage(leaderboard);
  homepage.init();
});
