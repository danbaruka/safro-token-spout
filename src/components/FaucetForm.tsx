
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface FaucetFormProps {
  tokenAmount?: number;
  tokenSymbol?: string;
}

const FaucetForm = ({ tokenAmount = 250, tokenSymbol = "SAF" }: FaucetFormProps) => {
  const [address, setAddress] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!address.startsWith('addr_safro')) {
      toast({
        title: "Invalid address",
        description: "Address must start with 'addr_safro'",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    try {
      const response = await supabase.functions.invoke('safro-transaction', {
        body: { receiver: address }
      });

      const { data: rawTxResult, error } = response;

      if (isRateLimitError(error) || isRateLimitError(rawTxResult)) {
        showRateLimitError();
        return;
      }
      if (!rawTxResult || !rawTxResult.transactionHash) {
        if (rawTxResult && typeof rawTxResult === 'object' && rawTxResult.error) {
          const errorStr = String(rawTxResult.error);
          if (errorStr.includes('Rate limit') || errorStr.includes('daily limit') || errorStr.includes('per 24h')) {
            showRateLimitError();
            return;
          }
        }
        throw new Error('Transaction failed: ' + (error?.message || rawTxResult?.error || 'Unknown error'));
      }

      const txData = {
        transactionHash: rawTxResult.transactionHash,
        chainId: rawTxResult.chainId || 'safrochain',
        blockHeight: rawTxResult.height?.toString(),
        amount: rawTxResult.amount || { denom: tokenSymbol.toLowerCase(), amount: String(tokenAmount) },
        senderAddress: rawTxResult.senderAddress,
        receiverAddress: rawTxResult.receiverAddress || address,
        memo: rawTxResult.memo || 'Sending tokens with CosmJS',
        senderBalance: rawTxResult.senderBalance,
        receiverBalance: rawTxResult.receiverBalance,
        gasUsed: rawTxResult.gasUsed?.toString(),
        gasWanted: rawTxResult.gasWanted?.toString()
      };

      toast({
        title: "Success!",
        description: (
          <a 
            href={`https://rpcsafro.cardanotask.com/tx?hash=0x${txData.transactionHash}`}
            target="_blank" 
            rel="noreferrer"
            className="text-blue-400 underline hover:text-blue-200"
          >
            View transaction on Safrochain Explorer
          </a>
        ),
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "An unknown error occurred. Please try again later.";
      if (isRateLimitErrorMessage(errorMessage)) {
        showRateLimitError();
      } else {
        toast({
          title: "Transaction error",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isRateLimitError = (obj: any): boolean => {
    if (!obj) return false;
    if (obj.code === '429' || obj.status === 429 || obj.statusCode === 429) return true;
    if (obj.message && isRateLimitErrorMessage(obj.message)) return true;
    if (obj.error) {
      const errorStr = String(obj.error);
      if (isRateLimitErrorMessage(errorStr)) return true;
    }
    return false;
  };

  const isRateLimitErrorMessage = (message: string): boolean => {
    if (!message) return false;
    return (
      message.includes('429') ||
      message.includes('Rate limit') ||
      message.includes('daily limit') ||
      message.includes('Too Many Requests') ||
      message.includes('per 24h')
    );
  };

  const showRateLimitError = () => {
    toast({
      title: "Daily limit reached",
      description: (
        <div className="flex items-center">
          <AlertTriangle className="h-4 w-4 mr-2 text-amber-500" />
          <span>You have reached your daily limit. Please try again tomorrow.</span>
        </div>
      ),
      variant: "destructive",
    });
    setIsLoading(false);
  };

  const CopyButton = ({ textToCopy }: { textToCopy: string }) => {
    const [isCopied, setIsCopied] = useState(false);
    const handleCopy = () => {
      navigator.clipboard.writeText(textToCopy);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 1500);
    };
    return (
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleCopy} 
        className="hover:bg-transparent p-1"
        tabIndex={-1}
        aria-label="Copy address"
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
    <form 
      onSubmit={handleSubmit} 
      className="w-full mx-auto p-0 rounded-2xl shadow-2xl glass-morphism border border-white/10 
                bg-gradient-to-br from-white/70 via-indigo-50 to-purple-100 
                dark:from-[#191c2a] dark:via-[#23284a] dark:to-[#181a23]
                transition-all duration-300 backdrop-blur-xl relative overflow-hidden
                flex flex-col gap-8 min-h-[325px]"
    >
      {/* Header */}
      <div className="flex flex-row items-center gap-3 justify-between w-full mb-2">
        <h2 className="text-xl font-bold text-indigo-950 dark:text-white bg-gradient-to-r from-blue-700 via-purple-800 to-indigo-600 bg-clip-text text-transparent tracking-tight">
          Request Safrochain Test Tokens
        </h2>
        <span className="rounded-full px-3 py-1 text-xs bg-blue-50/90 dark:bg-indigo-950/60 text-indigo-700 dark:text-white font-semibold border border-blue-100">
          {tokenAmount} {tokenSymbol}
        </span>
      </div>
      {/* Address Input */}
      <div>
        <label htmlFor="safro-address" className="block text-xs md:text-sm font-semibold mb-1 text-gray-800 dark:text-gray-200 text-left">
          Safrochain Address
        </label>
        <div className="relative flex items-center">
          <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-indigo-500 dark:text-indigo-300" />
          <Input
            id="safro-address"
            type="text"
            placeholder="e.g. addr_safro1xyz..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="pl-12 pr-12 h-12 text-base text-gray-800 dark:text-white bg-white/80 dark:bg-black/10 border-2 border-indigo-200 dark:border-indigo-800 shadow-md rounded-xl
                focus:border-blue-400 dark:focus:border-indigo-400 focus:ring-2 focus:ring-blue-200/60 font-medium transition-all"
            required
            maxLength={90}
            autoFocus
          />
          {address && <span className="absolute right-3"><CopyButton textToCopy={address} /></span>}
        </div>
      </div>
      {/* Submit Button */}
      <Button
        type="submit"
        className="w-full h-12 text-base py-0 px-8 rounded-xl font-semibold flex items-center justify-center gap-2 
                   bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700
                   hover:from-indigo-800 hover:to-blue-400 shadow-lg transition-all"
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="flex items-center">
            <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
            Processing...
          </span>
        ) : (
          <>
            <ArrowRight className="mr-2 h-5 w-5" />
            Request Tokens
          </>
        )}
      </Button>
      {/* Helper */}
      <div className="mt-1 text-center text-xs text-gray-400 dark:text-gray-400/70">
        <span>
          Please use an address starting with <b>addr_safro</b>.<br />
          One request per address per day.
        </span>
      </div>
    </form>
  );
};

export default FaucetForm;
