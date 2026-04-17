import uuid
from datetime import datetime, timedelta
import random
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.machine import Machine
from app.models.alert import Alert
from app.models.maintenance import MaintenanceRecord
from app.models.sensor import Sensor
from app.core.security import hash_password


# Machine IDs match simulation server exactly
MACHINES_DATA = [
    {
        "id": "CNC_01",
        "name": "CNC Mill 01",
        "model": "Fanuc 30iB",
        "location": "Factory Floor 1",
        "status": "warning",
        "risk_score": 42.0,
        "risk_level": "medium",
        "manufacturer": "Fanuc",
        "serial_number": "FNC-2021-001",
        "firmware_version": "3.2.1",
        "tags": ["cnc", "floor1", "bearing-wear"],
        "description": "CNC milling center — bearing wear pattern detected in simulation",
        "install_date": "2021-03-15",
        "next_maintenance_date": "2026-05-01",
    },
    {
        "id": "CNC_02",
        "name": "CNC Lathe 02",
        "model": "Mazak Quick Turn 250",
        "location": "Factory Floor 1",
        "status": "warning",
        "risk_score": 65.0,
        "risk_level": "high",
        "manufacturer": "Mazak",
        "serial_number": "MZK-2020-042",
        "firmware_version": "2.1.0",
        "tags": ["cnc", "floor1", "thermal-runaway"],
        "description": "CNC lathe — afternoon thermal runaway pattern",
        "install_date": "2020-07-20",
        "next_maintenance_date": "2026-04-25",
    },
    {
        "id": "PUMP_03",
        "name": "Industrial Pump 03",
        "model": "Grundfos CR 45",
        "location": "Utility Room",
        "status": "critical",
        "risk_score": 78.0,
        "risk_level": "critical",
        "manufacturer": "Grundfos",
        "serial_number": "GRF-2019-077",
        "firmware_version": "1.5.2",
        "tags": ["pump", "utility", "cavitation"],
        "description": "Industrial pump — cavitation/clog pattern, RPM dropping",
        "install_date": "2019-11-05",
        "next_maintenance_date": "2026-04-20",
    },
    {
        "id": "CONVEYOR_04",
        "name": "Conveyor Belt 04",
        "model": "Dorner 2200",
        "location": "Assembly Line",
        "status": "online",
        "risk_score": 8.0,
        "risk_level": "low",
        "manufacturer": "Dorner",
        "serial_number": "DOR-2023-005",
        "firmware_version": "8.6.2",
        "tags": ["conveyor", "assembly", "healthy"],
        "description": "Main assembly line conveyor — healthy baseline",
        "install_date": "2023-02-14",
        "next_maintenance_date": "2026-08-01",
    },
]

# Sensors match simulation server's output fields per machine
SENSOR_TEMPLATES_BY_MACHINE = {
    "CNC_01": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 70.0, "max_threshold": 85.0, "critical_min": 60.0, "critical_max": 95.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 0.5, "max_threshold": 3.5, "critical_min": 0.1, "critical_max": 5.0},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 1400.0, "max_threshold": 1600.0, "critical_min": 1200.0, "critical_max": 1800.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 10.0, "max_threshold": 15.0, "critical_min": 8.0, "critical_max": 18.0},
    ],
    "CNC_02": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 68.0, "max_threshold": 85.0, "critical_min": 58.0, "critical_max": 100.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 0.5, "max_threshold": 3.2, "critical_min": 0.1, "critical_max": 5.0},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 1600.0, "max_threshold": 1900.0, "critical_min": 1400.0, "critical_max": 2100.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 11.0, "max_threshold": 17.0, "critical_min": 9.0, "critical_max": 20.0},
    ],
    "PUMP_03": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 60.0, "max_threshold": 78.0, "critical_min": 50.0, "critical_max": 90.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 1.0, "max_threshold": 4.5, "critical_min": 0.5, "critical_max": 6.0},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 1200.0, "max_threshold": 1500.0, "critical_min": 1000.0, "critical_max": 1700.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 15.0, "max_threshold": 21.0, "critical_min": 12.0, "critical_max": 25.0},
    ],
    "CONVEYOR_04": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 48.0, "max_threshold": 62.0, "critical_min": 40.0, "critical_max": 70.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 1.0, "max_threshold": 3.5, "critical_min": 0.5, "critical_max": 5.0},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 1100.0, "max_threshold": 1300.0, "critical_min": 900.0, "critical_max": 1500.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 8.0, "max_threshold": 12.0, "critical_min": 6.0, "critical_max": 15.0},
    ],
}

