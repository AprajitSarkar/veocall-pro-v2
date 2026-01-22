#!/bin/bash

# Restore Script for Linux
# Usage: ./restore.sh

echo "------------------------------------------------"
echo "   Chrome Data Restore Script (for Linux)"
echo "------------------------------------------------"

# 1. Check if backup file exists
if [ ! -f "chrome_backup.zip" ]; then
    echo "ERROR: 'chrome_backup.zip' not found!"
    echo "Please put this script in the same folder as your zip file."
    exit 1
fi

# 2. Check if Chrome is installed
CHROME_CONFIG_DIR="$HOME/.config/google-chrome"
if [ ! -d "$CHROME_CONFIG_DIR" ]; then
    echo "WARNING: Chrome config directory not found at $CHROME_CONFIG_DIR"
    echo "Have you installed Google Chrome yet? Proceeding anyway (creating dir)..."
    mkdir -p "$CHROME_CONFIG_DIR"
fi

# 3. Kill Chrome if running
if pgrep chrome > /dev/null; then
    echo "Closing Google Chrome..."
    pkill chrome
    sleep 2
fi

# 4. Backup existing Default profile (safety first)
if [ -d "$CHROME_CONFIG_DIR/Default" ]; then
    echo "Backing up existing profile to Default.bak..."
    mv "$CHROME_CONFIG_DIR/Default" "$CHROME_CONFIG_DIR/Default.bak_$(date +%s)"
fi

# 5. Unzip
echo "Unzipping backup..."
# Unzip to a temp folder first to check structure
mkdir -p restore_temp
unzip -q chrome_backup.zip -d restore_temp

# 6. Move User Data
# The backup script zips the CONTENTS of "User Data" (Default, etc.) or the folder itself?
# PowerShell: Check if it zipped 'User Data' folder or its contents.
# Usually standard zip of a folder includes the root folder.
# Let's check structure.
if [ -d "restore_temp/User Data" ]; then
    echo "Restoring Profile Data..."
    # We want to copy the CONTENTS of 'User Data' to ~/.config/google-chrome/
    cp -r restore_temp/User Data/* "$CHROME_CONFIG_DIR/"
elif [ -d "restore_temp/Default" ]; then
    # If the zip contained the contents directly
    echo "Restoring Profile Data (Contents)..."
    cp -r restore_temp/* "$CHROME_CONFIG_DIR/"
else
    echo "Restoring Profile Data (Generic)..."
    # Fallback: Copy everything except Secrets
    rsync -av --exclude 'Secrets' restore_temp/ "$CHROME_CONFIG_DIR/"
fi

# 7. Locate Secrets
SECRETS_DIR="restore_temp/Secrets"
if [ -d "$SECRETS_DIR" ]; then
    echo "Found exported secrets!"
    # Move them to Documents for easy access
    mv "$SECRETS_DIR" "$HOME/Documents/Chrome_Secrets_Restore"
    echo "MOVED Secrets (passwords/cookies) to: ~/Documents/Chrome_Secrets_Restore"
else
    echo "WARNING: No 'Secrets' folder found in backup."
fi

# Cleanup
rm -rf restore_temp

echo "------------------------------------------------"
echo "   RESTORE COMPLETE!"
echo "------------------------------------------------"
echo "1. Open Google Chrome."
echo "2. Your Bookmarks, History, and Extensions should be there."
echo ""
echo "IMPORTANT - TO RESTORE LOGINS:"
echo "   > Go to chrome://password-manager/settings"
echo "   > Select 'Import passwords'"
echo "   > Select file: ~/Documents/Chrome_Secrets_Restore/passwords.csv"
echo ""
echo "TO RESTORE COOKIES:"
echo "   > Use your Cookie Extension to import:"
echo "   > File: ~/Documents/Chrome_Secrets_Restore/cookies.json"
echo "------------------------------------------------"
