/**
 * Genereaza echipe de cate 2 concurenti activi (iar daca numarul de concurenti activi
 * este impar, ultima echipa va avea 3 concurenti).
 *
 * Criterii:
 * 1. 'random' (Aleator): Amesteca concurentii activi cu algoritmul Fisher-Yates.
 * 2. 'support' (Suport): Sorteaza concurentii activi descrescator dupa numarul de versete invatate
 *    si imperecheaza cel mai mare cu cel mai mic, al 2-lea cel mai mare cu al 2-lea cel mai mic etc.
 *    Daca numarul e impar, concurentul ramas la mijloc este adaugat in ultima echipa (formand o echipa de 3).
 */
export function generateTeamsList(activeCompetitors, learnedCountByCompetitorId, criterion = 'support') {
  const list = [...activeCompetitors];
  const n = list.length;
  if (n === 0) return [];

  const now = new Date().toISOString();

  if (n < 2) {
    return [
      {
        id: 'team_1',
        name: 'Echipa 1',
        mode: criterion,
        memberIds: [list[0].id],
        created_at: now,
      },
    ];
  }

  let ordered = [];

  if (criterion === 'random') {
    ordered = [...list];
    for (let i = ordered.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ordered[i], ordered[j]] = [ordered[j], ordered[i]];
    }

    const pairs = [];
    let idx = 0;
    while ( ordered.length - idx > 3 ) {
      pairs.push([ordered[idx].id, ordered[idx + 1].id]);
      idx += 2;
    }
    if (ordered.length - idx === 3) {
      pairs.push([ordered[idx].id, ordered[idx + 1].id, ordered[idx + 2].id]);
    } else if (ordered.length - idx === 2) {
      pairs.push([ordered[idx].id, ordered[idx + 1].id]);
    }

    return pairs.map((memberIds, i) => ({
      id: `team_${i + 1}_${Date.now()}`,
      name: `Echipa ${i + 1}`,
      mode: 'random',
      memberIds,
      created_at: now,
    }));
  }

  // Criteriul 2: 'support' (Cel mai mare cu cel mai mic, al 2-lea cel mai mare cu al 2-lea cel mai mic...)
  ordered = [...list].sort((a, b) => {
    const countA = learnedCountByCompetitorId[a.id] || 0;
    const countB = learnedCountByCompetitorId[b.id] || 0;
    if (countB !== countA) return countB - countA;
    return a.name.localeCompare(b.name, 'ro');
  });

  const pairs = [];
  const pairCount = Math.floor(n / 2);

  for (let i = 0; i < pairCount; i++) {
    const high = ordered[i];
    const low = ordered[n - 1 - i];
    pairs.push([high.id, low.id]);
  }

  // Daca numarul de concurenti activi este impar, concurentul din mijloc se alatura ultimei echipe (echipa de 3)
  if (n % 2 === 1) {
    const middle = ordered[pairCount];
    pairs[pairs.length - 1].push(middle.id);
  }

  return pairs.map((memberIds, i) => ({
    id: `team_${i + 1}_${Date.now()}`,
    name: `Echipa ${i + 1}`,
    mode: 'support',
    memberIds,
    created_at: now,
  }));
}