ALERT_TEMPLATES = [
    {"severity": "critical", "title": "Critical temperature spike", "message": "Temperature exceeded critical threshold"},
    {"severity": "warning", "title": "High vibration detected", "message": "Vibration level approaching warning threshold"},
    {"severity": "warning", "title": "Bearing wear indicator", "message": "Vibration pattern suggests early bearing wear"},
    {"severity": "critical", "title": "Thermal runaway risk", "message": "Temperature spiking during afternoon shift"},
    {"severity": "error", "title": "RPM drop detected", "message": "Pump RPM dropping — possible clog forming"},
    {"severity": "info", "title": "Scheduled maintenance due", "message": "Machine is due for quarterly maintenance inspection"},
]


async def seed_database(db: AsyncSession):
    existing = await db.execute(select(User).limit(1))
    if existing.scalar_one_or_none():
        return

    users = [
        User(id=str(uuid.uuid4()), name="Admin User", email="admin@predictive.io",
             hashed_password=hash_password("admin123"), role="admin"),
        User(id=str(uuid.uuid4()), name="John Operator", email="operator@predictive.io",
             hashed_password=hash_password("operator123"), role="operator"),
        User(id=str(uuid.uuid4()), name="Jane Engineer", email="engineer@predictive.io",
             hashed_password=hash_password("engineer123"), role="engineer"),
    ]
    db.add_all(users)

    machine_records = []
    for m_data in MACHINES_DATA:
        machine = Machine(
            id=m_data["id"],
            name=m_data["name"],
            model=m_data["model"],
            location=m_data["location"],
            status=m_data["status"],
            risk_score=m_data["risk_score"],
            risk_level=m_data["risk_level"],
            last_seen=datetime.utcnow() - timedelta(minutes=random.randint(0, 5)),
            install_date=m_data["install_date"],
            next_maintenance_date=m_data.get("next_maintenance_date"),
            tags=m_data["tags"],
            metadata_={"plant": "Plant A", "pattern": m_data["tags"][-1]},
            description=m_data["description"],
            manufacturer=m_data["manufacturer"],
            serial_number=m_data["serial_number"],
            firmware_version=m_data["firmware_version"],
        )
        db.add(machine)
        machine_records.append(machine)

        for tmpl in SENSOR_TEMPLATES_BY_MACHINE[m_data["id"]]:
            sensor = Sensor(
                id=f"{m_data['id']}_{tmpl['type']}",
                machine_id=m_data["id"],
                name=f"{tmpl['name']} — {m_data['name']}",
                type=tmpl["type"],
                unit=tmpl["unit"],
                min_threshold=tmpl["min_threshold"],
                max_threshold=tmpl["max_threshold"],
                critical_min=tmpl["critical_min"],
                critical_max=tmpl["critical_max"],
                is_active=True,
            )
            db.add(sensor)

    await db.flush()

    for machine in machine_records:
        num_alerts = random.randint(1, 3)
        for _ in range(num_alerts):
            tmpl = random.choice(ALERT_TEMPLATES)
            status = random.choice(["active", "acknowledged", "resolved"])
            ts = datetime.utcnow() - timedelta(hours=random.randint(1, 48))
            alert = Alert(
                id=str(uuid.uuid4()),
                machine_id=machine.id,
                machine_name=machine.name,
                severity=tmpl["severity"],
                status=status,
                title=tmpl["title"],
                message=tmpl["message"],
                timestamp=ts,
                acknowledged_at=ts + timedelta(minutes=15) if status in ("acknowledged", "resolved") else None,
                resolved_at=ts + timedelta(hours=2) if status == "resolved" else None,
                acknowledged_by="John Operator" if status in ("acknowledged", "resolved") else None,
                value=round(random.uniform(50.0, 120.0), 2),
            )
            db.add(alert)

    maint_types = ["preventive", "corrective", "predictive", "inspection"]
    maint_statuses = ["scheduled", "in-progress", "completed", "cancelled"]
    for machine in machine_records:
        for k in range(random.randint(2, 4)):
            days_offset = random.randint(-30, 60)
            record = MaintenanceRecord(
                id=str(uuid.uuid4()),
                machine_id=machine.id,
                machine_name=machine.name,
                type=random.choice(maint_types),
                status=random.choice(maint_statuses),
                title=f"{'Quarterly' if k == 0 else 'Scheduled'} Maintenance — {machine.name}",
                description="Routine maintenance: lubrication, alignment, and parts inspection.",
                scheduled_date=(datetime.utcnow() + timedelta(days=days_offset)).strftime("%Y-%m-%d"),
                assigned_to=random.choice(["John Operator", "Jane Engineer", None]),
                estimated_duration=random.choice([60, 120, 240]),
                cost=round(random.uniform(200.0, 2000.0), 2),
                parts_replaced=["Filter", "Lubricant"] if k % 2 == 0 else [],
            )
            db.add(record)

    await db.commit()
    print("✅ Database seeded — 4 machines matching simulation server")
