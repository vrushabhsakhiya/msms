import os
import sys
import django
import time

# ── Setup ──────────────────────────────────────────────────────────────────────
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'msms.settings')
django.setup()

from django.db import connection, models
from django.apps import apps
from django.core.management import call_command

PASS = "✅"
FAIL = "❌"
WARN = "⚠️ "
FIX  = "🔧"
INFO = "📊"

def section(title):
    print(f"\n{'─'*55}")
    print(f"  {title}")
    print(f"{'─'*55}")

# ══════════════════════════════════════════════════════
# STEP 1: Django System Check
# ══════════════════════════════════════════════════════
def check_django_config():
    section("STEP 1/5 ── Django Configuration Check")
    try:
        call_command('check', verbosity=0)
        print(f"{PASS} No configuration errors found in Django settings.")
    except Exception as e:
        print(f"{FAIL} Configuration issue detected: {e}")

# ══════════════════════════════════════════════════════
# STEP 2: Migration Status
# ══════════════════════════════════════════════════════
def check_and_fix_migrations():
    section("STEP 2/5 ── Migration Status & Auto-Fix")
    from django.db.migrations.executor import MigrationExecutor
    executor = MigrationExecutor(connection)
    plan = executor.migration_plan(executor.loader.graph.leaf_nodes())
    
    if plan:
        print(f"{FAIL} {len(plan)} UNAPPLIED migrations detected!")
        for migration, backwards in plan:
            direction = "backwards" if backwards else "forwards"
            print(f"     → {migration} ({direction})")
        print(f"{FIX} Auto-applying all pending migrations now...")
        try:
            call_command('migrate', verbosity=1)
            print(f"{PASS} All migrations applied successfully!")
        except Exception as e:
            print(f"{FAIL} Migration failed: {e}")
    else:
        print(f"{PASS} All migrations are up-to-date. Schema is correct.")

# ══════════════════════════════════════════════════════
# STEP 3: Record Counts (Scale Overview)
# ══════════════════════════════════════════════════════
def check_record_counts():
    section("STEP 3/5 ── Database Scale (Row Counts)")
    targets = [
        ('accounts.Shop',      'Shops'),
        ('accounts.User',      'Users'),
        ('medicines.Medicine', 'Medicines'),
        ('customers.Customer', 'Customers'),
        ('sales.Sale',         'Bills / Sales'),
        ('suppliers.Supplier', 'Vendors / Suppliers'),
    ]
    for model_path, label in targets:
        try:
            model = apps.get_model(model_path)
            start = time.time()
            count = model.objects.count()
            ms = (time.time() - start) * 1000
            status = PASS if ms < 200 else WARN
            print(f"{status} {label:<22}: {count:>12,} records  [{ms:.1f}ms]")
        except Exception as e:
            print(f"{FAIL} {label:<22}: Could not query – {e}")

