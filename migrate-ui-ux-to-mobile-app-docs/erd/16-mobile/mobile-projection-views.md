---
entity: "@stateless"
domain: 16-mobile
service_owner: ParentApp
state_machine: none
api_endpoints:
  - "@no-api"
sequences_referenced_in:
  - "@no-sequence"
retention: "@stateless"
---

# 16-mobile — ParentApp Projection Views

@stateless — ParentApp owns **no** backend entities. This folder documents which entities from other lanes the mobile app reads and writes via the API Gateway.

## What ParentApp reads

| Entity | Owning lane | Access pattern |
|---|---|---|
| `users` | 01-identity | Read own profile; update email/password |
| `households` | 01-identity | Read household details; manage members |
| `children` | 01-identity | Read/write child profiles (name, nickname, avatar) |
| `devices` | 02-device | Read paired device list; initiate pairing |
| `device_heartbeats` | 02-device | Read last-seen / battery status |
| `courses` | 06-content | Browse course catalog |
| `levels`, `units`, `lessons` | 06-content | Read curriculum hierarchy |
| `parent_controls` | 07-parent | Read/write daily limits, topic restrictions |
| `usage_caps` | 07-parent | Read/write per-child usage caps |
| `weekly_summaries` | 07-parent | Read weekly session summaries |
| `subscription_plans` | 19-billing | Read active plans for pricing page |
| `subscriptions` | 19-billing | Read household subscription status |
| `invoices` | 19-billing | Read billing history |
| `entitlements` | 19-billing | Read per-child feature access |
| `notification_dispatches` | 10-notifications | Receive push notification history |
| `push_tokens` | 10-notifications | Write/update APNS/FCM push token on app launch |

## What ParentApp writes

| Entity | Owning lane | Write operation |
|---|---|---|
| `children` | 01-identity | Create/update/delete child profiles |
| `parent_controls` | 07-parent | Update parental control settings |
| `usage_caps` | 07-parent | Update per-child usage caps |
| `push_tokens` | 10-notifications | Register/update push token on login |
| `subscriptions` | 19-billing | Initiate checkout; request cancellation |

## Architecture note

ParentApp is a **consumer surface** — it calls backend APIs through the Gateway; it does not directly mutate any database table. All writes above go through authenticated REST endpoints owned by the respective backend service. The mobile app stores no persistent backend state of its own (local SQLite/SQLCipher cache is a read-through projection, not authoritative storage).
