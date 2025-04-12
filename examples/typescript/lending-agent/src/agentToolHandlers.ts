// Remove import from emberai-mcp index.js since we can't access it
// import {
//   // No longer directly importing from emberai-mcp
//   // ToolFunctions,
//   // TransactionPlan,
//   // GetWalletPositionsResponse,
//   // CapabilityType,
// } from "../../../mcp-tools/typescript/emberai-mcp/index.js";

import { z } from 'zod';
import axios from 'axios';

// Define a minimal MCPClient interface to match @modelcontextprotocol/sdk Client
interface MCPClient {
  callTool: (params: { 
    name: string; 
    arguments: Record<string, any>; 
    _meta?: Record<string, unknown> 
  }) => Promise<any>;
  close: () => Promise<void>;
}

// Define Zod schema for TransactionPlan
const TransactionPlanSchema = z.object({
  to: z.string(),
  data: z.string(),
  value: z.string().optional(),
  // Add other fields if needed based on actual server response
}).passthrough(); // Allow unknown fields
// Infer type for use in handlers
export type TransactionPlan = z.infer<typeof TransactionPlanSchema>;

// --- LLM-Facing Tool Schemas ---
// Keep this for reference, but agent.ts defines the tools now using Vercel AI SDK format

export const agentTools = [
  {
    name: "borrow",
    description:
      "Borrow a token. Provide the token name (e.g., USDC, WETH) and a human-readable amount.",
    parameters: {
      type: "object",
      properties: {
        tokenName: {
          type: "string",
          description: "The name of the token to borrow (e.g., USDC, WETH).",
        },
        amount: {
          type: "string",
          description: "The amount to borrow (human readable, e.g., '100', '0.5').",
        },
      },
      required: ["tokenName", "amount"],
    },
  },
  {
    name: "repay",
    description:
      "Repay a borrowed token. Provide the token name and a human-readable amount.",
    parameters: {
      type: "object",
      properties: {
        tokenName: {
          type: "string",
          description: "The name of the token to repay.",
        },
        amount: {
          type: "string",
          description: "The amount to repay.",
        },
      },
      required: ["tokenName", "amount"],
    },
  },
  {
    name: "supply",
    description:
      "Supply (deposit) a token. Provide the token name and a human-readable amount.",
    parameters: {
      type: "object",
      properties: {
        tokenName: {
          type: "string",
          description: "The name of the token to supply.",
        },
        amount: {
          type: "string",
          description: "The amount to supply.",
        },
      },
      required: ["tokenName", "amount"],
    },
  },
  {
    name: "withdraw",
    description:
      "Withdraw a previously supplied token. Provide the token name and a human-readable amount.",
    parameters: {
      type: "object",
      properties: {
        tokenName: {
          type: "string",
          description: "The name of the token to withdraw.",
        },
        amount: {
          type: "string",
          description: "The amount to withdraw.",
        },
      },
      required: ["tokenName", "amount"],
    },
  },
  {
    name: "getUserPositions",
    description:
      "Get a summary of your current lending and borrowing positions.",
    // No parameters needed from the LLM, userAddress is added by the agent
    parameters: { type: "object", properties: {} },
  },
  // Add getCapabilities schema if you expose that via a handler
  // {
  //   name: "getCapabilities",
  //   description: "Get lending/borrowing capabilities.",
  //   parameters: {
  //     type: "object",
  //     properties: {
  //       type: {
  //         type: "string",
  //         enum: [`${CapabilityType.LENDING}`], // Example
  //         description: "The type of capabilities to get.",
  //       },
  //     },
  //     required: ["type"],
  //   },
  // },
];

// --- Handler Context Type ---

// Defines the state/methods handlers receive from the Agent
export interface HandlerContext {
  // Replace toolExecutor with mcpClient
  mcpClient: MCPClient;
  tokenMap: Record<string, { chainId: string; address: string }>;
  userAddress: string;
  wallet: any; // Replace with actual wallet type if available
  executeAction: (
    actionName: string,
    transactions: TransactionPlan[],
    chain: "arbitrum" | "apechain", // Choose blockchain dynamically
  ) => Promise<string>;
  log: (...args: unknown[]) => void;
  // Use a generic type parameter since we don't have GetWalletPositionsResponse
  describeWalletPositionsResponse: (
    response: any, // Generic response type from MCP server
  ) => string;
  describeSearchAndBidResponse: (
    response: any, // Generic response type from MCP server
  ) => string;
}

