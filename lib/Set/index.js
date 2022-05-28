/**
 * converts an arbitray amount of arrays to sets
 */
Set.toSet = function (...arrays) {
  return arrays.map((array) => new Set(array));
};

/**
 * calculates the setDifference from two input Arrays
 */
Set.prototype.difference = function (set, toArray = false) {
  if (!(set instanceof Set)) set = new Set(set);
  let difference = new Set([...this].filter((elem) => !set.has(elem)));
  return toArray ? Array.from(difference) : difference;
};

Set.union = function (set, toArray = false) {
  if (!(set instanceof Set)) set = new Set(set);
  let union = new Set([...this, ...set]);
  return toArray ? Array.from(union) : union;
};

/**
 * calculates the intersection of two input Arrays
 */
Set.prototype.intersection = function (set, toArray = false) {
  if (!(set instanceof Set)) set = new Set(set);
  let intersection = new Set([...this].filter((elem) => set.has(elem)));
  return toArray ? Array.from(intersection) : intersection;
};

Set.prototype.stats = function (set, toArray = false) {
  if (!(set instanceof Set)) set = new Set(set);
  let union = new Set([...this, ...set]);
  let intersection = new Set();
  let ANotInB = new Set();
  let BNotInA = new Set();

  union.forEach((elem) =>
    this.has(elem)
      ? set.has(elem)
        ? intersection.add(elem)
        : ANotInB.add(elem)
      : BNotInA.add(elem)
  );

  if (toArray) {
    union = [...union];
    intersection = [...intersection];
    ANotInB = [...ANotInB];
    BNotInA = [...BNotInA];
  }

  return { union, intersection, ANotInB, BNotInA };
};

Set.prototype.isSuperset = function (subset) {
  if (!(subset instanceof Set)) subset = new Set(subset);
  for (const elem of subset) {
    if (!this.has(elem)) return false;
  }
  return true;
};

Set.prototype.isSubset = function (superset) {
  if (!(superset instanceof Set)) superset = new Set(superset);
  for (const elem of this) {
    if (!superset.has(elem)) return false;
  }
  return true;
};
