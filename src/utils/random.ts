/**
 * Gets a random element from an array.
 * @param array The array from which to get a random element.
 * @returns A random element from the array.
 */
export function getRandomElement<T>(array: T[]): T {
  if (array.length === 0) {
    throw new Error("Array must not be empty");
  }
  const randomIndex = Math.floor(getRandomFloat(0, array.length));
  return array[randomIndex];
}

/**
 * Gets a random float between the specified min and max values.
 * @param min The minimum value (inclusive).
 * @param max The maximum value (exclusive).
 * @returns A random float between min and max.
 */
export function getRandomFloat(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

/**
 * Gets a random bigint between the specified min and max values.
 * @param min the minimum bigint (inclusive)
 * @param max the maximum bigint (exclusive)
 * @returns A random bigint between min and max.
 */
export function getRandomBigInt(min: bigint, max: bigint): bigint {
  const range = max - min;
  const rand = BigInt(Math.floor(Math.random() * Number(range)));
  return min + rand;
}
