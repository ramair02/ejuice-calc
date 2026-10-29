# Import file format

Export and Import both use the same JSON format. You can write a file by hand, or have Claude write one, to bulk-add recipes and inventory.

## Top level

```json
{
  "app": "ejuice-calc",
  "version": 1,
  "exportedAt": "2026-10-20T03:09:04.000Z",
  "items": [],
  "recipes": [],
  "mixes": []
}
```

| Field | Required | Notes |
|---|---|---|
| `app` | **yes** | Must be exactly `"ejuice-calc"`, or the file is rejected. |
| `items` | **yes** | Array. Can be empty `[]`. |
| `recipes` | **yes** | Array. Can be empty `[]`. |
| `mixes` | no | History entries. Treated as `[]` if missing. |
| `version`, `exportedAt` | no | Informational. |

## Items (inventory)

```json
{ "id": "tfa-pear", "kind": "flavor", "name": "TFA Pear", "carrier": "PG", "ml": 77, "lowMl": 5 }
{ "id": "nic-100", "kind": "nic", "name": "Nicotine base 100 mg", "strength": 100, "pgPct": 100, "ml": 220, "lowMl": 10 }
{ "id": "pg", "kind": "pg", "name": "PG", "ml": 11119, "lowMl": 50 }
{ "id": "vg", "kind": "vg", "name": "VG", "ml": 33358.94, "lowMl": 50 }
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique. Recipes refer to items by this. Use lowercase-with-dashes of the name, e.g. `tfa-juicy-peach`. |
| `kind` | `"flavor"` \| `"nic"` \| `"pg"` \| `"vg"` | |
| `name` | string | Shown everywhere. Unique within a kind. |
| `ml` | number | Amount on hand. |
| `lowMl` | number | "Low" warning threshold. |
| `carrier` | `"PG"` \| `"VG"` \| `"Other"` | Flavors only. Almost always `"PG"`. |
| `strength` | number | Nicotine bases only, in mg/mL. |
| `pgPct` | number | Nicotine bases only. PG % of the base; the rest is VG. |

**IDs of the starting data.** Use these to reference items that already exist:

| Item | id |
|---|---|
| Nicotine base 100 mg | `nic-100` |
| PG / VG | `pg` / `vg` |
| TFA Bavarian Cream | `tfa-bavarian-cream` |
| FA Fresh Cream | `fa-fresh-cream` |
| TFA Sour | `tfa-sour` |
| CAP Sweet Lychee | `cap-sweet-lychee` |
| TFA Honeysuckle | `tfa-honeysuckle` |
| CAP Sweet Mango | `cap-sweet-mango` |
| TFA Cantaloupe | `tfa-cantaloupe` |
| TFA Nectarine | `tfa-nectarine` |
| TFA Pear | `tfa-pear` |
| TFA Juicy Peach | `tfa-juicy-peach` |
| TFA Honeydew | `tfa-honeydew` |
| Fruity Flakes | `fruity-flakes` |

Items you add in the app get random IDs, like `mvg35of8baulwq`. To find them, Export and look in the file.

## Recipes

```json
{
  "id": "peach-rings",
  "name": "Peach Rings",
  "notes": "Sour peach candy. Straight fruit: good after a day or two.",
  "batchMl": 100,
  "nicMg": 1.5,
  "pgPct": 50,
  "nicBaseId": "nic-100",
  "flavors": [
    { "itemId": "tfa-juicy-peach", "pct": 6 },
    { "itemId": "tfa-nectarine", "pct": 2 },
    { "itemId": "tfa-sour", "pct": 1.5 },
    { "itemId": "cap-sweet-lychee", "pct": 0.5 }
  ],
  "updatedAt": 1792465744576
}
```

| Field | Type | Notes |
|---|---|---|
| `id` | string | Unique. |
| `name` | string | |
| `notes` | string | Use `""` for none. |
| `batchMl` | number | Default batch size in mL. |
| `nicMg` | number | Target strength in mg/mL. 1.5 with a 100 mg base = 1.5% of the bottle. |
| `pgPct` | number | Target PG %. VG is 100 − this. |
| `nicBaseId` | string \| null | `id` of a `nic` item. |
| `flavors` | array | `{ "itemId", "pct" }`. Each `itemId` must be the `id` of a flavor item, either in this file or already in the app. `pct` is % of the total batch. |
| `updatedAt` | number | Milliseconds since 1970. Any number works. |

An `itemId` that doesn't exist anywhere shows up as "(deleted flavor)". Include any new flavors in `items`.

## Mixes (history)

Usually only present in exports. Shape:

```json
{
  "id": "m1abc", "date": 1792465744576, "recipeId": "peach-rings", "recipeName": "Peach Rings",
  "batchMl": 100, "nicMg": 1.5, "pgPct": 50,
  "usage": [{ "itemId": "tfa-sour", "name": "TFA Sour", "ml": 1.5, "deducted": 1.5 }]
}
```

## How Merge matches things

**Items**
1. Matched by `id`, otherwise by `kind` + `name`, ignoring case.
2. A matched item is **overwritten** with the file's values, but keeps the app's own `id`. This includes `ml`, so your on-hand amount becomes the file's.
3. An unmatched item is added.

**Recipes**
1. Matched by `id`, otherwise by `name`, ignoring case.
2. A matched recipe is overwritten. An unmatched one is added.
3. Flavor and nicotine-base references are pointed at the app's items, even when IDs differ.

**History**: entries are added unless one with the same `id` already exists.

**Anything not in the file is untouched.** Merge never deletes.

After a merge, a green banner summarizes it, e.g. *"0 inventory items added, 15 updated; 15 recipes added, 0 updated."*

## Recipes only (keep my inventory amounts)

Merge overwrites `ml` for every item in the file. To add recipes without touching your stock levels:

- Set `"items": []`, as long as every flavor the recipes use already exists in the app with the same `id`. The starting flavors' IDs are listed above.
- If the recipes use **new** flavors, include only those new flavors in `items`.

Export first if you're unsure. Import → Merge of that export restores everything.

## Having Claude write an import file

Paste this into Claude chat, then describe the recipes you want:

```text
Write a JSON import file for my e-juice calculator app. Use exactly this format:

{"app":"ejuice-calc","version":1,"items":[],"recipes":[ ... ],"mixes":[]}

Each recipe:
{"id":"lowercase-dashed-name","name":"Name","notes":"short description + steep advice",
 "batchMl":100,"nicMg":1.5,"pgPct":50,"nicBaseId":"nic-100",
 "flavors":[{"itemId":"<flavor id>","pct":<number>}],"updatedAt":0}

Flavor ids I have (only use these unless I say otherwise):
tfa-bavarian-cream, fa-fresh-cream, tfa-sour, cap-sweet-lychee, tfa-honeysuckle,
cap-sweet-mango, tfa-cantaloupe, tfa-nectarine, tfa-pear, tfa-juicy-peach,
tfa-honeydew, fruity-flakes

If a recipe needs a flavor I don't have, add it to "items" as
{"id":"brand-flavor-name","kind":"flavor","name":"BRAND Flavor Name","carrier":"PG","ml":0,"lowMl":5}
and tell me. Leave "items" empty otherwise so my stock levels aren't overwritten.
Each recipe should total 10% flavor, for MTL.
```

Save the reply as a `.json` file, then use **Import → Merge** in the app.