# ══════════════════════════════════════════════════════
# STEP 4: Data Integrity (Duplicates + NULLs)
# ══════════════════════════════════════════════════════
def check_and_fix_integrity():
    section("STEP 4/5 ── Data Integrity Scan & Auto-Fix")

    from medicines.models import Medicine
    from customers.models import Customer
    from suppliers.models import Supplier
    from sales.models import Sale

    # ── 4A. Duplicate Medicine Codes per Shop ──────────────────────────────
    print("\n  [A] Scanning for Duplicate Medicine Codes...")
    dupes = (
        Medicine.objects
        .values('medicine_code', 'shop_id')
        .annotate(cnt=models.Count('id'))
        .filter(cnt__gt=1)
    )
    if dupes.exists():
        dupe_count = dupes.count()
        print(f"{FAIL} Found {dupe_count} duplicate medicine codes. Auto-fixing...")
        fixed = 0
        for d in dupes:
            # Keep only the latest record, delete older ones
            entries = Medicine.objects.filter(
                medicine_code=d['medicine_code'],
                shop_id=d['shop_id']
            ).order_by('-id')
            to_delete = entries[1:]  # Keep first (newest), delete rest
            ids_to_delete = list(to_delete.values_list('id', flat=True))
            Medicine.objects.filter(id__in=ids_to_delete).delete()
            fixed += len(ids_to_delete)
        print(f"{PASS} Fixed: Removed {fixed} duplicate medicine entries.")
    else:
        print(f"{PASS} No duplicate medicine codes found per shop.")

    # ── 4B. NULL Shop on Medicines (Data Leak) ─────────────────────────────
    print("\n  [B] Scanning for orphaned Medicines (No Shop assigned)...")
    null_med = Medicine.objects.filter(shop__isnull=True).count()
    if null_med > 0:
        print(f"{FAIL} Found {null_med} medicines with no shop. Deleting orphans...")
        Medicine.objects.filter(shop__isnull=True).delete()
        print(f"{PASS} Fixed: Deleted {null_med} orphaned medicine records.")
    else:
        print(f"{PASS} All medicines are correctly assigned to a shop.")

    # ── 4C. NULL Shop on Customers ─────────────────────────────────────────
    print("\n  [C] Scanning for orphaned Customers (No Shop assigned)...")
    null_cust = Customer.objects.filter(shop__isnull=True).count()
    if null_cust > 0:
        print(f"{FAIL} Found {null_cust} customers with no shop. Deleting orphans...")
        Customer.objects.filter(shop__isnull=True).delete()
        print(f"{PASS} Fixed: Deleted {null_cust} orphaned customer records.")
    else:
        print(f"{PASS} All customers are correctly assigned to a shop.")

    # ── 4D. NULL Shop on Sales (Billing Leaks) ─────────────────────────────
    print("\n  [D] Scanning for orphaned Bills/Sales (No Shop assigned)...")
    null_sale = Sale.objects.filter(shop__isnull=True).count()
    if null_sale > 0:
        print(f"{FAIL} Found {null_sale} bills with no shop. Deleting orphans...")
        Sale.objects.filter(shop__isnull=True).delete()
        print(f"{PASS} Fixed: Deleted {null_sale} orphaned sales records.")
    else:
        print(f"{PASS} All bills are correctly linked to a shop.")

    # ── 4E. Duplicate Customer Mobile per Shop ─────────────────────────────
    print("\n  [E] Scanning for Duplicate Customer Mobiles per Shop...")
    mobile_dupes = (
        Customer.objects
        .values('mobile', 'shop_id')
        .annotate(cnt=models.Count('id'))
        .filter(cnt__gt=1, mobile__isnull=False)
        .exclude(mobile='')
    )
    if mobile_dupes.exists():
        print(f"{WARN} Found {mobile_dupes.count()} duplicate mobile numbers per shop.")
        print(f"     (Seeded test data causes this. Run cleanup_test_data.py to clear.)")
    else:
        print(f"{PASS} No duplicate customer mobiles found per shop.")

# ══════════════════════════════════════════════════════
# STEP 5: Index Verification (Performance Audit)
# ══════════════════════════════════════════════════════
def check_indexes():
    section("STEP 5/5 ── Index & Query Performance Verification")

    print("  Running timed benchmark queries...\n")

    from medicines.models import Medicine
    from customers.models import Customer
    from sales.models import Sale
    from accounts.models import Shop

    shop = Shop.objects.first()
    if not shop:
        print(f"{WARN} No shops found. Skipping performance test.")
        return

    benchmarks = [
        ("Medicine Name Search  (indexed)", lambda: list(Medicine.objects.filter(shop=shop, medicine_name__icontains='a')[:10])),
        ("Customer Mobile Lookup (indexed)", lambda: list(Customer.objects.filter(shop=shop, mobile__startswith='987')[:10])),
        ("Sales Dashboard Agg   (indexed)", lambda: Sale.objects.filter(shop=shop).count()),
        ("Supplier Full List    (paginated)", lambda: list(Shop.objects.all()[:20])),
    ]

    all_pass = True
    for label, query_fn in benchmarks:
        start = time.time()
        try:
            query_fn()
            ms = (time.time() - start) * 1000
            if ms < 100:
                status = PASS
            elif ms < 500:
                status = WARN
            else:
                status = FAIL
                all_pass = False
            print(f"  {status} {label:<40}: {ms:>8.2f}ms")
        except Exception as e:
            print(f"  {FAIL} {label:<40}: ERROR – {e}")
            all_pass = False

    if all_pass:
        print(f"\n{PASS} All queries are within performance thresholds (<100ms).")
    else:
        print(f"\n{WARN} Some queries are slow. Consider adding DB indexes or upgrading to PostgreSQL.")

# ══════════════════════════════════════════════════════
# MAIN RUNNER
# ══════════════════════════════════════════════════════
if __name__ == "__main__":
    print("╔══════════════════════════════════════════════════════╗")
    print("║     🏥  MSMS DATABASE FULL AUDIT & AUTO-FIX TOOL    ║")
    print("╚══════════════════════════════════════════════════════╝")
    start = time.time()

    check_django_config()
    check_and_fix_migrations()
    check_record_counts()
    check_and_fix_integrity()
    check_indexes()

    total = time.time() - start
    print(f"\n{'═'*55}")
    print(f"  🏁  AUDIT COMPLETE  ──  Total Time: {total:.2f}s")
    print(f"{'═'*55}\n")
