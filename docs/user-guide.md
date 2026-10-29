# User guide

- [Starting the app](#starting-the-app)
- [Desktop shortcut](#desktop-shortcut)
- [Calculator tab](#calculator-tab)
- [Adding and editing recipes](#adding-and-editing-recipes)
- [Recipes tab](#recipes-tab)
- [Inventory tab](#inventory-tab)
- [Mixing a batch](#mixing-a-batch)
- [History tab](#history-tab)
- [Export and Import](#export-and-import)
- [Where your data lives](#where-your-data-lives)
- [First run and starting data](#first-run-and-starting-data)
- [Troubleshooting](#troubleshooting)

## Starting the app

```bash
cd ejuice-calc
npm run dev
```

Then open http://localhost:5173. The app only works while that terminal window is open.

On Windows, double-click `Start E-Juice.cmd` in the project folder instead. It:

1. Opens the page and exits if the app is already running on port 5173.
2. Otherwise runs `npm install` if `node_modules` is missing, starts the app on port 5173, and opens your default browser once it's ready.

Close the "E-Juice Calculator" window to stop the app.

## Desktop shortcut

To launch the app from your desktop:

1. Right-click `Start E-Juice.cmd` and choose **Show more options → Send to → Desktop (create shortcut)**.
2. Optional: right-click the new shortcut, choose **Properties**, and set **Run** to **Minimized** so the server window stays out of the way. You can also change the icon from there.

Or create the shortcut with PowerShell, run from the project folder:

```powershell
$s = (New-Object -ComObject WScript.Shell).CreateShortcut("$([Environment]::GetFolderPath('Desktop'))\E-Juice Calculator.lnk")
$s.TargetPath = "$PWD\Start E-Juice.cmd"; $s.WorkingDirectory = "$PWD"; $s.WindowStyle = 7
$s.IconLocation = 'C:\Windows\System32\shell32.dll,13'; $s.Save()
```

## Calculator tab

The working area. It shows whichever recipe you're currently editing (the "draft").

**Recipe bar**
- **Dropdown**: load a saved recipe, or choose **— New recipe —** to start blank.
- **New**: clears the form.
- **Name** and **Notes**: notes are free text, such as steep time or tweaks.
- **Save**: saves the recipe. If you loaded an existing recipe, this updates it.
- **Save copy**: saves your changes as a new recipe named "*Name* (copy)" and leaves the original untouched. Handy for trying variations.
- **Delete**: deletes the loaded recipe after asking you to confirm.

**Target**
- **Amount to make (mL)**: batch size.
- **Strength (mg/mL)**: target nicotine strength. The hint underneath shows what % of the bottle the nicotine base will be. With a 100 mg/mL base, 1.5 mg/mL = 1.5% nic base.
- **PG / VG**: target ratio. Editing either box updates the other so they always add up to 100.
- **Nicotine base**: which base from your inventory to use. Its strength and PG/VG ratio are set on the Inventory tab and shown here.

**Flavors**
- Type a flavor name. Names already in your inventory are suggested as you type. Matching ignores upper/lower case.
- Enter its **%** of the total batch.
- Next to each row: the flavor's carrier (PG/VG/Other) and how much you have on hand. A name that isn't in inventory yet shows *"new — added to inventory on save"*.
- **+ Add flavor** adds a row, and **✕** removes one.
- The heading shows the total flavor %.

**Mixing results**

One row per ingredient: nicotine base, each flavor, then the VG and PG to add. Each row shows **mL**, **grams** (for mixing by weight on a scale), **%**, and **On hand**.

- **On hand** turns red when you don't have enough of that ingredient for this batch.
- A red row means the recipe is impossible at your target ratio. For example, the flavors and nicotine already contain more PG than the target allows. A warning explains it.
- **Mix this batch…**: see [Mixing a batch](#mixing-a-batch).

## Adding and editing recipes

**One recipe at a time**
1. Go to **Calculator** and click **New**.
2. Enter a name. Set the batch size, strength, PG/VG and nicotine base. These are saved with the recipe as its defaults.
3. Add flavors with their %.
4. Click **Save**. Any flavor names you typed that aren't in inventory are added to inventory at 0 mL. Set their quantities on the Inventory tab.

**Editing**: open the recipe from the **Recipes** tab or the dropdown, change it, and click **Save**, or **Save copy** to keep the original.

**Many recipes at once**: use **Import → Merge** with a JSON file. See [Import file format](data-format.md). That page includes a ready-made prompt for getting Claude to write the file for you.

## Recipes tab

Every saved recipe as a card, sorted by name. Click a card to open it in the Calculator.

Each card shows:
- the flavors with their % and the total flavor %
- notes
- a stock chip:
  - 🟢 **Can make N mL**: you have enough for at least the recipe's saved batch size. N is the largest batch you could make.
  - 🟡 **Up to N mL**: you can make some, but less than the saved batch size.
  - 🔴 **Need …**: lists ingredients that are out of stock (0 mL) or missing from inventory.
- **Last mixed** date, if you've logged a batch of it

The search box filters by recipe name or flavor name.

## Inventory tab

**Bases**: nicotine bases, PG and VG.
- Nicotine bases have a **strength** (mg/mL) and **% PG**. The rest is VG. You can have several, for example a 100 mg PG base and a 48 mg 50/50 base. Add one with **+ Nicotine base**.
- PG and VG are always there and can't be deleted.

**Flavors**
- **Carrier**: what the concentrate is dissolved in. Nearly all TFA/CAP/FA flavors are **PG**. Use **Other** for water- or alcohol-based ones. This affects the PG/VG math and the grams.
- Add a flavor with the box at the top right, or by typing a new name in the Calculator and saving.

**Columns (every item)**
- **Name**: click to rename. Renaming is safe because recipes link to items by ID, not by name.
- **On hand (mL)**: type the exact amount you have.
- **Restock**: type an amount and press **Add** or Enter to add it to the current amount. Useful when a new bottle arrives.
- **Low at (mL)**: the item counts as low when on hand is at or below this.
- **Status**: **OK**, **Low**, or **Out** (0 mL). The Inventory tab title shows how many items are low or out.
- **✕**: delete. You can't delete an item that a recipe uses. Remove it from those recipes first.

All changes save as you type. There's no Save button.

## Mixing a batch

When you physically make a batch:

1. Load the recipe in the Calculator and set the amount you're making.
2. Click **Mix this batch…**.
3. The dialog confirms what will happen and warns if inventory says you're short on anything.
4. Click **Mix & deduct**.

Every ingredient's mL is subtracted from inventory, and the batch is logged in **History**.

- Stock never goes below 0. If you're short, that item is set to 0, and History records how much was actually deducted.
- You can mix without saving the recipe first. It's logged under the name in the name box, or "Untitled mix".
- The button is disabled when the calculation has a problem, such as an impossible ratio, no nicotine base, or a batch size of 0.

## History tab

Every mixed batch, newest first, with recipe name, batch size, strength, PG/VG, date and how long ago. Click an entry to see each ingredient's **Used** and **Deducted** mL. Deducted is shown in red if it was less than Used because you were short.

**Undo & restore inventory** puts back exactly the amounts that were deducted and removes the entry. Use it if you logged a mix by mistake.

## Export and Import

Buttons at the top right.

- **Export** downloads `ejuice-backup-YYYY-MM-DD.json` with everything: inventory, recipes and history. Do this regularly. It's your only backup.
- **Import** asks for a JSON file, shows what's in it, then offers:
  - **Merge** (the default): adds new items, recipes and history entries. Items and recipes that match an existing one by ID or name are **updated**, including on-hand amounts. Anything not in the file is left alone.
  - **Replace everything**: deletes all current data and loads the file. Asks you to confirm.

To import **recipes only** without touching your inventory amounts, set `"items": []` in the file before importing. See [Import file format → Recipes only](data-format.md#recipes-only-keep-my-inventory-amounts).

## Where your data lives

Data is stored in your browser's **IndexedDB** under the exact address you opened the app at. That means:

- **Chrome and Edge have separate data**, and so do different Chrome profiles.
- `http://localhost:5173`, `http://127.0.0.1:5173` and `http://localhost:4173` (the `npm run preview` port) are **three different storage areas**.
- Clearing your browser's site data or cookies for localhost **deletes it**.
- Hard-refreshing (Ctrl+Shift+R) does **not** affect it.

The app asks the browser to keep the data persistent so it isn't cleaned up automatically, but Export is still your real backup.

**Moving to another browser or computer:** Export in the old one, then Import → Replace everything in the new one.

## First run and starting data

The first time the app opens at a new address, it creates the database with starting data:

- **Inventory**: the original flavor stash (TFA, CAP and FA flavors), a 100 mg/mL 100% PG nicotine base, PG and VG. **All at 0 mL**, so enter your real amounts on the Inventory tab.
- **13 recipes**: the original recipe set, mostly 100 mL at 1.5 mg/mL and 50/50.

This only happens when the database is new. It never overwrites existing data.

## Troubleshooting

**The app looks empty, or shows only the starting recipes, and my data is gone.**
You're almost certainly at a different address or in a different browser than before. Check the address bar for exactly `http://localhost:5173`, and use the browser you entered the data in. The desktop launcher always uses the right address.

**I imported a file somewhere else but my browser doesn't show it.**
Imports only affect the browser you imported into. Run the import again in the browser you use.

**`Start E-Juice.cmd` window flashes and closes, or the page doesn't load.**
Run `npm run dev` in a terminal from the project folder to see the error. Common causes: Node.js isn't installed, or another program is using port 5173. The launcher uses `--strictPort` and won't silently switch ports, because a new port would mean empty data.

**The PG or VG row is negative or red.**
The target ratio can't be reached. For example, at 30/70 with 10% PG flavor and a 100% PG nic base, there may not be room for that much PG. Raise the PG % or use a base with more VG.

**Recipes show "Need PG, VG, …" even though I have them.**
Their on-hand amount is 0. Set it on the Inventory tab.

**I deleted or mixed something by mistake.**
A mix can be undone in History. A deleted recipe can only be restored from an Export, using Import → Merge.
