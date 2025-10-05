import {
  access,
  mkdir,
  readFile,
  writeFile as writeFileAsync,
} from "node:fs/promises";
import { constants } from "node:fs";
import { dirname } from "node:path";

import { IFileStorage } from "../../domain/fileStorage.js";
import { ILogger } from "../../domain/logger.js";
import { createDirIfNeeded } from "../../utils/createDir.js";

/**
 * File storage based on storing files in the local filesystem.
 */
export class LocalFileStorage implements IFileStorage<string> {
  constructor(public fileName: string, private logger?: ILogger) {
    this.logger?.debug("LocalFileStorage created", { fileName });
  }

  async doesFileExists(): Promise<boolean> {
    try {
      await access(this.fileName, constants.F_OK);
      this.logger?.debug("File exists check: true", {
        fileName: this.fileName,
      });
      return true;
    } catch (error) {
      this.logger?.debug("File exists check: false", {
        fileName: this.fileName,
      });
      return false;
    }
  }

  async getFileContents(): Promise<string | null> {
    this.logger?.debug("Reading file contents", { fileName: this.fileName });
    try {
      const contents = await readFile(this.fileName, "utf-8");
      if (!contents.trim()) {
        this.logger?.debug("File is empty", { fileName: this.fileName });
        return null;
      }

      this.logger?.debug("File contents read successfully", {
        fileName: this.fileName,
        contentLength: contents.length,
      });
      return contents;
    } catch (error) {
      this.logger?.debug("Failed to read file", {
        fileName: this.fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async writeFile(value: string): Promise<void> {
    this.logger?.debug("Writing file", {
      fileName: this.fileName,
      contentLength: value.length,
    });
    await createDirIfNeeded(this.fileName);
    await writeFileAsync(this.fileName, value, "utf-8");
    this.logger?.debug("File written successfully", {
      fileName: this.fileName,
    });
  }
}
