
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Wallet, ArrowRight, Copy, Check, RefreshCw, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

const FaucetForm = () => {
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
      // Use Supabase Edge Function for transaction
      const response = await supabase.functions.invoke('safro-transaction', {
        body: { receiver: address }
      });
      
      // Récupérer les données et vérifier les erreurs
      const { data: rawTxResult, error } = response;
      
      console.log("Supabase function response:", { rawTxResult, error });

      // Si l'invocation retourne une erreur directe (comme un 429)
      if (error) {
        console.log("Error detected:", error);
        
        // Vérifier si c'est un dépassement de limite
        if (error.message && (
          error.message.includes('429') || 
          error.message.includes('Rate limit') ||
          error.message.includes('Too Many Requests')
        )) {
          showRateLimitError();
          return;
        }
        
        throw new Error(`Erreur: ${error.message}`);
      }
      
      // Vérifier si la réponse indique un problème de limite (429)
      if (response.status === 429 || 
          (rawTxResult && 
            ((rawTxResult.status === 429) ||
             (rawTxResult.statusCode === 429) || 
             (typeof rawTxResult === 'object' && rawTxResult.error && (
               String(rawTxResult.error).includes('Rate limit exceeded') ||
               String(rawTxResult.error).includes('daily limit') ||
               String(rawTxResult.error).includes('per 24h')))))) {
        showRateLimitError();
        return;
      }

      // Si la réponse ne contient pas de hash de transaction, c'est une erreur
      if (!rawTxResult || !rawTxResult.transactionHash) {
        // Vérifier encore une fois pour un message d'erreur de limite de fréquentation
        if (rawTxResult && typeof rawTxResult === 'object' && 
            rawTxResult.error && typeof rawTxResult.error === 'string' && 
            (rawTxResult.error.includes('Rate limit') || 
             rawTxResult.error.includes('daily limit'))) {
          showRateLimitError();
          return;
        }
        
        throw new Error('Transaction échouée: Réponse invalide');
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
        title: "Transaction réussie!",
        description: (
          <a 
            href={`https://rpcsafro.cardanotask.com/tx?hash=0x${txData.transactionHash}`}
            target="_blank" 
            rel="noreferrer"
            className="text-blue-500 underline hover:text-blue-700"
          >
            Voir la transaction sur Safrochain Explorer
          </a>
        ),
      });
    } catch (error) {
      console.error("Erreur complète:", error);
      
      // Extraction du message d'erreur
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Une erreur inconnue est survenue. Veuillez réessayer plus tard.";
      
      // Vérifier spécifiquement les indicateurs de limite de fréquentation
      if (
        errorMessage.includes('Rate limit exceeded') || 
        errorMessage.includes('faucet requests allowed per 24h') || 
        errorMessage.includes('429') || 
        errorMessage.includes('Too Many Requests') ||
        errorMessage.includes('daily limit')
      ) {
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

  // Helper function to show rate limit error
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
    <form onSubmit={handleSubmit} className="w-full max-w-md space-y-6">
      <div className="relative">
        <Wallet className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
        <Input
          type="text"
          placeholder="Entrez votre adresse Safrochain"
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
            Traitement en cours...
          </span>
        ) : (
          <>
            <ArrowRight className="mr-2 h-5 w-5" />
            Demander 250 SAF
          </>
        )}
      </Button>
    </form>
  );
};

export default FaucetForm;
