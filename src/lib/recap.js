/** Tallies genre frequency across a year's completed titles for the recap card. */
export function computeRecap(items) {
  const counts = new Map();
  for (const item of items) {
    for (const g of item.genres || []) {
      counts.set(g, (counts.get(g) || 0) + 1);
    }
  }
  const genres = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([genre, count]) => ({ genre, count }));
  return { total: items.length, genres };
}
