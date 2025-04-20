
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
        title: "Adresse invalide",
        description: "L'adresse doit commencer par 'addr_safro'",
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
        throw new Error('Transaction échouée: ' + (error?.message || rawTxResult?.error || 'Erreur inconnue'));
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
        title: "Transaction réussie!",
        description: (
          <a 
            href={`https://rpcsafro.cardanotask.com/tx?hash=0x${txData.transactionHash}`}
            target="_blank" 
            rel="noreferrer"
            className="text-blue-400 underline hover:text-blue-200"
          >
            Voir la transaction sur Safrochain Explorer
          </a>
        ),
      });
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Une erreur inconnue est survenue. Veuillez réessayer plus tard.";
      if (isRateLimitErrorMessage(errorMessage)) {
        showRateLimitError();
      } else {
        toast({
          title: "Erreur de transaction",
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
      message.includes('limite journalière') ||
      message.includes('daily limit') ||
      message.includes('Too Many Requests') ||
      message.includes('per 24h')
    );
  };

  const showRateLimitError = () => {
    toast({
      title: "Limite journalière atteinte",
      description: (
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 mr-2 text-amber-500" />
          <span>Vous avez atteint votre limite journalière. Veuillez réessayer demain.</span>
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
    <form 
      onSubmit={handleSubmit} 
      className="w-full max-w-2xl mx-auto rounded-3xl px-0 py-0 shadow-2xl glass-morphism border border-white/20 
                bg-gradient-to-br from-white via-indigo-50 to-purple-100 dark:from-[#1a2239] dark:via-[#21284d] dark:to-[#191e2a]
                transition-all duration-300 backdrop-blur-2xl relative overflow-hidden lg:p-14 md:p-10 p-7"
    >
      <div className="mb-8 flex flex-col gap-3">
        <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-950 dark:text-white bg-gradient-to-r from-blue-700 via-purple-800 to-indigo-600 bg-clip-text text-transparent text-center tracking-tight drop-shadow-2xl">
          Demandez vos tokens de test Safrochain
        </h2>
        <p className="text-center text-lg md:text-xl text-secondary-foreground dark:text-gray-200/70">
          Entrez votre adresse pour recevoir <b>{tokenAmount} {tokenSymbol}</b> gratuits sur le testnet.
        </p>
      </div>
      <div className="flex flex-col gap-8">
        <div>
          <label htmlFor="safro-address" className="block text-lg font-semibold mb-2 text-gray-800 dark:text-gray-200 text-left">
            Adresse Safrochain
          </label>
          <div className="relative flex items-center">
            <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 h-6 w-6 text-indigo-500 dark:text-indigo-300" />
            <Input
              id="safro-address"
              type="text"
              placeholder="Ex: addr_safro1xyz..."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="pl-14 pr-12 h-16 text-xl text-gray-800 dark:text-white bg-white/80 dark:bg-black/15 border-2 border-indigo-200 dark:border-indigo-900 shadow-lg rounded-2xl
                focus:border-blue-400 dark:focus:border-indigo-400 focus:ring-2 focus:ring-blue-200/60 font-medium transition-all"
              required
              maxLength={90}
              autoFocus
            />
            {address && <span className="absolute right-3"><CopyButton textToCopy={address} /></span>}
          </div>
        </div>
        <Button
          type="submit"
          className="w-full h-16 text-2xl py-0 px-10 mt-6 rounded-2xl font-bold flex items-center justify-center gap-3 
                     bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700
                     hover:from-indigo-700 hover:to-blue-400 shadow-xl
                     transition-all duration-150 outline-none focus:outline-none"
          disabled={isLoading}
        >
          {isLoading ? (
            <span className="flex items-center">
              <RefreshCw className="mr-2 h-6 w-6 animate-spin" />
              Traitement en cours...
            </span>
          ) : (
            <>
              <ArrowRight className="mr-2 h-6 w-6" />
              Demander {tokenAmount} {tokenSymbol}
            </>
          )}
        </Button>
      </div>
      <div className="mt-10 text-center text-sm text-gray-400 dark:text-gray-400/70">
        <span>Besoin d'aide ? Veuillez utiliser une adresse <b>commençant par addr_safro</b>.<br></br>
        Limite : 1 demande par jour.</span>
      </div>
    </form>
  );
};

export default FaucetForm;

