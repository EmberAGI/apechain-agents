import { singleton } from "tsyringe";
import { IRuntime } from "../../domain/runtime.js";
import { v4 as uuid } from "uuid";

/**
 * Number of milliseconds in one second.
 */
const ONE_SECOND_IN_MS = 1_000;

/**
 * A simple TypeScript runtime implementation using Node.js timers.
 */
@singleton()
export class TSRuntime implements IRuntime<string> {
  private taskMap = new Map<string, NodeJS.Timeout>();

  public async scheduleTask(
    task: () => Promise<void>,
    delayMs: number,
    oneOf: boolean = false,
  ): Promise<string> {
    const taskId = uuid();
    if (!oneOf) {
      const timeout = setTimeout(task, delayMs);
      this.taskMap.set(taskId, timeout);
      return taskId;
    }

    const taskWithDeletion = async () => {
      await task();
      this.clearTask(taskId);
    };
    return this.scheduleTask(taskWithDeletion, delayMs, false);
  }

  public async clearTask(taskId: string) {
    const timeout = this.taskMap.get(taskId);
    if (timeout) {
      clearTimeout(timeout);
      this.taskMap.delete(taskId);
    }
  }

  public async runTillEnd(): Promise<void> {
    while (this.taskMap.size > 0) {
      // Check every 1 second if there are still tasks
      await new Promise((resolve) => setTimeout(resolve, ONE_SECOND_IN_MS));
    }
  }
}
