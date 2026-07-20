# validation/

No source validation files here. Validator scripts live in `tjbot-mobile/scripts/`:

| Script dir | Validates |
|---|---|
| `scripts/erd/` | ERD dbml + prisma consistency |
| `scripts/flows/` | Nav-graph flow generation |
| `scripts/sequences/` | Sequence diagram syntax + actor allow-list |
| `scripts/usecases/` | Use-case index coverage + domain.meta.json alignment |

Run all validators from `tjbot-mobile/`:

```sh
npm run erd:validate
npm run flows:validate
npm run sequences:fast
npm run usecases:validate
```