// --- Stateless Handler Functions ---

// Helper function for validating transaction results
async function validateAndExecuteAction(
  actionName: string,
  rawTransactions: unknown, // Result from mcpClient.callTool
  context: HandlerContext,
  chain: "arbitrum" | "apechain" // Choose blockchain dynamically
): Promise<string> {
  const validationResult = z.array(TransactionPlanSchema).safeParse(rawTransactions);
  if (!validationResult.success) {
    const errorMsg = `MCP tool '${actionName}' returned invalid transaction data.`;
    context.log("Validation Error:", errorMsg, validationResult.error);
    throw new Error(errorMsg);
  }
  // Use validated data
  return await context.executeAction(actionName, validationResult.data, chain);
}

export async function handleBorrow(
  params: { tokenName: string; amount: string },
  context: HandlerContext,
): Promise<string> {
  const { tokenName, amount } = params;
  const tokenDetail = context.tokenMap[tokenName];
  if (!tokenDetail)
    throw new Error(`Token ${tokenName} not available for borrowing.`);

  context.log(
    `Executing borrow via MCP: ${tokenName} (address: ${tokenDetail.address}, chain: ${tokenDetail.chainId}), amount: ${amount}`,
  );

  const rawTransactions = await context.mcpClient.callTool({
    name: "borrow",
    arguments: {
      tokenAddress: tokenDetail.address,
      tokenChainId: tokenDetail.chainId,
      amount,
      userAddress: context.userAddress,
    }
  });

  // Validate and execute
  return await validateAndExecuteAction("borrow", rawTransactions, context, 'arbitrum');
}

export async function handleRepay(
  params: { tokenName: string; amount: string },
  context: HandlerContext,
): Promise<string> {
  const { tokenName, amount } = params;
  const tokenDetail = context.tokenMap[tokenName];
  if (!tokenDetail) throw new Error(`Token ${tokenName} not found.`);

  context.log(
    `Executing repay via MCP: ${tokenName} (address: ${tokenDetail.address}, chain: ${tokenDetail.chainId}), amount: ${amount}`,
  );

  const rawTransactions = await context.mcpClient.callTool({
    name: "repay",
    arguments: {
      tokenAddress: tokenDetail.address,
      tokenChainId: tokenDetail.chainId,
      amount,
      userAddress: context.userAddress,
    }
  });

  return await validateAndExecuteAction("repay", rawTransactions, context, 'arbitrum');
}

export async function handleSupply(
  params: { tokenName: string; amount: string },
  context: HandlerContext,
): Promise<string> {
  const { tokenName, amount } = params;
  const tokenDetail = context.tokenMap[tokenName];
  if (!tokenDetail)
    throw new Error(`Token ${tokenName} not available for supplying.`);

  context.log(
    `Executing supply via MCP: ${tokenName} (address: ${tokenDetail.address}, chain: ${tokenDetail.chainId}), amount: ${amount}`,
  );

  const rawTransactions = await context.mcpClient.callTool({
    name: "supply",
    arguments: {
      tokenAddress: tokenDetail.address,
      tokenChainId: tokenDetail.chainId,
      amount,
      userAddress: context.userAddress,
    }
  });

  return await validateAndExecuteAction("supply", rawTransactions, context, 'arbitrum');
}

export async function handleWithdraw(
  params: { tokenName: string; amount: string },
  context: HandlerContext,
): Promise<string> {
  const { tokenName, amount } = params;
  const tokenDetail = context.tokenMap[tokenName];
  if (!tokenDetail)
    throw new Error(`Token ${tokenName} not available for withdrawing.`);

  context.log(
    `Executing withdraw via MCP: ${tokenName} (address: ${tokenDetail.address}, chain: ${tokenDetail.chainId}), amount: ${amount}`,
  );

  const rawTransactions = await context.mcpClient.callTool({
    name: "withdraw",
    arguments: {
      tokenAddress: tokenDetail.address,
      tokenChainId: tokenDetail.chainId,
      amount,
      userAddress: context.userAddress,
    }
  });

  return await validateAndExecuteAction("withdraw", rawTransactions, context, 'arbitrum');
}

