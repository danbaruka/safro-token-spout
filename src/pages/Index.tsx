
import FaucetForm from '@/components/FaucetForm';

const Index = () => {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col items-center justify-center space-y-8">
          {/* Header */}
          <div className="text-center">
            <img 
              src="https://i.ibb.co/99q9HK6D/Safrochain-Logo.png" 
              alt="Safrochain Logo" 
              className="h-16 mb-6"
            />
            <h1 className="text-3xl font-bold mb-2">Safrochain Faucet</h1>
            <p className="text-gray-400">
              Get test tokens for Safrochain Blockchain development
            </p>
          </div>

          {/* Main Content */}
          <div className="w-full max-w-md bg-gray-900 p-8 rounded-lg border border-gray-800 shadow-xl">
            <div className="mb-6 text-center">
              <div className="text-[#355dab] mb-2">
                <h2 className="text-xl font-semibold">Request Test Tokens</h2>
              </div>
              <p className="text-gray-400 text-sm">
                Receive 250 SAF tokens for testing
              </p>
            </div>
            <FaucetForm />
          </div>

          {/* Footer */}
          <div className="text-center text-gray-500 text-sm mt-8">
            Safrochain Testnet Faucet • Use only for testing purposes
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
