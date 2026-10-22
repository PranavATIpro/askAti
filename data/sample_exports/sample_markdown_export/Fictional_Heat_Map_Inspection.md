# Fictional Streamlit Heat Map Inspection

**Form Type:** Default Ticket Form  
**Ticket Type:** Knowledge  
**Category:** Software  
**Product Area:** Streamlit  
**Components:** Heat Map, Telemetry Visualizer  
**Source Page ID:** notion-page-fictional-heatmap-002  
**Source URL:** https://www.notion.so/ati-motors/Fictional-Heat-Map-Inspection-notion-page-fictional-heatmap-002  

## Step 1: Launch Local Streamlit Visualizer
Start the telemetry visualizer container to inspect Wi-Fi RSSI heatmaps.

```bash
docker run --rm -p 8501:8501 -v /data/telemetry:/app/data fictional_visualizer:latest streamlit run app.py
```

> **Notes:** Heatmap is generated to check for low network signal zones in the operational warehouse.

## Step 2: Overlay Signal Thresholds
Apply the RSSI floor filter to identify dead zones below -75 dBm.

```bash
python3 /app/tools/generate_heatmap_overlay.py --input /app/data/run_telemetry.csv --threshold -75
```

> **Warning:** Do not modify threshold parameters during an active mission run.
