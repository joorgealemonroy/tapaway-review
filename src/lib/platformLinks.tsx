import { 
  Instagram, 
  Youtube, 
  Globe, 
  Mail, 
  DollarSign, 
  Music,
  Star,
  MapPin,
  LucideIcon
} from "lucide-react";
import { normalizeGooglePlaceId, buildGoogleReviewUrl } from "@/lib/google";
import { YelpIcon } from "@/components/icons/YelpIcon";

// X icon
export const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
  </svg>
);

// TikTok icon
export const TikTokIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
  </svg>
);

// Venmo icon
export const VenmoIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M19.23 2.476c.685 1.14 1.008 2.316 1.008 3.815 0 4.754-4.062 10.937-7.359 15.284H5.456L2.77 3.617l6.324-.604 1.476 11.837c1.37-2.238 3.06-5.762 3.06-8.172 0-1.423-.244-2.393-.648-3.177l6.249-1.025z"/>
  </svg>
);

// CashApp icon
export const CashAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.59 3.475a5.1 5.1 0 0 0-3.05-3.05c-1.31-.42-2.5-.42-4.92-.42H8.36c-2.4 0-3.61 0-4.9.4a5.1 5.1 0 0 0-3.05 3.06C0 4.765 0 5.965 0 8.365v7.27c0 2.4 0 3.6.4 4.9a5.1 5.1 0 0 0 3.05 3.05c1.3.41 2.5.41 4.9.41h7.28c2.4 0 3.6 0 4.9-.4a5.1 5.1 0 0 0 3.05-3.06c.41-1.3.41-2.5.41-4.9v-7.27c0-2.4 0-3.6-.4-4.9Zm-6.17 4.63-.93.93a.5.5 0 0 1-.67.01 5 5 0 0 0-3.22-1.18c-.97 0-1.94.32-1.94 1.21 0 .9 1.04 1.2 2.24 1.65 2.1.7 3.84 1.58 3.84 3.64 0 2.24-1.74 3.78-4.58 3.95l-.26 1.2a.49.49 0 0 1-.48.39H9.63l-.09-.01a.5.5 0 0 1-.38-.59l.28-1.27a6.54 6.54 0 0 1-2.88-1.57v-.01a.48.48 0 0 1 0-.68l1-.97a.49.49 0 0 1 .67 0c.91.86 2.13 1.34 3.39 1.32 1.3 0 2.17-.55 2.17-1.42 0-.87-.88-1.1-2.54-1.72-1.76-.63-3.43-1.52-3.43-3.6 0-2.42 2.01-3.6 4.39-3.71l.25-1.23a.48.48 0 0 1 .48-.38h1.78l.1.01c.26.06.43.31.37.57l-.27 1.37c.9.3 1.75.77 2.48 1.39a.49.49 0 0 1 .02.7Z"/>
  </svg>
);

// Spotify icon
export const SpotifyIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
  </svg>
);

// Google "G" icon
export const GoogleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

// Telegram icon
export const TelegramIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
  </svg>
);

// LinkedIn icon
export const LinkedInIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
  </svg>
);

// Facebook icon
export const FacebookIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
  </svg>
);

// Discord icon
export const DiscordIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.946 2.4189-2.1568 2.4189Z"/>
  </svg>
);

// Twitch icon
export const TwitchIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
  </svg>
);

