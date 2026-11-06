const OTHER_CATEGORY = 'Бусад';

// Хоолнуудыг ангиллаар нь бүлэглэнэ: [{ name, items }]
export function groupByCategory(menuItems) {
  const groups = new Map();
  menuItems.forEach((item) => {
    const name = item.category || OTHER_CATEGORY;
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
  });

  return [...groups]
    .map(([name, items]) => ({ name, items }))
    .sort((a, b) => a.name.localeCompare(b.name, 'mn'));
}
