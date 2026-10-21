export type BusinessBrief = {
  name: string;
  city: string;
  link: string;
  goal: string;
  googlePlaceId?: string;
  address?: string;
  state?: string;
  postalCode?: string;
  phone?: string;
  googleMapsUri?: string;
  lat?: number;
  lng?: number;
};
const KEY = "tapaway-business-brief";
export function readBusinessBrief(): BusinessBrief {
  try {
    return {
      name: "",
      city: "",
      link: "",
      goal: "Reviews & customer connections",
      ...JSON.parse(sessionStorage.getItem(KEY) || "{}"),
    };
  } catch {
    return {
      name: "",
      city: "",
      link: "",
      goal: "Reviews & customer connections",
    };
  }
}
export function saveBusinessBrief(value: BusinessBrief) {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Checkout works without local storage. */
  }
}
