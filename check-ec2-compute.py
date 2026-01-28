#!/usr/bin/env python3
"""Check EC2 Compute costs for last 6 months"""
import json
import os
import subprocess
import sys

# Define last 6 months
months = [
    ('2025-07-01', '2025-08-01', 'July 2025'),
    ('2025-08-01', '2025-09-01', 'August 2025'),
    ('2025-09-01', '2025-10-01', 'September 2025'),
    ('2025-10-01', '2025-11-01', 'October 2025'),
    ('2025-11-01', '2025-12-01', 'November 2025'),
    ('2025-12-01', '2026-01-01', 'December 2025'),
]

print("Fetching EC2 Compute costs for last 6 months...")
ec2_costs = {}

for start, end, label in months:
    group_by_json = json.dumps([{"Type": "DIMENSION", "Key": "SERVICE"}])
    result = subprocess.run(
        ['aws', 'ce', 'get-cost-and-usage',
         '--time-period', f'Start={start},End={end}',
         '--granularity', 'MONTHLY',
         '--metrics', 'BLENDED_COST',
         '--group-by', group_by_json],
        env=os.environ,
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        data = json.loads(result.stdout)
        ec2_cost = 0.0
        for result_by_time in data.get('ResultsByTime', []):
            for group in result_by_time.get('Groups', []):
                service = group['Keys'][0]
                if 'Elastic Compute Cloud - Compute' in service or 'EC2-Instance' in service:
                    cost = float(group['Metrics']['BlendedCost']['Amount'])
                    ec2_cost += cost
        ec2_costs[label] = ec2_cost
    else:
        print(f"Warning: Could not fetch costs for {label}: {result.stderr}")
        ec2_costs[label] = 0.0

print(f"\n{'='*70}")
print("EC2 Compute Costs - Last 6 Months")
print(f"{'='*70}")
print(f"\n{'Month':<20} {'EC2 Compute Cost':>20}")
print(f"{'-'*40}")

for month_label in months:
    label = month_label[2]
    cost = ec2_costs.get(label, 0.0)
    print(f"{label:<20} ${cost:>19,.2f}")

# Find minimum
min_cost = min(ec2_costs.values())
min_month = [label for label, cost in ec2_costs.items() if cost == min_cost][0]

print(f"{'-'*40}")
print(f"\n{'Lowest EC2 Compute Cost:':<20} ${min_cost:>19,.2f}")
print(f"{'Month:':<20} {min_month:>20}")

# Calculate average
avg_cost = sum(ec2_costs.values()) / len(ec2_costs) if ec2_costs else 0
print(f"{'Average:':<20} ${avg_cost:>19,.2f}")

print(f"\n{'='*70}")

