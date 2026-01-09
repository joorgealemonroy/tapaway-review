import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { motion } from "framer-motion";
import { 
  Link, 
  MessageCircle, 
  Mail,
  Check,
  X,
  ArrowRight
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { OptimizedAvatar } from "./OptimizedImage";
import { useIsMobile } from "@/hooks/use-mobile";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile: {
    username: string;
    full_name: string;
    profile_photo_url: string | null;
    banner_image_url?: string | null;
  };
  shareUrl: string;
}

const shareOptions = [
  { 
    id: 'copy', 
    label: 'Copy', 
    icon: Link,
    color: 'bg-zinc-700',
    action: 'copy'
  },
  { 
    id: 'x', 
    label: 'X', 
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
      </svg>
    ),
    color: 'bg-black',
    action: 'x'
  },
  { 
    id: 'facebook', 
    label: 'Facebook', 
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
      </svg>
    ),
    color: 'bg-[#1877F2]',
    action: 'facebook'
  },
  { 
    id: 'whatsapp', 
    label: 'WhatsApp', 
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
      </svg>
    ),
    color: 'bg-[#25D366]',
    action: 'whatsapp'
  },
  { 
    id: 'linkedin', 
    label: 'LinkedIn', 
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
      </svg>
    ),
    color: 'bg-[#0A66C2]',
    action: 'linkedin'
  },
  { 
    id: 'messenger', 
    label: 'Messenger', 
    icon: () => (
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
        <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.975 12-11.111S18.627 0 12 0zm1.191 14.963l-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
      </svg>
    ),
    color: 'bg-gradient-to-br from-[#00B2FF] to-[#006AFF]',
    action: 'messenger'
  },
  { 
    id: 'snapchat', 
    label: 'Snapchat', 
    icon: () => (
      <svg className="h-5 w-5" viewBox="0 0 24 24">
        <path 
          d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.403.403 0 0 1 .464.053.39.39 0 0 1 .116.467c-.198.428-.639.634-1.023.768-.215.076-.433.133-.634.181a8.252 8.252 0 0 0-.363.09.478.478 0 0 0-.252.134c-.037.047-.054.11-.04.196.239.954.687 1.716 1.336 2.262a4.618 4.618 0 0 0 1.56.815c.18.059.363.106.539.138.4.072.49.226.467.399-.038.282-.474.471-.819.527-.34.054-.757.09-1.206.09-.36 0-.735-.024-1.081-.055-.345-.03-.677-.046-.924-.016-.164.02-.3.056-.419.152-.135.11-.3.285-.558.58-.376.43-.847.966-1.53 1.315-.794.405-1.634.595-2.495.595s-1.7-.19-2.494-.595c-.683-.349-1.154-.885-1.53-1.315-.258-.295-.423-.47-.558-.58-.119-.096-.255-.132-.419-.152-.247-.03-.579-.014-.924.016-.346.031-.721.055-1.08.055-.45 0-.867-.036-1.207-.09-.345-.056-.78-.245-.819-.527-.023-.173.068-.327.467-.399.176-.032.36-.079.539-.138a4.618 4.618 0 0 0 1.56-.815c.65-.546 1.098-1.308 1.337-2.262.014-.086-.003-.149-.04-.196a.478.478 0 0 0-.252-.134 8.252 8.252 0 0 0-.363-.09c-.2-.048-.419-.105-.634-.181-.384-.134-.825-.34-1.023-.768a.39.39 0 0 1 .116-.467.403.403 0 0 1 .464-.053c.374.181.733.285 1.033.301.198 0 .326-.045.401-.09l-.03-.51-.003-.06c-.104-1.628-.23-3.654.3-4.847C7.86 1.069 11.216.793 12.206.793Z"
          fill="#FFFFFF"
          stroke="#000000"
          strokeWidth="0.8"
          paintOrder="stroke"
        />
      </svg>
    ),
    color: 'bg-[#FFFC00]',
    action: 'snapchat'
  },
  { 
    id: 'sms', 
    label: 'Text', 
    icon: MessageCircle,
    color: 'bg-[#34C759]',
    action: 'sms'
  },
  { 
    id: 'email', 
    label: 'Email', 
    icon: Mail,
    color: 'bg-zinc-600',
    action: 'email'
  },
];

