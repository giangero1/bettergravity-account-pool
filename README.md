# 👥 BetterGravity Account Pool Monitor & Switcher

[![BetterGravity Plugin](https://img.shields.io/badge/BetterGravity-Plugin-6366f1.svg)](https://github.com/YashjitPal/BetterGravity)
[![Antigravity-Manager](https://img.shields.io/badge/Powered%20By-Antigravity--Manager-10b981.svg)](https://github.com/lbjlaq/Antigravity-Manager)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/Platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey.svg)]()

> A seamless, privacy-protected multi-account quota monitor and instant account switcher for **Google Antigravity**, powered by **BetterGravity** and **Antigravity-Manager**.

---

## 🔗 The Ecosystem: How It Works

This project connects two essential community tools to give you unlimited, hassle-free Gemini coding in Google Antigravity:

```
┌────────────────────────────────────────────────────────┐
│                   Google Antigravity                   │
│                                                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │         BetterGravity Modification Platform      │  │
│  │                                                  │  │
│  │  ┌────────────────────────────────────────────┐  │  │
│  │  │  Account Pool Plugin (This Repository)     │  │  │
│  │  │  - Titlebar Ticker & Live Quotas           │  │  │
│  │  │  - 1-Click Multi-Account Switcher Modal    │  │  │
│  │  │  - Privacy-First Email Masking             │  │  │
│  │  └─────────────────────┬──────────────────────┘  │  │
│  └────────────────────────┼─────────────────────────┘  │
└───────────────────────────┼────────────────────────────┘
                            │
               REST API (:8045 with Bearer auth)
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             Antigravity-Manager (lbjlaq)               │
│             http://127.0.0.1:8045                      │
│                                                        │
│  • Manages Google account pool & OAuth tokens          │
│  • Monitors 5-Hour and Weekly limits                   │
│  • Autostart on PC boot via enable-autostart.bat       │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
           Google Gemini Upstream (Accounts 1..N)
```

1. **[BetterGravity](https://github.com/YashjitPal/BetterGravity)**: The open modification platform that extends Google Antigravity with themes, custom plugins, and enhanced developer UI.
2. **[Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)**: The local background proxy and multi-account manager developed by **@lbjlaq** that rotates and manages your Google credentials.
3. **Account Pool Plugin (This Project)**: The native visual interface inside Antigravity that reads quotas from Antigravity-Manager, displays 5H & Weekly limits in real time, and lets you switch active accounts with a single click.

---

## ✨ Features

- ⚡ **Real-Time Quotas**: Track remaining 5-Hour and Weekly limits directly in your Antigravity titlebar and sidebar.
- 🔄 **Instant Account Switching**: Switch your active coding account on the fly without logging out or restarting Antigravity.
- 🔒 **Privacy-First Design**: Raw email addresses are masked by default (`••••••••@gmail.com`) with individual reveal/hide toggles.
- 🚀 **1-Click Autostart**: Comes with a helper script so your proxy service launches automatically on Windows boot.
- 🛡️ **Zero Credential Leaks**: Your API keys and tokens are stored exclusively in your local storage—never hardcoded into the plugin code.

---

## 📋 Prerequisites

Before installing this plugin, ensure you have:

1. **Google Antigravity** installed with **[BetterGravity](https://github.com/YashjitPal/BetterGravity)**.
2. **[Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)** (or Antigravity Tools) installed and running locally on your PC (port `8045`).

---

## 🚀 Quick Start & Installation

### Option 1: 1-Click Installer (Windows)
1. Download or clone this repository:
   ```bash
   git clone https://github.com/giangero1/bettergravity-account-pool.git
   ```
2. Double-click **`install.bat`**.
3. It will automatically install the plugin into `%APPDATA%\BetterGravity\plugins\account-pool` and prompt you to set up Windows autostart.

### Option 2: Manual Installation
1. Download the [Latest Release ZIP](https://github.com/giangero1/bettergravity-account-pool/releases).
2. Extract the folder into your BetterGravity plugins directory:
   ```
   %APPDATA%\BetterGravity\plugins\account-pool
   ```
3. Restart Antigravity or open BetterGravity Settings (`Ctrl + Shift + G`) to verify the plugin is active.

---

## ⚡ Autostart Setup (Antigravity Tools Service)

For the plugin to work every time you open Antigravity, the **Antigravity-Manager** proxy service needs to run in the background.

To make it automatically launch whenever your PC starts:

- **Automatic**: Double-click **`enable-autostart.bat`** in this folder. It will detect your `antigravity-tools.exe` and place a shortcut in your Windows Startup directory (`shell:startup`).
- **Manual**: Press `Win + R` -> type `shell:startup` -> paste a shortcut to your `antigravity-tools.exe` (located at `%LOCALAPPDATA%\Antigravity Tools\antigravity-tools.exe`).

---

## ⚙️ Configuration

1. In Antigravity, press `Ctrl + Shift + G` to open the **BetterGravity Settings Panel**.
2. Scroll to the **Account Pool Monitor** section.
3. Configure the following:
   - **Proxy Service URL**: `http://127.0.0.1:8045` (default)
   - **Proxy API Key**: Paste the secret key from your Antigravity-Manager application (`sk-...`).

*(Alternatively, if you prefer editing files directly, open `index.js` and paste your key into `FALLBACK_PROXY_KEY`).*

---

## 🔍 Troubleshooting

| Issue | Solution |
| :--- | :--- |
| **"Gateway Offline"** | Make sure Antigravity-Manager is running in your taskbar. Run `enable-autostart.bat` to keep it running on boot. |
| **"Refresh Failed" (401 Unauthorized)** | Verify your Proxy API Key matches the key configured in Antigravity-Manager. |
| **Accounts not switching** | Confirm that Antigravity-Manager has target IDE set to Antigravity (`agy`). |

---

## 🤝 Credits & Acknowledgments

- **[lbjlaq / Antigravity-Manager](https://github.com/lbjlaq/Antigravity-Manager)**: For the proxy engine and multi-account manager.
- **[YashjitPal / BetterGravity](https://github.com/YashjitPal/BetterGravity)**: For the Antigravity modification runtime and plugin API.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
