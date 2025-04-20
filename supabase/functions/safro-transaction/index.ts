import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

// Helper to fetch faucet config from Supabase
async function fetchFaucetConfig() {
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

// Custom JSON stringifier for BigInt
const JSONStringifyWithBigInt = (obj: unknown): string =>
  JSON.stringify(obj, (_, value) => (typeof value === "bigint" ? value.toString() : value));

// Helper: Insert request info to user_requests table
async function insertUserRequest({ ip_address, region, user_agent, receiver_address, success, transaction_hash }: {
  ip_address: string,
  region: string | null,
  user_agent: string | null,
  receiver_address: string,
  success: boolean,
  transaction_hash: string | null,
}) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://phqtdczpawzuvdpbxarn.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/user_requests`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify({
      ip_address,
      region,
      user_agent,
      receiver_address,
      success,
      transaction_hash,
    }),
  });
  // do not throw on insert errors; just log
  if (!resp.ok) {
    console.error("Failed to log user request:", await resp.text());
  }
}

// Helper: Count requests by IP in last 24h
async function getRequestCountByIp(ip: string, sinceISO: string) {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://phqtdczpawzuvdpbxarn.supabase.co";
  const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = `${SUPABASE_URL}/rest/v1/user_requests?ip_address=eq.${ip}&request_timestamp=gte.${sinceISO}&select=id`;
  const resp = await fetch(url, {
    headers: {
      apikey: SUPABASE_SERVICE_ROLE_KEY!,
      Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json"
    }
  });
  if (!resp.ok) return 0;
  const arr = await resp.json();
  return Array.isArray(arr) ? arr.length : 0;
}

// Helper: Try to geolocate user's region (optional)
async function fetchRegion(ip: string): Promise<string | null> {
  if (!ip || ip === "127.0.0.1" || ip === "::1") return null;
  try {
    // Using ipinfo.io (free, returns country)
    const resp = await fetch(`https://ipinfo.io/${ip}/json`);
    if (!resp.ok) return null;
    const json = await resp.json();
    // Return combined country and region if available
    return json.country ? [json.country, json.region, json.city].filter(Boolean).join(", ") : null;
  } catch {
    return null;
  }
}

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

  let ip = "";
  let user_agent: string | null = null;
  let region: string | null = null;
  let receiver_address = "";
  let tx_success = false;
  let tx_hash: string | null = null;

  try {
    // Extract IP: try headers, then req.conn (not available), fallback to null
    ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("x-real-ip") ||
      ""; // Empty string if not found

    user_agent = req.headers.get("user-agent") || null;

    const requestData = await req.json();
    receiver_address = requestData.receiver;
    // Fetch config for prefix and IP rate limit
    const config = await fetchFaucetConfig();
    const PREFIX = config.prefix;
    const REQUESTS_LIMIT = config.requests_limit_per_day || 3;

    // IP is required for rate limiting
    if (!ip) {
      return new Response(
        JSON.stringify({ error: "IP address could not be determined", success: false }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }
    // 24 hour window
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const requestCount = await getRequestCountByIp(ip, since);
    if (requestCount >= REQUESTS_LIMIT) {
      // Insert failed log (enforced regardless of tx) for analysis
      await insertUserRequest({
        ip_address: ip,
        region: null,
        user_agent,
        receiver_address,
        success: false,
        transaction_hash: null,
      });
      return new Response(
        JSON.stringify({
          error: `Rate limit exceeded. Only ${REQUESTS_LIMIT} faucet requests allowed per 24h from the same IP.`,
          success: false
        }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Prefix validation
    if (!receiver_address || !receiver_address.startsWith(PREFIX)) {
      // Log as failed (invalid address)
      await insertUserRequest({
        ip_address: ip,
        region: null,
        user_agent,
        receiver_address,
        success: false,
        transaction_hash: null,
      });
      return new Response(
        JSON.stringify({ error: `Invalid receiver address. Must start with: ${PREFIX}` }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Try to fetch region as extra metadata (non-blocking)
    region = await fetchRegion(ip);

    // Core transaction logic
    const result = await sendTokens(receiver_address);
    tx_success = Boolean(result && result.success);
    tx_hash = tx_success && result.transactionHash ? String(result.transactionHash) : null;

    // Log success attempt
    await insertUserRequest({
      ip_address: ip,
      region,
      user_agent,
      receiver_address,
      success: tx_success,
      transaction_hash: tx_hash,
    });

    return new Response(
      JSONStringifyWithBigInt(result),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    // Try to log failed attempt
    try {
      await insertUserRequest({
        ip_address: ip,
        region,
        user_agent,
        receiver_address,
        success: false,
        transaction_hash: null,
      });
    } catch {}
    console.error("Error in request handler:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "An unknown error occurred",
        success: false,
      }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