function ShareContent({ profile, shareUrl, onClose, variant = 'dialog' }: Omit<ShareModalProps, 'isOpen'> & { variant?: 'dialog' | 'drawer' }) {
  const [copied, setCopied] = useState(false);
  const isDrawer = variant === 'drawer';

  const handleShare = useCallback(async (action: string) => {
    const encodedUrl = encodeURIComponent(shareUrl);
    const shareText = encodeURIComponent(`Check out ${profile.full_name}'s TapAway profile`);

    switch (action) {
      case 'copy':
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        toast.success("Link copied!");
        setTimeout(() => setCopied(false), 2000);
        break;
      case 'x':
        window.open(`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${shareText}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${shareText}%20${encodedUrl}`, '_blank');
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`, '_blank');
        break;
      case 'messenger':
        window.open(`https://www.facebook.com/dialog/send?link=${encodedUrl}&app_id=291494419107518&redirect_uri=${encodedUrl}`, '_blank');
        break;
      case 'snapchat':
        window.open(`https://www.snapchat.com/share?link=${encodedUrl}`, '_blank');
        break;
      case 'sms':
        window.open(`sms:?body=${shareText}%20${encodedUrl}`, '_blank');
        break;
      case 'email':
        window.open(`mailto:?subject=${encodeURIComponent(`${profile.full_name}'s TapAway`)}&body=${shareText}%20${encodedUrl}`, '_blank');
        break;
    }
  }, [shareUrl, profile.full_name]);

  return (
    <div className="flex flex-col">
      {/* Profile Preview Card with Banner */}
      <div className={isDrawer ? "pb-4" : "px-5 pt-2 pb-4"}>
        <div 
          className={`relative overflow-hidden h-40 ${isDrawer ? 'rounded-b-2xl' : 'rounded-2xl'}`}
          style={{
            backgroundImage: profile.banner_image_url 
              ? `url(${profile.banner_image_url})` 
              : 'linear-gradient(135deg, #27272a 0%, #18181b 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
        />
      </div>

      {/* Share Options */}
      <div className="px-5 pb-5">
        <p className="text-zinc-500 text-sm mb-4 font-medium">Share this profile</p>
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-hide">
          {shareOptions.map((option) => {
            const IconComponent = option.icon;
            return (
              <motion.button
                key={option.id}
                onClick={() => handleShare(option.action)}
                className="flex flex-col items-center gap-2.5 flex-shrink-0"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.92 }}
              >
                <div className={`h-14 w-14 rounded-2xl ${option.color} flex items-center justify-center text-white shadow-md`}>
                  {option.id === 'copy' && copied ? (
                    <Check className="h-5 w-5" />
                  ) : (
                    <IconComponent />
                  )}
                </div>
                <span className="text-zinc-500 text-xs font-medium whitespace-nowrap">{option.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* CTA Section */}
        <div className="pt-5 mt-5 border-t border-zinc-800/50 text-center">
          <p className="text-zinc-500 text-sm">
            Don't have TapAway yet?
          </p>
          <a 
            href="/personal"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 mt-2 text-white font-semibold hover:text-primary transition-colors"
          >
            Start using TapAway
            <ArrowRight className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  );
}

export function ShareModal({ isOpen, onClose, profile, shareUrl }: ShareModalProps) {
  const isMobile = useIsMobile();

  // Mobile: Bottom drawer with rounded top corners
  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent showHandle={false} className="bg-zinc-900 border-zinc-800 rounded-t-3xl max-h-[90vh]">
          <ShareContent profile={profile} shareUrl={shareUrl} onClose={onClose} variant="drawer" />
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop: Centered dialog with rounded corners
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-zinc-900 border-zinc-800 rounded-3xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        <div className="pt-6">
          <ShareContent profile={profile} shareUrl={shareUrl} onClose={onClose} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
