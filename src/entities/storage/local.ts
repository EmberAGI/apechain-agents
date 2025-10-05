import {
  access,
  appendFile,
  mkdir,
  readFile,
  writeFile as writeFileAsync,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

import { IFileStorage } from "../../domain/fileStorage.js";
import { injectable } from "tsyringe";

/**
 * File storage based on storing files in the local filesystem.
 */
@injectable()
export class LocalFileStorage implements IFileStorage<string> {
  constructor(public fileName: string) {}

  async doesFileExists(): Promise<boolean> {
    try {
      await access(this.fileName, constants.F_OK);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getFileContents(): Promise<string | null> {
    try {
      const contents = await readFile(this.fileName, "utf-8");
      if (!contents.trim()) {
        return null;
      }

      return contents;
    } catch (error) {
      return null;
    }
  }

  async writeFile(value: string): Promise<void> {
    const directory = dirname(this.fileName);
    if (directory && directory !== ".") {
      await mkdir(directory, { recursive: true });
    }

    await writeFileAsync(this.fileName, value, "utf-8");
  }
}
