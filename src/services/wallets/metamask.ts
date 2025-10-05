import {
  Implementation,
  toMetaMaskSmartAccount,
  ToMetaMaskSmartAccountReturnType,
} from "@metamask/delegation-toolkit";
import { PublicClient } from "viem";
import {
  IViemWallet,
  IWallet,
  TransactionInformation,
} from "../../domain/wallet.js";
import { BundlerClient } from "viem/account-abstraction";
import { ILogger } from "../../domain/logger.js";

/**
 * MetaMask wallet implementation for the IWallet interface.
 */
export class MetaMaskWallet implements IWallet {
  private smartAccountCache: ToMetaMaskSmartAccountReturnType<Implementation> | null =
    null;

  constructor(
    private viemWallet: IViemWallet,
    private publicClient: PublicClient,
    private bundler: BundlerClient,
    private logger: ILogger,
  ) {
    this.logger.info("MetaMaskWallet created");
  }

  public async getAddress(): Promise<`0x${string}`> {
    const account = await this.getMetamaskWallet();
    const address = account.getAddress();
    this.logger.debug("MetaMaskWallet address retrieved", { address });
    return address;
  }

  public async executeTransaction(
    transactionInfo: TransactionInformation[],
  ): Promise<`0x${string}` | null> {
    try {
      this.logger.info("Executing transaction via MetaMaskWallet", {
        transactionCount: transactionInfo.length,
      });
      const hash = await this.bundler.sendUserOperation({
        account: await this.getMetamaskWallet(),
        calls: transactionInfo.map((tx) => ({
          to: tx.to,
          value: BigInt(tx.value ?? 0),
          data: tx.data ? tx.data : "0x",
        })),
      });
      this.logger.info("Transaction executed successfully", { hash });
      return hash;
    } catch (error) {
      this.logger.error("Transaction execution failed", {
        error: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /**
   * Retrieves the current application configuration.
   * @returns The current application configuration.
   */
  private async getMetamaskWallet() {
    if (this.smartAccountCache) {
      return this.smartAccountCache;
    }
    const account = await this.viemWallet.getAccount();

    this.smartAccountCache = await toMetaMaskSmartAccount({
      client: this.publicClient,
      implementation: Implementation.Hybrid,
      deployParams: [account.address, [], [], []],
      deploySalt: "0x",
      signer: { account },
    });
    return this.smartAccountCache;
  }
}
