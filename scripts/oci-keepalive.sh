#!/bin/bash
# OCI Keep-Alive Script for Oracle Cloud Always Free instances
# Runs a controlled, lightweight CPU calculation for 35 seconds to satisfy Oracle's 20% utilization threshold.
# Prevents idle instance reclamation without impacting system performance.

LOG_FILE="/var/log/oci-keepalive.log"
TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")

echo "[$TIMESTAMP] Starting OCI Keep-Alive pulse..." >> "$LOG_FILE"

# Run a controlled CPU load across 2 cores for 35 seconds using native Python
python3 -c '
import time, multiprocessing

def work(duration):
    end_time = time.time() + duration
    while time.time() < end_time:
        _ = [x * x for x in range(50000)]
        time.sleep(0.005)

 if __name__ == "__main__":
    processes = []
    for _ in range(min(2, multiprocessing.cpu_count())):
        p = multiprocessing.Process(target=work, args=(35,))
        p.start()
        processes.append(p)
    for p in processes:
        p.join()
' >> "$LOG_FILE" 2>&1

END_TIMESTAMP=$(date "+%Y-%m-%d %H:%M:%S")
echo "[$END_TIMESTAMP] OCI Keep-Alive pulse completed successfully." >> "$LOG_FILE"
