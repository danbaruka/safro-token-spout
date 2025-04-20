
import FaucetForm from '@/components/FaucetForm';
import ThemeSwitcher from "@/components/ThemeSwitcher";
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
    <div className="min-h-screen bg-gradient-to-br from-[#181e2b] via-[#283c66] to-[#243949] text-white flex flex-col relative">
      <ThemeSwitcher />
      <div className="container mx-auto flex flex-1 flex-col justify-center px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-12"> {/* Increased gap for modern look */}
          {/* Header */}
          <div className="w-full flex flex-col items-center">
            <div className="flex justify-center items-center w-full mb-3"> {/* Use mb-3 for visual balance */}
              <img
                src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png"
                alt="Safrochain Logo"
                className="h-28 md:h-36 xl:h-40 drop-shadow-2xl transition-all"
                style={{ display: "block" }}
              />
            </div>
            <h1 className="text-5xl md:text-6xl font-extrabold mb-2 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text drop-shadow-2xl leading-tight text-center">
              Safrochain Faucet
            </h1>
            <p className="text-gray-300 font-medium text-xl md:text-2xl text-center">
              Get test tokens for Safrochain Blockchain development
            </p>
            {/* Token Amount displayed at top */}
            <div className="mt-6 mb-2">
              <span className="inline-flex items-center px-7 py-3 rounded-full bg-indigo-700/90 text-2xl font-extrabold text-white shadow-lg border border-indigo-400/30 backdrop-blur">
                {loading ? <span className="animate-pulse">...</span> : `${tokenAmount ?? 250} ${tokenSymbol ?? "SAF"}`}
              </span>
            </div>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-2xl glass-morphism rounded-3xl p-12 border border-white/10 shadow-2xl relative bg-white/10 backdrop-blur-xl transition-all">
            <div className="mb-10 text-center">
              <h2 className="text-3xl font-semibold text-gradient-primary mb-2">Request Test Tokens</h2>
              <p className="text-gray-200 text-lg font-semibold">
                Receive test tokens to start building on Safrochain!
              </p>
            </div>
            <FaucetForm tokenAmount={tokenAmount ?? 250} tokenSymbol={tokenSymbol ?? "SAF"} />
          </div>

          {/* Footer */}
          <div className="text-center text-gray-400 text-base mt-12 opacity-70">
            Safrochain Testnet Faucet &bull; Use only for testing purposes
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
