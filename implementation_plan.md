# Hackathon Payment Polish — Implementation Plan
**Buidl Battle #2** | Deadline: March 20, 2026 | Targeting: $12,000+ in bounties

---

## Design Decisions (Confirmed)

- **Testnet wallet:** `ST0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F48XHSV8` (same for STX and sBTC)
- **Keep all prices as-is** (3.5 STX / 1 USDCx for all plans)
- **3-way token selector** on ALL transactions: USDCx (default) | STX | sBTC
- **USDCx is the base price** — STX and sBTC amounts are converted equivalents
- **Testnet first**, mainnet cutover on Monday

---

## Phase 1 — Testnet Migration

### Backend

#### [MODIFY] [settings.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/deorganized/settings.py)

```diff
-STACKS_NETWORK = os.environ.get('STACKS_NETWORK', 'mainnet')
+STACKS_NETWORK = os.environ.get('STACKS_NETWORK', 'testnet')

-PLATFORM_WALLET_ADDRESS = os.environ.get('PLATFORM_WALLET_ADDRESS', 'SP0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F5SGQDQQ')
+PLATFORM_WALLET_ADDRESS = os.environ.get('PLATFORM_WALLET_ADDRESS', 'ST0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F48XHSV8')
```

### Frontend

#### [MODIFY] [.env](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/.env)

```diff
-VITE_STACKS_NETWORK=mainnet
+VITE_STACKS_NETWORK=testnet

-VITE_USDCX_CONTRACT_ADDRESS=SP120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE
+VITE_USDCX_CONTRACT_ADDRESS=ST120SBRBQJ00MCWS7TM5R8WJNTTKD5K0HFRC2CNE

+# sBTC Testnet Contract
+VITE_SBTC_CONTRACT_ADDRESS=ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
+VITE_SBTC_CONTRACT_NAME=sbtc-token

-VITE_PLATFORM_WALLET_ADDRESS=SP0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F5SGQDQQ
+VITE_PLATFORM_WALLET_ADDRESS=ST0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F48XHSV8
```

