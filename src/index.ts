// Reflect metadata is required for tsyringe to work properly
import "reflect-metadata";
import { container } from "tsyringe";
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

export async function run() {
  const environment = container.resolve(Environment);

  /**
   * Register wallet client in container for dependency injection.
   */
  const walletClient = createWalletClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  container.register<WalletClient<Transport, Chain>>("WalletClient", {
    useValue: walletClient,
  });

  /**
   * Register public client in container for dependency injection.
   */
  const publicClient = createPublicClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.ARBITRUM_RPC_URL),
  });
  container.register<PublicClient>("PublicClient", {
    useValue: publicClient,
  });

  /**
   * Register bundler client
   */
  const bundlerClient = createBundlerClient({
    chain: arbitrumChain.chain,
    transport: http(environment.settings.BUNDLER_URL),
  });
  container.register<BundlerClient>("BundlerClient", {
    useValue: bundlerClient,
  });

  /**
   * Register where vault local wallet will be stored
   */
  const vaultLocalStorage = new LocalFileStorage(
    `${environment.settings.MEMORY_FOLDER}/vault-wallet.json`,
  );
  const vaultStoragePath = new JSONFileStorage<WalletStorage>(
    vaultLocalStorage,
  );
  container.register<IFileStorage<WalletStorage>>(
    "IFileStorage<WalletStorage>",
    { useValue: vaultStoragePath },
  );

  /**
   * Setup agent and run
   */
  const runtime = container.resolve(TSRuntime);
  const onchainActions = container.resolve(OnchainActionsClient);
  const agentWallet = container.resolve(MetaMaskWallet);
  const vaultWallet = container.resolve(StoredLocalWallet);
  setupAgent(agentWallet, vaultWallet, runtime, environment, onchainActions);
  await runtime.runTillEnd();
}

run();
