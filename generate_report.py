#!/usr/bin/env python3
"""Generate HTML report then open in browser — Cmd+P to save as PDF."""
from datetime import datetime
import os, webbrowser

OUTPUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "PredictiveAI_Architecture_Report.html")
NOW = datetime.now().strftime("%d %B %Y, %H:%M")
print(f"Generating report -> {OUTPUT}")

with open(OUTPUT, "w", encoding="utf-8") as f:
    f.write(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "_report_template.html")).read())

print("Done. Opening in browser...")
webbrowser.open(f"file://{OUTPUT}")
