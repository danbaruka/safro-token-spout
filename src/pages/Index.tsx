import FaucetForm from '@/components/FaucetForm';
import ThemeSwitcher from "@/components/ThemeSwitcher";

const TOKEN_AMOUNT = 250;
const TOKEN_SYMBOL = "SAF";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#181e2b] via-[#283c66] to-[#243949] text-white flex flex-col">
      <ThemeSwitcher />
      <div className="container mx-auto flex flex-1 flex-col justify-center px-4 py-8">
        <div className="flex flex-col items-center justify-center gap-10">
          {/* Header */}
          <div className="text-center flex flex-col items-center">
            <div className="flex justify-center items-center w-full">
              <img 
                src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png" 
                alt="Safrochain Logo" 
                className="h-20 mb-4 mx-auto drop-shadow-xl"
                style={{ display: "block" }}
              />
            </div>
            <h1 className="text-4xl font-black mb-3 bg-gradient-to-tr from-blue-400 via-indigo-400 to-purple-400 text-transparent bg-clip-text drop-shadow-lg">
              Safrochain Faucet
            </h1>
            <p className="text-gray-300 font-medium text-lg">
              Get test tokens for Safrochain Blockchain development
            </p>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-md glass-morphism rounded-2xl p-8 border border-white/10 shadow-2xl relative">
            <div className="mb-6 text-center">
              <div className="text-gradient-primary mb-2">
                <h2 className="text-2xl font-semibold">Request Test Tokens</h2>
              </div>
              <p className="text-gray-300 text-base font-semibold flex items-center justify-center gap-2">
                <span>Receive</span>
                <span className="inline-flex items-center px-3 py-1 rounded bg-indigo-700/60 text-lg font-bold text-white shadow">
                  {TOKEN_AMOUNT} {TOKEN_SYMBOL}
                </span>
                <span>for testing</span>
              </p>
            </div>
            <FaucetForm tokenAmount={TOKEN_AMOUNT} tokenSymbol={TOKEN_SYMBOL} />
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
