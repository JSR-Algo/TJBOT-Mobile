# Rewards

Rewards is a shared presentation slice consumed by the progress, parent, and robot-management route owners. It owns no route itself: persisted inbox celebration is registered by progress, private history by parent, and preference controls by robot management.

The generated flow is intentionally state-free. Route ownership remains singular in the three host domains while API parsing, query hooks, and the scoped seen queue stay reusable here.
