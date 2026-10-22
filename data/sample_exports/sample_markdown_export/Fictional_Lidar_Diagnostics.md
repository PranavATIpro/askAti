# Fictional Lidar Diagnostics

**Form Type:** Default Ticket Form  
**Ticket Type:** Knowledge  
**Category:** Software  
**Product Area:** Sensor  
**Components:** Fictional Lidar, Optical Driver  
**Source Page ID:** notion-page-fictional-lidar-001  
**Source URL:** https://www.notion.so/ati-motors/Fictional-Lidar-Diagnostics-notion-page-fictional-lidar-001  

## Step 1: Check Lidar Driver Communication
Inspect if the lidar sensor node is publishing pointcloud packets over Ethernet.

```bash
docker exec -it fictional_lidar_node ros2 topic hz /lidar/points_raw
```

> **Warning:** Ensure the vehicle emergency stop is engaged before connecting test cables.
> **Notes:** Nominal rate is 10 Hz. If rate drops below 5 Hz, check physical RJ45 connector.

## Step 2: Validate Packet CRC and Frame Drops
Verify the driver logs for dropped packets or timing discrepancies.

```bash
journalctl -u fictional-lidar.service -n 50 --no-pager
```

> **Notes:** Look for `CRC_ERR` or `TIMEOUT_DISCONNECT` events.

## Step 3: Run Optical Beam Alignment Diagnostic
Trigger internal calibration scan for 360-degree beam integrity.

```bash
fictional_lidar_tool --diag-beam --report-path /tmp/lidar_beam_report.json
```

> **Warning:** Do not look directly into optical emitter during laser diagnostic.