// Snapchat icon
export const SnapchatIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.206.793c.99 0 4.347.276 5.93 3.821.529 1.193.403 3.219.299 4.847l-.003.06c-.012.18-.022.345-.03.51.075.045.203.09.401.09.3-.016.659-.12 1.033-.301.165-.088.344-.104.464-.104.182 0 .359.029.509.09.45.149.734.479.734.838.015.449-.39.839-1.213 1.168-.089.029-.209.075-.344.119-.45.135-1.139.36-1.333.81-.09.224-.061.524.12.868l.015.015c.06.136 1.526 3.475 4.791 4.014.255.044.435.27.42.509 0 .075-.015.149-.045.225-.24.569-1.273.988-3.146 1.271-.059.091-.12.375-.164.57-.029.179-.074.36-.134.553-.076.271-.27.405-.555.405h-.03c-.135 0-.313-.031-.538-.074-.36-.075-.765-.135-1.273-.135-.3 0-.599.015-.913.074-.6.104-1.123.464-1.723.884-.853.599-1.826 1.288-3.294 1.288-.06 0-.119-.015-.18-.015h-.149c-1.468 0-2.427-.675-3.279-1.288-.599-.42-1.107-.779-1.707-.884-.314-.045-.629-.074-.928-.074-.54 0-.958.089-1.272.149-.211.043-.391.074-.54.074-.374 0-.523-.224-.583-.42-.061-.192-.09-.389-.135-.567-.046-.181-.105-.494-.166-.57-1.918-.222-2.95-.642-3.189-1.226-.031-.063-.052-.15-.055-.225-.015-.243.165-.465.42-.509 3.264-.54 4.73-3.879 4.791-4.02l.016-.029c.18-.345.224-.645.119-.869-.195-.434-.884-.658-1.332-.809-.121-.029-.24-.074-.346-.119-1.107-.435-1.257-.93-1.197-1.273.09-.479.674-.793 1.168-.793.146 0 .27.029.383.074.42.194.789.3 1.104.3.234 0 .384-.06.465-.105l-.046-.569c-.098-1.626-.225-3.651.307-4.837C7.392 1.077 10.739.807 11.727.807l.419-.015h.06z"/>
  </svg>
);

// Pinterest icon
export const PinterestIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.017 0C5.396 0 .029 5.367.029 11.987c0 5.079 3.158 9.417 7.618 11.162-.105-.949-.199-2.403.041-3.439.219-.937 1.406-5.957 1.406-5.957s-.359-.72-.359-1.781c0-1.663.967-2.911 2.168-2.911 1.024 0 1.518.769 1.518 1.688 0 1.029-.653 2.567-.992 3.992-.285 1.193.6 2.165 1.775 2.165 2.128 0 3.768-2.245 3.768-5.487 0-2.861-2.063-4.869-5.008-4.869-3.41 0-5.409 2.562-5.409 5.199 0 1.033.394 2.143.889 2.741.099.12.112.225.085.345-.09.375-.293 1.199-.334 1.363-.053.225-.172.271-.401.165-1.495-.69-2.433-2.878-2.433-4.646 0-3.776 2.748-7.252 7.92-7.252 4.158 0 7.392 2.967 7.392 6.923 0 4.135-2.607 7.462-6.233 7.462-1.214 0-2.354-.629-2.758-1.379l-.749 2.848c-.269 1.045-1.004 2.352-1.498 3.146 1.123.345 2.306.535 3.55.535 6.607 0 11.985-5.365 11.985-11.987C23.97 5.39 18.592.026 11.985.026L12.017 0z"/>
  </svg>
);

// Threads icon
export const ThreadsIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12.186 24h-.007c-3.581-.024-6.334-1.205-8.184-3.509C2.35 18.44 1.5 15.586 1.472 12.01v-.017c.03-3.579.879-6.43 2.525-8.482C5.845 1.205 8.6.024 12.18 0h.014c2.746.02 5.043.725 6.826 2.098 1.677 1.29 2.858 3.13 3.509 5.467l-2.04.569c-1.104-3.96-3.898-5.984-8.304-6.015-2.91.022-5.11.936-6.54 2.717C4.307 6.504 3.616 8.914 3.589 12c.027 3.086.718 5.496 2.057 7.164 1.43 1.783 3.631 2.698 6.54 2.717 2.623-.02 4.358-.631 5.8-2.045 1.647-1.613 1.618-3.593 1.09-4.798-.31-.71-.873-1.3-1.634-1.75-.192 1.352-.622 2.446-1.284 3.272-.886 1.102-2.14 1.704-3.73 1.79-1.202.065-2.361-.218-3.259-.801-1.063-.689-1.685-1.74-1.752-2.96-.065-1.182.408-2.256 1.33-3.022.88-.73 2.151-1.168 3.694-1.27 1.374-.093 2.6.082 3.654.521.027-.467.013-.932-.044-1.388-.197-1.608-.862-2.763-1.921-3.336-.73-.394-1.684-.59-2.835-.584l-.168.003c-1.292.03-2.374.408-3.124 1.093-.73.666-1.146 1.576-1.201 2.631l-2.119-.067c.076-1.538.678-2.86 1.74-3.826 1.09-.991 2.592-1.52 4.343-1.53l.198-.003c1.514-.01 2.819.262 3.882.81 1.551.798 2.524 2.296 2.808 4.33.096.685.128 1.39.094 2.1 1.024.576 1.83 1.37 2.353 2.383.736 1.428.906 3.398-.48 5.355-1.813 2.558-4.657 3.414-8.376 3.437zM9.681 15.206c.04.722.435 1.286 1.149 1.638.59.29 1.355.413 2.148.367 1.026-.056 1.836-.424 2.409-1.096.48-.563.817-1.35.987-2.345-.791-.244-1.658-.36-2.59-.346-1.07.015-1.97.271-2.537.722-.508.403-.617.882-.587 1.331l.021-.271z"/>
  </svg>
);

