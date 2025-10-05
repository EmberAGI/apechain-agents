import { IFileStorage } from "../../domain/fileStorage.js";
import { ILogger } from "../../domain/logger.js";

/**
 * File storage based on storing json files in a string-based file storage.
 */
export class JSONFileStorage<Shape> implements IFileStorage<Shape> {
  constructor(
    private stringFileStorage: IFileStorage<string>,
    private logger?: ILogger,
  ) {
    this.logger?.debug("JSONFileStorage created", {
      fileName: stringFileStorage.fileName,
    });
  }

  doesFileExists(): Promise<boolean> {
    return this.stringFileStorage.doesFileExists();
  }

  async getFileContents(): Promise<Shape | null> {
    this.logger?.debug("Getting JSON file contents", {
      fileName: this.fileName,
    });
    const contents = await this.stringFileStorage.getFileContents();
    if (!contents) {
      this.logger?.debug("No contents found in JSON file", {
        fileName: this.fileName,
      });
      return null;
    }
    try {
      const parsed = JSON.parse(contents) as Shape;
      this.logger?.debug("JSON parsed successfully", {
        fileName: this.fileName,
      });
      return parsed;
    } catch (error) {
      this.logger?.error("Failed to parse JSON", {
        fileName: this.fileName,
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  async writeFile(value: Shape): Promise<void> {
    this.logger?.debug("Writing JSON file", { fileName: this.fileName });
    const json = JSON.stringify(value, null, 2);
    await this.stringFileStorage.writeFile(json);
    this.logger?.debug("JSON file written successfully", {
      fileName: this.fileName,
    });
  }

  public get fileName(): string {
    return this.stringFileStorage.fileName;
  }
}
