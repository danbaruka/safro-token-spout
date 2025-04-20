
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Copy, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

const FaucetForm = () => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!address.startsWith('addr_safro')) {
      toast({
        title: "Invalid Address",
        description: "Address must start with 'addr_safro'",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Simulating transaction
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulated transaction hash
      const txHash = "0x123456789abcdef"; 

      toast({
        title: "Success!",
        description: (
          <div className="flex items-center justify-between">
            <span>250 SAF tokens sent</span>
            <CopyButton textToCopy={txHash} />
          </div>
        ),
      });
    } catch (error) {
      toast({
        title: "Transaction Failed",
        description: "Please try again later",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // New component for copy functionality
  const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = () => {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    };

    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleCopy} 
        className="hover:bg-transparent p-1"
      >
        {isCopied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4 hover:text-blue-500" />
        )}
      </Button>
    );
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="relative">
        <Wallet className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Enter your Safrochain address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          className="pl-10 bg-white/5 border-gray-700"
          required
        />
      </div>
      <Button 
        type="submit" 
        className="w-full bg-[#355dab] hover:bg-[#2a4a8a]"
        disabled={isLoading}
      >
        {isLoading ? (
          "Processing..."
        ) : (
          <>
            <ArrowRight className="mr-2 h-5 w-5" />
            Request 250 SAF
          </>
        )}
      </Button>
    </form>
  );
};

export default FaucetForm;