// WhatsApp icon
export const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
  </svg>
);

// Patreon icon
export const PatreonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M0 .48v23.04h4.22V.48zm15.385 0c-4.764 0-8.641 3.88-8.641 8.65 0 4.755 3.877 8.623 8.641 8.623 4.75 0 8.615-3.868 8.615-8.623C24 4.36 20.136.48 15.385.48z"/>
  </svg>
);

// Ko-fi icon
export const KofiIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.881 8.948c-.773-4.085-4.859-4.593-4.859-4.593H.723c-.604 0-.679.798-.679.798s-.082 7.324-.022 11.822c.164 2.424 2.586 2.672 2.586 2.672s8.267-.023 11.966-.049c2.438-.426 2.683-2.566 2.658-3.734 4.352.24 7.422-2.831 6.649-6.916zm-11.062 3.511c-1.183 1.378-3.626 3.588-3.986 3.918-.073.067-.222.033-.277-.023-.039-.04-.081-.086-.123-.133-.455-.497-3.14-2.963-3.783-3.803-.679-.888-.913-2.26-.122-3.198.766-.91 2.549-1.096 3.924.228a2.62 2.62 0 0 1 3.076-.689c1.674.728 1.891 2.56 1.291 3.7zm6.173.478c-.928.116-1.682.028-1.682.028V7.284h1.77s1.971.551 1.971 2.638c0 1.913-.985 2.667-2.059 3.015z"/>
  </svg>
);

// SoundCloud icon
export const SoundCloudIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M23.999 14.165c-.052 1.796-1.612 3.169-3.4 3.169h-8.18a.68.68 0 0 1-.675-.683V7.862a.747.747 0 0 1 .452-.724s.75-.513 2.333-.513a5.364 5.364 0 0 1 2.763.755 5.433 5.433 0 0 1 2.57 3.54c.282-.08.574-.121.868-.12.884 0 1.73.358 2.347.992s.948 1.49.922 2.373ZM10.721 8.421c.247 2.98.427 5.697 0 8.672a.264.264 0 0 1-.53 0c-.395-2.946-.22-5.718 0-8.672a.264.264 0 0 1 .53 0ZM9.072 9.448c.285 2.659.37 4.986-.006 7.655a.277.277 0 0 1-.55 0c-.331-2.63-.256-5.02 0-7.655a.277.277 0 0 1 .556 0Zm-1.663-.257c.27 2.726.39 5.171 0 7.904a.266.266 0 0 1-.532 0c-.38-2.69-.257-5.21 0-7.904a.266.266 0 0 1 .532 0Zm-1.647.77a26.108 26.108 0 0 1-.008 7.147.272.272 0 0 1-.542 0 27.955 27.955 0 0 1 0-7.147.275.275 0 0 1 .55 0Zm-1.67 1.769c.421 1.865.228 3.5-.029 5.388a.257.257 0 0 1-.514 0c-.21-1.858-.398-3.549 0-5.389a.272.272 0 0 1 .543 0Zm-1.655-.273c.388 1.897.26 3.508-.01 5.412-.026.28-.514.283-.54 0-.244-1.878-.347-3.54-.01-5.412a.283.283 0 0 1 .56 0Zm-1.668.911c.4 1.268.257 2.292-.026 3.572a.257.257 0 0 1-.514 0c-.241-1.262-.354-2.312-.023-3.572a.283.283 0 0 1 .563 0Z"/>
  </svg>
);

// Bandcamp icon
export const BandcampIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M0 18.75l7.437-13.5H24l-7.438 13.5H0z"/>
  </svg>
);

