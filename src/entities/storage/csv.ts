import { FormatterOptionsArgs, parseFile, writeToStream } from "fast-csv";

import { ITableStorage } from "../../domain/tableStorage.js";
import { createWriteStream, existsSync } from "node:fs";

/**
 * Table storage based on storing CSV files in the local filesystem.
 */
export class CsvLocalTableStorage<Shape extends Record<string, unknown>>
  implements ITableStorage<Shape>
{
  constructor(private fileName: string, private delimiter = ",") {}

  private writeToCsv(
    stream: NodeJS.WritableStream,
    rows: Shape[],
    overrideOptions?: FormatterOptionsArgs<Shape, Shape>,
  ) {
    const options = {
      headers: true,
      delimiter: this.delimiter,
      ...overrideOptions,
    };
    return new Promise((res, rej) => {
      writeToStream(stream, rows, options)
        .on("error", (err: Error) => rej(err))
        .on("finish", () => res(undefined));
    });
  }

  async addRow(value: Shape): Promise<void> {
    // if file doesn't exist
    if (!existsSync(this.fileName)) {
      await this.writeToCsv(createWriteStream(this.fileName), [value], {
        writeHeaders: true,
      });
      return;
    }

    await this.writeToCsv(createWriteStream(this.fileName, { flags: "a" }), [
      value,
    ]);
  }

  async getTableContents(): Promise<Shape[] | null> {
    if (!existsSync(this.fileName)) {
      return null;
    }

    const rows: Shape[] = [];
    return new Promise((resolve, reject) => {
      parseFile<Shape, Shape>(this.fileName, {
        headers: true,
        delimiter: this.delimiter,
      })
        .on("error", (error) => reject(error))
        .on("data", (row) => rows.push(row))
        .on("end", () => resolve(rows));
    });
  }
}
