
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

          // Display the full error message in a toast
          toast({
            title: "Transaction error",
            description: errorStr,
            variant: "destructive",
          });
          setIsLoading(false);
          return;
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
            href={rawTxResult.explorerTxUrl || `https://rpcsafro.cardanotask.com/tx?hash=0x${txData.transactionHash}`}
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
        // Display the full error message
        toast({
          title: "Transaction error",
          description: (
            <div className="max-w-[340px] break-words">
              {errorMessage}
            </div>
          ),
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
      className="w-[98vw] sm:w-[90vw] md:w-[70vw] max-w-5xl mx-auto
                 min-w-0
                 lg:max-w-5xl
                 rounded-2xl border border-white/10 
                 bg-white/60 dark:bg-[#191c2a]/80
                 shadow-[0_8px_32px_0_rgba(31,38,135,0.19)]
                 glass-morphism
                 backdrop-blur-xl 
                 overflow-hidden 
                 flex flex-col md:flex-row items-center md:items-stretch justify-center gap-0
                 min-h-[350px] md:min-h-[340px] max-h-[620px]
                 transition-all duration-300
                 relative
                 mx-auto"
      style={{
        aspectRatio: '2.4/1',
        boxShadow: '0 8px 56px 0 rgba(78,58,122,0.14), 0 2px 24px 2px rgba(62,20,95,0.13)',
        background: 'linear-gradient(90deg,#ede9fc 0%, #f6f8fd 51%, #e3e4fb 100%)',
      }}
    >
      {/* Left: Form Fields */}
      <div className="flex flex-col flex-1 justify-center items-center md:items-start px-6 sm:px-10 py-8 gap-4 lg:gap-6 w-full">
        {/* Header */}
        <h2 className="text-2xl md:text-2xl font-bold text-[#452b87] dark:text-white bg-gradient-to-r from-[#6c3edb] via-[#a1a7f8] to-[#fbafe3] bg-clip-text text-transparent tracking-tight mb-2 w-full text-center md:text-left">
          Request Safrochain Test Tokens
        </h2>
        {/* Input */}
        <label htmlFor="safro-address" className="block w-full text-[14px] md:text-base font-medium mb-1 text-gray-800/80 dark:text-gray-200/80 text-left">
          Safrochain Address
        </label>
        <div className="relative flex items-center w-full">
          <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 h-[20px] w-[20px] text-indigo-400 dark:text-indigo-300" />
          <Input
            id="safro-address"
            type="text"
            placeholder="e.g. addr_safro1xyz..."
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="pl-11 pr-12 h-12 md:h-11 text-base text-gray-800 dark:text-white bg-white/70 dark:bg-black/10 border border-indigo-100 dark:border-indigo-700 shadow rounded-lg
              focus:border-indigo-300 dark:focus:border-indigo-400 transition-all"
            required
            maxLength={90}
            autoFocus
            style={{ minWidth: 0 }}
          />
          {address && <span className="absolute right-2"><CopyButton textToCopy={address} /></span>}
        </div>
        {/* Helper */}
        <span className="mt-1 text-xs md:text-sm leading-tight text-gray-400 dark:text-gray-400/60 w-full text-center md:text-left">
          Please use an address starting with <b>addr_safro</b>. Only one request per day.
        </span>
      </div>

      {/* Right: Action & Amount */}
      <div className="flex flex-row md:flex-col justify-center md:justify-between items-center md:items-end flex-shrink-0 border-t md:border-t-0 md:border-l border-white/20 px-5 sm:px-7 py-5 sm:py-8 gap-4 bg-gradient-to-b from-white/70 via-white/40 to-purple-50 dark:from-[#222238]/80 dark:via-[#221f35]/70 dark:to-transparent
        w-full md:w-auto"
        style={{ minWidth: '220px' }}>
        <div className="flex items-center gap-2 mb-0 md:mb-4 mt-0 md:mt-1">
          <span className="rounded-lg px-4 py-1.5 text-base bg-[#ece5fc] dark:bg-[#34246b] text-[#6c3edb] dark:text-indigo-200 font-semibold border border-[#ddcef9] dark:border-[#47307c]">
            {tokenAmount} {tokenSymbol}
          </span>
        </div>
        <Button
          type="submit"
          className="w-full md:w-auto px-8 py-3 text-base rounded-xl font-semibold flex items-center justify-center gap-3
            bg-gradient-to-r from-[#8e7ced] via-[#aea7e6] to-[#fee1fa]
            hover:from-[#7c66b3] hover:to-[#e9cef8] shadow-xl transition-all duration-200"
          disabled={isLoading}
          style={{ minWidth: 0 }}
        >
          {isLoading ? (
            <span className="flex items-center text-base">
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
      </div>
    </form>
  );
};

export default FaucetForm;
