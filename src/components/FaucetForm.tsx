
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

      // Cas 1: Vérification explicite des erreurs de limite de fréquentation
      if (isRateLimitError(error) || isRateLimitError(rawTxResult)) {
        showRateLimitError();
        return;
      }

      // Cas 2: Pas de transaction hash, mais pas d'erreur de limite = erreur générique
      if (!rawTxResult || !rawTxResult.transactionHash) {
        // Une dernière vérification pour les messages d'erreur de limite de fréquentation
        if (rawTxResult && typeof rawTxResult === 'object' && rawTxResult.error) {
          const errorStr = String(rawTxResult.error);
          if (errorStr.includes('Rate limit') || errorStr.includes('daily limit') || errorStr.includes('per 24h')) {
            showRateLimitError();
            return;
          }
        }
        
        // Si ce n'est pas une erreur de limite, alors c'est une autre erreur
        throw new Error('Transaction échouée: ' + (error?.message || rawTxResult?.error || 'Erreur inconnue'));
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
      
      // Vérification finale des indicateurs de limite de fréquentation
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

  // Fonction pour vérifier si une erreur est liée à la limite de fréquentation
  const isRateLimitError = (obj: any): boolean => {
    if (!obj) return false;
    
    // Vérifier le code d'erreur HTTP 429
    if (obj.code === '429' || obj.status === 429 || obj.statusCode === 429) return true;
    
    // Vérifier le message d'erreur
    if (obj.message && isRateLimitErrorMessage(obj.message)) return true;
    
    // Vérifier les propriétés d'erreur imbriquées
    if (obj.error) {
      const errorStr = String(obj.error);
      if (isRateLimitErrorMessage(errorStr)) return true;
    }
    
    return false;
  };
  
  // Fonction pour vérifier si un message contient des indicateurs de limite de fréquentation
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

  // Component for copying text
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
