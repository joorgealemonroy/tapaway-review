 import { useIsMobile } from "@/hooks/use-mobile";
 import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
 import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
 import { cn } from "@/lib/utils";
 
 interface ResponsiveModalProps {
   open: boolean;
   onOpenChange: (open: boolean) => void;
   title: string;
   description?: string;
   children: React.ReactNode;
   className?: string;
 }
 
 /**
  * A responsive modal component that renders as a Dialog on desktop
  * and a bottom Drawer on mobile for better touch UX.
  */
 export const ResponsiveModal = ({
   open,
   onOpenChange,
   title,
   description,
   children,
   className,
 }: ResponsiveModalProps) => {
   const isMobile = useIsMobile();
 
   if (isMobile) {
     return (
       <Drawer open={open} onOpenChange={onOpenChange}>
         <DrawerContent className={cn("max-h-[90vh]", className)}>
           <DrawerHeader className="text-left">
             <DrawerTitle>{title}</DrawerTitle>
             {description && <DrawerDescription>{description}</DrawerDescription>}
           </DrawerHeader>
           <div className="overflow-y-auto flex-1 px-4 pb-8">
             {children}
           </div>
         </DrawerContent>
       </Drawer>
     );
   }
 
   return (
     <Dialog open={open} onOpenChange={onOpenChange}>
       <DialogContent className={cn("max-w-md", className)}>
         <DialogHeader>
           <DialogTitle>{title}</DialogTitle>
           {description && <DialogDescription>{description}</DialogDescription>}
         </DialogHeader>
         {children}
       </DialogContent>
     </Dialog>
   );
 };