import { FormatterOptionsArgs, parseFile, writeToStream } from "fast-csv";

import { ITableStorage } from "../../domain/tableStorage.js";
import {
  appendFile,
  createWriteStream,
  existsSync,
  open,
  read,
  close,
} from "node:fs";
import { ILogger } from "../../domain/logger.js";
import { createDirIfNeeded } from "../../utils/createDir.js";
import { getLastByte } from "../../utils/getLastByte.js";

/**
 * Table storage based on storing CSV files in the local filesystem.
 */
export class CsvLocalTableStorage<Shape extends Record<string, unknown>>
  implements ITableStorage<Shape>
{
  constructor(
    private fileName: string,
    private delimiter = ",",
    private logger?: ILogger,
  ) {
    this.logger?.debug("CsvLocalTableStorage created", {
      fileName,
      delimiter,
    });
  }

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
    this.logger?.debug("Adding row to CSV", {
      fileName: this.fileName,
      fileExists: existsSync(this.fileName),
    });
    // if file doesn't exist
    if (!existsSync(this.fileName)) {
      await createDirIfNeeded(this.fileName);
      this.logger?.debug("Creating new CSV file with headers", {
        fileName: this.fileName,
      });
      await this.writeToCsv(createWriteStream(this.fileName), [value], {
        writeHeaders: true,
      });
      this.logger?.debug("CSV file created with first row", {
        fileName: this.fileName,
      });
      return;
    }

    // Ensure the file ends with a newline before appending
    // Only read the last byte to check for newline
    const lastByte = (await getLastByte(this.fileName)) ?? 0x0a;
    if (lastByte !== 0x0a) {
      await new Promise<void>((resolve, reject) => {
        appendFile(this.fileName, "\n", (err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    }

    await this.writeToCsv(
      createWriteStream(this.fileName, { flags: "a" }),
      [value],
      {
        writeHeaders: false,
      },
    );
    this.logger?.debug("Row appended to CSV", { fileName: this.fileName });
  }

  async getTableContents(): Promise<Shape[] | null> {
    this.logger?.debug("Reading CSV table contents", {
      fileName: this.fileName,
      fileExists: existsSync(this.fileName),
    });
    if (!existsSync(this.fileName)) {
      this.logger?.debug("CSV file does not exist", {
        fileName: this.fileName,
      });
      return null;
    }

    const rows: Shape[] = [];
    return new Promise((resolve, reject) => {
      parseFile<Shape, Shape>(this.fileName, {
        headers: true,
        delimiter: this.delimiter,
      })
        .on("error", (error) => {
          this.logger?.error("Failed to parse CSV file", {
            fileName: this.fileName,
            error: error.message,
          });
          resolve(rows);
        })
        .on("data", (row) => {
          rows.push(row);
        })
        .on("end", () => {
          this.logger?.debug("CSV table contents read successfully", {
            fileName: this.fileName,
            rowCount: rows.length,
          });
          resolve(rows);
        });
    });
  }
}
