import { Account } from "viem";
import * as z from "zod";

/**
 * Schema for transaction information.
 */
export const TransactionInformationSchema = z.object({
  type: z.enum(["EVM_TX"]),
  to: z.templateLiteral(["0x", z.string()]),
  data: z.templateLiteral(["0x", z.string()]),
  value: z.string(),
  chainId: z.string(),
});
export type TransactionInformation = z.infer<
  typeof TransactionInformationSchema
>;

/**
 * Interface a defi wallet that can execute transactions.
 */
export interface IWallet {
  /**
   * The wallet address.
   */
  getAddress(): Promise<`0x${string}`>;
  /**
   * @param transactionInfo - The transaction information to execute.
   * @returns A promise that resolves to true if the transaction was executed successfully, false otherwise.
   */
  executeTransaction(
    transationInfo: TransactionInformation[],
  ): Promise<`0x${string}` | null>;
}

export interface IViemWallet extends IWallet {
  /**
   * Gets the underlying viem account.
   */
  getAccount(): Promise<Account>;
}
