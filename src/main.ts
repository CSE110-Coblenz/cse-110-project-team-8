import { Level } from "./level.js";
import VimGrid from "./vimgrid.js";

const level = await Level.fromFile("/src/testlevel.json");

// Get keyframes as VimGrid instances
const keyframeGrids = level.getKeyframesAsVimGrids();

// Display each keyframe using VimGrid
for (const { tMs, grid } of keyframeGrids) {
  console.log(`t=${tMs}ms`);
  const gridData = grid.getGrid();
  for (const row of gridData) {
    const rowStr = row.map(cell => cell.ch).join("");
    console.log(`  ${rowStr}`);
  }
  console.log();
}

console.log("Pairwise comparisons:\n");

// Compare all pairs of keyframes
for (let i = 0; i < keyframeGrids.length; i++) {
  for (let j = 0; j <= i; j++) {
    const a = keyframeGrids[i];
    const b = keyframeGrids[j];

    const score = Level.score(a.grid, b.grid);

    console.log(
      `Keyframe ${i} (${a.tMs}ms) <-> ${j} (${b.tMs}ms): ${score} points`
    );
  }
}