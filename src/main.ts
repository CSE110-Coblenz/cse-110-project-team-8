import { Level } from "./level.js";

const level = await Level.fromFile("./src/testlevel.json");

const keyframes = (level as any).keyframes;

for (const kf of keyframes) {
  console.log(`t=${kf.tMs}ms`);
  for (const row of kf.state) {
    console.log(`  ${row}`);
  }
  console.log();
}

console.log("Pairwise comparisons:\n");

for (let i = 0; i < keyframes.length; i++) {
  for (let j = 0; j <= i; j++) {
    const a = keyframes[i];
    const b = keyframes[j];

    const score = (Level as any).score(a.state, b.state);

    console.log(
      `Keyframe ${i} (${a.tMs}ms) <-> ${j} (${b.tMs}ms): ${score} points`
    );
  }
}