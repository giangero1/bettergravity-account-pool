// BetterGravity Account Pool Monitor & Native Switcher Plugin
// Privacy-first: Hides raw emails, displays 5H & Weekly limits, and labels accounts as Account 1..5

const { ui, account } = plugin;

const settings = plugin.settings.define({
  proxyUrl: {
    type: "string",
    label: "Proxy Service URL",
    description: "Local endpoint of the Antigravity Tools proxy service.",
    default: "http://127.0.0.1:8045",
    placeholder: "http://127.0.0.1:8045"
  },
  proxyKey: {
    type: "string",
    label: "Proxy API Key",
    description: "Bearer authentication key from your local Antigravity Tools application.",
    default: "",
    placeholder: "sk-...",
    secret: true
  }
});

// ============================================================================
// CONFIGURATION (Zero personal data by default)
// You can enter your key in BetterGravity Settings (Ctrl+Shift+G),
// OR simply paste it below between the quotes into FALLBACK_PROXY_KEY:
// ============================================================================
const FALLBACK_PROXY_KEY = ""; // e.g. "sk-your-antigravity-tools-key"
const FALLBACK_PROXY_URL = "http://127.0.0.1:8045";

function getProxyUrl() {
  const fromSettings = (settings.proxyUrl || "").trim();
  const url = fromSettings || FALLBACK_PROXY_URL;
  return url.replace(/\/+$/, "");
}

function getProxyKey() {
  const fromSettings = (settings.proxyKey || "").trim();
  if (fromSettings) return fromSettings;
  return (FALLBACK_PROXY_KEY || "").trim();
}

function getAuthHeaders() {
  const key = getProxyKey();
  const headers = {};
  if (key) {
    headers["Authorization"] = `Bearer ${key}`;
  }
  return headers;
}

// Material Symbols Person Icon
const PERSON_ICON = "M480-480q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47ZM160-160v-112q0-34 17.5-62.5T224-378q62-31 126-46.5T480-440q64 0 128 15.5T736-378q29 15 46.5 43.5T800-272v112H160Z";

let cachedAccounts = [];
let currentAccountId = null;
let currentAccountEmail = null;
let isProxyOnline = false;
let lastPingMs = null;
let titleButtonHandle = null;
let sidebarButtonHandle = null;
let activeModalRender = null;

// Privacy state: Set of account IDs whose email is currently revealed
const revealedAccounts = new Set();
let revealAllEmails = false;

function maskEmail(email) {
  if (!email) return "••••••••";
  const parts = email.split("@");
  if (parts.length < 2) return "••••••••";
  return `••••••••@${parts[1]}`;
}

