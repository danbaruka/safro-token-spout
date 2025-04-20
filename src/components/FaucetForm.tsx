
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Copy, Check, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FaucetForm = () => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [txAttempt, setTxAttempt] = useState(0);
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

    try {
      // Use Supabase Edge Function for transaction
      const { data: rawTxResult, error } = await supabase.functions.invoke('safro-transaction', {
        body: { receiver: address }
      });

      if (error) {
        throw new Error(`Edge function error: ${error.message}`);
      }

      if (!rawTxResult || !rawTxResult.transactionHash) {
        throw new Error('Transaction failed: Invalid response from Edge Function');
      }
      
      // Format the transaction data for display
      const txData = {
        transactionHash: rawTxResult.transactionHash,
        chainId: rawTxResult.chainId || 'safrochain',
        blockHeight: rawTxResult.height?.toString(),
        amount: rawTxResult.amount || { denom: 'saf', amount: '250' },
        senderAddress: rawTxResult.senderAddress,
        receiverAddress: rawTxResult.receiverAddress || address,
        memo: rawTxResult.memo || 'Sending tokens with CosmJS',
        senderBalance: rawTxResult.senderBalance,
        receiverBalance: rawTxResult.receiverBalance,
        gasUsed: rawTxResult.gasUsed?.toString(),
        gasWanted: rawTxResult.gasWanted?.toString()
      };

      toast({
        title: "Transaction Successful!",
        description: (
          <a 
            href={`https://rpcsafro.cardanotask.com/tx?hash=0x${txData.transactionHash}`}
            target="_blank" 
            rel="noreferrer"
            className="text-blue-500 underline hover:text-blue-700"
          >
            View Transaction on Safrochain Explorer
          </a>
        ),
      });
    } catch (error) {
      // Implement retry logic on frontend side for network issues
      if (txAttempt < 2) {
        setTxAttempt(txAttempt + 1);
        toast({
          title: "Transaction Attempt Failed",
          description: `Retrying... (Attempt ${txAttempt + 1}/3)`,
          variant: "default",
        });
        
        // Wait a moment before retrying
        setTimeout(() => {
          handleSubmit(e);
        }, 2000);
        return;
      }
      
      // After all retries, show final error
      toast({
        title: "Transaction Failed",
        description: error instanceof Error 
          ? error.message 
          : "An unknown error occurred. Please try again later.",
        variant: "destructive",
      });
      
      // Reset retry counter
      setTxAttempt(0);
    } finally {
      setIsLoading(false);
    }
  };

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
          <span className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            {txAttempt > 0 ? `Retrying (${txAttempt}/3)...` : "Processing..."}
          </span>
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

