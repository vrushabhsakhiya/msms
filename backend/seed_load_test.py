import os
import sys
import django
import time
import random

# Setup Django Environment
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'msms.settings')
django.setup()

from accounts.models import Shop, User
from medicines.models import Medicine
from django.db import transaction

def start_load_test():
    print("🚀 Starting Production Level Load Test Seeding...")
    print("🎯 Target: 1,000 Shops, 50,000+ Records")
    
    start_time = time.time()
    
    try:
        with transaction.atomic():
            # 1. Create 1000 Shops
            print(f"--- Creating 1,000 Shops ---")
            shops = []
            for i in range(1, 1001):
                s = Shop(
                    name=f"Test Pharmacy {i}",
                    owner_name=f"Owner {i}",
                    address=f"Location {i}, City, India",
                    contact_number=f"987654{i:04d}",
                    license_number=f"DL-{i:06d}-2026",
                    status='approved'
                )
                shops.append(s)
            
            # Use bulk_create for speed
            Shop.objects.bulk_create(shops)
            # Fetch all created shops to get their IDs
            all_shops = list(Shop.objects.filter(name__startswith="Test Pharmacy"))
            print(f"✅ Created {len(all_shops)} Shops.")

            # 2. Create Admin users for each shop
            print(f"--- Creating 1,000 Admin Users ---")
            users = []
            for i, shop in enumerate(all_shops, 1):
                u = User(
                    username=f"admin_shop_{i}",
                    email=f"admin{i}@testshop.com",
                    shop=shop,
                    role='admin',
                    full_name=f"Manager of {shop.name}"
                )
                # Password hashing is slow, setting it manually or skip hashing for testing
                # For high scale tests, we can skip password hashing by setting password to something unusable or a fixed hash
                u.password = "pbkdf2_sha256$260000$tVvC6yTzZ9Gg$Y2+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ+yQ=" # 'testpass123'
                users.append(u)
            
            User.objects.bulk_create(users)
            print(f"✅ Created {len(users)} Shop Admins.")

            # 3. Create 50 Medicines per shop (50,000 total)
            print(f"--- Creating 50,000 Medicine Records (50 per shop) ---")
            categories = ["Tablet", "Capsule", "Syrup", "Injection", "Cream"]
            
            # Batch process per 5000 to save memory
            for i in range(0, len(all_shops), 100):
                batch_shops = all_shops[i:i+100]
                batch_meds = []
                for shop in batch_shops:
                    for j in range(1, 51):
                        m = Medicine(
                            shop=shop,
                            medicine_name=f"Medicine {j} - {shop.name}",
                            medicine_code=f"CODE-{shop.id}-{j}",
                            generic_name=f"Generic Formula {j}",
                            company="Global Pharma Co",
                            category=random.choice(categories),
                            purchase_price=random.uniform(10, 500),
                            mrp=random.uniform(500, 1000),
                            selling_price=random.uniform(450, 950),
                            stock_quantity=random.randint(5, 500),
                            reorder_level=10,
                            batch_number=f"B-{j:03d}-X"
                        )
                        batch_meds.append(m)
                
                Medicine.objects.bulk_create(batch_meds)
                print(f"--- Progress: {Medicine.objects.count()} total medicines in DB ---")

            print(f"✅ Created {Medicine.objects.count()} total Medicines.")

    except Exception as e:
        print(f"❌ Error during seeding: {e}")
        return

    end_time = time.time()
    duration = end_time - start_time
    print(f"\n✨ SUCCESS: Load system seeded in {duration:.2f} seconds.")
    print(f"📊 Dashboard Check: {Shop.objects.count()} shops ready for scale testing.")

if __name__ == "__main__":
    start_load_test()
