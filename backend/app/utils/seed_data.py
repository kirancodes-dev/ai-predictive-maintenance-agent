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
from app.models.technician import Technician
from app.core.security import hash_password


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
        "description": "CNC milling center — bearing wear pattern detected",
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
        "tags": ["conveyor", "assembly"],
        "description": "Main assembly line conveyor — healthy baseline",
        "install_date": "2023-02-14",
        "next_maintenance_date": "2026-08-01",
    },
]

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
         "min_threshold": 12.0, "max_threshold": 20.0, "critical_min": 8.0, "critical_max": 25.0},
    ],
    "PUMP_03": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 60.0, "max_threshold": 80.0, "critical_min": 50.0, "critical_max": 90.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 0.2, "max_threshold": 2.5, "critical_min": 0.1, "critical_max": 4.5},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 1000.0, "max_threshold": 1500.0, "critical_min": 800.0, "critical_max": 1700.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 8.0, "max_threshold": 18.0, "critical_min": 5.0, "critical_max": 22.0},
    ],
    "CONVEYOR_04": [
        {"name": "Temperature", "type": "temperature", "unit": "°C",
         "min_threshold": 55.0, "max_threshold": 75.0, "critical_min": 45.0, "critical_max": 85.0},
        {"name": "Vibration", "type": "vibration", "unit": "mm/s",
         "min_threshold": 0.1, "max_threshold": 2.0, "critical_min": 0.05, "critical_max": 3.5},
        {"name": "RPM", "type": "rpm", "unit": "RPM",
         "min_threshold": 900.0, "max_threshold": 1200.0, "critical_min": 700.0, "critical_max": 1400.0},
        {"name": "Current", "type": "current", "unit": "A",
         "min_threshold": 5.0, "max_threshold": 12.0, "critical_min": 3.0, "critical_max": 15.0},
    ],
}

TECHNICIANS_DATA = [
    {
        "name": "Arjun Sharma",
        "email": "arjun.sharma@factory.com",
        "phone": "+91-98765-43210",
        "specialty": "CNC & Precision Machining",
        "skills": ["cnc", "bearing-wear", "thermal-runaway", "vibration"],
        "shift_start_hour": 6,
        "shift_end_hour": 18,
        "is_available": True,
    },
    {
        "name": "Priya Nair",
        "email": "priya.nair@factory.com",
        "phone": "+91-87654-32109",
        "specialty": "Fluid Systems & Pumps",
        "skills": ["pump", "cavitation", "conveyor", "pressure"],
        "shift_start_hour": 8,
        "shift_end_hour": 20,
        "is_available": True,
    },
    {
        "name": "Rajesh Kumar",
        "email": "rajesh.kumar@factory.com",
        "phone": "+91-76543-21098",
        "specialty": "Electrical & Motor Systems",
        "skills": ["cnc", "current", "motor", "compressor"],
        "shift_start_hour": 7,
        "shift_end_hour": 19,
        "is_available": True,
    },
    {
        "name": "Sunita Patel",
        "email": "sunita.patel@factory.com",
        "phone": "+91-65432-10987",
        "specialty": "Mechanical & Conveyor Systems",
        "skills": ["conveyor", "assembly", "bearing-wear", "vibration"],
        "shift_start_hour": 6,
        "shift_end_hour": 14,
        "is_available": True,
    },
    {
        "name": "Mohammed Ali",
        "email": "mohammed.ali@factory.com",
        "phone": "+91-54321-09876",
        "specialty": "Night Shift General Maintenance",
        "skills": ["cnc", "pump", "conveyor", "thermal-runaway", "cavitation"],
        "shift_start_hour": 18,
        "shift_end_hour": 6,   # overnight shift
        "is_available": True,
    },
]


