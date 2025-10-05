import { IFileStorage } from "../../domain/fileStorage.js";

/**
 * File storage based on storing json files in a string-based file storage.
 */
export class JSONFileStorage<Shape> implements IFileStorage<Shape> {
  constructor(private stringFileStorage: IFileStorage<string>) {}

  doesFileExists(): Promise<boolean> {
    return this.stringFileStorage.doesFileExists();
  }

  async getFileContents(): Promise<Shape | null> {
    const contents = await this.stringFileStorage.getFileContents();
    if (!contents) {
      return null;
    }
    return JSON.parse(contents) as Shape;
  }

  async writeFile(value: Shape): Promise<void> {
    const json = JSON.stringify(value, null, 2);
    await this.stringFileStorage.writeFile(json);
  }

  public get fileName(): string {
    return this.stringFileStorage.fileName;
  }
}
