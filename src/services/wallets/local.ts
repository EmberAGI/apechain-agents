import {
  Account,
  Chain,
  PrivateKeyAccount,
  Transport,
  WalletClient,
} from "viem";
import { IViemWallet, TransactionInformation } from "../../domain/wallet.js";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import * as z from "zod";
import { IFileStorage } from "../../domain/fileStorage.js";
import { ILogger } from "../../domain/logger.js";

/**
 * A wallet that uses a local private key to sign transactions.
 */
export class LocalWallet implements IViemWallet {
  private localAccountCache: PrivateKeyAccount | null = null;

  constructor(
    private privateKey: `0x${string}`,
    private walletClient: WalletClient<Transport, Chain>,
    private logger: ILogger,
  ) {
    this.logger.info("LocalWallet created", {
      address: privateKeyToAccount(privateKey).address,
    });
  }

  public async getAccount() {
    if (!this.localAccountCache) {
      this.localAccountCache = privateKeyToAccount(this.privateKey);
    }
    return this.localAccountCache;
  }

  public async getAddress(): Promise<`0x${string}`> {
    const account = await this.getAccount();
    return account.address;
  }

  public async executeTransaction(
    transactionInfo: TransactionInformation[],
  ): Promise<`0x${string}` | null> {
    try {
      const account = await this.getAccount();
      let hash: `0x${string}` | null = null;
      for (const transaction of transactionInfo) {
        hash = await this.walletClient.sendTransaction({
          account,
          to: transaction.to,
          data: transaction.data,
          value: BigInt(transaction.value),
        });
      }
      return hash;
    } catch {
      return null;
    }
  }
}

/**
 * Schema for storing the wallet private key.
 */
const WalletStorageSchema = z.object({
  privateKey: z.templateLiteral(["0x", z.string()]),
});
export type WalletStorage = z.infer<typeof WalletStorageSchema>;

/**
 * A wallet that stores its private key in a file storage.
 */
export class StoredLocalWallet implements IViemWallet {
  private localAccountCache: LocalWallet | null = null;
  constructor(
    private privateKeyStorage: IFileStorage<WalletStorage>,
    private walletClient: WalletClient<Transport, Chain>,
    private logger: ILogger,
  ) {
    this.logger.info("StoredLocalWallet created");
  }

  private async getLocalAccount(): Promise<LocalWallet> {
    if (this.localAccountCache) {
      return this.localAccountCache;
    }
    const storedValue = await this.privateKeyStorage.getFileContents();
    if (!storedValue) {
      const privateKey = generatePrivateKey();
      await this.privateKeyStorage.writeFile({ privateKey });
      this.logger.info("Generated new private key for StoredLocalWallet");
      return new LocalWallet(privateKey, this.walletClient, this.logger);
    }

    const parsed = await WalletStorageSchema.parseAsync(storedValue);
    this.logger.info("Loaded existing private key for StoredLocalWallet");
    this.localAccountCache = new LocalWallet(
      parsed.privateKey,
      this.walletClient,
      this.logger,
    );
    return this.localAccountCache;
  }

  public async getAccount(): Promise<Account> {
    const localAccount = await this.getLocalAccount();
    return localAccount.getAccount();
  }

  public async getAddress(): Promise<`0x${string}`> {
    const localAccount = await this.getLocalAccount();
    return localAccount.getAddress();
  }

  public async executeTransaction(
    transactionInfo: TransactionInformation[],
  ): Promise<`0x${string}` | null> {
    const localAccount = await this.getLocalAccount();
    return localAccount.executeTransaction(transactionInfo);
  }
}
