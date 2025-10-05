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
  ) {}

  public async getAddress(): Promise<`0x${string}`> {
    const account = await this.getMetamaskWallet();
    return account.getAddress();
  }

  public async executeTransaction(
    transactionInfo: TransactionInformation[],
  ): Promise<`0x${string}` | null> {
    try {
      return await this.bundler.sendUserOperation({
        account: await this.getMetamaskWallet(),
        calls: transactionInfo.map((tx) => ({
          to: tx.to,
          value: BigInt(tx.value ?? 0),
          data: tx.data ? tx.data : "0x",
        })),
      });
    } catch {
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