// PayPal icon
export const PayPalIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082h-2.19c-1.376 0-2.534 1.014-2.752 2.378l-.894 5.676c-.062.399.24.758.643.758h3.566c.503 0 .933-.368 1.014-.863l.038-.192.768-4.874.05-.264c.08-.495.51-.863 1.014-.863h.64c4.136 0 7.374-1.68 8.32-6.541.394-2.03.19-3.72-.011-4.01z"/>
  </svg>
);

// GitHub icon
export const GitHubIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/>
  </svg>
);

// Behance icon
export const BehanceIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M22 7h-7V5h7v2zm1.726 10c-.442 1.297-2.029 3-5.101 3-3.074 0-5.564-1.729-5.564-5.675 0-3.91 2.325-5.92 5.466-5.92 3.082 0 4.964 1.782 5.375 4.426.078.506.109 1.188.095 2.14H15.97c.13 3.211 3.483 3.312 4.588 2.029h3.168zm-7.686-4h4.965c-.105-1.547-1.136-2.219-2.477-2.219-1.466 0-2.277.768-2.488 2.219zm-9.574 6.988H0V5.021h6.953c5.476.081 5.58 5.444 2.72 6.906 3.461 1.26 3.577 8.061-3.207 8.061zM3 11h3.584c2.508 0 2.906-3-.312-3H3v3zm3.391 3H3v3.016h3.341c3.055 0 2.868-3.016.05-3.016z"/>
  </svg>
);

// Dribbble icon
export const DribbbleIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} fill="currentColor">
    <path d="M12 24C5.385 24 0 18.615 0 12S5.385 0 12 0s12 5.385 12 12-5.385 12-12 12zm10.12-10.358c-.35-.11-3.17-.953-6.384-.438 1.34 3.684 1.887 6.684 1.992 7.308 2.3-1.555 3.936-4.02 4.395-6.87zm-6.115 7.808c-.153-.9-.75-4.032-2.19-7.77l-.066.02c-5.79 2.015-7.86 6.025-8.04 6.4 1.73 1.358 3.92 2.166 6.29 2.166 1.42 0 2.77-.29 4-.814zm-11.62-2.58c.232-.4 3.045-5.055 8.332-6.765.135-.045.27-.084.405-.12-.26-.585-.54-1.167-.832-1.74C7.17 11.775 2.206 11.71 1.756 11.7l-.004.312c0 2.633.998 5.037 2.634 6.855zm-2.42-8.955c.46.008 4.683.026 9.477-1.248-1.698-3.018-3.53-5.558-3.8-5.928-2.868 1.35-5.01 3.99-5.676 7.17zM9.6 2.052c.282.38 2.145 2.914 3.822 6 3.645-1.365 5.19-3.44 5.373-3.702-1.81-1.61-4.19-2.586-6.795-2.586-.825 0-1.63.1-2.4.285zm10.335 3.483c-.218.29-1.935 2.493-5.724 4.04.24.49.47.985.68 1.486.08.18.15.36.22.53 3.41-.428 6.8.26 7.14.33-.02-2.42-.88-4.64-2.31-6.38z"/>
  </svg>
);

export interface PlatformConfig {
  type: string;
  label: string;
  icon: LucideIcon | React.FC<{ className?: string }>;
  inputType: "handle" | "email" | "url" | "options" | "cashtag";
  placeholder: string;
  prefix?: string;
  generateUrl: (value: string) => string;
  extractValue: (url: string) => string;
  color: string;
  bgColor: string;
  gradient?: string;
  // For button text color when using custom pill colors
  textOnCustom?: string;
}

// Platform color presets for custom link styling
export const PLATFORM_COLORS = {
  instagram: "#E4405F",
  instagramGradient: "linear-gradient(135deg, #833AB4, #E4405F, #FCAF45)",
  tiktok: "#000000",
  youtube: "#FF0000",
  x: "#000000",
  venmo: "#008CFF",
  cashapp: "#00D632",
  spotify: "#1DB954",
  applemusic: "#FC3C44",
  website: "#475569",
  email: "#64748b",
  google_review: "#4285F4",
  yelp: "#D32323",
  directions: "#2563eb",
  telegram: "#0088CC",
  linkedin: "#0A66C2",
  facebook: "#1877F2",
  discord: "#5865F2",
  twitch: "#9146FF",
  snapchat: "#FFFC00",
  pinterest: "#E60023",
  threads: "#000000",
  whatsapp: "#25D366",
  patreon: "#FF424D",
  kofi: "#FF5E5B",
  soundcloud: "#FF5500",
  bandcamp: "#1DA0C3",
  paypal: "#003087",
  github: "#181717",
  behance: "#1769FF",
  dribbble: "#EA4C89",
} as const;

