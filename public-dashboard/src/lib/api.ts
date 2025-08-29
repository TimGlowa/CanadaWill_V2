export const API_BASE = import.meta.env.VITE_API_BASE_URL || "https://canadawill-api2c-dpfyd2btbuhagmda.canadacentral-01.azurewebsites.net/api/v1";

export async function getOfficials(address: string) {
  const res = await fetch(`${API_BASE}/geo-search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ address })
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return res.json();
} 