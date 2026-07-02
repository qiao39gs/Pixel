import { LAB } from '../colorUtils';

export interface KMedoidItem {
  code: string;
  lab: LAB;
}

/**
 * 色卡内 k-medoids 贪心选色：从候选色号中选 k 个，使每像素到所选最近色号的总色差最小。
 * - 候选集限定为第一轮出现用量的色号（uniqueBeads）
 * - 以频次 top-N 为热启动（确定性）
 * - 局部交换优化：每轮尝试 (移除旧 + 加入新) 的最佳改善，纯查表不重算距离
 * - 距离度量通过 getDist 回调注入，复用用户选定的 deltaE 算法（含 WeightedRGB）
 */
export function selectPaletteByKMedoids(
  n: number,                          // 非空像素数
  candidates: KMedoidItem[],
  k: number,
  freqTopCodes: string[],
  getDist: (pixelIndex: number, candidateIndex: number) => number,
): string[] {
  const m = candidates.length;
  if (m <= k) return candidates.map(c => c.code);
  if (n === 0 || k <= 0) return freqTopCodes.slice(0, Math.max(0, k));

  // 距离矩阵 [n][m]，行主序：dist[i*m + j] = 第 i 像素到第 j 候选的色差
  const dist = new Float32Array(n * m);
  for (let i = 0; i < n; i++) {
    const row = i * m;
    for (let j = 0; j < m; j++) dist[row + j] = getDist(i, j);
  }

  const codeToIdx = new Map<string, number>();
  candidates.forEach((c, j) => codeToIdx.set(c.code, j));

  // 初始选集：频次 top-N 热启动，去重，不足则补位
  const selected: number[] = [];
  const seen = new Set<number>();
  for (const code of freqTopCodes) {
    const idx = codeToIdx.get(code);
    if (idx !== undefined && !seen.has(idx)) { selected.push(idx); seen.add(idx); }
    if (selected.length === k) break;
  }
  for (let j = 0; j < m && selected.length < k; j++) {
    if (!seen.has(j)) { selected.push(j); seen.add(j); }
  }

  const curBest = new Float32Array(n);        // 当前每像素到所选最近色差
  const curAssign = new Int32Array(n);        // 该最近色号在 selected 中的位置
  const secondBest = new Float32Array(n);     // 次近色差（用于移除当前最近时的重分配）

  const computeAssignments = () => {
    for (let i = 0; i < n; i++) {
      let b0 = Infinity, b1 = Infinity, p0 = 0;
      const row = i * m;
      for (let s = 0; s < selected.length; s++) {
        const d = dist[row + selected[s]];
        if (d < b0) { b1 = b0; b0 = d; p0 = s; }
        else if (d < b1) b1 = d;
      }
      curBest[i] = b0; curAssign[i] = p0; secondBest[i] = b1;
    }
  };

  computeAssignments();

  const maxRounds = n > 20000 ? 5 : 10;
  for (let round = 0; round < maxRounds; round++) {
    let bestDelta = -1e-4;   // 需严格改善（阈值防抖动）
    let bestOldPos = -1, bestNewIdx = -1;

    for (let oldPos = 0; oldPos < selected.length; oldPos++) {
      for (let newIdx = 0; newIdx < m; newIdx++) {
        if (seen.has(newIdx)) continue;
        let delta = 0;
        for (let i = 0; i < n; i++) {
          const row = i * m;
          if (curAssign[i] === oldPos) {
            // 最近色被移除：重分配到次近或新候选
            const nb = Math.min(secondBest[i], dist[row + newIdx]);
            delta += nb - curBest[i];
          } else {
            // 最近色保留：仅当新候选更近时改善
            const d = dist[row + newIdx];
            if (d < curBest[i]) delta += d - curBest[i];
          }
        }
        if (delta < bestDelta) { bestDelta = delta; bestOldPos = oldPos; bestNewIdx = newIdx; }
      }
    }

    if (bestOldPos < 0) break;   // 收敛
    seen.delete(selected[bestOldPos]);
    selected[bestOldPos] = bestNewIdx;
    seen.add(bestNewIdx);
    computeAssignments();
  }

  return selected.map(idx => candidates[idx].code);
}
