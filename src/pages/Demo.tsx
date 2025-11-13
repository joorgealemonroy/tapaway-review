import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Star, 
  Navigation, 
  Instagram, 
  Menu as MenuIcon
} from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Demo = () => {
  const [menuOpen, setMenuOpen] = useState(false);

  const handleButtonClick = (action: string) => {
    console.log(`Demo action: ${action}`);
    // In production, this would fire Fathom events
  };

  const menuSections = [
    {
      name: "Tacos",
      items: [
        { name: "Al Pastor Taco", price: "$4.50", description: "Marinated pork, pineapple, cilantro" },
        { name: "Carne Asada Taco", price: "$5.00", description: "Grilled beef, onions, cilantro" },
        { name: "Fish Taco", price: "$5.50", description: "Beer-battered fish, cabbage, chipotle mayo" },
      ]
    },
    {
      name: "Burritos",
      items: [
        { name: "Classic Burrito", price: "$12.00", description: "Rice, beans, meat, cheese, salsa" },
        { name: "California Burrito", price: "$13.50", description: "Carne asada, fries, cheese, guacamole" },
      ]
    },
    {
      name: "Drinks",
      items: [
        { name: "Horchata", price: "$3.00" },
        { name: "Jamaica", price: "$3.00" },
        { name: "Tamarindo", price: "$3.00" },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 shadow-2xl">
        <div className="w-20 h-20 rounded-lg bg-muted flex items-center justify-center mx-auto mb-6">
          <span className="text-xs text-muted-foreground text-center">Your Logo Here</span>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            How was your visit?
          </h1>
          <p className="text-muted-foreground">
            We'd love to hear from you! Share your experience below.
          </p>
        </div>

        <div className="space-y-3">
          <Button 
            className="w-full h-14 text-lg justify-start gap-3"
            onClick={() => {
              handleButtonClick('google_review');
              window.open('https://www.google.com/search?q=reviews', '_blank');
            }}
          >
            <Star className="w-5 h-5" />
            Google Reviews
          </Button>

          <Button 
            variant="secondary"
            className="w-full h-14 text-lg justify-start gap-3"
            onClick={() => {
              handleButtonClick('yelp_review');
              window.open('https://www.yelp.com', '_blank');
            }}
          >
            <Star className="w-5 h-5" />
            Yelp Reviews
          </Button>

          <Button 
            variant="outline"
            className="w-full h-12 justify-start gap-3"
            onClick={() => {
              handleButtonClick('directions');
              window.open('https://maps.google.com', '_blank');
            }}
          >
            <Navigation className="w-5 h-5" />
            Directions
          </Button>

          <Button 
            variant="outline"
            className="w-full h-12 justify-start gap-3"
            onClick={() => {
              handleButtonClick('instagram');
              window.open('https://instagram.com', '_blank');
            }}
          >
            <Instagram className="w-5 h-5" />
            Instagram
          </Button>

          <Button 
            variant="outline"
            className="w-full h-12 justify-start gap-3"
            onClick={() => {
              handleButtonClick('menu');
              setMenuOpen(true);
            }}
          >
            <MenuIcon className="w-5 h-5" />
            View Menu
          </Button>
        </div>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          Powered by{" "}
          <a 
            href="https://tapaway.co/demo" 
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
            onClick={() => handleButtonClick('demo_link')}
          >
            TapAway
          </a>
        </div>
      </Card>

      {/* Menu Modal */}
      <Dialog open={menuOpen} onOpenChange={setMenuOpen}>
        <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Our Menu</DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            {menuSections.map((section, idx) => (
              <div key={idx}>
                <h3 className="text-lg font-semibold mb-3 text-foreground border-b border-border pb-2">
                  {section.name}
                </h3>
                <div className="space-y-3">
                  {section.items.map((item, itemIdx) => (
                    <div key={itemIdx} className="flex justify-between items-start gap-4">
                      <div className="flex-1">
                        <div className="font-medium text-foreground">{item.name}</div>
                        {item.description && (
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {item.description}
                          </div>
                        )}
                      </div>
                      <div className="font-semibold text-foreground whitespace-nowrap">
                        {item.price}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Demo;
