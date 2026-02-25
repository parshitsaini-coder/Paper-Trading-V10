let cachedToken = null;
let tokenExpiry = null;

function generateTOTP(secret) {
  const base32Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = '';
  for (const char of secret.toUpperCase().replace(/=+$/, '')) {
    const val = base32Chars.indexOf(char);
    if (val === -1) continue;
    bits += val.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  const counter = Math.floor(Date.now() / 1000 / 30);
  const counterBytes = new Uint8Array(8);
  let c = counter;
  for (let i = 7; i >= 0; i--) { counterBytes[i] = c & 0xff; c = Math.floor(c / 256); }
  return crypto.subtle.importKey(
    'raw', new Uint8Array(bytes), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']
  ).then(key => crypto.subtle.sign('HMAC', key, counterBytes))
   .then(sig => {
     const arr = new Uint8Array(sig);
     const offset = arr[19] & 0x0f;
     const code = ((arr[offset] & 0x7f) << 24 | arr[offset+1] << 16 | arr[offset+2] << 8 | arr[offset+3]) % 1000000;
     return code.toString().padStart(6, '0');
   });
}

async function getAngelToken() {
  if (cachedToken && tokenExpiry && Date.now() < tokenExpiry) return cachedToken;
  const totp = await generateTOTP(process.env.ANGEL_TOTP_SECRET);
  const loginRes = await fetch(
    "https://apiconnect.angelone.in/rest/auth/angelbroking/user/v1/loginByPassword",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-UserType": "USER",
        "X-SourceID": "WEB",
        "X-ClientLocalIP": "127.0.0.1",
        "X-ClientPublicIP": "127.0.0.1",
        "X-MACAddress": "00:00:00:00:00:00",
        "X-PrivateKey": process.env.ANGEL_API_KEY
      },
      body: JSON.stringify({
        clientcode: process.env.ANGEL_CLIENT_CODE,
        password: process.env.ANGEL_PASSWORD,
        totp: totp
      })
    }
  );
  const loginData = await loginRes.json();
  if (!loginData?.data?.jwtToken) {
    throw new Error('Login failed: ' + (loginData?.message || JSON.stringify(loginData)));
  }
  cachedToken = loginData.data.jwtToken;
  tokenExpiry = Date.now() + (50 * 60 * 1000);
  return cachedToken;
}

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  try {
    const token = await getAngelToken();
    const { tokens } = req.query;
    if (!tokens) return res.status(400).json({ error: "tokens param required" });
    const tokenArr = tokens.split(",").map(t => t.trim()).filter(Boolean);
    const quoteRes = await fetch(
      "https://apiconnect.angelone.in/rest/secure/angelbroking/market/v1/quote/",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
          "X-UserType": "USER",
          "X-SourceID": "WEB",
          "X-PrivateKey": process.env.ANGEL_API_KEY
        },
        body: JSON.stringify({
          mode: "FULL",
          exchangeTokens: { "NSE": tokenArr }
        })
      }
    );
    const data = await quoteRes.json();
    res.status(200).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
```

**5.** Neeche **"Commit changes"** green button click karo

---

Commit hone ke baad **Vercel automatically 1-2 min mein redeploy** kar lega, phir test karo:
```
https://paper-trading-v10.vercel.app/api/angel-proxy?tokens=2885
