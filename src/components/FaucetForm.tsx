
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
      className="w-full max-w-2xl min-w-[400px] mx-auto
                 p-0 rounded-2xl border border-white/10 bg-white/60 dark:bg-[#191c2a]/80
                 shadow-[0_8px_32px_0_rgba(31,38,135,0.19)]
                 glass-morphism
                 backdrop-blur-xl 
                 overflow-hidden 
                 flex flex-row items-stretch gap-0
                 min-h-[210px] max-h-[340px]
                 transition-all duration-300
                 relative"
      style={{
        aspectRatio: '2.7/1',
        boxShadow: '0 4px 36px 0 rgba(78,58,122,0.15), 0 2px 12px 1px rgba(62,20,95,0.09)',
        background: 'linear-gradient(90deg,#ede9fc 0%, #f6f8fd 51%, #e3e4fb 100%)',
      }}
    >
      {/* Left: Form Fields */}
      <div className="flex flex-col flex-1 justify-center items-start px-10 py-6 gap-3 lg:gap-4">
        {/* Header */}
        <h2 className="text-lg font-bold text-[#452b87] dark:text-white bg-gradient-to-r from-[#6c3edb] via-[#a1a7f8] to-[#fbafe3] bg-clip-text text-transparent tracking-tight mb-2">
          Request Safrochain Test Tokens
        </h2>
        {/* Input */}
        <label htmlFor="safro-address" className="block text-[13px] md:text-sm font-medium mb-1 text-gray-800/70 dark:text-gray-200/80 text-left">
          Safrochain Address
        </label>
        <div className="relative flex items-center w-full">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-[18px] w-[18px] text-indigo-400 dark:text-indigo-300" />
          <Input
            id="safro-address"
            type="text"
            placeholder="e.g. addr_safro1xyz..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="pl-10 pr-11 h-9 text-[15px] text-gray-800 dark:text-white bg-white/70 dark:bg-black/10 border border-indigo-100 dark:border-indigo-700 shadow rounded-lg
              focus:border-indigo-300 dark:focus:border-indigo-400 transition-all"
            required
            maxLength={90}
            autoFocus
            style={{ minWidth: 0 }}
          />
          {address && <span className="absolute right-2"><CopyButton textToCopy={address} /></span>}
        </div>
        {/* Helper */}
        <span className="mt-1 text-[11px] leading-tight text-gray-400 dark:text-gray-400/60">
          Please use an address starting with <b>addr_safro</b>. Only one request per day.
        </span>
      </div>

      {/* Right: Action & Amount */}
      <div className="flex flex-col justify-between items-end flex-shrink-0 border-l border-white/20 px-7 py-6 gap-4 bg-gradient-to-b from-white/70 via-white/40 to-purple-50 dark:from-[#222238]/80 dark:via-[#221f35]/70 dark:to-transparent"
        style={{ minWidth: '220px' }}>
        <div className="flex items-center gap-2 mb-4 mt-1">
          <span className="rounded-lg px-3 py-1 text-[13px] bg-[#ece5fc] dark:bg-[#34246b] text-[#6c3edb] dark:text-indigo-200 font-semibold border border-[#ddcef9] dark:border-[#47307c]">
            {tokenAmount} {tokenSymbol}
          </span>
        </div>
        <Button
          type="submit"
          className="w-full px-6 py-[10px] text-sm rounded-lg font-semibold flex items-center justify-center gap-2
            bg-gradient-to-r from-[#8e7ced] via-[#aea7e6] to-[#fee1fa]
            hover:from-[#7c66b3] hover:to-[#e9cef8] shadow-lg transition-all duration-200"
          disabled={isLoading}
          style={{ minWidth: 0 }}
        >
          {isLoading ? (
            <span className="flex items-center text-[13px]">
              <RefreshCw className="mr-1 h-4 w-4 animate-spin" />
              Processing...
            </span>
          ) : (
            <>
              <ArrowRight className="mr-1 h-4 w-4" />
              Request Tokens
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

export default FaucetForm;
