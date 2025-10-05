export interface IRuntime<Task> {
  /**
   * It schedules a task to be executed after a delay.
   * @param task - The task to be executed.
   * @param delayMs - the delay in milliseconds before executing the task.
   * @param oneOf - If true, this task only runs one time.
   * @returns A promise that resolves to the task ID.
   */
  scheduleTask(
    task: () => Promise<void>,
    delayMs: number,
    oneOf?: boolean,
  ): Promise<Task>;

  /**
   * Stops a schedule task to be executed.
   * @param taskId A task ID to finish.
   */
  clearTask(taskId: Task): Promise<void>;

  /**
   * Runs the runtime until there are no more scheduled tasks.
   */
  runTillEnd(): Promise<void>;
}
