import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handleBusinessCheckout } from "../_shared/businessCheckoutHandler.ts";

serve(handleBusinessCheckout);
