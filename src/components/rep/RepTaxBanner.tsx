import { AlertTriangle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface RepTaxBannerProps {
  status: 'missing' | 'submitted' | 'approved' | 'rejected';
}

export const RepTaxBanner = ({ status }: RepTaxBannerProps) => {
  const navigate = useNavigate();
  
  if (status === 'approved') return null;

  const getMessage = () => {
    switch (status) {
      case 'missing':
        return 'Before we can pay out commissions, you need to upload your W-9.';
      case 'submitted':
        return 'Your W-9 is pending review. We\'ll notify you once it\'s approved.';
      case 'rejected':
        return 'Your W-9 was not accepted. Please upload a new one to receive payouts.';
      default:
        return 'Complete your tax information to receive commission payouts.';
    }
  };

  const bgColor = status === 'rejected' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
  const textColor = status === 'rejected' ? 'text-red-800' : 'text-amber-800';
  const iconColor = status === 'rejected' ? 'text-red-500' : 'text-amber-500';

  return (
    <div className={`${bgColor} border rounded-lg p-3 mb-4`}>
      <div className="flex items-start gap-2">
        <AlertTriangle className={`h-4 w-4 mt-0.5 flex-shrink-0 ${iconColor}`} />
        <div className={`text-sm ${textColor}`}>
          <span>{getMessage()}</span>
          {status !== 'submitted' && (
            <button 
              onClick={() => navigate('/rep/profile')}
              className="ml-1 font-medium underline hover:no-underline"
            >
              Go to Profile →
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