async def seed_database(db: AsyncSession) -> None:
    # ── Users ──────────────────────────────────────────────────────────────
    existing_user = await db.execute(select(User).limit(1))
    if not existing_user.scalar_one_or_none():
        users = [
            User(
                name="Admin User",
                email="admin@factory.com",
                hashed_password=hash_password("Admin@123"),
                role="admin",
            ),
            User(
                name="Operator One",
                email="operator@factory.com",
                hashed_password=hash_password("Operator@123"),
                role="operator",
            ),
        ]
        for u in users:
            db.add(u)
        await db.flush()

    # ── Machines & Sensors ──────────────────────────────────────────────────
    existing_machine = await db.execute(select(Machine).limit(1))
    if not existing_machine.scalar_one_or_none():
        for m_data in MACHINES_DATA:
            machine = Machine(
                id=m_data["id"],
                name=m_data["name"],
                model=m_data["model"],
                location=m_data["location"],
                status=m_data["status"],
                risk_score=m_data["risk_score"],
                risk_level=m_data["risk_level"],
                manufacturer=m_data["manufacturer"],
                serial_number=m_data["serial_number"],
                firmware_version=m_data["firmware_version"],
                tags=m_data["tags"],
                description=m_data["description"],
                install_date=m_data["install_date"],
                next_maintenance_date=m_data.get("next_maintenance_date"),
                metadata_={},
            )
            db.add(machine)
            await db.flush()

            # Sensors for this machine
            sensor_templates = SENSOR_TEMPLATES_BY_MACHINE.get(m_data["id"], [])
            for tmpl in sensor_templates:
                sensor = Sensor(
                    machine_id=m_data["id"],
                    name=tmpl["name"],
                    type=tmpl["type"],
                    unit=tmpl["unit"],
                    min_threshold=tmpl["min_threshold"],
                    max_threshold=tmpl["max_threshold"],
                    critical_min=tmpl["critical_min"],
                    critical_max=tmpl["critical_max"],
                )
                db.add(sensor)

    await db.flush()

    # ── Technicians ─────────────────────────────────────────────────────────
    existing_tech = await db.execute(select(Technician).limit(1))
    if not existing_tech.scalar_one_or_none():
        for t_data in TECHNICIANS_DATA:
            tech = Technician(
                name=t_data["name"],
                email=t_data["email"],
                phone=t_data["phone"],
                specialty=t_data["specialty"],
                skills=t_data["skills"],
                shift_start_hour=t_data["shift_start_hour"],
                shift_end_hour=t_data["shift_end_hour"],
                is_available=t_data["is_available"],
            )
            db.add(tech)

    await db.flush()

    # ── Sample Alerts ───────────────────────────────────────────────────────
    existing_alert = await db.execute(select(Alert).limit(1))
    if not existing_alert.scalar_one_or_none():
        alerts = [
            Alert(
                machine_id="PUMP_03",
                machine_name="Industrial Pump 03",
                severity="critical",
                status="active",
                title="Critical vibration anomaly detected",
                message="Vibration sensor reading 4.8 mm/s — exceeds critical threshold. Cavitation suspected.",
            ),
            Alert(
                machine_id="CNC_02",
                machine_name="CNC Lathe 02",
                severity="warning",
                status="active",
                title="Temperature rising above normal range",
                message="Temperature sensor reading 92°C. Thermal runaway pattern active.",
            ),
            Alert(
                machine_id="CNC_01",
                machine_name="CNC Mill 01",
                severity="warning",
                status="active",
                title="Bearing wear vibration signature detected",
                message="Vibration pattern consistent with early-stage bearing wear.",
            ),
        ]
        for a in alerts:
            db.add(a)

    # ── Sample Maintenance Records ──────────────────────────────────────────
    existing_maint = await db.execute(select(MaintenanceRecord).limit(1))
    if not existing_maint.scalar_one_or_none():
        records = [
            MaintenanceRecord(
                machine_id="CNC_01",
                machine_name="CNC Mill 01",
                type="preventive",
                status="scheduled",
                title="Quarterly bearing inspection & lubrication",
                description="Inspect all bearings, replace lubrication, check spindle runout.",
                scheduled_date="2026-05-01",
                assigned_to="Arjun Sharma",
                estimated_duration=180,
            ),
            MaintenanceRecord(
                machine_id="PUMP_03",
                machine_name="Industrial Pump 03",
                type="corrective",
                status="scheduled",
                title="Impeller inspection — cavitation damage",
                description="Inspect impeller for cavitation pitting. Replace if wear > 15%.",
                scheduled_date="2026-04-20",
                assigned_to="Priya Nair",
                estimated_duration=240,
            ),
        ]
        for r in records:
            db.add(r)

    await db.commit()
    print("✅ Database seeded successfully (machines, sensors, technicians, alerts, maintenance)")

    # ── Failure Fingerprints (known failure patterns) ───────────────────────
    await _seed_failure_fingerprints(db)


