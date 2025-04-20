
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { DirectSecp256k1HdWallet } from "npm:@cosmjs/proto-signing";
import { SigningStargateClient } from "npm:@cosmjs/stargate";
import { stringToPath } from "npm:@cosmjs/crypto";
import { validateMnemonic } from "npm:bip39";

// Configuration
const MNEMONIC = "bomb copper better force inject kitten access isolate forward marine foam rubber retreat cool depart impact bus claw wave pulp assault inch split save";
const RPC_ENDPOINT = "https://rpcsafro.cardanotask.com";
const DEFAULT_RECEIVER_ADDRESS = "addr_safro16m9kwskkjf0vuyku4fkjlyat58nn4ca685n38x";
const DENOM = "saf";
const AMOUNT_VALUE = "250";
const PREFIX = "addr_safro";
const MEMO = "Sending tokens with CosmJS";

// CORS headers for browser requests
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Transaction function
async function sendTokens(receiverAddress: string) {
  console.log("Starting transaction process...");
  
  try {
    // Validate configuration
    if (!MNEMONIC || MNEMONIC.split(" ").length < 12 || !validateMnemonic(MNEMONIC)) {
      throw new Error("Invalid or missing MNEMONIC configuration");
    }
    
    if (!RPC_ENDPOINT || !DENOM || !AMOUNT_VALUE || !PREFIX) {
      throw new Error("Missing required configuration (RPC_ENDPOINT, DENOM, AMOUNT, or PREFIX)");
    }

    // Construct amount array
    const amount = [{ denom: DENOM, amount: AMOUNT_VALUE }];

    // Debug logs
    console.log("RPC Endpoint:", RPC_ENDPOINT);
    console.log("Receiver Address:", receiverAddress);
    console.log("Denom:", DENOM);
    console.log("Amount:", amount);
    console.log("Prefix:", PREFIX);
    console.log("Memo:", MEMO);

    // Create wallet from mnemonic
    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
      prefix: PREFIX,
      hdPaths: [stringToPath("m/44'/118'/0'/0/0")], // Standard Cosmos derivation path
    });
    const [senderAccount] = await wallet.getAccounts();
    const senderAddress = senderAccount.address;

    // Connect to the blockchain
    console.log("Connecting to blockchain...");
    const client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, wallet);

    // Log transaction details
    const chainId = await client.getChainId();
    console.log("Connected to chain:", chainId);
    console.log("Sender address:", senderAddress);
    console.log("Receiver address:", receiverAddress);
    console.log("Amount to send:", amount);

    // Check sender's balance
    const senderBalance = await client.getAllBalances(senderAddress);
    console.log("Sender's balance:", senderBalance);

    // Define custom fee
    const fee = {
      amount: [{ denom: DENOM, amount: "500" }], // Fee amount
      gas: "200000", // Gas limit
    };

    // Send tokens with retry logic
    let retries = 3;
    let result;
    let txError;

    while (retries > 0) {
      try {
        console.log(`Attempt ${4 - retries}/3: Sending transaction...`);
        result = await client.signAndBroadcast(
          senderAddress,
          [
            {
              typeUrl: "/cosmos.bank.v1beta1.MsgSend",
              value: {
                fromAddress: senderAddress,
                toAddress: receiverAddress,
                amount,
              },
            },
          ],
          fee,
          MEMO
        );

        console.log("Raw transaction result:", result);

        // Transaction was successful
        console.log("Transaction successful!");
        console.log("Transaction hash:", result.transactionHash);
        console.log("Block height:", result.height);

        // Check receiver's balance
        const receiverBalance = await client.getAllBalances(receiverAddress);
        console.log("Receiver's balance:", receiverBalance);

        // Return successful transaction data
        return {
          success: true,
          transactionHash: result.transactionHash,
          chainId: chainId,
          height: result.height,
          amount: amount[0],
          senderAddress: senderAddress,
          receiverAddress: receiverAddress,
          memo: MEMO,
          senderBalance: senderBalance,
          receiverBalance: receiverBalance,
          gasUsed: result.gasUsed,
          gasWanted: result.gasWanted
        };
      } catch (error) {
        console.error("Transaction error:", error.message);
        console.error("Raw transaction error response:", error.response || error);

        txError = error;
        retries -= 1;
        if (retries > 0) {
          console.log(`Retrying transaction... (${3 - retries}/3)`);
        }
      }
    }

    // If we've exhausted all retries
    if (retries === 0) {
      throw new Error(`Transaction failed after multiple retries: ${txError?.message}`);
    }

    // This should not be reached, but TypeScript needs a return value
    return { success: false, error: "Unknown error" };

  } catch (error) {
    console.error("Error sending tokens:", error.message);
    throw error;
  }
}

// Request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  
  try {
    // Only accept POST requests
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          status: 405, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }

    // Parse request body
    const requestData = await req.json();
    const { receiver } = requestData;
    
    // Use provided receiver address or default
    const receiverAddress = receiver || DEFAULT_RECEIVER_ADDRESS;
    
    // Basic validation for receiver address
    if (!receiverAddress.startsWith(PREFIX)) {
      return new Response(
        JSON.stringify({ error: `Invalid receiver address. Must start with: ${PREFIX}` }),
        { 
          status: 400, 
          headers: { 
            "Content-Type": "application/json",
            ...corsHeaders 
          } 
        }
      );
    }

    // Send tokens
    const result = await sendTokens(receiverAddress);
    
    // Return successful response
    return new Response(
      JSON.stringify(result),
      { 
        status: 200, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  } catch (error) {
    console.error("Error in request handler:", error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred", 
        success: false 
      }),
      { 
        status: 500, 
        headers: { 
          "Content-Type": "application/json",
          ...corsHeaders 
        } 
      }
    );
  }
});
