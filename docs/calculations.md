# How the math works

All calculation is in [`src/lib/calc.ts`](../src/lib/calc.ts). It's tested against real results from the original HTML calculator in [`calc.test.ts`](../src/lib/calc.test.ts).

## Inputs

- **B**: batch size (mL)
- **S**: target nicotine strength (mg/mL)
- **P**: target PG fraction (e.g. 0.5). VG fraction is 1 − P.
- **N**: nicotine base strength (mg/mL), with base PG fraction **p<sub>n</sub>**
- For each flavor: **f** (% of batch) and a carrier of PG, VG or Other

## Volumes

```
nic base mL    = S × B / N
  of which PG  = nic mL × pₙ
  of which VG  = nic mL × (1 − pₙ)

flavor mL      = B × f / 100           (for each flavor)

PG to add      = B × P       − nic PG − PG-carried flavors − Other-carried flavors × P
VG to add      = B × (1 − P) − nic VG − VG-carried flavors − Other-carried flavors × (1 − P)
```

"Other" carriers (water, alcohol) take room from the PG and VG fill in the target ratio, so the total always equals the batch size. The original HTML calculator didn't subtract "Other" flavors at all, which made the total come out larger than the batch.

**Percent** for each row = row mL ÷ B × 100.

## Weights

Grams = mL × specific gravity:

| Liquid | g/mL |
|---|---|
| PG | 1.036 |
| VG | 1.261 |
| Other | 1.0 |

A nicotine base weighs its PG part × 1.036 + its VG part × 1.261. A flavor uses its carrier's value.

## Worked example

Lychee Blossom, 400 mL, 1.5 mg/mL, 50/50, 100 mg/mL 100% PG base, all PG flavors at 5 / 3.5 / 1 / 0.5 %:

| Ingredient | mL | g | % |
|---|---|---|---|
| Nicotine base | 6.00 | 6.22 | 1.50 |
| CAP Sweet Lychee | 20.00 | 20.72 | 5.00 |
| TFA Pear | 14.00 | 14.50 | 3.50 |
| TFA Honeysuckle | 4.00 | 4.14 | 1.00 |
| TFA Sour | 2.00 | 2.07 | 0.50 |
| VG | 200.00 | 252.20 | 50.00 |
| PG | 154.00 | 159.54 | 38.50 |
| **Total** | **400.00** | **459.40** | **100** |

PG to add = 200 − 6 − 40 = 154.

## Problems that are flagged

- **PG or VG to add is negative**: the target ratio is impossible with these ingredients. The row turns red and Mix is disabled.
- **Strength set but no nicotine base, or a base with strength 0.**
- **Target strength higher than the base strength.**

## Inventory math

- **On hand turns red** when the total mL this batch needs from an item exceeds its on-hand amount. The same flavor listed twice counts once with both amounts added together.
- **Max batch** on a recipe card = the smallest of (on hand ÷ mL needed per mL of batch) across all ingredients. A missing or 0 mL ingredient makes it 0.
- **Mixing** deducts min(needed, on hand) from each item and records both numbers, so **Undo** restores exactly what was taken.
- Amounts are rounded to 0.01 mL when stored.
