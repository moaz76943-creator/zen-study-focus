const W = [
0.4, 0.6, 2.4, 5.8, 4.93, 0.94,
0.86, 0.01, 1.49, 0.14, 0.94, 2.18,
0.05, 0.34, 1.26, 0.29, 2.61];
function retention(t, s) {
  const tD = Math.max(0, +t || 0);
  const sV = Math.max(0.1, +s || 1);
  return Math.pow(1+(19*tD)/(81*sV), -0.5);
}
function interval(s, r) {
  const sV = Math.max(0.1, +s || 1);
  const rT = Math.min(0.97,
    Math.max(0.7, +r || 0.9));
  const iv = (81*sV/19) * (Math.pow(rT,-2)-1);
  const rnd = Math.round(iv);
  return Math.min(3650, Math.max(1, rnd));
}
function nextD(d, g) {
  const gr = Math.min(4, Math.max(1, +g || 3));
  const cD = Math.min(10,
    Math.max(1, +d || 5));
  const d0 = W[4] - (gr - 3) * W[5];
  const rD = cD - W[6] * (gr - 3);
  const nD = W[7]*d0 + (1-W[7])*rD;
  return Math.min(10, Math.max(1, nD));
}
function nextS(s, d, r, g) {
  const sV = Math.max(0.1, +s || 1);
  const dV = Math.min(10,
    Math.max(1, +d || 5));
  const rV = Math.min(1,
    Math.max(0.01, +r || 0.9));
  const gr = Math.min(4, Math.max(1, +g || 3));
  if (gr === 1) {
    const pP = Math.pow(sV + 1, W[13]) - 1;
    const eP = Math.exp((1 - rV) * W[14]);
    return Math.min(sV, Math.max(0.1,
      W[11]*Math.pow(dV,-W[12])*pP*eP));
  }
  const hB = gr === 2 ? W[15] : 1;
  const eB = gr === 4 ? W[16] : 1;
  const e1 = Math.exp((1-rV)*W[10]) - 1;
  const expP = Math.exp(W[8])*(11-dV)*
    Math.pow(sV,-W[9])*e1;
  return Math.max(0.1,
    sV * (1 + expP * hB * eB));
}
function reviewCard(card, g, days) {
  const c = card || {};
  const ret = retention(days,
    c.stability || 1);
  const nD = nextD(c.difficulty || 5, g);
  const nS = nextS(c.stability || 1,
    nD, ret, g);
  const iv = interval(nS, 0.9); const reps = ((card && card.reps) || 0) + 1;
  return { stability: nS, s: nS, difficulty: nD, d: nD, interval: iv, ivl: iv, retrievability: ret, reps: reps };
}
if (typeof module !== 'undefined') {
  module.exports = { W, retention, interval,
    nextD, nextS, reviewCard };
}
if (typeof window !== 'undefined') {
  window.FSRS45 = { W, retention, interval,
    nextD, nextS, reviewCard };
}
