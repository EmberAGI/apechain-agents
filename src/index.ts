import { Environment } from "./entities/environment.js";
import { TSRuntime } from "./entities/runtimes/ts.js";
import { OnchainActionsClient } from "./entities/onchain-actions-client.js";
import {
  Chain,
  createPublicClient,
  createWalletClient,
  http,
  PublicClient,
  Transport,
  WalletClient,
} from "viem";
import { arbitrumChain } from "./entities/chain.js";
import { JSONFileStorage } from "./entities/storage/json.js";
import { LocalFileStorage } from "./entities/storage/local.js";
import { StoredLocalWallet, WalletStorage } from "./services/wallets/local.js";
import { IFileStorage } from "./domain/fileStorage.js";
import { MetaMaskWallet } from "./services/wallets/metamask.js";
import { BundlerClient, createBundlerClient } from "viem/account-abstraction";
import { setupAgent } from "./services/agent.js";
import { en } from "zod/locales";

export async function run() {
  const environment = new Environment();

  /**
   * Create clients for interacting with the blockchain.
   */
  const walletClient = createWalletClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  const publicClient = createPublicClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  const bundlerClient = createBundlerClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.BUNDLER_URL),
  });

  /**
   * Vault wallet (stored locally in a file)
   */
  const vaultLocalStorage = new LocalFileStorage(
    `${environment.settings.MEMORY_FOLDER}/vault-wallet.json`,
  );
  const vaultStoragePath = new JSONFileStorage<WalletStorage>(
    vaultLocalStorage,
  );
  const vaultWallet = new StoredLocalWallet(vaultStoragePath, walletClient);

  /**
   * Setup agent and run
   */
  const agentWallet = new MetaMaskWallet(
    vaultWallet,
    publicClient,
    bundlerClient,
  );

  // Run agent
  const runtime = new TSRuntime();
  const onchainActions = new OnchainActionsClient(
    environment.settings.ONCHAIN_ACTIONS_API_URL,
  );
  setupAgent(agentWallet, vaultWallet, runtime, environment, onchainActions);
  await runtime.runTillEnd();
}

run();