export async function handleGetUserPositions(
  params: Record<string, unknown>, // No specific params from LLM needed
  context: HandlerContext,
): Promise<string> {
  // Use mcpClient.callTool instead of toolExecutor.getUserPositions
  const positionsResponse = await context.mcpClient.callTool({
    name: "getUserPositions",
    arguments: { userAddress: context.userAddress }
  });

  return context.describeWalletPositionsResponse(positionsResponse);
}

/**
 * 
  * Handles the buying of NFTs from a collection.
 */
export async function handleBuyNFT(
  params: { collectionName: string; amount: string, attributes: string[] | null, tokenId: string | null; },
  context: HandlerContext,
): Promise<string> {
  try {

    const { collectionName, amount, attributes, tokenId } = params;

    const baseUrl = process.env.MAGICEDEN_API_BASE || "https://api-mainnet.magiceden.dev";

    console.log("Buying NFTs with params:", params);

    // Fetch listings from Magic Eden via ApeFloor
    const listings: any[] = await getApeFloorListings(collectionName, attributes, tokenId, baseUrl);

    console.log(`Fetched ${listings.length} listings from collection "${collectionName}"`);

    if (listings.length === 0) {
      console.log("No NFTs available for purchase.");
      return 'No NFTs available for purchase.';
    }

    let totalSpent = 0;
    const orderItems: any[] = [];
    const purchasedNFTs: any[] = [];

    // Attempt to select NFTs to purchase within the given budget
    for (const nft of listings) {
      const price = nft.market?.floorAsk?.price?.amount?.usd ?? Infinity;
      const orderId = nft.market?.floorAsk?.id;

      // Skip if over budget or order ID is missing
      if (totalSpent + price > amount || !orderId) break;

      orderItems.push({ orderId });
      purchasedNFTs.push(nft);
      totalSpent += price;
    }

    if (orderItems.length === 0) {
      console.log("Budget too low to purchase any NFTs.");
      return 'Budget too low to purchase any NFTs.';
    }

    console.log("Preparing to buy NFTs");

    // Retrieve transaction steps to buy NFTs
    const orderDetails = await getOrderDetails(orderItems, context.userAddress, baseUrl);

    if (!orderDetails) {
      console.error("Failed to fetch order details.");
      return 'Failed to fetch order details.';
    }

    const transactionData = [orderDetails.steps[0]?.items[0]?.data];
    if (!transactionData) {
      console.error("No transaction data found.");
      return 'No transaction data found.';
    }
    return await validateAndExecuteAction("buyNFT", transactionData, context, 'apechain');
  } catch (error: any) {
    console.error("Error buying NFTs:", error.message);
    return `Error buying NFTs: ${error.message}`;
  }
}

async function getApeFloorListings(collectionName: string, attributes: string[] | null, tokenId: string | null = null, baseUrl: string): Promise<any[]> {

  // Construct basic query params for sorting by floor price
  const queryParams = new URLSearchParams({
    sortBy: 'floorAskPrice',
    sortDirection: 'asc',
    edge_cache: 'true',
    limit: '100'
  });

  const collectionsUrl = `${baseUrl}/v2/unifiedSearch/xchain/collection/${collectionName}?${queryParams.toString()}`;

  console.log("Fetching collections for:", collectionName);
  const response = await axios.get(collectionsUrl);
  const collections: any[] = response.data.apechain;

  if (!collections || collections.length === 0) {
    console.warn(`No collections found for name: ${collectionName}`);
    return [];
  }

  const allTokens: any[] = [];

  // Build token search filters based on attributes/tokenId
  const params = await fetchCollectionAttributesParams(collections, attributes, baseUrl, tokenId);
  console.log(`Attribute query parameters: ${params}`);

  // Loop through each collection and fetch tokens
  for (const collection of collections) {
    const tokenUrl = `${baseUrl}/v3/rtp/apechain/tokens/v6?collection=${collection.contract}&sortBy=floorAskPrice&sortDirection=asc&includeAttributes=true&${params}`;
    console.log("Fetching tokens for contract:", collection.contract);

    const { data }: { data: { tokens: any[] } } = await axios.get(tokenUrl);

    if (Array.isArray(data.tokens)) {
      allTokens.push(...data.tokens);
    }
  }

  // Sort tokens by USD floor price
  return allTokens.sort((a, b) => {
    const priceA = a.market?.floorAsk?.price?.amount?.usd ?? Infinity;
    const priceB = b.market?.floorAsk?.price?.amount?.usd ?? Infinity;
    return priceA - priceB;
  });
}

