// What the stall sells: the ingredients, how each one is prepared, and the bowls customers order.

/** prep: 'boil' goes in a pot, 'chop' goes on the board, 'ladle' comes from the cauldron, null is ready. */
export const INGREDIENTS = {
  noodles: { name: 'Noodles', prep: 'boil', key: '1' },
  scallion: { name: 'Scallion', prep: 'chop', key: '2' },
  mushroom: { name: 'Mushroom', prep: 'chop', key: '3' },
  chili: { name: 'Chili', prep: 'chop', key: '4' },
  egg: { name: 'Egg', prep: null, key: '5' },
  shrimp: { name: 'Shrimp', prep: null, key: '6' },
  tofu: { name: 'Tofu', prep: null, key: '7' },
  broth: { name: 'Broth', prep: 'ladle', key: 'B' },
};

/** The crates on the counter, left to right (broth comes from the cauldron instead). */
export const CRATE_ORDER = ['noodles', 'scallion', 'mushroom', 'chili', 'egg', 'shrimp', 'tofu'];

/** Every bowl starts from noodles and broth; the toppings make the dish. */
export const RECIPES = [
  { id: 'shoyu', name: 'Lantern Shoyu', price: 14, toppings: ['egg', 'scallion'], from: 0 },
  { id: 'harbor', name: 'Harbor Shrimp', price: 16, toppings: ['shrimp', 'egg'], from: 0 },
  { id: 'quiet', name: 'Quiet Tofu', price: 15, toppings: ['tofu', 'mushroom'], from: 0 },
  { id: 'forest', name: 'Forest Bowl', price: 18, toppings: ['mushroom', 'tofu', 'scallion'], from: 0.2 },
  { id: 'firecracker', name: 'Firecracker', price: 20, toppings: ['chili', 'shrimp', 'scallion'], from: 0.35 },
];

export function recipeItems(recipe) {
  return ['noodles', 'broth', ...recipe.toppings];
}

/** The recipes on the menu once `progress` (0 to 1) of the shift has passed. */
export function menuAt(progress) {
  return RECIPES.filter((recipe) => recipe.from <= progress);
}

/** True when a bowl holding exactly `items` is this recipe. */
export function bowlMatches(items, recipe) {
  const wanted = recipeItems(recipe);
  return items.length === wanted.length && wanted.every((id) => items.includes(id));
}
