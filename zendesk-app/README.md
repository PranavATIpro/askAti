# ATI Motors Runbook Assistant - Zendesk Support Sidebar App

This directory contains the production Zendesk Support Apps Framework (ZAF v2) package for hosting the **Robotics Runbook Assistant** directly inside the Zendesk Support agent ticket sidebar.

---

## 🚀 How to Install in Zendesk Support

### 1. Package the App
From your terminal, navigate to this folder and zip the manifest and assets:

```bash
cd /home/pranavsai/askati/zendesk-app
zip -r ../ati-runbook-zendesk-app.zip manifest.json assets/
```

*(Or using the Zendesk Apps Tools CLI if installed: `zat package`)*

### 2. Upload to Zendesk Admin Center
1. Log in to your Zendesk Support instance as an Administrator.
2. In the Admin Center, navigate to **Apps and integrations** > **Apps** > **Zendesk Support apps**.
3. Click **Upload private app** in the top right.
4. Set App Name: `ATI Motors Runbook Assistant`.
5. Select the `ati-runbook-zendesk-app.zip` archive.
6. Under App Parameters:
   - `runbookAssistantUrl`: Set to your deployed internal URL (e.g. `https://runbook.internal.atimotors.com` or `http://localhost:5173` for testing).
7. Click **Upload** and then **Install**.

---

## 🛠 Features in the Zendesk Ticket Sidebar

1. **Auto-Ticket Diagnosis**: Automatically parses `ticket.id`, `ticket.subject`, and `ticket.tags` from the open ticket to immediately recommend the exact matching runbook steps.
2. **Strict Zero-Hallucination Grounding**: Always grounded strictly in ATI Motors' official Notion procedures (Map Generation, Lidar frames, Streamlit visualizer, Mule container, Delfino, Battery LED, Wheel Calibration, etc.).
3. **1-Click "Insert to Ticket"**: Support engineers can click `Insert to Ticket` to immediately write the exact troubleshooting checklist and terminal commands into the agent's internal or public ticket reply box.
4. **Interactive Command Blocks**: Copyable commands with flags and parameters formatted with syntax highlighting.
