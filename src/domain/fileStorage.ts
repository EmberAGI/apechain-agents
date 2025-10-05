/**
 * Storage interface for defining storage-related operations.
 */
export interface IFileStorage<Shape> {
  fileName: string;

  /**
   * Checks if a value exists in storage.
   */
  doesFileExists(): Promise<boolean>;

  /**
   * Retrieves the value associated in the storage.
   * @return The stored value which may not be the exact shape expected or null if not found.
   */
  getFileContents(): Promise<Shape | null>;

  /**
   * Stores a value in storage.
   * @param value - The value to store.
   */
  writeFile(value: Shape): Promise<void>;
}
