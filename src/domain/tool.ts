export interface ITool {
  /**
   * Executes the tool's functionality.
   */
  execute(): Promise<void>;
}
