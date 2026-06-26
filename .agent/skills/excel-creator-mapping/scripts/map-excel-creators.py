import os
import sys
import secrets
import argparse
import json
import pandas as pd
import psycopg2
from psycopg2.extras import RealDictCursor

def parse_env(env_path):
    config = {}
    if not os.path.exists(env_path):
        return config
    with open(env_path, 'r') as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith('#'):
                continue
            if '=' in line:
                key, val = line.split('=', 1)
                config[key.strip()] = val.strip()
    return config

def generate_nanoid():
    alphabet = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    return "".join(secrets.choice(alphabet) for _ in range(21))

# Static override dictionary for specific Excel names
NAME_OVERRIDES = {
    'draft': 'drafter',
    'eclair': 'eclairs',
    'ming': 'มิ้ง',
    'reindear': 'reandear',
    'ticha': 'ticha - fah',
    'tontoey': 'toey'
}

def is_creator_snapshot_missing(comp_type, agreed_rate, comm_rate):
    if not comp_type:
        return True
    if comp_type in ('FIXED', 'HYBRID') and agreed_rate is None:
        return True
    if comp_type in ('COMMISSION', 'HYBRID') and comm_rate is None:
        return True
    return False

def main():
    parser = argparse.ArgumentParser(description="Map creators to shows from Excel into DB")
    parser.add_argument('--dry-run', action='store_true', help="Print actions without modifying database")
    parser.add_argument('--prod', action='store_true', help="Run against production database (PROD_DATABASE_URL)")
    args = parser.parse_args()

    # 1. Parse DB config
    env_path = 'apps/erify_api/.env'
    env_config = parse_env(env_path)
    
    if args.prod:
        db_url = env_config.get('PROD_DATABASE_URL')
        db_label = "PRODUCTION"
    else:
        db_url = env_config.get('DATABASE_URL')
        db_label = "LOCAL"

    if not db_url:
        print(f"Error: Database URL not found in {env_path} for label: {db_label}")
        sys.exit(1)

    print(f"Connecting to {db_label} database...")
    conn = psycopg2.connect(db_url)
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # 2. Fetch all active shows (by external_id, name, and uid) and get studio_id
    print("Fetching active shows from database...")
    cur.execute("SELECT id, uid, external_id, name, studio_id FROM shows WHERE deleted_at IS NULL")
    db_shows = cur.fetchall()
    
    show_map = {}
    for s in db_shows:
        if s['external_id']:
            show_map[s['external_id'].strip().lower()] = s
        if s['name']:
            show_map[s['name'].strip().lower()] = s
        if s['uid']:
            show_map[s['uid'].strip().lower()] = s

    # 3. Fetch all active creators
    print("Fetching active creators from database...")
    cur.execute("SELECT id, uid, name, alias_name, default_rate, default_rate_type, default_commission_rate FROM creators WHERE deleted_at IS NULL")
    db_creators = cur.fetchall()

    creator_map = {}
    for c in db_creators:
        if c['alias_name']:
            creator_map[c['alias_name'].strip().lower()] = c
        if c['name']:
            creator_map[c['name'].strip().lower()] = c

    # 4. Fetch all studio_creators defaults
    print("Fetching studio creator roster defaults...")
    cur.execute("SELECT studio_id, mc_id, default_rate, default_rate_type, default_commission_rate FROM studio_creators WHERE deleted_at IS NULL")
    studio_creators = cur.fetchall()
    studio_creator_defaults = {}
    for sc in studio_creators:
        studio_creator_defaults[(sc['studio_id'], sc['mc_id'])] = sc

    # 5. Fetch existing mappings
    print("Fetching existing show-creator assignments...")
    cur.execute("SELECT id, show_id, mc_id, deleted_at, compensation_type, agreed_rate, commission_rate, metadata FROM show_creators")
    existing_mappings = cur.fetchall()
    mapping_map = {}
    for m in existing_mappings:
        mapping_map[(m['show_id'], m['mc_id'])] = m

    # 6. Read Excel
    excel_file = 'schedule_may_erify.xlsx'
    print(f"Reading spreadsheet: {excel_file}...")
    df = pd.read_excel(excel_file)

    # Stats counters
    total_rows = len(df)
    missing_shows = set()
    missing_creators = set()
    skipped_tests = 0
    
    actions_to_take = [] # list of dicts

    print("Analyzing spreadsheet mappings...")
    for idx, row in df.iterrows():
        show_id_val = row.get('UID / Show ID')
        if pd.isna(show_id_val):
            continue
        
        show_id_str = str(show_id_val).strip()
        show_key = show_id_str.lower()
        
        show_record = show_map.get(show_key)
        if not show_record:
            missing_shows.add(show_id_str)
            continue

        # Extract MC names
        mc_cols = ['MC 1', 'MC 2', 'MC 3']
        for col in mc_cols:
            mc_val = row.get(col)
            if pd.isna(mc_val):
                continue
            
            mc_name = str(mc_val).strip()
            mc_lower = mc_name.lower()

            if mc_lower == 'test live':
                skipped_tests += 1
                continue

            # Apply overrides if matching
            matched_name = NAME_OVERRIDES.get(mc_lower, mc_lower)
            creator_record = creator_map.get(matched_name)

            if not creator_record:
                missing_creators.add(mc_name)
                continue

            show_db_id = show_record['id']
            creator_db_id = creator_record['id']
            studio_db_id = show_record['studio_id']

            # Resolve defaults: roster default first, then creator default, else null
            roster_defaults = studio_creator_defaults.get((studio_db_id, creator_db_id))
            if roster_defaults:
                resolved_rate = roster_defaults['default_rate']
                resolved_type = roster_defaults['default_rate_type']
                resolved_comm = roster_defaults['default_commission_rate']
            else:
                resolved_rate = creator_record['default_rate']
                resolved_type = creator_record['default_rate_type']
                resolved_comm = creator_record['default_commission_rate']

            is_missing = is_creator_snapshot_missing(resolved_type, resolved_rate, resolved_comm)

            existing = mapping_map.get((show_db_id, creator_db_id))
            if existing:
                needs_update = False
                
                # Check if values or metadata flag mismatch
                existing_meta = existing['metadata'] or {}
                if isinstance(existing_meta, str):
                    try:
                        existing_meta = json.loads(existing_meta)
                    except:
                        existing_meta = {}
                
                existing_flags = existing_meta.get('flags', {})
                existing_missing_flag = existing_flags.get('agreement_snapshot_missing')

                if (
                    existing['compensation_type'] != resolved_type or
                    existing['agreed_rate'] != resolved_rate or
                    existing['commission_rate'] != resolved_comm or
                    existing_missing_flag != is_missing or
                    existing['deleted_at'] is not None
                ):
                    needs_update = True

                if needs_update:
                    actions_to_take.append({
                        'action': 'update',
                        'show': show_record,
                        'creator': creator_record,
                        'existing_id': existing['id'],
                        'compensation_type': resolved_type,
                        'agreed_rate': resolved_rate,
                        'commission_rate': resolved_comm,
                        'is_missing': is_missing,
                        'existing_deleted': existing['deleted_at'] is not None
                    })
                else:
                    actions_to_take.append({
                        'action': 'skip',
                        'show': show_record,
                        'creator': creator_record
                    })
            else:
                actions_to_take.append({
                    'action': 'insert',
                    'show': show_record,
                    'creator': creator_record,
                    'compensation_type': resolved_type,
                    'agreed_rate': resolved_rate,
                    'commission_rate': resolved_comm,
                    'is_missing': is_missing
                })

    # Summary of plan
    inserts = [a for a in actions_to_take if a['action'] == 'insert']
    updates = [a for a in actions_to_take if a['action'] == 'update']
    skips = [a for a in actions_to_take if a['action'] == 'skip']

    print(f"\n--- Summary of Analysis ({db_label} DB) ---")
    print(f"Total spreadsheet rows checked: {total_rows}")
    print(f"Skipped 'Test live' mappings: {skipped_tests}")
    print(f"Unmatched Shows in Excel: {len(missing_shows)} -> {sorted(list(missing_shows))}")
    print(f"Unmatched Creators in Excel: {len(missing_creators)} -> {sorted(list(missing_creators))}")
    print(f"Already active & correct mappings (Skipping): {len(skips)}")
    print(f"Mappings to update/restore: {len(updates)}")
    print(f"New mappings to insert: {len(inserts)}")

    if args.dry_run:
        print(f"\n[Dry-run] No changes committed to the {db_label} database.")
        cur.close()
        conn.close()
        return

    # Execute changes
    print(f"\nExecuting {db_label} database updates...")
    db_updates = 0
    db_inserts = 0

    try:
        for action in actions_to_take:
            metadata_dict = {"flags": {"agreement_snapshot_missing": action['is_missing']}}
            metadata_json = json.dumps(metadata_dict)

            if action['action'] == 'update':
                cur.execute(
                    """
                    UPDATE show_creators 
                    SET deleted_at = NULL, 
                        compensation_type = %s, 
                        agreed_rate = %s, 
                        commission_rate = %s, 
                        metadata = %s, 
                        updated_at = NOW() 
                    WHERE id = %s
                    """,
                    (
                        action['compensation_type'],
                        action['agreed_rate'],
                        action['commission_rate'],
                        metadata_json,
                        action['existing_id']
                    )
                )
                db_updates += 1
            elif action['action'] == 'insert':
                uid = f"show_mc_{generate_nanoid()}"
                cur.execute(
                    """
                    INSERT INTO show_creators (uid, show_id, mc_id, compensation_type, agreed_rate, commission_rate, metadata, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
                    """,
                    (
                        uid,
                        action['show']['id'],
                        action['creator']['id'],
                        action['compensation_type'],
                        action['agreed_rate'],
                        action['commission_rate'],
                        metadata_json
                    )
                )
                db_inserts += 1
        
        conn.commit()
        print(f"Successfully updated/restored {db_updates} records and inserted {db_inserts} new records in {db_label} DB.")
    except Exception as e:
        conn.rollback()
        print(f"Error executing updates: {e}")
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    main()