function formatReset(isoString) {
  if (!isoString) return "";
  try {
    const diffMs = new Date(isoString).getTime() - Date.now();
    if (diffMs <= 0) return "Ready";
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    if (days > 0) return `${days}d ${remHours}h`;
    const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m`;
  } catch {
    return "";
  }
}

function setSpinning(isSpinning) {
  // Titlebar button icon
  const tbSvg = titleButtonHandle?.element?.querySelector("svg");
  if (tbSvg) {
    if (isSpinning) tbSvg.classList.add("account-pool-spinning");
    else tbSvg.classList.remove("account-pool-spinning");
  }
  // Sidebar button icon
  const sbRefreshSvg = sidebarButtonHandle?.element?.querySelector(".account-pool-refresh-icon");
  if (sbRefreshSvg) {
    if (isSpinning) sbRefreshSvg.classList.add("account-pool-spinning");
    else sbRefreshSvg.classList.remove("account-pool-spinning");
  }
  // Modal refresh icon
  const modalRefreshSvg = document.querySelector(".account-pool-modal-refresh-icon");
  if (modalRefreshSvg) {
    if (isSpinning) modalRefreshSvg.classList.add("account-pool-spinning");
    else modalRefreshSvg.classList.remove("account-pool-spinning");
  }
}

function updateSidebarUI(active5h, activeWeekly, activeIndex, isOnline) {
  if (!sidebarButtonHandle || !sidebarButtonHandle.element) return;
  const el = sidebarButtonHandle.element;
  
  // Set clean label showing 5H and Weekly limits: e.g. "Active: 5H 100% · Wk 84%"
  const labelText = isOnline 
    ? `Active: 5H ${active5h !== null ? active5h + "%" : "--"} · Wk ${activeWeekly !== null ? activeWeekly + "%" : "--"}`
    : "Account Pool (Offline)";
  sidebarButtonHandle.setLabel(labelText);

  // Trailing controls container: refresh button + badge
  let trailing = el.querySelector(".account-pool-sidebar-trailing");
  if (!trailing) {
    trailing = document.createElement("span");
    trailing.className = "account-pool-sidebar-trailing";
    el.appendChild(trailing);
  }

  // Sidebar manual refresh button
  let refreshBtn = trailing.querySelector(".account-pool-sidebar-refresh-btn");
  if (!refreshBtn) {
    refreshBtn = document.createElement("button");
    refreshBtn.type = "button";
    refreshBtn.className = "account-pool-sidebar-refresh-btn";
    refreshBtn.title = "Refresh quotas now";
    refreshBtn.innerHTML = `<svg class="account-pool-refresh-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M482-160q-134 0-228-93t-94-227v-13l-74 74-42-42 148-148 146 146-42 42-72-72v13q0 109 76.5 185.5T482-218q28 0 55-6.5t52-19.5l44 44q-35 22-74.5 31t-76.5 9Zm242-121L578-427l42-42 72 72v-13q0-109-76.5-185.5T430-672q-28 0-55 6.5T323-646l-44-44q35-22 74.5-31t76.5-9q134 0 228 93t94 227v13l74-74 42 42-148 148Z"/></svg>`;
    refreshBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      fetchAccountsData(true);
    });
    trailing.appendChild(refreshBtn);
  }

  // Badge
  let badge = trailing.querySelector(".account-pool-badge");
  if (!badge) {
    badge = document.createElement("span");
    badge.className = "account-pool-badge";
    trailing.appendChild(badge);
  }
  badge.textContent = isOnline ? `Acc ${activeIndex}` : "OFF";
  badge.style.background = isOnline ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)";
  badge.style.color = isOnline ? "#34d399" : "#f87171";
  badge.style.borderColor = isOnline ? "rgba(16, 185, 129, 0.3)" : "rgba(239, 68, 68, 0.3)";
}

async function fetchAccountsData(manual = false, forceUpstream = false) {
  const start = performance.now();
  setSpinning(true);
  try {
    // 1. Detect Antigravity's active signed-in account if available
    let activeEmail = null;
    try {
      if (account && typeof account.read === "function") {
        const profile = await account.read();
        if (profile && profile.email) {
          activeEmail = profile.email.toLowerCase();
          currentAccountEmail = activeEmail;
        }
      }
    } catch {}

    // 2. If user clicked refresh or periodic sync fires, force proxy to sync with Google upstream
    if (manual || forceUpstream) {
      try {
        await fetch(`${getProxyUrl()}/api/accounts/refresh`, {
          method: "POST",
          headers: getAuthHeaders()
        });
      } catch {
        // Fall back to reading cached state if upstream times out
      }
    }

    const res = await fetch(`${getProxyUrl()}/api/accounts`, {
      method: "GET",
      headers: getAuthHeaders()
    });
    if (res.ok) {
      const data = await res.json();
      lastPingMs = Math.round(performance.now() - start);
      isProxyOnline = true;
      cachedAccounts = data.accounts || [];

      // Extract active account quotas:
      // Priority 1: Match account in pool whose email equals the signed-in account's email
      // Priority 2: Use current_account_id or is_current from gateway
      let curIdx = -1;
      if (activeEmail) {
        curIdx = cachedAccounts.findIndex(a => a.email && a.email.toLowerCase() === activeEmail);
      }
      if (curIdx === -1) {
        curIdx = cachedAccounts.findIndex(a => (data.current_account_id && a.id === data.current_account_id) || a.is_current);
      }

      if (curIdx !== -1) {
        currentAccountId = cachedAccounts[curIdx].id;
        if (!currentAccountEmail && cachedAccounts[curIdx].email) {
          currentAccountEmail = cachedAccounts[curIdx].email.toLowerCase();
        }
      } else {
        currentAccountId = data.current_account_id;
      }

      const currentAcc = curIdx !== -1 ? cachedAccounts[curIdx] : null;
      const activeNumber = curIdx !== -1 ? curIdx + 1 : 1;

      let active5h = null;
      let activeWeekly = null;

      if (currentAcc && currentAcc.quota && currentAcc.quota.quota_groups) {
        const gemGroup = currentAcc.quota.quota_groups.find(g => g.display_name && g.display_name.toLowerCase().includes("gemini"));
        if (gemGroup && gemGroup.buckets) {
          const b5h = gemGroup.buckets.find(b => b.window === "5h");
          const bWk = gemGroup.buckets.find(b => b.window === "weekly");
          if (b5h) active5h = Math.round(b5h.remaining_fraction * 100);
          if (bWk) activeWeekly = Math.round(bWk.remaining_fraction * 100);
        }
      }

      if (titleButtonHandle) {
        titleButtonHandle.setLabel(`● [Acc ${activeNumber}] 5H:${active5h !== null ? active5h + "%" : "--"} Wk:${activeWeekly !== null ? activeWeekly + "%" : "--"}`);
      }
      updateSidebarUI(active5h, activeWeekly, activeNumber, true);

      if (typeof activeModalRender === "function") {
        activeModalRender();
      }

      if (manual) {
        ui.toast({
          title: "Quotas Refreshed",
          body: `Active: Acc ${activeNumber} (${lastPingMs}ms)`,
          kind: "info",
          duration: 2500
        });
      }
      return true;
    }
  } catch (err) {
    // Proxy unreachable
  } finally {
    setSpinning(false);
  }

  isProxyOnline = false;
  if (titleButtonHandle) titleButtonHandle.setLabel("○ Pool Offline");
  updateSidebarUI(null, null, 1, false);

  if (typeof activeModalRender === "function") {
    activeModalRender();
  }

  if (manual) {
    ui.toast({
      title: "Refresh Failed",
      body: "Could not reach account proxy",
      kind: "error",
      duration: 3000
    });
  }
  return false;
}

async function switchActiveAccount(accountId) {
  try {
    const res = await fetch(`${getProxyUrl()}/api/accounts/switch`, {
      method: "POST",
      headers: {
        ...getAuthHeaders(),
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        accountId,
        account_id: accountId,
        target_ide: "agy"
      })
    });
    if (res.ok) {
      currentAccountId = accountId;
      const matched = cachedAccounts.find(a => a.id === accountId);
      if (matched && matched.email) {
        currentAccountEmail = matched.email.toLowerCase();
      }
      ui.toast({
        title: "Account Switched",
        body: "Switched active gateway account cleanly!",
        kind: "success"
      });
      await fetchAccountsData();
      return true;
    } else {
      const text = await res.text();
      ui.toast({ title: "Switch Failed", body: text || "Error", kind: "error" });
    }
  } catch (err) {
    ui.toast({ title: "Switch Error", body: String(err), kind: "error" });
  }
  return false;
}

// 1. TitleBar Button: Click to refresh quotas, Right-click to open pool modal
titleButtonHandle = ui.button({
  area: "titleBar",
  label: "Account Pool Status",
  icon: ui.icons.refresh,
  tooltip: "Refresh Quotas (Click) / Manage Pool (Right-Click)",
  onClick: () => {
    fetchAccountsData(true);
  }
});
if (titleButtonHandle?.element) {
  titleButtonHandle.element.classList.add("account-pool-titlebar-btn");
  titleButtonHandle.element.addEventListener("contextmenu", (e) => {
    e.preventDefault();
    openPoolModal();
  });
}

// 2. Sidebar Button: Click to open full dashboard modal
sidebarButtonHandle = ui.button({
  area: "sidebar",
  label: "Active: Loading...",
  icon: PERSON_ICON,
  tooltip: "Open 5-Account Quota Dashboard & Switcher",
  onClick: () => openPoolModal()
});
if (sidebarButtonHandle?.element) {
  sidebarButtonHandle.element.classList.add("account-pool-sidebar-btn");
}

// Initial Fetch, periodic polling (every 15s local, every 2 min upstream sync), and focus-based auto-refresh
fetchAccountsData(false, true);
let pingCount = 0;
const pingInterval = setInterval(() => {
  pingCount++;
  const forceUpstream = (pingCount % 8 === 0); // Upstream Google sync every 2 minutes (120s)
  fetchAccountsData(false, forceUpstream);
}, 15000);
const onWindowFocus = () => fetchAccountsData(false, true);
window.addEventListener("focus", onWindowFocus);

const unbindSettings = plugin.settings.onChange(() => {
  fetchAccountsData(true, true);
});

plugin.onDispose(() => {
  if (typeof unbindSettings === "function") unbindSettings();
  clearInterval(pingInterval);
  window.removeEventListener("focus", onWindowFocus);
  activeModalRender = null;
  if (titleButtonHandle) titleButtonHandle.remove();
  if (sidebarButtonHandle) sidebarButtonHandle.remove();
});

function openPoolModal() {
  fetchAccountsData(false, true);
  ui.modal({
    title: "Account Manager & Quota Monitor",
    description: "Privacy-Protected Multi-Account Switcher & Live Quota Dashboard",
    width: 660,
    render: (body, close) => {
      const root = ui.element("div", { class: "flex flex-col gap-3 text-sm" });

      // Top Bar: Online status, Privacy toggle, 5H / Weekly filter
      const topBar = ui.element("div", { class: "flex items-center justify-between pb-2 border-b border-border flex-wrap gap-2" });
      
      const statusPill = ui.element("div", { class: "flex items-center gap-2" }, [
        ui.element("span", {
          class: "account-pool-status-dot",
          style: `width:8px;height:8px;border-radius:50%;background:${isProxyOnline ? "#10b981" : "#ef4444"};display:inline-block;`
        }),
        ui.element("span", {
          class: "account-pool-status-text text-xs font-medium",
          text: isProxyOnline ? `Gateway Online (${lastPingMs}ms)` : "Gateway Offline"
        })
      ]);

      const controlsGroup = ui.element("div", { class: "flex items-center gap-2" });

      // Manual Refresh button in modal header
      const refreshBtn = ui.element("button", {
        class: "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-medium cursor-pointer whitespace-nowrap",
        title: "Refresh quotas from gateway now"
      });
      refreshBtn.innerHTML = `<svg class="account-pool-modal-refresh-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 -960 960 960" fill="currentColor"><path d="M482-160q-134 0-228-93t-94-227v-13l-74 74-42-42 148-148 146 146-42 42-72-72v13q0 109 76.5 185.5T482-218q28 0 55-6.5t52-19.5l44 44q-35 22-74.5 31t-76.5 9Zm242-121L578-427l42-42 72 72v-13q0-109-76.5-185.5T430-672q-28 0-55 6.5T323-646l-44-44q35-22 74.5-31t76.5-9q134 0 228 93t94 227v13l74-74 42 42-148 148Z"/></svg><span>Refresh</span>`;
      refreshBtn.addEventListener("click", async () => {
        await fetchAccountsData(true);
      });

      // Reveal / Hide All Emails button
      const toggleEmailsBtn = ui.element("button", {
        class: "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-border/60 bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors font-medium cursor-pointer whitespace-nowrap",
        text: revealAllEmails ? "🔒 Hide Emails" : "👁 Reveal Emails"
      });
      toggleEmailsBtn.addEventListener("click", () => {
        revealAllEmails = !revealAllEmails;
        toggleEmailsBtn.innerText = revealAllEmails ? "🔒 Hide Emails" : "👁 Reveal Emails";
        renderList();
      });

      controlsGroup.append(refreshBtn, toggleEmailsBtn);
      topBar.append(statusPill, controlsGroup);

      // Account cards container
      const listContainer = ui.element("div", { class: "flex flex-col gap-2 max-h-[460px] overflow-y-auto pr-1" });

      function renderList() {
        // Update status pill
        const dot = statusPill.querySelector(".account-pool-status-dot");
        const statusTxt = statusPill.querySelector(".account-pool-status-text");
        if (dot) dot.style.background = isProxyOnline ? "#10b981" : "#ef4444";
        if (statusTxt) statusTxt.textContent = isProxyOnline ? `Gateway Online (${lastPingMs}ms)` : "Gateway Offline";

        listContainer.replaceChildren();

        if (cachedAccounts.length === 0) {
          if (!isProxyOnline) {
            const offlineChildren = [
              ui.element("span", { class: "text-amber-500 font-semibold text-sm", text: "Antigravity Tools Service Offline" }),
              ui.element("span", { class: "text-muted-foreground text-xs max-w-sm leading-relaxed", text: `Could not connect to the proxy service at ${getProxyUrl()}. Please ensure Antigravity Tools is running in the background on your PC.` })
            ];
            if (!getProxyKey()) {
              offlineChildren.push(ui.element("span", { class: "text-[11px] text-blue-400 mt-1", text: "Tip: Configure your Proxy API Key in Settings (Ctrl+Shift+G) → Account Pool Monitor." }));
            }
            listContainer.appendChild(ui.element("div", { class: "p-5 flex flex-col items-center gap-2 text-center rounded-lg border border-border/40 bg-muted/20 my-2" }, offlineChildren));
            return;
          }
          listContainer.appendChild(ui.element("div", { class: "p-4 text-center text-muted-foreground text-xs", text: "Loading accounts from gateway..." }));
          return;
        }

        cachedAccounts.forEach((acc, index) => {
          const isCurrent = acc.id === currentAccountId || (currentAccountEmail && acc.email && acc.email.toLowerCase() === currentAccountEmail);
          const accountNum = index + 1;
          const isEmailRevealed = revealAllEmails || revealedAccounts.has(acc.id);

          // Extract Gemini 5-Hour and Weekly quota buckets
          let bucket5h = null;
          let bucketWeekly = null;

          if (acc.quota && acc.quota.quota_groups) {
            const gemGroup = acc.quota.quota_groups.find(g => g.display_name && g.display_name.toLowerCase().includes("gemini"));
            if (gemGroup && gemGroup.buckets) {
              bucket5h = gemGroup.buckets.find(b => b.window === "5h");
              bucketWeekly = gemGroup.buckets.find(b => b.window === "weekly");
            }
          }

          const pct5h = bucket5h ? Math.round(bucket5h.remaining_fraction * 100) : 100;
          const reset5h = bucket5h ? formatReset(bucket5h.reset_time) : "";

          const pctWeekly = bucketWeekly ? Math.round(bucketWeekly.remaining_fraction * 100) : 100;
          const resetWeekly = bucketWeekly ? formatReset(bucketWeekly.reset_time) : "";

          const color5h = pct5h > 50 ? "#10b981" : pct5h > 20 ? "#f59e0b" : "#ef4444";
          const colorWeekly = pctWeekly > 50 ? "#10b981" : pctWeekly > 20 ? "#f59e0b" : "#ef4444";

          const card = ui.element("div", {
            class: `${ui.classes.card} p-3 flex flex-col gap-2 ${isCurrent ? "border-primary/60 bg-primary/5" : "hover:bg-muted/30"}`
          });

          // Top row: "Account X", CURRENT badge, PRO badge, Email with eye toggle, Switch button
          const rowTop = ui.element("div", { class: "flex items-center justify-between" });
          
          const emailDisplay = isEmailRevealed ? acc.email : maskEmail(acc.email);

          const leftMeta = ui.element("div", { class: "flex items-center gap-2 flex-wrap" }, [
            ui.element("span", { class: "font-semibold text-xs text-foreground", text: `Account ${accountNum}` }),
            isCurrent ? ui.element("span", { class: "px-1.5 py-0.2 rounded text-[10px] font-bold bg-blue-500 text-white", text: "CURRENT" }) : "",
            ui.element("span", { class: "px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30", text: "◆ PRO" }),
            ui.element("span", { class: "text-xs text-muted-foreground font-mono ml-1", text: emailDisplay })
          ]);

          // Individual reveal toggle button
          const eyeBtn = ui.element("button", {
            class: "px-1.5 py-0.5 text-[11px] rounded hover:bg-muted text-muted-foreground border border-transparent hover:border-border/40 transition-colors",
            title: isEmailRevealed ? "Hide email" : "Reveal email",
            text: isEmailRevealed ? "🔒" : "👁"
          });
          eyeBtn.addEventListener("click", () => {
            if (revealedAccounts.has(acc.id)) {
              revealedAccounts.delete(acc.id);
            } else {
              revealedAccounts.add(acc.id);
            }
            renderList();
          });
          leftMeta.appendChild(eyeBtn);

          let switchBtn = "";
          if (!isCurrent) {
            switchBtn = ui.element("button", { class: ui.classes.button + " py-0.5 px-2 text-xs", text: "Switch To This" });
            switchBtn.addEventListener("click", async () => {
              switchBtn.innerText = "Switching...";
              await switchActiveAccount(acc.id);
              renderList();
            });
          }

          rowTop.append(leftMeta, switchBtn);

          // Bottom row: Gemini 5-Hour (left) & Weekly (right) quota meters
          const rowQuota = ui.element("div", { class: "grid grid-cols-2 gap-2 mt-1" });

          // Left: Gemini 5-Hour Limit
          const pill5h = ui.element("div", { class: "bg-muted/40 p-2 rounded flex flex-col gap-1 border border-border/50" }, [
            ui.element("div", { class: "flex justify-between items-center text-[11px]" }, [
              ui.element("span", { class: "text-muted-foreground font-medium", text: "Gemini 5-Hour" }),
              ui.element("span", { style: `font-weight:bold;color:${color5h};`, text: `${pct5h}% ${reset5h ? `(${reset5h})` : ""}`.trim() })
            ]),
            ui.element("div", { class: "w-full bg-muted/60 h-1.5 rounded-full overflow-hidden" }, [
              ui.element("div", { style: `width:${pct5h}%;height:100%;background:${color5h};border-radius:9999px;transition:width 0.3s;` })
            ])
          ]);

          // Right: Weekly Limit
          const pillWeekly = ui.element("div", { class: "bg-muted/40 p-2 rounded flex flex-col gap-1 border border-border/50" }, [
            ui.element("div", { class: "flex justify-between items-center text-[11px]" }, [
              ui.element("span", { class: "text-muted-foreground font-medium", text: "Weekly Quota" }),
              ui.element("span", { style: `font-weight:bold;color:${colorWeekly};`, text: `${pctWeekly}% ${resetWeekly ? `(${resetWeekly})` : ""}`.trim() })
            ]),
            ui.element("div", { class: "w-full bg-muted/60 h-1.5 rounded-full overflow-hidden" }, [
              ui.element("div", { style: `width:${pctWeekly}%;height:100%;background:${colorWeekly};border-radius:9999px;transition:width 0.3s;` })
            ])
          ]);

          rowQuota.append(pill5h, pillWeekly);
          card.append(rowTop, rowQuota);
          listContainer.appendChild(card);
        });
      }

      activeModalRender = renderList;
      renderList();

      // Footer
      const footer = ui.element("div", { class: "flex items-center justify-between pt-2 border-t border-border mt-1" }, [
        ui.element("span", { class: "text-[11px] text-muted-foreground", text: "Emails are private by default. Click 👁 to reveal individually or above." }),
        ui.element("button", { class: ui.classes.buttonQuiet, text: "Done" })
      ]);
      footer.querySelector("button").addEventListener("click", () => {
        activeModalRender = null;
        close();
      });

      root.append(topBar, listContainer, footer);
      body.appendChild(root);
    }
  });
}