### Verification
- 402 challenges emit `"network": "testnet"`
- Wallet popups connect to Stacks testnet
- Fund wallets via [testnet faucet](https://explorer.hiro.so/sandbox/faucet?chain=testnet)

---

## Phase 2 — USDCx Payment Polish

### 2a. Balance Pre-check

#### [MODIFY] [x402Client.ts](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/lib/x402Client.ts)

Add `getTokenBalance(address, tokenType, network)` — queries Stacks API before opening wallet:
- **STX:** `GET /v2/accounts/{address}` → `stx.balance`
- **USDCx/sBTC:** Read-only `get-balance` on the SIP-010 contract
- If insufficient → throw `InsufficientBalanceError` → toast: "Insufficient balance (have: X, need: Y)"

### 2b. Payment Success Toasts

#### [MODIFY] All x402-gated component files

After successful payment, show `toast.success()` with truncated txId:
- [CreatorDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CreatorDetail.tsx) (merch), [PlayoutControl.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/PlayoutControl.tsx) (subscription), [ShowDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/ShowDetail.tsx) (episodes), [CommunityFeed.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CommunityFeed.tsx) (posts), [TipModal.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/TipModal.tsx) (tips)

### Verification
- Zero-balance wallet gets a clear error toast before popup opens
- Successful payments show green toast with tx link

---

## Phase 3 — sBTC Integration ($3K Bounty)

### 3a. x402 Client: Add sBTC Token Type

#### [MODIFY] [x402Client.ts](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/lib/x402Client.ts)

```typescript
export type PaymentToken = "STX" | "USDCx" | "sBTC";
```

Add `sBTC` branch using [openContractCall](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/node_modules/@stacks/connect/dist/types/transactions/index.d.ts#26-28) (identical pattern to USDCx but different contract):
```typescript
} else if (tokenType === "sBTC") {
    const sbtcAddress = import.meta.env.VITE_SBTC_CONTRACT_ADDRESS;
    const sbtcName = import.meta.env.VITE_SBTC_CONTRACT_NAME || 'sbtc-token';
    // SIP-010 transfer: (amount, sender, recipient, memo)
    txIdentifier = await new Promise((resolve, reject) => {
        openContractCall({
            contractAddress: sbtcAddress, contractName: sbtcName,
            functionName: 'transfer',
            functionArgs: [
                uintCV(paymentRequired.amountSBTC),
                principalCV(senderAddr),
                principalCV(paymentRequired.payTo),
                someCV(bufferCV(new TextEncoder().encode(`x402:${paymentRequired.nonce.substring(0,8)}`)))
            ],
            postConditionMode: PostConditionMode.Deny, postConditions: [],
            network,
            onFinish: (data) => resolve(data.txId),
            onCancel: () => reject(new PaymentCancelledError()),
        });
    });
}
```

### 3b. Backend: 402 Header + Decorator

#### [MODIFY] [payments/x402.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/payments/x402.py)

```diff
-def build_payment_required_header(pay_to, amount_stx, amount_usdcx, resource, description):
+def build_payment_required_header(pay_to, amount_stx, amount_usdcx, resource, description, amount_sbtc=0):
     payload = {
         ...
+        "amountSBTC": int(amount_sbtc),
-        "tokenTypes": ["STX", "USDCx"],
+        "tokenTypes": ["STX", "USDCx", "sBTC"],
     }
```

#### [MODIFY] [payments/decorators.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/payments/decorators.py)

Update to handle 3-value tuple from [get_amounts](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py#1040-1043) (backward compatible — defaults `amount_sbtc=0` if only 2 returned).

### 3c. Backend: Add sBTC Pricing to x402-Gated Views

All 6 views update [get_amounts](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py#1040-1043) to return 3 values. sBTC price derived from USDCx base:

| View | File | sBTC Amount Derivation |
|------|------|------------------------|
| Subscription | [users/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py) | `usdcx_price * sbtc_rate` |
| Merch | [merch/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/merch/views.py) | `item.price_usdcx * sbtc_rate` |
| Episodes | [shows/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/shows/views.py) | `ep.price_usdcx * sbtc_rate` |
| Posts | `posts/views.py` | `post.price_usdcx * sbtc_rate` |
| Tips | [users/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py) | Variable |
| DMs | [messaging/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/messaging/views.py) | `creator.dm_price_usdcx * sbtc_rate` |

> [!NOTE]
> For the hackathon demo, we'll use a fixed conversion rate constant (e.g., `SBTC_PER_USDCX = 0.000015`). Live oracle pricing is post-hackathon.

### 3d. Frontend: 3-Way Token Selector on All Payment UIs

#### [MODIFY] All token-selector components

Upgrade existing STX/USDCx toggles to 3-way: `[ USDCx ] [ STX ] [ ₿ sBTC ]`

Files:
- [CreatorDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CreatorDetail.tsx) — merch token selector
- [PlayoutControl.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/PlayoutControl.tsx) — subscription plan page
- [ShowDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/ShowDetail.tsx) — episode unlock
- [CommunityFeed.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CommunityFeed.tsx) — gated post unlock
- [TipModal.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/TipModal.tsx) — tip selector

Price display dynamically converts from USDCx base:
```
USDCx selected → show raw USDCx price
STX selected   → show STX equivalent (price × stx_rate)
sBTC selected  → show sBTC equivalent (price × sbtc_rate)
```

### Verification
- 3 token options visible on all payment UIs
- Selecting sBTC triggers [openContractCall](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/node_modules/@stacks/connect/dist/types/transactions/index.d.ts#26-28) with sBTC contract
- 402 header includes `amountSBTC` and `"sBTC"` in `tokenTypes`
- PaymentReceipt records `token_type: "sBTC"`

---

## Phase 4 — x402 Agent Commerce ($3K Bounty)

### 4a. Headless x402 Client

#### [NEW] `agent/x402AgentClient.ts`

Uses `@stacks/transactions` `makeSTXTokenTransfer` directly (private key, no wallet popup):
```
1. fetch(url) → get 402 + payment-required header
2. Decode payment challenge
3. Sign tx with private key (makeSTXTokenTransfer / makeContractCall)
4. Broadcast tx
5. Retry fetch with payment-signature header
```

### 4b. Agent Demo Script

#### [NEW] `agent/dcpe_agent.ts`

End-to-end autonomous channel provisioning:
```
Agent Flow:
1. POST /api/subscription/upgrade/ → 402 → agent pays → subscription active
2. POST /ops/create-folder/ → DCPE folder created
3. POST /ops/upload/ → video content uploaded
4. POST /ops/set-mode/ {playout} → deployment started
5. POST /ops/stream-start/ → stream goes live
6. Log: "Channel provisioned and streaming ✅"
```

### 4c. Optional: Visual Demo Page

#### [NEW] `components/AgentDemo.tsx`

Terminal-style UI showing agent steps in real-time with step indicators.

#### Backend Improvements
Implement immediate episode provisioning:
- Modify `ShowViewSet` in `shows/views.py` to call the episode creation logic when a recurring show is published.
- Alternatively, add a `django.db.models.signals.post_save` signal for the `Show` model to handle this globally. (Preferred for robustness).

### Explanation of Automatic Show Creation
1. **Logic**: The system uses a Celery task (`auto_create_recurring_episodes`) that scans for `published` recurring shows.
2. **Occurrences**: It uses `show.get_upcoming_occurrences(count=5)` to find the next 5 dates within a 90-day window.
3. **Trigger**: Currently, this only runs on a schedule (likely daily). It is not triggered on show creation, which is why episodes don't appear immediately.
### Verification
- Agent script runs end-to-end on testnet without human intervention
- Demo recording shows autonomous x402 payment + channel provisioning

---

## Phase 5 — Mainnet Cutover (Monday)

### Environment Flip
**Backend:** `STACKS_NETWORK=mainnet`, `PLATFORM_WALLET_ADDRESS=SP0Z1GWFDZ7ESYAXYZ9AMM9Y4RB2W87F5SGQDQQ`
**Frontend:** `VITE_STACKS_NETWORK=mainnet`, mainnet contract addresses

### Cleanup
- Clear testnet [PaymentReceipt](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/payments/models.py#4-20) rows from DB

---

## Phase 6 — Demo & Submission

1. Record demo: creator subscribes (USDCx) → merch purchase (sBTC) → agent provisions channel (x402)
2. Submit to DoraHacks with video + repo + writeup

---

## Files Modified Summary

| File | Phase | Changes |
|------|-------|---------|
| [settings.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/deorganized/settings.py) | 1, 5 | `STACKS_NETWORK`, `PLATFORM_WALLET_ADDRESS` |
| [.env](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/.env) | 1, 5 | Network, contract addresses, sBTC config |
| [x402Client.ts](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/lib/x402Client.ts) | 2, 3 | Balance pre-check, sBTC branch, 3 token types |
| [payments/x402.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/payments/x402.py) | 3 | `amountSBTC` in 402 header |
| [payments/decorators.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/payments/decorators.py) | 3 | 3-value [get_amounts](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py#1040-1043) support |
| [users/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/users/views.py) | 3 | sBTC amounts in subscription + tips |
| [merch/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/merch/views.py) | 3 | sBTC amounts in merch orders |
| [shows/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/shows/views.py) | 3 | sBTC amounts in episode unlock |
| `posts/views.py` | 3 | sBTC amounts in gated posts |
| [messaging/views.py](file:///C:/Users/Solumgolie/Documents/New%20Beginnings/python/deorganized/deorganized/messaging/views.py) | 3 | sBTC amounts in DM pay-gate |
| [CreatorDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CreatorDetail.tsx) | 3 | 3-way token selector |
| [PlayoutControl.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/PlayoutControl.tsx) | 3 | 3-way token selector |
| [ShowDetail.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/ShowDetail.tsx) | 3 | 3-way token selector |
| [CommunityFeed.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/CommunityFeed.tsx) | 3 | 3-way token selector |
| [TipModal.tsx](file:///C:/Users/Solumgolie/Documents/DeorganizedP2/components/TipModal.tsx) | 3 | 3-way token selector |
| `agent/x402AgentClient.ts` | 4 | **NEW** — headless x402 client |
| `agent/dcpe_agent.ts` | 4 | **NEW** — agent demo script |
