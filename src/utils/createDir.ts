import { mkdir } from "fs/promises";
import { dirname } from "path";

export async function createDirIfNeeded(path: string) {
  const directory = dirname(path);
  if (!directory || directory === ".") {
    return;
  }
  await mkdir(directory, { recursive: true });
}
