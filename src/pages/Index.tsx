
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
        <div className="flex flex-col items-center justify-center gap-10">
          {/* Header */}
          <div className="flex flex-col items-center w-full">
            <div className="flex justify-center items-center w-full">
              <img 
                src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png" 
                alt="Safrochain Logo" 
                className="h-24 md:h-28 xl:h-32 mb-4 mx-auto drop-shadow-2xl transition-all"
                style={{ display: "block" }}
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-3 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text drop-shadow-2xl transition-all duration-150 leading-tight">
              Safrochain Faucet
            </h1>
            <p className="text-gray-300 font-medium text-lg md:text-xl">
              Get test tokens for Safrochain Blockchain development
            </p>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-md glass-morphism rounded-3xl p-10 border border-white/10 shadow-2xl relative bg-white/10 backdrop-blur-xl">
            <div className="mb-8 text-center">
              <h2 className="text-2xl font-semibold text-gradient-primary mb-1">Request Test Tokens</h2>
              <p className="text-gray-300 text-base font-semibold flex items-center justify-center gap-2">
                <span>Receive</span>
                <span className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-700/70 text-xl font-bold text-white shadow-md border border-indigo-400/20 backdrop-blur">
                  {loading ? <span className="animate-pulse">...</span> : `${tokenAmount ?? 250} ${tokenSymbol ?? "SAF"}`}
                </span>
                <span>for testing</span>
              </p>
            </div>
            <FaucetForm tokenAmount={tokenAmount ?? 250} tokenSymbol={tokenSymbol ?? "SAF"} />
          </div>

          {/* Footer */}
          <div className="text-center text-gray-400 text-sm mt-8 opacity-70">
            Safrochain Testnet Faucet &bull; Use only for testing purposes
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