async def _seed_failure_fingerprints(db: AsyncSession) -> None:
    """Seed known failure fingerprints — sensor snapshots from past failures.

    Each entry is a reading at a specific hours-before-failure offset.
    Together they form trajectories that the fingerprint matcher compares
    against live readings.
    """
    from app.models.failure_fingerprint import FailureFingerprint

    existing = await db.execute(select(FailureFingerprint).limit(1))
    if existing.scalar_one_or_none():
        return  # already seeded

    fingerprints = [
        # ── CNC Bearing-Wear Failure (trajectory: 48h → 24h → 6h → 0h) ──
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #1",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 78.0, "vibration": 2.8, "current": 13.5, "rpm": 1520.0,
            "hours_before_failure": 48.0,
        },
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #1",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 82.0, "vibration": 3.6, "current": 14.8, "rpm": 1480.0,
            "hours_before_failure": 24.0,
        },
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #1",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 88.0, "vibration": 4.5, "current": 16.2, "rpm": 1420.0,
            "hours_before_failure": 6.0,
        },
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #1",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 93.0, "vibration": 5.2, "current": 17.8, "rpm": 1350.0,
            "hours_before_failure": 0.0,
        },

        # ── CNC Thermal-Runaway Failure (trajectory: 24h → 12h → 1h → 0h) ──
        {
            "machine_type": "cnc", "label": "CNC thermal-runaway failure #1",
            "failure_type": "thermal-runaway", "source": "seed",
            "temperature": 86.0, "vibration": 2.2, "current": 18.0, "rpm": 1650.0,
            "hours_before_failure": 24.0,
        },
        {
            "machine_type": "cnc", "label": "CNC thermal-runaway failure #1",
            "failure_type": "thermal-runaway", "source": "seed",
            "temperature": 94.0, "vibration": 2.8, "current": 21.0, "rpm": 1580.0,
            "hours_before_failure": 12.0,
        },
        {
            "machine_type": "cnc", "label": "CNC thermal-runaway failure #1",
            "failure_type": "thermal-runaway", "source": "seed",
            "temperature": 105.0, "vibration": 3.5, "current": 24.0, "rpm": 1500.0,
            "hours_before_failure": 1.0,
        },
        {
            "machine_type": "cnc", "label": "CNC thermal-runaway failure #1",
            "failure_type": "thermal-runaway", "source": "seed",
            "temperature": 112.0, "vibration": 4.0, "current": 26.5, "rpm": 1420.0,
            "hours_before_failure": 0.0,
        },

        # ── Pump Cavitation Failure (trajectory: 72h → 24h → 6h → 0h) ──
        {
            "machine_type": "pump", "label": "Pump cavitation failure #1",
            "failure_type": "cavitation", "source": "seed",
            "temperature": 72.0, "vibration": 2.0, "current": 15.0, "rpm": 1100.0,
            "hours_before_failure": 72.0,
        },
        {
            "machine_type": "pump", "label": "Pump cavitation failure #1",
            "failure_type": "cavitation", "source": "seed",
            "temperature": 78.0, "vibration": 3.2, "current": 17.5, "rpm": 980.0,
            "hours_before_failure": 24.0,
        },
        {
            "machine_type": "pump", "label": "Pump cavitation failure #1",
            "failure_type": "cavitation", "source": "seed",
            "temperature": 84.0, "vibration": 4.2, "current": 20.0, "rpm": 850.0,
            "hours_before_failure": 6.0,
        },
        {
            "machine_type": "pump", "label": "Pump cavitation failure #1",
            "failure_type": "cavitation", "source": "seed",
            "temperature": 90.0, "vibration": 5.0, "current": 22.5, "rpm": 720.0,
            "hours_before_failure": 0.0,
        },

        # ── Conveyor Belt-Slip Failure (trajectory: 48h → 12h → 1h → 0h) ──
        {
            "machine_type": "conveyor", "label": "Conveyor belt-slip failure #1",
            "failure_type": "belt-slip", "source": "seed",
            "temperature": 68.0, "vibration": 1.5, "current": 10.0, "rpm": 1050.0,
            "hours_before_failure": 48.0,
        },
        {
            "machine_type": "conveyor", "label": "Conveyor belt-slip failure #1",
            "failure_type": "belt-slip", "source": "seed",
            "temperature": 74.0, "vibration": 2.5, "current": 12.5, "rpm": 920.0,
            "hours_before_failure": 12.0,
        },
        {
            "machine_type": "conveyor", "label": "Conveyor belt-slip failure #1",
            "failure_type": "belt-slip", "source": "seed",
            "temperature": 80.0, "vibration": 3.2, "current": 14.0, "rpm": 800.0,
            "hours_before_failure": 1.0,
        },
        {
            "machine_type": "conveyor", "label": "Conveyor belt-slip failure #1",
            "failure_type": "belt-slip", "source": "seed",
            "temperature": 85.0, "vibration": 3.8, "current": 15.5, "rpm": 680.0,
            "hours_before_failure": 0.0,
        },

        # ── Second CNC bearing-wear event (different machine, different readings) ──
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #2",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 80.0, "vibration": 3.0, "current": 14.0, "rpm": 1500.0,
            "hours_before_failure": 24.0,
        },
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #2",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 90.0, "vibration": 4.8, "current": 17.0, "rpm": 1380.0,
            "hours_before_failure": 6.0,
        },
        {
            "machine_type": "cnc", "label": "CNC bearing-wear failure #2",
            "failure_type": "bearing-wear", "source": "seed",
            "temperature": 96.0, "vibration": 5.5, "current": 18.5, "rpm": 1300.0,
            "hours_before_failure": 0.0,
        },
    ]

    for fp_data in fingerprints:
        fp = FailureFingerprint(**fp_data)
        db.add(fp)

    await db.commit()
    print(f"✅ Seeded {len(fingerprints)} failure fingerprints (cnc, pump, conveyor)")

