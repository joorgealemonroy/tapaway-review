import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion } from "framer-motion";
import { 
  Link, 
  MessageCircle, 
  Mail,
  Check,
  X
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { OptimizedAvatar } from "./OptimizedImage";

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
    label: 'Copy link', 
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
      <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current text-black">
        <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301a.601.601 0 01.25-.053c.21 0 .406.091.541.24a.756.756 0 01.076.754c-.121.234-.411.547-1.024.715a2.7 2.7 0 00-.286.09c-.086.03-.204.085-.27.186-.062.1-.045.22-.015.346.06.266.135.584.15.658.135.63.285 1.35-.15 1.8-.375.39-.81.525-1.155.6-.165.036-.315.06-.435.09-.135.03-.225.075-.27.12-.09.135.015.315.06.435.12.33.36.75.75.93.39.18.795.24 1.155.195.03 0 .06-.015.09-.015.09-.015.165-.03.24-.03.195 0 .375.075.51.24.135.165.195.36.165.555-.06.36-.39.615-.75.69-.135.03-.27.045-.405.045-.27 0-.54-.045-.795-.135-.315-.12-.645-.3-.975-.585-.465-.42-.66-.9-.765-1.23-.09-.255-.12-.45-.12-.6 0-.165.045-.315.135-.435.09-.12.21-.195.33-.225.12-.03.24-.06.375-.09.375-.09.855-.21 1.215-.495a.808.808 0 00.18-.255c.015-.06.03-.165-.015-.255-.045-.105-.165-.195-.345-.255-.165-.06-.45-.135-.825-.225-1.065-.255-1.5-.945-1.5-1.53 0-.03 0-.06.015-.09.015-.045.03-.105.06-.165.075-.195.24-.495.66-.72.315-.165.765-.345 1.41-.555a.66.66 0 00.195-.09c.045-.03.075-.06.09-.09a.66.66 0 00.015-.165c.015-.09.015-.195.015-.315 0-.18-.015-.405-.015-.675-.015-.285-.045-.615-.09-.99-.15-1.215-.45-2.49-1.125-3.345-.69-.885-1.635-1.365-2.88-1.44a10.53 10.53 0 00-.54-.015c-.27 0-.54.015-.81.045-1.245.075-2.19.555-2.88 1.44-.675.855-.975 2.13-1.125 3.345-.045.375-.075.705-.09.99 0 .27 0 .495-.015.675 0 .12 0 .225.015.315a.66.66 0 00.015.165c.015.03.045.06.09.09a.66.66 0 00.195.09c.645.21 1.095.39 1.41.555.42.225.585.525.66.72.03.06.045.12.06.165.015.03.015.06.015.09 0 .585-.435 1.275-1.5 1.53-.375.09-.66.165-.825.225-.18.06-.3.15-.345.255-.045.09-.03.195-.015.255a.808.808 0 00.18.255c.36.285.84.405 1.215.495.135.03.255.06.375.09.12.03.24.105.33.225.09.12.135.27.135.435 0 .15-.03.345-.12.6-.105.33-.3.81-.765 1.23-.33.285-.66.465-.975.585-.255.09-.525.135-.795.135-.135 0-.27-.015-.405-.045-.36-.075-.69-.33-.75-.69-.03-.195.03-.39.165-.555.135-.165.315-.24.51-.24.075 0 .15.015.24.03.03 0 .06.015.09.015.36.045.765-.015 1.155-.195.39-.18.63-.6.75-.93.045-.12.15-.3.06-.435-.045-.045-.135-.09-.27-.12-.12-.03-.27-.054-.435-.09-.345-.075-.78-.21-1.155-.6-.435-.45-.285-1.17-.15-1.8.015-.074.09-.392.15-.658.03-.126.047-.246-.015-.346-.066-.101-.184-.156-.27-.186a2.7 2.7 0 00-.286-.09c-.613-.168-.903-.481-1.024-.715a.756.756 0 01.076-.754.645.645 0 01.541-.24c.09 0 .173.02.25.053.374.181.733.285 1.033.301.198 0 .326-.045.401-.09a4.406 4.406 0 01-.033-.57c-.104-1.628-.23-3.654.299-4.847C7.859 1.069 11.216.793 12.206.793z"/>
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

export function ShareModal({ isOpen, onClose, profile, shareUrl }: ShareModalProps) {
  const [copied, setCopied] = useState(false);

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
        window.open(`https://www.snapchat.com/share?url=${encodedUrl}`, '_blank');
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden bg-zinc-900 border-zinc-800">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 h-8 w-8 rounded-full bg-zinc-800 hover:bg-zinc-700 flex items-center justify-center transition-colors"
        >
          <X className="h-4 w-4 text-white" />
        </button>

        {/* Profile Preview Card */}
        <div className="p-6 pb-4">
          <div className="bg-zinc-800 rounded-2xl p-4 flex items-center gap-4">
            <OptimizedAvatar
              src={profile.profile_photo_url}
              alt={profile.full_name}
              size={56}
              className="rounded-full ring-2 ring-white/10"
            />
            <div className="flex-1 min-w-0">
              <p className="text-white font-semibold truncate">{profile.full_name}</p>
              <p className="text-zinc-400 text-sm truncate">tapaway.co/{profile.username}</p>
            </div>
            <div className="flex-shrink-0">
              <img 
                src="/tapaway-logo.svg" 
                alt="TapAway" 
                className="h-6 w-6 opacity-60"
              />
            </div>
          </div>
        </div>

        {/* Share Options */}
        <div className="px-6 pb-6">
          <p className="text-zinc-400 text-sm mb-4">Share this profile</p>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-hide">
            {shareOptions.map((option) => {
              const IconComponent = option.icon;
              return (
                <motion.button
                  key={option.id}
                  onClick={() => handleShare(option.action)}
                  className="flex flex-col items-center gap-2 flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className={`h-14 w-14 rounded-full ${option.color} flex items-center justify-center text-white shadow-lg`}>
                    {option.id === 'copy' && copied ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      <IconComponent />
                    )}
                  </div>
                  <span className="text-zinc-400 text-xs whitespace-nowrap">{option.label}</span>
                </motion.button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
