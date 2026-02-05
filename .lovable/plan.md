
# Plan: Improve Live Preview, Clean Up Design Tab & Fix Card Request Text

## Overview

This plan improves the mobile live preview experience, cleans up the Design tab for a more polished look, and changes "Request More Cards" to "Request a Card" in the Cards tab.

---

## Changes Required

### 1. Improve Live Preview (Already Shows Real Data!)

The preview is already using live data from the dashboard state (`profile`, `links`, `blocks`). The improvements focus on presentation:

**File: `src/components/personal/ProfilePreviewPanel.tsx`**

Update the panel to have a cleaner, more prominent design:

```tsx
function ProfilePreviewPanelComponent({
  profile,
  links,
  blocks,
}: ProfilePreviewPanelProps) {
  const handleLinkClick = (url: string) => {
    toast.info("Links are disabled in preview mode", {
      description: url,
      duration: 2000,
    });
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Phone frame with better shadow and styling */}
      <div className="relative">
        {/* Phone bezel - slimmer, more modern */}
        <div className="w-[280px] h-[560px] bg-gray-900 rounded-[2.5rem] p-[6px] shadow-2xl ring-1 ring-gray-700/50">
          {/* Screen */}
          <div className="w-full h-full bg-white rounded-[2.2rem] overflow-hidden relative">
            {/* Dynamic Island style notch - smaller, modern */}
            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 bg-gray-900 rounded-full z-10" />
            
            {/* Content */}
            <div className="h-full overflow-y-auto scrollbar-hide">
              <ProfilePreviewRenderer
                profile={profile}
                links={links}
                blocks={blocks}
                isPreview={true}
                onLinkClick={handleLinkClick}
              />
            </div>
          </div>
        </div>
        
        {/* Side buttons (decorative) - refined */}
        <div className="absolute right-[-2px] top-24 w-[3px] h-8 bg-gray-700 rounded-l-sm" />
        <div className="absolute left-[-2px] top-20 w-[3px] h-6 bg-gray-700 rounded-r-sm" />
        <div className="absolute left-[-2px] top-32 w-[3px] h-12 bg-gray-700 rounded-r-sm" />
      </div>
    </div>
  );
}
```

**File: `src/pages/personal/PersonalDashboard.tsx`**

Update the mobile preview section in the Links tab:

```tsx
{/* Mobile Live Preview */}
<div className="xl:hidden border-t pt-6 pb-8">
  <div className="text-center mb-6">
    <p className="text-sm font-semibold text-foreground">
      Your Profile Preview
    </p>
    <p className="text-xs text-muted-foreground mt-1">
      This is exactly how your profile looks to visitors
    </p>
  </div>
  <div className="flex justify-center">
    <ProfilePreviewPanel
      profile={profile}
      links={links}
      blocks={previewBlocks}
    />
  </div>
</div>
```

---

### 2. Clean Up Design Tab

**File: `src/components/personal/DashboardDesignTab.tsx`**

Reorganize with clear sections, better spacing, and cleaner visual hierarchy:

