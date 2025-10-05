export interface ITableStorage<Shape> {
  /**
   * Appends a row of data to the table storage.
   */
  addRow(value: Shape): Promise<void>;

  /**
   * Retrieves all rows from the table storage.
   */
  getTableContents(): Promise<Shape[] | null>;
}