/**
 * Fetches order details for buying NFTs.
 */
async function getOrderDetails(orderItems: any, takerAddress: any, baseUrl: string): Promise<any> {

  try {
    const url = `${baseUrl}/v3/rtp/apechain/execute/buy/v7`;

    const response = await axios.post(
      url,
      {
        items: orderItems,
        skipBalanceCheck: true,
        taker: takerAddress,
      },
      {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    return response.data;
  } catch (error: any) {
    console.error("Buy request failed:", error.response?.data || error.message);
    return null;
  }
}

/**
 * Fetches collection attributes and builds query parameters.
 */
async function fetchCollectionAttributesParams(collections: any[], attributes: string[] | null, baseUrl: string, tokenId: string | null = null): Promise<string> {

  let params = '';
  if (tokenId) {
    params += `tokenName=${tokenId}&`
  }
  else if (attributes) {

    for (const collection of collections) {
      let matchedAttributes = await parseUserAttributes(collection.contract, attributes, baseUrl);

      if (matchedAttributes.length > 0) {
        const query = buildAttributeQuery(matchedAttributes || null);

        params += `${query.toString()}`
        console.log(query.toString(), 'tokenParams')
      }
    }
  }
  return params;
}

// Fetches all attribute keys and values for a collection contract
async function fetchCollectionAttributes(
  contractAddress: string,
  baseUrl: string
): Promise<Record<string, { key: string; value: string }>> {
  const url = `${baseUrl}/v3/rtp/apechain/collections/${contractAddress}/attributes/all/v4`;
  const response = await axios.get(url);

  const valueToKeyMap: Record<string, { key: string; value: string }> = {};

  // Map attribute values to their keys (case-insensitive)
  for (const attr of response.data.attributes) {
    const key: string = attr.key;
    for (const valueObj of attr.values) {
      const value: string = valueObj.value;
      valueToKeyMap[value.toLowerCase()] = { key, value };
    }
  }

  return valueToKeyMap;
}


// Parses user-provided attribute values into { key, value } pairs using collection metadata
async function parseUserAttributes(
  contractAddress: string,
  userAttributes: string[] = [],
  baseUrl: string
): Promise<{ key: string | null; value: string }[]> {
  const attributeMap = await fetchCollectionAttributes(contractAddress, baseUrl);

  if (Object.keys(attributeMap).length === 0) {
    return [];
  }
  return userAttributes.map(userVal => {
    const lookup = attributeMap[userVal.toLowerCase()];
    return lookup || { key: null, value: userVal };
  });
}

// Converts an array of attribute key-value pairs into a query string format
function buildAttributeQuery(attributes: { key: string | null; value: string }[] | null): string {
  if (!attributes) return "";

  return attributes
    .filter(attr => attr.key && attr.value)
    .map(attr => `attributes[${attr.key}]=${attr.value}`)
    .join("&");
}


export async function handlelistAutoAcceptNFT(params: { collectionName: string; amount: string },
  context: HandlerContext,): Promise<string> {
  try {

    const { collectionName, amount } = params;

    const baseUrl = process.env.MAGICEDEN_API_BASE || "https://api-mainnet.magiceden.dev";

    // Get latest user NFTs
    const userTokensUrl = `${baseUrl}/v3/rtp/apechain/users/${context.userAddress}/tokens/v7?sortBy=acquiredAt&sortDirection=desc&includeTopBid=true&includeAttributes=false`;

    const response = await axios.get(userTokensUrl);
    const allTokens = response.data.tokens;

    console.log(`Fetched ${allTokens.length} NFTs from user wallet.`);

    // Filter tokens by collection name
    const matchingTokens = allTokens.filter((token: any) =>
      token.token.collection.name?.toLowerCase().includes(collectionName.toLowerCase())
  );

    if (matchingTokens.length === 0) {
      console.log("No matching NFTs found in user wallet.");
      return "No matching NFTs found in user wallet.";
    }

    // Format token IDs for bidding API
    const tokenSetIds = matchingTokens.map(
      (item: any) => `${item.token.contract}:${item.token.tokenId}`
    );

    const bids: any[] = [];

    // Fetch bids for each token
    for (const tokenSetId of tokenSetIds) {
      const bidUrl = `${baseUrl}/v3/rtp/apechain/orders/bids/v6?token=${tokenSetId}&sortBy=createdAt&limit=50`;
      const bidResponse = await axios.get(bidUrl);

      for (const bid of bidResponse.data.orders) {
        bids.push({
          ...bid,
          tokenId: tokenSetId,
        });
      }
    }

    if (bids.length === 0) {
      console.log("No valid bids found.");
      return "No NFTs available for listing.";
    }

    // Auto-accept the highest bid that meets or exceeds user's minimum price
    for (const bid of bids) {
      if (bid?.price?.amount?.usd >= parseFloat(amount)) {
        console.log("Accepting bid:", bid.price.amount.usd, "USD for token", bid.tokenId);

        const sellResponse = await sellNFTs(bid.id, context.userAddress, bid.tokenId, baseUrl);
        if (!sellResponse) {
          console.error("Failed to fetch sell transaction steps.");
          continue;
        }

        const saleStep = sellResponse.steps.find((step: any) => step.id === "sale");
        if (!saleStep) {
          console.error("No 'sale' step found in transaction.");
          continue;
        }

        console.log("Sale step found. Preparing transaction...");

        const txData = saleStep.items[0].data;

        const transaction = [{
          from: txData.from,
          to: txData.to,
          data: txData.data,
        }];

        return await validateAndExecuteAction("listAutoAccept", transaction, context, "apechain");
      }
    }

    console.log("No bids met the minimum amount.");
    return "No bids met the minimum listing price.";
  } catch (error: any) {
    console.error("Error during NFT auto-listing:", error.response?.data || error.message);
    return "An error occurred while processing NFT listing.";
  }
}

// Executes sell request to Magic Eden's API for a specific NFT
async function sellNFTs(orderItems: any, takerAddress: string, tokenId: string, baseUrl: string) {
  try {

    const url = `${baseUrl}/v3/rtp/apechain/execute/sell/v7`;

    const response = await axios.post(
      url,
      {
        items: [
          {
            quantity: 1,
            token: tokenId,
            orderId: orderItems,
          }
        ],
        taker: takerAddress,
      },
      {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Sell response received.");
    return response.data;
  } catch (error: any) {
    console.error("Buy request failed:", error.response?.data || error.message);
    return null;
  }
}


// Simplifies the NFT listing data for easier consumption
function simplifyNftListings(fullListingData: any) {
  return fullListingData.map((item: any) => {
    const token = item.token;
    const market = item.market?.floorAsk;

    return {
      name: token.name,
      tokenId: token.tokenId,
      image: token.image,
      description: token.description,
      price: market?.price?.amount?.decimal ?? null,
      priceUsd: market?.price?.amount?.usd ?? null,
      currency: market?.price?.currency?.symbol ?? null,
      collection: token.collection?.name ?? null,
      rarity: token.rarity,
      owner: token.owner,
      marketplace: market?.source?.name ?? null,
      marketplaceUrl: market?.source?.url ?? null,
      attributes: token.attributes?.map((attr: any) => ({
        key: attr.key,
        value: attr.value,
      })) ?? [],
    };
  });
}


/**
 * Handles the search for NFTs based on collection name, attributes, and tokenId.
 */
export async function handleSearchNFT(params: { collectionName: string; attributes: string[] | null; tokenId: string | null; },
  context: HandlerContext,): Promise<string> {
  try {

    const baseUrl = process.env.MAGICEDEN_API_BASE || "https://api-mainnet.magiceden.dev";

    const { collectionName, attributes, tokenId } = params;

    // Fetch NFT listings based on the provided collection, attributes, and tokenId.
    const listings: any[] = await getApeFloorListings(collectionName, attributes, tokenId, baseUrl);

    if (listings.length === 0) {
      console.log("No NFTs available for purchase.");
      return 'No NFTs available for purchase.';
    }

    // Simplify the listings data for easier display to the user.
    let simplifyNftListingss = simplifyNftListings(listings);

    return context.describeSearchAndBidResponse(simplifyNftListingss);
  } catch (error: any) {
    console.error("Error during NFT auto-listing:", error.response?.data || error.message);
    return "An error occurred while processing NFT listing.";
  }
}


/**
 * Handles the placing of an NFT offer.
 */
export async function handlePlaceOfferNFT(params: { collectionName: string; amount: string; attributes: string[] | null; tokenId: string | null; },
  context: HandlerContext,): Promise<string> {
  try {

    const { collectionName, amount, attributes, tokenId } = params;
    const baseUrl = process.env.MAGICEDEN_API_BASE || "https://api-mainnet.magiceden.dev";

    // Constant for the currency address (wAPE)
    const CURRENCY_ADDRESS = "0x48b62137edfa95a428d35c09e44256a739f6b557";

    // Convert dollar amount to wAPE in wei
    const BID_PRICE_WEI = await convertDollarToWape(Number(amount));

    //Fetch listings based on collection, attributes, and tokenId
    const listings: any[] = await getApeFloorListings(collectionName, attributes, tokenId, baseUrl);

    if (!listings.length) {
      console.warn("No listings found for given attributes.");
      return "No listings found for given attributes.";
    }

    // Prepare bid payload
    const bidPayload = {
      maker: context.userAddress,
      source: "magiceden.io",
      params: [
        {
          weiPrice: BID_PRICE_WEI,
          currency: CURRENCY_ADDRESS,
          quantity: 1,
          orderbook: "reservoir",
          orderKind: "seaport-v1.6",
          options: {
            "seaport-v1.6": {
              useOffChainCancellation: true
            }
          },
          automatedRoyalties: true,
          token: `${listings[0].token.contract}:${listings[0].token.tokenId}`
        }
      ]
    };

    // Submit bid request
    const { data: bidResponse } = await axios.post(`${baseUrl}/v3/rtp/apechain/execute/bid/v5`, bidPayload, {
      headers: {
        accept: '*/*',
        'content-type': 'application/json',
      }
    });

    // Extract the signature step from the response.
    const signStep = bidResponse.steps.find((step: any) => step.id === 'order-signature');
    if (!signStep) throw new Error("Signature step not found in response.");

    const { sign: signData, post: postData } = signStep.items[0].data;

    console.log("Consideration data:", postData.body.order.data.consideration);

    // Sign order using EIP-712
    const signature = await context.wallet._signTypedData(signData.domain, signData.types, signData.value);
    console.log("Signature:", signature);

    // Submit signed order
    const { data: orderResponse } = await axios.post(
      `${baseUrl}/v3/rtp/apechain/order/v3?signature=${signature}`,
      postData.body,
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    console.log("Order placed successfully!", orderResponse);
    return "Order placed successfully!";
  } catch (error: any) {
    const errorMessage = error.response?.data || error.message || "Unknown error";
    console.error("Error placing bid:", errorMessage);
    return `Error placing bid: ${errorMessage}`;
  }
}

// Convert USD amount to wAPE in wei
async function convertDollarToWape(usdAmount: number): Promise<string> {
  try {
    // Fetch wAPE price in USD — this assumes wAPE is tracked like APE
    const response = await axios.get(
      'https://api.coingecko.com/api/v3/simple/price?ids=apecoin&vs_currencies=usd'
    );

    const apePrice = response.data?.apecoin?.usd;

    if (!apePrice || typeof apePrice !== 'number') {
      throw new Error("Invalid price data for wAPE.");
    }

    const wapeAmount = usdAmount / apePrice;

    // Convert wAPE to wei (1 wAPE = 1 ETH = 10^18 wei)
    const wapeInWei = (wapeAmount * Math.pow(10, 18)).toString();

    // console.log("wAPE in weimethod:", wapeInWei);
    return wapeInWei;
  } catch (error: any) {
    console.error("Error converting USD to wAPE:", error.message || error);
    throw error;
  }
}


// Add handleGetCapabilities if needed (adapt to use mcpClient)
// export async function handleGetCapabilities(
//   params: { type: string },
//   context: HandlerContext,
// ): Promise<string> {
//   const response = await context.mcpClient.callTool({
//     name: "getCapabilities",
//     arguments: { type: params.type }
//   });
//   return `Capabilities loaded. Available token types: ...`; // Format response
// } 