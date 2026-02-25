# TradeSim Pro — Vercel Deployment Guide

## Steps:

1. Is folder ko GitHub repo mein push karo
2. vercel.com pe jao → "New Project" → GitHub repo select karo
3. Deploy karo — Vercel automatic build karega
4. Deploy hone ke baad URL milega jaise: `https://your-project.vercel.app`
5. `tradesim-pro.html` mein yeh line dhundho:
   ```
   const DHAN_PROXY_URL = "https://your-project.vercel.app/api/dhan-proxy";
   ```
   Aur apna actual Vercel URL daalo.
6. File GitHub mein update karo → automatically redeploy hoga