/**
 * Strip an optional scheme, `www.`, and the platform host from raw user input,
 * returning the first meaningful path segment (handle / page name).
 *
 * Handles scheme-less input ("facebook.com/mypage"), full URLs, bare handles
 * ("@mypage") and app schemes ("instagram://user?username=mypage").
 */
export const stripHost = (raw: string, hostPattern: RegExp, keepQuery = false, keepPath = false): string => {
  if (!raw) return "";
  let s = raw.trim();
  // App-scheme handles, e.g. instagram://user?username=foo
  const appScheme = s.match(/^[a-z][a-z0-9+.-]*:\/\/[^?]*\?(?:username|user)=([^&]+)/i);
  if (appScheme) return decodeURIComponent(appScheme[1]).replace(/^@/, "");
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//i, "");
  s = s.replace(/^www\./i, "");
  const m = s.match(hostPattern);
  if (m) s = s.slice(m[0].length);
  s = s.replace(/^\/+/, "");
  const path = s.split(/[?#]/)[0];
  const query = s.split(/[?#]/)[1];
  const seg = keepPath
    ? path.replace(/\/+$/, "")
    : path.split("/").filter(Boolean)[0] || "";
  const clean = seg.replace(/^@/, "");
  if (keepQuery && query) return `${clean}?${query}`;
  return clean;
};

/**
 * Handles for platforms whose profile URLs use multi-segment paths
 * (facebook.com/people/Name/ID, linkedin.com/company/x, yelp.com/biz/x).
 * Keeps the whole path when it starts with a known prefix, otherwise falls back
 * to the single-segment handle so plain usernames keep working.
 */
const multiSegmentHandle = (
  raw: string,
  hostPattern: RegExp,
  prefixRe: RegExp,
  keepQuery = false,
): string => {
  const full = stripHost(raw, hostPattern, keepQuery, true);
  if (prefixRe.test(full)) return full;
  return stripHost(raw, hostPattern, keepQuery);
};

const FB_MULTI_PREFIX = /^(?:people|pages|p|groups|profile\.php)(?:\/|\?|$)/i;
const LINKEDIN_PREFIX = /^(?:in|company|school|showcase)\//i;
const YELP_PREFIX = /^biz\//i;

const facebookHandle = (raw: string) =>
  multiSegmentHandle(raw, /^(?:facebook\.com|fb\.com|m\.facebook\.com)/i, FB_MULTI_PREFIX, true);
const linkedinHandle = (raw: string) =>
  multiSegmentHandle(raw, /^linkedin\.com/i, LINKEDIN_PREFIX);
const yelpHandle = (raw: string) => multiSegmentHandle(raw, /^yelp\.com/i, YELP_PREFIX, true);

/** True when a "handle" is really just a bare domain (facebook.com, www.tiktok.com …). */
export const isBareDomainHandle = (value: string): boolean => {
  if (!value) return true;
  const v = value.trim().replace(/^www\./i, "").toLowerCase();
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(v);
};

/** Build a URL only when the handle is real — otherwise return "" so callers can reject it. */
const safeUrl = (handle: string, build: (h: string) => string): string => {
  const h = (handle || "").trim();
  if (!h || isBareDomainHandle(h)) return "";
  return build(h);
};


export const PLATFORM_CONFIGS: PlatformConfig[] = [

  {
    type: "instagram",
    label: "Instagram",
    icon: Instagram,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^instagram\.com/i), (h) => `instagram://user?username=${h}`),
    extractValue: (url) => stripHost(url, /^instagram\.com/i),

    color: "text-white",
    bgColor: "bg-[#E4405F]",
    gradient: "bg-gradient-to-br from-[#833AB4] via-[#E4405F] to-[#FCAF45]",
  },
  {
    type: "tiktok",
    label: "TikTok",
    icon: TikTokIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^tiktok\.com/i), (h) => `https://tiktok.com/@${h}`),
    extractValue: (url) => stripHost(url, /^tiktok\.com/i),

    color: "text-white",
    bgColor: "bg-black",
  },
  {
    type: "youtube",
    label: "YouTube",
    icon: Youtube,
    inputType: "options",
    placeholder: "handle or channel ID",
    generateUrl: (v) => v.startsWith("UC") ? `https://youtube.com/channel/${v}` : `https://youtube.com/@${v.replace(/^@/, "")}`,
    extractValue: (url) => {
      if (url.includes("/channel/")) return url.split("/channel/")[1]?.split("/")[0] || "";
      return url.replace(/^https?:\/\/(www\.)?youtube\.com\/@?/, "").split("/")[0] || "";
    },
    color: "text-white",
    bgColor: "bg-[#FF0000]",
  },
  {
    type: "x",
    label: "X",
    icon: XIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^(?:x|twitter)\.com/i), (h) => `https://x.com/${h}`),
    extractValue: (url) => stripHost(url, /^(?:x|twitter)\.com/i),

    color: "text-white",
    bgColor: "bg-black",
  },
  {
    type: "threads",
    label: "Threads",
    icon: ThreadsIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^threads\.(?:net|com)/i), (h) => `https://threads.net/@${h}`),
    extractValue: (url) => stripHost(url, /^threads\.(?:net|com)/i),

    color: "text-white",
    bgColor: "bg-black",
  },
  {
    type: "linkedin",
    label: "LinkedIn",
    icon: LinkedInIcon,
    inputType: "url",
    placeholder: "linkedin.com/in/yourname",
    generateUrl: (v) => safeUrl(stripHost(v, /^linkedin\.com(?:\/(?:in|company))?/i), (h) => `https://linkedin.com/in/${h}`),
    extractValue: (url) => stripHost(url, /^linkedin\.com(?:\/(?:in|company))?/i),

    color: "text-white",
    bgColor: "bg-[#0A66C2]",
  },
  {
    type: "facebook",
    label: "Facebook",
    icon: FacebookIcon,
    inputType: "url",
    placeholder: "facebook.com/yourpage",
    generateUrl: (v) => safeUrl(stripHost(v, /^(?:facebook\.com|fb\.com|m\.facebook\.com)/i, true), (h) => `https://facebook.com/${h}`),
    extractValue: (url) => stripHost(url, /^(?:facebook\.com|fb\.com|m\.facebook\.com)/i, true),

    color: "text-white",
    bgColor: "bg-[#1877F2]",
  },
  {
    type: "discord",
    label: "Discord",
    icon: DiscordIcon,
    inputType: "url",
    placeholder: "discord.gg/invite",
    generateUrl: (v) => safeUrl(stripHost(v, /^(?:discord\.gg|discord\.com(?:\/invite)?)/i), (h) => `https://discord.gg/${h}`),
    extractValue: (url) => stripHost(url, /^(?:discord\.gg|discord\.com(?:\/invite)?)/i),


    color: "text-white",
    bgColor: "bg-[#5865F2]",
  },
  {
    type: "twitch",
    label: "Twitch",
    icon: TwitchIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => safeUrl(stripHost(v, /^twitch\.tv/i), (h) => `https://twitch.tv/${h}`),
    extractValue: (url) => stripHost(url, /^twitch\.tv/i),

    color: "text-white",
    bgColor: "bg-[#9146FF]",
  },
  {
    type: "snapchat",
    label: "Snapchat",
    icon: SnapchatIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => safeUrl(stripHost(v, /^snapchat\.com(?:\/add)?/i), (h) => `https://snapchat.com/add/${h}`),
    extractValue: (url) => stripHost(url, /^snapchat\.com(?:\/add)?/i),

    color: "text-black",
    bgColor: "bg-[#FFFC00]",
  },
  {
    type: "pinterest",
    label: "Pinterest",
    icon: PinterestIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => safeUrl(stripHost(v, /^pinterest\.com/i), (h) => `https://pinterest.com/${h}`),
    extractValue: (url) => stripHost(url, /^pinterest\.com/i),

    color: "text-white",
    bgColor: "bg-[#E60023]",
  },
  {
    type: "whatsapp",
    label: "WhatsApp",
    icon: WhatsAppIcon,
    inputType: "url",
    placeholder: "wa.me/1234567890",
    generateUrl: (v) => v.startsWith("http") ? v : `https://wa.me/${v.replace(/\D/g, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?(wa\.me|api\.whatsapp\.com\/send\?phone=)/, "").split(/[/?]/)[0] || url,
    color: "text-white",
    bgColor: "bg-[#25D366]",
  },
  {
    type: "telegram",
    label: "Telegram",
    icon: TelegramIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^(?:t\.me|telegram\.me)/i), (h) => `https://t.me/${h}`),
    extractValue: (url) => stripHost(url, /^(?:t\.me|telegram\.me)/i),

    color: "text-white",
    bgColor: "bg-[#0088CC]",
  },
  {
    type: "google_review",
    label: "Google Review",
    icon: GoogleIcon,
    inputType: "url",
    placeholder: "Place ID (ChIJ...) or Google Review URL",
    generateUrl: (v) => {
      const url = buildGoogleReviewUrl(v);
      return url || v;
    },
    extractValue: (url) => {
      const placeId = normalizeGooglePlaceId(url);
      return placeId || url;
    },
    color: "text-white",
    bgColor: "bg-[#4285F4]",
  },
  {
    type: "yelp",
    label: "Check us out on Yelp",
    icon: YelpIcon,
    inputType: "url",
    placeholder: "https://www.yelp.com/biz/yourbusiness",
    generateUrl: (v) => safeUrl(stripHost(v, /^yelp\.com(?:\/biz)?/i, true), (h) => `https://www.yelp.com/biz/${h}`),
    extractValue: (url) => stripHost(url, /^yelp\.com(?:\/biz)?/i, true),

    color: "text-white",
    bgColor: "bg-[#D32323]",
  },
  {
    type: "directions",
    label: "Directions",
    icon: MapPin,
    inputType: "url",
    placeholder: "Full address or Apple Maps URL",
    generateUrl: (v) => {
      if (v.startsWith("http")) return v;
      return `https://maps.apple.com/?daddr=${encodeURIComponent(v)}`;
    },
    extractValue: (url) => {
      try {
        const u = new URL(url);
        const daddr = u.searchParams.get("daddr");
        if (daddr) return daddr;
      } catch {}
      return url;
    },
    color: "text-white",
    bgColor: "bg-[#2563eb]",
  },
  {
    type: "website",
    label: "Website",
    icon: Globe,
    inputType: "url",
    placeholder: "https://yourwebsite.com",
    generateUrl: (v) => v.startsWith("http") ? v : `https://${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-slate-700",
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    inputType: "email",
    placeholder: "your@email.com",
    generateUrl: (v) => `mailto:${v.replace(/^mailto:/, "")}`,
    extractValue: (url) => url.replace(/^mailto:/, ""),
    color: "text-white",
    bgColor: "bg-slate-500",
  },
  {
    type: "venmo",
    label: "Venmo",
    icon: VenmoIcon,
    inputType: "handle",
    placeholder: "yourname",
    prefix: "@",
    generateUrl: (v) => safeUrl(stripHost(v, /^venmo\.com(?:\/u)?/i), (h) => `https://venmo.com/${h}`),
    extractValue: (url) => stripHost(url, /^venmo\.com(?:\/u)?/i),

    color: "text-white",
    bgColor: "bg-[#008CFF]",
  },
  {
    type: "cashapp",
    label: "Cash App",
    icon: CashAppIcon,
    inputType: "cashtag",
    placeholder: "cashtag",
    prefix: "$",
    generateUrl: (v) => `https://cash.app/$${v.replace(/^\$/, "")}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?cash\.app\/\$?/, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#00D632]",
  },
  {
    type: "paypal",
    label: "PayPal",
    icon: PayPalIcon,
    inputType: "url",
    placeholder: "paypal.me/yourname",
    generateUrl: (v) => v.startsWith("http") ? v : `https://paypal.me/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?paypal\.me\//, "").split("/")[0] || url,
    color: "text-white",
    bgColor: "bg-[#003087]",
  },
  {
    type: "patreon",
    label: "Patreon",
    icon: PatreonIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://patreon.com/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?patreon\.com\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#FF424D]",
  },
  {
    type: "kofi",
    label: "Ko-fi",
    icon: KofiIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://ko-fi.com/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?ko-fi\.com\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#FF5E5B]",
  },
  {
    type: "spotify",
    label: "Spotify",
    icon: SpotifyIcon,
    inputType: "url",
    placeholder: "spotify.com/artist/...",
    generateUrl: (v) => v.startsWith("http") ? v : `https://open.spotify.com/${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-[#1DB954]",
  },
  {
    type: "applemusic",
    label: "Apple Music",
    icon: Music,
    inputType: "url",
    placeholder: "music.apple.com/...",
    generateUrl: (v) => v.startsWith("http") ? v : `https://music.apple.com/${v}`,
    extractValue: (url) => url,
    color: "text-white",
    bgColor: "bg-gradient-to-br from-[#FC3C44] to-[#A445B2]",
  },
  {
    type: "soundcloud",
    label: "SoundCloud",
    icon: SoundCloudIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://soundcloud.com/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?soundcloud\.com\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#FF5500]",
  },
  {
    type: "bandcamp",
    label: "Bandcamp",
    icon: BandcampIcon,
    inputType: "url",
    placeholder: "yourname.bandcamp.com",
    generateUrl: (v) => v.startsWith("http") ? v : `https://${v}.bandcamp.com`,
    extractValue: (url) => url.replace(/^https?:\/\//, "").replace(/\.bandcamp\.com.*$/, "") || url,
    color: "text-white",
    bgColor: "bg-[#1DA0C3]",
  },
  {
    type: "github",
    label: "GitHub",
    icon: GitHubIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://github.com/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?github\.com\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#181717]",
  },
  {
    type: "behance",
    label: "Behance",
    icon: BehanceIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://behance.net/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?behance\.net\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#1769FF]",
  },
  {
    type: "dribbble",
    label: "Dribbble",
    icon: DribbbleIcon,
    inputType: "handle",
    placeholder: "yourname",
    generateUrl: (v) => `https://dribbble.com/${v}`,
    extractValue: (url) => url.replace(/^https?:\/\/(www\.)?dribbble\.com\//, "").split("/")[0] || "",
    color: "text-white",
    bgColor: "bg-[#EA4C89]",
  },
];

// Detect platform from URL
export const detectPlatformFromUrl = (url: string): string | null => {
  const urlLower = url.toLowerCase();
  
  if (urlLower.includes("instagram.com")) return "instagram";
  if (urlLower.includes("tiktok.com")) return "tiktok";
  if (urlLower.includes("youtube.com") || urlLower.includes("youtu.be")) return "youtube";
  if (urlLower.includes("x.com") || urlLower.includes("twitter.com")) return "x";
  if (urlLower.includes("threads.net")) return "threads";
  if (urlLower.includes("linkedin.com")) return "linkedin";
  if (urlLower.includes("facebook.com") || urlLower.includes("fb.com")) return "facebook";
  if (urlLower.includes("discord.gg") || urlLower.includes("discord.com")) return "discord";
  if (urlLower.includes("twitch.tv")) return "twitch";
  if (urlLower.includes("snapchat.com")) return "snapchat";
  if (urlLower.includes("pinterest.com")) return "pinterest";
  if (urlLower.includes("wa.me") || urlLower.includes("whatsapp.com")) return "whatsapp";
  if (urlLower.includes("t.me") || urlLower.includes("telegram.me")) return "telegram";
  if (urlLower.includes("search.google.com/local/writereview")) return "google_review";
  if (urlLower.includes("yelp.com") || urlLower.includes("yelp.ca")) return "yelp";
  if (urlLower.includes("maps.apple.com")) return "directions";
  if (urlLower.includes("venmo.com")) return "venmo";
  if (urlLower.includes("cash.app")) return "cashapp";
  if (urlLower.includes("paypal.me") || urlLower.includes("paypal.com")) return "paypal";
  if (urlLower.includes("patreon.com")) return "patreon";
  if (urlLower.includes("ko-fi.com")) return "kofi";
  if (urlLower.includes("spotify.com")) return "spotify";
  if (urlLower.includes("music.apple.com")) return "applemusic";
  if (urlLower.includes("soundcloud.com")) return "soundcloud";
  if (urlLower.includes("bandcamp.com")) return "bandcamp";
  if (urlLower.includes("github.com")) return "github";
  if (urlLower.includes("behance.net")) return "behance";
  if (urlLower.includes("dribbble.com")) return "dribbble";
  
  return null;
};

export const getPlatformConfig = (type: string): PlatformConfig | undefined => {
  return PLATFORM_CONFIGS.find(p => p.type === type);
};

export const getPlatformIcon = (type: string) => {
  return getPlatformConfig(type)?.icon || Globe;
};
