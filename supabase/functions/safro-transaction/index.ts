
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Helper to fetch faucet config from Supabase
async function fetchFaucetConfig() {
  // This uses the service role key, which is automatically attached for edge functions in Supabase
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://phqtdczpawzuvdpbxarn.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY secret is not set");
  }

  const url = `${SUPABASE_URL}/rest/v1/safro_faucet_config?select=*&order=id.desc&limit=1`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
  });
  if (!resp.ok) {
    throw new Error(`Failed to fetch faucet config from Supabase: ${resp.statusText}`);
  }
  const configArr = await resp.json();
  if (!configArr.length) {
    throw new Error("No faucet config found in Supabase table");
  }
  return configArr[0];
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Custom JSON stringifier to handle BigInt
const JSONStringifyWithBigInt = (obj: unknown): string => {
  return JSON.stringify(obj, (_, value) => 
    typeof value === 'bigint' ? value.toString() : value
  );
};

async function sendTokens(receiverAddress: string) {
  console.log("Starting transaction process...");
  // Fetch config dynamically
  const config = await fetchFaucetConfig();
  const {
    mnemonic: MNEMONIC,
    rpc_endpoint: RPC_ENDPOINT,
    denom: DENOM,
    amount: AMOUNT_VALUE,
    prefix: PREFIX,
    memo: MEMO,
    explorer_url_prefix: EXPLORER_TX_URL_PREFIX = "https://rpcsafro.cardanotask.com/tx?hash=0x",
  } = config;

  // Import CosmJS and utilities inside function for edge runtime compatibility
  const { DirectSecp256k1HdWallet } = await import("npm:@cosmjs/proto-signing");
  const { SigningStargateClient } = await import("npm:@cosmjs/stargate");
  const { stringToPath } = await import("npm:@cosmjs/crypto");
  const { validateMnemonic } = await import("npm:bip39");

  try {
    if (!MNEMONIC || MNEMONIC.split(" ").length < 12 || !validateMnemonic(MNEMONIC)) {
      throw new Error("Invalid or missing MNEMONIC configuration");
    }
    if (!RPC_ENDPOINT || !DENOM || !AMOUNT_VALUE || !PREFIX) {
      throw new Error("Missing required configuration (rpc_endpoint, denom, amount, or prefix)");
    }
    const amount = [{ denom: DENOM, amount: AMOUNT_VALUE }];
    // Debug
    console.log("RPC Endpoint:", RPC_ENDPOINT);
    console.log("Receiver Address:", receiverAddress);
    console.log("Denom:", DENOM);
    console.log("Amount:", amount);
    console.log("Prefix:", PREFIX);
    console.log("Memo:", MEMO);

    const wallet = await DirectSecp256k1HdWallet.fromMnemonic(MNEMONIC, {
      prefix: PREFIX,
      hdPaths: [stringToPath("m/44'/118'/0'/0/0")],
    });
    const [senderAccount] = await wallet.getAccounts();
    const senderAddress = senderAccount.address;
    const client = await SigningStargateClient.connectWithSigner(RPC_ENDPOINT, wallet);

    const chainId = await client.getChainId();
    const senderBalance = await client.getAllBalances(senderAddress);
    // Fee config same as before
    const fee = {
      amount: [{ denom: DENOM, amount: "500" }],
      gas: "200000",
    };

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
        console.log("Transaction successful!");
        console.log("Transaction hash:", result.transactionHash);
        console.log("Block height:", result.height);

        const receiverBalance = await client.getAllBalances(receiverAddress);
        const processedResult = {
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
          gasUsed: result.gasUsed ? result.gasUsed.toString() : undefined,
          gasWanted: result.gasWanted ? result.gasWanted.toString() : undefined,
          explorerTxUrl: `${EXPLORER_TX_URL_PREFIX}${result.transactionHash}`,
        };

        return processedResult;
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
    if (retries === 0) {
      throw new Error(`Transaction failed after multiple retries: ${txError?.message}`);
    }
    return { success: false, error: "Unknown error" };
  } catch (error) {
    console.error("Error sending tokens:", error.message);
    throw error;
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ error: "Method not allowed" }),
        { 
          status: 405,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }
    const requestData = await req.json();
    const { receiver } = requestData;
    // Fetch config for dynamic prefix
    const config = await fetchFaucetConfig();
    const PREFIX = config.prefix;
    const receiverAddress = receiver;
    if (!receiverAddress || !receiverAddress.startsWith(PREFIX)) {
      return new Response(
        JSON.stringify({ error: `Invalid receiver address. Must start with: ${PREFIX}` }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders }
        }
      );
    }

    // Core transaction logic now uses dynamic config
    const result = await sendTokens(receiverAddress);
    return new Response(
      JSONStringifyWithBigInt(result),
      { 
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  } catch (error) {
    console.error("Error in request handler:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "An unknown error occurred", 
        success: false 
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders }
      }
    );
  }
});
