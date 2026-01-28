#!/usr/bin/env python3
"""Check November AWS Support costs"""
import json
import os
import subprocess
import sys

# Get November costs by service
print("Fetching November 2025 costs by service...")
group_by_json = json.dumps([{"Type": "DIMENSION", "Key": "SERVICE"}])
result = subprocess.run(
    ['aws', 'ce', 'get-cost-and-usage',
     '--time-period', 'Start=2025-11-01,End=2025-12-01',
     '--granularity', 'MONTHLY',
     '--metrics', 'BLENDED_COST',
     '--group-by', group_by_json],
    env=os.environ,
    capture_output=True,
    text=True
)

if result.returncode != 0:
    print(f"Error: {result.stderr}")
    sys.exit(1)

data = json.loads(result.stdout)
services = []
for result_by_time in data.get('ResultsByTime', []):
    for group in result_by_time.get('Groups', []):
        service = group['Keys'][0]
        cost = float(group['Metrics']['BlendedCost']['Amount'])
        services.append((service, cost))

services.sort(key=lambda x: x[1], reverse=True)

# Find support costs
support_services = [(s, c) for s, c in services if 'Support' in s or 'support' in s.lower()]

print(f"\n{'='*70}")
print("November 2025 - AWS Support Costs")
print(f"{'='*70}")

if support_services:
    total_support = 0
    for service, cost in support_services:
        print(f"{service:<50} ${cost:>15,.2f}")
        total_support += cost
    print(f"{'-'*70}")
    print(f"{'Total Support Costs':<50} ${total_support:>15,.2f}")
else:
    print("No AWS Support costs found in November 2025")

# Show top 10 services for context
print(f"\n{'='*70}")
print("November 2025 - Top 10 Services (for context)")
print(f"{'='*70}")
for service, cost in services[:10]:
    if cost > 0:
        print(f"{service:<50} ${cost:>15,.2f}")

