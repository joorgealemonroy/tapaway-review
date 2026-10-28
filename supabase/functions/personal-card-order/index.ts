import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { handlePersonalCardOrder } from "../_shared/personalOrderHandler.ts";

serve(handlePersonalCardOrder);
