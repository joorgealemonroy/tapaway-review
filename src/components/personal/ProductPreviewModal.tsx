import { useState, useCallback, useEffect } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import useEmblaCarousel from "embla-carousel-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  title: string;
  description: string | null;
  long_description?: string | null;
  price_cents: number;
  product_type: string;
  cover_image_url: string | null;
  image_urls?: string[] | null;
}

interface ProductPreviewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onBuy: (productId: string) => void;
}

function ImageCarousel({ images }: { images: string[] }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi, onSelect]);

  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <div className="w-full aspect-[4/3] rounded-xl overflow-hidden">
        <img src={images[0]} alt="" className="w-full h-full object-cover" />
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="overflow-hidden rounded-xl" ref={emblaRef}>
        <div className="flex">
          {images.map((url, i) => (
            <div key={i} className="flex-none w-full aspect-[4/3]">
              <img src={url} alt="" className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      </div>
      {/* Dot indicators */}
      <div className="flex justify-center gap-1.5 mt-3">
        {images.map((_, i) => (
          <button
            key={i}
            onClick={() => emblaApi?.scrollTo(i)}
            className={cn(
              "h-2 rounded-full transition-all",
              i === selectedIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/30"
            )}
          />
        ))}
      </div>
    </div>
  );
}

function ModalContent({ product, onBuy }: { product: Product; onBuy: (id: string) => void }) {
  const allImages = [
    ...(product.cover_image_url ? [product.cover_image_url] : []),
    ...(product.image_urls || []),
  ];

  const displayDescription = product.long_description || product.description;
  const typeLabel = product.product_type === "pdf" ? "PDF" : product.product_type === "video" ? "Video" : product.product_type === "course" ? "Course" : product.product_type;

  return (
    <div className="space-y-4">
      {allImages.length > 0 && <ImageCarousel images={allImages} />}

      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant="secondary" className="text-xs capitalize">{typeLabel}</Badge>
        <Badge variant="default" className="text-sm font-bold">
          ${(product.price_cents / 100).toFixed(2)}
        </Badge>
      </div>

      {displayDescription && (
        <p className="text-sm text-muted-foreground whitespace-pre-line leading-relaxed">
          {displayDescription}
        </p>
      )}

      <div className="sticky bottom-0 pt-3 pb-1 bg-background">
        <button
          onClick={() => onBuy(product.id)}
          className="w-full px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity text-base"
        >
          Buy Now — ${(product.price_cents / 100).toFixed(2)}
        </button>
      </div>
    </div>
  );
}

export function ProductPreviewModal({ product, isOpen, onClose, onBuy }: ProductPreviewModalProps) {
  const isMobile = useIsMobile();

  if (!product) return null;

  if (isMobile) {
    return (
      <Drawer open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DrawerContent className="max-h-[90vh]">
          <DrawerHeader className="text-left">
            <DrawerTitle>{product.title}</DrawerTitle>
            <DrawerDescription className="sr-only">Product details</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto flex-1 px-4 pb-8">
            <ModalContent product={product} onBuy={onBuy} />
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product.title}</DialogTitle>
          <DialogDescription className="sr-only">Product details</DialogDescription>
        </DialogHeader>
        <ModalContent product={product} onBuy={onBuy} />
      </DialogContent>
    </Dialog>
  );
}