```tsx
return (
  <div className="space-y-8">
    {/* Header Style Section */}
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Header Style</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Choose how your profile header appears
        </p>
      </div>
      
      <RadioGroup 
        value={headerType} 
        onValueChange={handleTypeChange}
        className="grid grid-cols-3 gap-3"
      >
        {/* Solid Color option */}
        <div>
          <RadioGroupItem value="color" id="header-color" className="peer sr-only" />
          <Label 
            htmlFor="header-color" 
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
          >
            <Paintbrush className="h-5 w-5" />
            <span className="text-xs font-medium">Solid Color</span>
          </Label>
        </div>
        
        {/* Custom Image option */}
        <div>
          <RadioGroupItem value="image" id="header-image" className="peer sr-only" />
          <Label 
            htmlFor="header-image" 
            className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
          >
            <ImageIcon className="h-5 w-5" />
            <span className="text-xs font-medium">Image</span>
          </Label>
        </div>
        
        {/* Full Banner (Premium only) */}
        {isPremium && (
          <div>
            <RadioGroupItem value="banner" id="header-banner" className="peer sr-only" />
            <Label 
              htmlFor="header-banner" 
              className="flex flex-col items-center gap-2 p-4 rounded-xl border-2 border-muted bg-card cursor-pointer transition-all peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 hover:bg-muted/50"
            >
              <Sparkles className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium">Full Banner</span>
            </Label>
          </div>
        )}
      </RadioGroup>
      
      {/* Conditional content based on header type */}
      {headerType === "banner" ? (
        <div className="p-4 bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl border border-primary/20">
          <div className="flex items-start gap-3">
            <Sparkles className="h-5 w-5 text-primary mt-0.5" />
            <div>
              <p className="text-sm font-medium text-foreground">
                Full-Screen Banner Mode
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Your profile photo displays as a stunning full-screen banner with ambient color matching.
              </p>
            </div>
          </div>
        </div>
      ) : headerType === "color" ? (
        <div className="space-y-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Solid Colors</p>
            <div className="grid grid-cols-8 gap-2">
              {COLOR_PRESETS.map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorChange(color)}
                  className={`aspect-square rounded-full border-2 transition-all ${
                    headerColor === color ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:scale-110"
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-medium text-muted-foreground mb-2">Gradients</p>
            <div className="grid grid-cols-6 gap-2">
              {GRADIENT_PRESETS.map((gradient, i) => (
                <button
                  key={i}
                  onClick={() => handleColorChange(gradient)}
                  className={`aspect-square rounded-full border-2 transition-all ${
                    headerColor === gradient ? "border-primary ring-2 ring-primary/30" : "border-transparent hover:scale-110"
                  }`}
                  style={{ background: gradient }}
                />
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={customColorInput.startsWith("#") ? customColorInput : "#6BCB77"}
              onChange={(e) => {
                setCustomColorInput(e.target.value);
                handleColorChange(e.target.value);
              }}
              className="h-10 w-10 rounded-lg border-0 cursor-pointer"
            />
            <Input
              type="text"
              placeholder="#6BCB77"
              value={customColorInput}
              onChange={(e) => setCustomColorInput(e.target.value)}
              onBlur={() => {
                if (/^#[0-9A-Fa-f]{6}$/.test(customColorInput)) {
                  handleColorChange(customColorInput);
                }
              }}
              className="h-10 flex-1 font-mono text-sm"
            />
          </div>
        </div>
      ) : (
        /* Image upload UI - unchanged */
      )}
    </div>

    {/* Divider */}
    <div className="h-px bg-border" />

    {/* Background Section */}
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Background</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Set your page's background color
        </p>
      </div>
      
      <div className="grid grid-cols-6 gap-2">
        {BG_PRESETS.map((color) => (
          <button
            key={color}
            onClick={() => handleBgColorChange(color)}
            className={`aspect-square rounded-full border-2 transition-all ${
              backgroundColor === color ? "border-primary ring-2 ring-primary/30" : "border-border hover:scale-110"
            }`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      
      {/* Ambient gradient info (when banner mode) */}
      {bannerImageSource && imageBasedColor && (
        <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
          <div
            className="h-10 w-10 rounded-full flex-shrink-0"
            style={{ background: generateAmbientGradient(imageBasedColor) }}
          />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground">Auto-matched to your photo</p>
            <p className="text-xs text-muted-foreground">Override with a solid color above</p>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-3">
        <input
          type="color"
          value={bgColorInput.startsWith("#") ? bgColorInput : "#ffffff"}
          onChange={(e) => {
            setBgColorInput(e.target.value);
            handleBgColorChange(e.target.value);
          }}
          className="h-10 w-10 rounded-lg border-0 cursor-pointer"
        />
        <Input
          type="text"
          placeholder="#ffffff"
          value={bgColorInput}
          onChange={(e) => setBgColorInput(e.target.value)}
          onBlur={() => {
            if (/^#[0-9A-Fa-f]{6}$/.test(bgColorInput)) {
              handleBgColorChange(bgColorInput);
            }
          }}
          className="h-10 flex-1 font-mono text-sm"
        />
      </div>
    </div>
  </div>
);
```

Key improvements:
- **Card-style selection** for header type instead of inline radio buttons
- **Section headers** with descriptions
- **Organized color grids** with labels
- **Cleaner spacing** with visual divider
- **Compact ambient gradient indicator** instead of large box

---

### 3. Update Card Tab Request Text

**File: `src/components/dashboard/RequestMoreCards.tsx`**

Change the component to accept a `variant` prop to customize the text:

```tsx
interface RequestMoreCardsProps {
  restaurantId: string;
  variant?: "restaurant" | "personal";
}

export const RequestMoreCards = ({ restaurantId, variant = "restaurant" }: RequestMoreCardsProps) => {
  // ...
  
  const isPersonal = variant === "personal";
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Package className="h-4 w-4" />
          {isPersonal ? "Request a Card" : "Request More Cards"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-primary" />
            {isPersonal ? "Request a TapAway Card" : "Request More TapAway Cards"}
          </DialogTitle>
          <DialogDescription>
            {isPersonal 
              ? "Need an additional card? You can request up to 10 cards per month."
              : "Need more NFC cards for your business? You can request up to 10 cards per month."
            }
          </DialogDescription>
        </DialogHeader>
        {/* Rest unchanged */}
      </DialogContent>
    </Dialog>
  );
};
```

**File: `src/pages/personal/PersonalDashboard.tsx`**

Update the usage in the Card tab:

```tsx
<RequestMoreCards restaurantId={profile.id} variant="personal" />
```

Also update the label text:

```tsx
<div className="text-center space-y-3 pt-4 border-t">
  <p className="text-sm text-muted-foreground">
    Want another card?
  </p>
  <RequestMoreCards restaurantId={profile.id} variant="personal" />
</div>
```

---

## Summary of File Changes

| File | Changes |
|------|---------|
| `src/components/personal/ProfilePreviewPanel.tsx` | Modernize phone frame with Dynamic Island style notch, better shadows |
| `src/pages/personal/PersonalDashboard.tsx` | Update mobile preview text, add variant prop to RequestMoreCards usage |
| `src/components/personal/DashboardDesignTab.tsx` | Complete reorganization with card-style selectors, section headers, organized color grids |
| `src/components/dashboard/RequestMoreCards.tsx` | Add variant prop for personal vs restaurant text |

---

## Visual Comparison

### Design Tab - Before vs After

**Before:**
```text
Header Style
○ Solid Color  ○ Custom Image  ○ Full Banner

[color] [color] [color] [color] [color] [color] [color] [color]
[grad] [grad] [grad] [grad] [grad] [grad]

[hex input___________] [picker]

Page Background
[bg] [bg] [bg] [bg] [bg] [bg]
[hex input___________] [picker]
```

**After:**
```text
Header Style
Choose how your profile header appears

┌──────────┐  ┌──────────┐  ┌──────────┐
│   🎨     │  │   📷     │  │   ✨     │
│  Solid   │  │  Image   │  │  Banner  │
│  Color   │  │          │  │          │
└──────────┘  └──────────┘  └──────────┘

Solid Colors
[●] [●] [●] [●] [●] [●] [●] [●]

Gradients  
[●] [●] [●] [●] [●] [●]

[picker] [hex input___________]

───────────────────────────────────

Background
Set your page's background color

[●] [●] [●] [●] [●] [●]

[picker] [hex input___________]
```

---

## Technical Notes

1. **Live Preview is Already Live** - The preview already shows real-time data from dashboard state. Changes to profile, links, and blocks are immediately reflected.

2. **Card-Style Radio Buttons** - Uses the `sr-only` pattern with peer styling for custom radio appearances.

3. **Consistent Touch Targets** - Color picker buttons maintain the 44px minimum touch target from previous mobile optimization.
