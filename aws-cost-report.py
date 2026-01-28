#!/usr/bin/env python3
"""AWS Cost Report - Multi-Month Comparison"""
import json
import os
import subprocess
import sys
from datetime import datetime
from calendar import month_name

# Define months to compare (last 5 months)
months = [
    ('2025-08-01', '2025-09-01', 'August 2025'),
    ('2025-09-01', '2025-10-01', 'September 2025'),
    ('2025-10-01', '2025-11-01', 'October 2025'),
    ('2025-11-01', '2025-12-01', 'November 2025'),
    ('2025-12-01', '2026-01-01', 'December 2025'),
]

print("Fetching costs for multiple months...")
monthly_costs = {}

for start, end, label in months:
    result = subprocess.run(
        ['aws', 'ce', 'get-cost-and-usage',
         '--time-period', f'Start={start},End={end}',
         '--granularity', 'MONTHLY',
         '--metrics', 'BLENDED_COST'],
        env=os.environ,
        capture_output=True,
        text=True
    )
    
    if result.returncode == 0:
        data = json.loads(result.stdout)
        if data.get('ResultsByTime'):
            cost = float(data['ResultsByTime'][0]['Total']['BlendedCost']['Amount'])
            monthly_costs[label] = cost
        else:
            monthly_costs[label] = 0.0
    else:
        print(f"Warning: Could not fetch costs for {label}: {result.stderr}")
        monthly_costs[label] = 0.0

print(f"\n{'='*80}")
print(f"AWS Cost Comparison - Last 5 Months")
print(f"{'='*80}")

# Display monthly comparison
print(f"\n{'Month':<20} {'Cost':>15} {'Change':>15} {'% Change':>15}")
print(f"{'-'*65}")
prev_cost = None
for month_label in months:
    label = month_label[2]
    cost = monthly_costs.get(label, 0.0)
    
    if prev_cost is not None:
        change = cost - prev_cost
        pct_change = (change / prev_cost * 100) if prev_cost > 0 else 0
        change_str = f"${change:+,.2f}"
        pct_str = f"{pct_change:+.1f}%"
    else:
        change_str = "-"
        pct_str = "-"
    
    print(f"{label:<20} ${cost:>14,.2f} {change_str:>15} {pct_str:>15}")
    prev_cost = cost

# Calculate totals and averages
total_cost = sum(monthly_costs.values())
avg_cost = total_cost / len(monthly_costs) if monthly_costs else 0
print(f"{'-'*65}")
print(f"{'Total':<20} ${total_cost:>14,.2f}")
print(f"{'Average':<20} ${avg_cost:>14,.2f}")

# Show trend
costs_list = [monthly_costs.get(m[2], 0) for m in months]
if len(costs_list) >= 2:
    first_half = sum(costs_list[:2]) / 2
    second_half = sum(costs_list[-2:]) / 2
    trend = second_half - first_half
    trend_pct = (trend / first_half * 100) if first_half > 0 else 0
    print(f"{'Trend (last 2 vs first 2)':<20} ${trend:>14,.2f} ({trend_pct:+.1f}%)")

# Get December service breakdown
print(f"\n{'='*80}")
print("December 2025 - Top Services Breakdown")
print(f"{'='*80}")

group_by_json = json.dumps([{"Type": "DIMENSION", "Key": "SERVICE"}])
result = subprocess.run(
    ['aws', 'ce', 'get-cost-and-usage',
     '--time-period', 'Start=2025-12-01,End=2026-01-01',
     '--granularity', 'MONTHLY',
     '--metrics', 'BLENDED_COST',
     '--group-by', group_by_json],
    env=os.environ,
    capture_output=True,
    text=True
)

if result.returncode == 0:
    data = json.loads(result.stdout)
    services = []
    for result_by_time in data.get('ResultsByTime', []):
        for group in result_by_time.get('Groups', []):
            service = group['Keys'][0]
            cost = float(group['Metrics']['BlendedCost']['Amount'])
            services.append((service, cost))
    
    services.sort(key=lambda x: x[1], reverse=True)
    
    # Show top 15 services
    print(f"\n{'Service':<50} {'Cost':>15}")
    print(f"{'-'*65}")
    for service, cost in services[:15]:
        if cost > 0:
            print(f"{service:<50} ${cost:>14,.2f}")
    
    print(f"{'-'*65}")
    print(f"{'Total (all services)':<50} ${sum(c[1] for c in services if c[1] > 0):>14,.2f}")
else:
    print(f"Could not get service breakdown: {result.stderr}")

print(f"\n{'='*80}")

