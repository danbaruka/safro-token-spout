import FaucetForm from '@/components/FaucetForm';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
const Index = () => {
  const [tokenAmount, setTokenAmount] = useState<number | null>(null);
  const [tokenSymbol, setTokenSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      const {
        data,
        error
      } = await supabase.from('safro_faucet_config').select('amount, denom').order('id', {
        ascending: false
      }).limit(1).single();
      if (!error && data) {
        setTokenAmount(Number(data.amount));
        setTokenSymbol(data.denom?.toUpperCase() || "SAF");
      } else {
        setTokenAmount(250);
        setTokenSymbol("SAF");
      }
      setLoading(false);
    };
    fetchConfig();
  }, []);
  return <div className="min-h-screen flex flex-col justify-center items-center w-full bg-gradient-to-tr from-[#1d2232] via-[#23243b] to-[#312540] p-6">
      <div className="flex flex-col justify-center items-center gap-8 max-w-[900px] w-full mx-auto">
        {/* Branding and Information */}
        <div className="flex flex-col justify-center items-center max-w-md px-6 text-center">
          <img src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png" alt="Safrochain Logo" className="h-24 mb-4 drop-shadow-2xl" />
          <h1 className="text-4xl font-extrabold mb-2 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Safrochain Faucet
          </h1>
          <p className="text-sm md:text-base font-medium text-gray-300 mb-6 max-w-[420px]">
            Instantly request test tokens to build & test on the Safrochain Blockchain.
          </p>
          <div className="rounded-lg bg-indigo-700/80 flex items-center gap-3 text-white text-sm shadow border border-indigo-500/20 mb-2 max-w-[300px] mx-auto px-[12px] py-[2px]">
            <span>Amount&nbsp;</span>
            <span className="font-bold text-base">
              {loading ? <span className="animate-pulse">...</span> : `${tokenAmount ?? 250} ${tokenSymbol ?? "SAF"}`}
            </span>
            <span>&nbsp;per request</span>
          </div>
          <p className="text-xs text-gray-400 mt-3 max-w-[380px]">
            For testnet use only – Limited to 1 request per day per address.
          </p>
        </div>

        {/* The Request Form */}
        <div className="w-full px-4">
          <FaucetForm tokenAmount={tokenAmount ?? 250} tokenSymbol={tokenSymbol ?? "SAF"} />
        </div>
      </div>
      <footer className="mt-12 w-full text-center text-xs text-gray-500 py-2 opacity-80 pointer-events-none select-none max-w-lg mx-auto">
        Safrochain Testnet Faucet &mdash; for developers and testing only
      </footer>
    </div>;
};
export default Index;