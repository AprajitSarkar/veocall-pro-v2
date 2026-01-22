# Chrome Windows to Linux Migration Guide (Complete)

> [!WARNING]
> **CRITICAL SECURITY NOTICE**
> The final `chrome_backup.zip` will contain your **UNENCRYPTED PASSWORDS AND COOKIES**.
> Store this file securely. Delete it after restoring on Linux.

## Phase 1: Preparation (Do this FIRST)
The backup script is smart. It looks for your exported files to bundle them into one easy package.

### 1. Export Passwords
1.  Open Chrome on Windows.
2.  Go to `chrome://password-manager/settings`.
3.  Click **Download file** (Export passwords).
4.  **Save as**: `passwords.csv`
5.  **Location**: Save it in the **SAME FOLDER** as the `backup_chrome.ps1` script.

### 2. Export Cookies (Essential for staying logged in)
1.  Install **J2TEAM Cookies** extension (or similar).
2.  Open the extension and click **Export**.
3.  **Save as**: `cookies.json` (or `cookies.txt`).
4.  **Location**: Save it in the **SAME FOLDER** as the `backup_chrome.ps1` script.

---

## Phase 2: Run the "All-in-One" Backup
1.  **Close Google Chrome Completely.**
2.  Right-click `backup_chrome.ps1` and select **Run with PowerShell**.
3.  The script will:
    *   Backup your User Data folder.
    *   **Detect and capture** your `passwords.csv` and `cookies.json`.
    *   Create a single `chrome_backup.zip`.
4.  Copy `chrome_backup.zip` to your external drive or cloud storage.

---

## Phase 3: Restore on Linux
After you install Linux and Chrome:

### 1. Restore Profile Files
1.  Close Chrome.
2.  Unzip `chrome_backup.zip`.
3.  You will see a `User Data` folder and a `Secrets` folder.
4.  Copy the contents of `User Data` into your Linux Chrome config:
    ```bash
    cp -r "User Data"/* ~/.config/google-chrome/
    ```

### 2. Import Secrets (Crucial)
1.  Open Chrome on Linux.
2.  **Passwords**: Go to `chrome://password-manager/settings` -> **Import passwords** -> Select `Secrets/passwords.csv`.
3.  **Cookies**: Install the generic "Cookie Editor" or "J2TEAM Cookies" extension -> **Import** -> Select `Secrets/cookies.json`.

**Done!** You should now have your history, bookmarks, extensions, AND be logged in to your sites.
