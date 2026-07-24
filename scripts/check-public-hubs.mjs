const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const anonKey =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !anonKey) {
  console.error(
    "Missing public backend environment variables. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to run hub checks.",
  );
  process.exit(1);
}

const headers = {
  apikey: anonKey,
  Authorization: `Bearer ${anonKey}`,
};

const checks = [
  {
    label: "approved restaurant hub",
    path: "/rest/v1/rpc/get_public_restaurant_hub",
    body: { _slug: "islasmarias" },
    expectRows: true,
  },
  {
    label: "approved restaurant legacy hub",
    path: "/rest/v1/rpc/get_public_restaurant_hub",
    body: { _slug: "lasislasmarias" },
    expectRows: true,
  },
  {
    label: "approved trial personal demo hub",
    path: "/rest/v1/personal_profiles_public?select=id,username&username=eq.las-nuevas-islas",
    expectRows: true,
  },
  {
    label: "unapproved demo remains hidden",
    path: "/rest/v1/personal_profiles_public?select=id,username&username=eq.demo-rjcutj",
    expectRows: false,
  },
];

const readRows = async (path) => {
const readRows = async ({ path, body }) => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    headers: body
      ? { ...headers, "Content-Type": "application/json" }
      : headers,
    method: body ? "POST" : "GET",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  const rows = await response.json();
  if (!Array.isArray(rows)) {
    throw new Error("Expected an array response");
  }

  return rows;
};

const failures = [];

for (const check of checks) {
  try {
    const rows = await readRows(check);
    const passed = check.expectRows ? rows.length > 0 : rows.length === 0;
    if (!passed) {
      failures.push(`${check.label}: expected ${check.expectRows ? "visible" : "hidden"}, got ${rows.length} row(s)`);
    }
  } catch (error) {
    failures.push(`${check.label}: ${error instanceof Error ? error.message : "unknown error"}`);
  }
}

if (failures.length > 0) {
  console.error("Public hub checks failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Public hub checks passed.");