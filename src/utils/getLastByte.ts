import { open, read, close } from "node:fs";

/**
 * Get the last byte of a file.
 * @param fileName The name of the file to read the last byte from.
 * @returns A promise that resolves to the last byte of the file, or 0x0a if the file is empty.
 */
export function getLastByte(fileName: string): Promise<number | undefined> {
  return new Promise((resolve, reject) => {
    open(fileName, "r", (err, fd) => {
      if (err) {
        reject(err);
        return;
      }

      const buffer = Buffer.alloc(1);
      read(fd, buffer, 0, 1, -1, (err, bytesRead) => {
        close(fd, () => {}); // Close the file descriptor
        if (err) {
          reject(err);
        } else if (bytesRead === 0) {
          resolve(undefined); // Empty file, treat as if it has newline
        } else {
          resolve(buffer[0]);
        }
      });
    });
  });
}
