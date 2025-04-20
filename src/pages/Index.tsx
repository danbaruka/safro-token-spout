
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
      const { data, error } = await supabase
        .from('safro_faucet_config')
        .select('amount, denom')
        .order('id', { ascending: false })
        .limit(1)
        .single();
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

  return (
    <div className="min-h-screen flex flex-col justify-center items-center w-full bg-gradient-to-tr from-[#1d2232] via-[#23243b] to-[#312540] p-0">
      <div className="flex flex-row justify-center gap-8 w-full max-w-6xl px-4 py-8 lg:py-24 md:py-16">
        {/* Left: Branding and Information */}
        <div className="flex-1 flex flex-col justify-center items-start min-w-[320px] max-w-[480px] pr-0 md:pr-6">
          <img 
            src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png" 
            alt="Safrochain Logo" 
            className="h-20 md:h-24 xl:h-32 mb-4 drop-shadow-2xl"
          />
          <h1 className="text-3xl md:text-4xl font-black mb-1 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text">
            Safrochain Faucet
          </h1>
          <p className="text-sm md:text-base font-medium text-gray-300 mb-4">
            Instantly request test tokens to build & test on the Safrochain Blockchain.
          </p>
          <div className="py-3 px-6 rounded-lg bg-indigo-700/80 flex items-center gap-3 text-white text-base shadow border border-indigo-500/20 mb-2">
            <span>Amount&nbsp;</span>
            <span className="font-bold text-base">
              {loading ? <span className="animate-pulse">...</span> : `${tokenAmount ?? 250} ${tokenSymbol ?? "SAF"}`}
            </span>
            <span>&nbsp;per request</span>
          </div>
          <p className="text-xs text-gray-400 mt-3">
            For testnet use only – Limited to 1 request per day per address.
          </p>
        </div>
        {/* Right: The Request Form */}
        <div className="flex-1 min-w-[360px] max-w-xl flex flex-col justify-center">
          <FaucetForm tokenAmount={tokenAmount ?? 250} tokenSymbol={tokenSymbol ?? "SAF"} />
        </div>
      </div>
      <footer className="absolute bottom-0 w-full text-center text-xs text-gray-500 py-2 opacity-80 pointer-events-none select-none">
        Safrochain Testnet Faucet &mdash; for developers and testing only
      </footer>
    </div>
  );
};

export default Index;
