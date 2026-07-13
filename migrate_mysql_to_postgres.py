#!/usr/bin/env python3
"""
MySQL to PostgreSQL Migration Script
Migrates all tables and data from MySQL to PostgreSQL
"""

import mysql.connector
import psycopg2
import sys
from datetime import datetime, date
from decimal import Decimal

# MySQL connection settings
MYSQL_CONFIG = {
    'host': '127.0.0.1',
    'port': 3307,  # ✅ Your MySQL is on 3307
    'user': 'root',
    'password': '',
    'database': 'cuple_shop'
}

# PostgreSQL connection settings
POSTGRES_CONFIG = {
    'host': '127.0.0.1',
    'port': 5432,
    'user': 'postgres',
    'password': 'password',
    'dbname': 'cuple_shop'  # ✅ psycopg2 prefers dbname
}

# MySQL to PostgreSQL type mapping
TYPE_MAP = {
    'bigint': 'BIGINT',
    'int': 'INTEGER',
    'smallint': 'SMALLINT',
    'tinyint': 'SMALLINT',  # PostgreSQL doesn't have TINYINT
    'mediumint': 'INTEGER',
    'float': 'REAL',
    'double': 'DOUBLE PRECISION',
    'decimal': 'DECIMAL',
    'varchar': 'VARCHAR',
    'char': 'CHAR',
    'text': 'TEXT',
    'mediumtext': 'TEXT',
    'longtext': 'TEXT',
    'tinytext': 'TEXT',
    'blob': 'BYTEA',
    'mediumblob': 'BYTEA',
    'longblob': 'BYTEA',
    'tinyblob': 'BYTEA',
    'datetime': 'TIMESTAMP',
    'timestamp': 'TIMESTAMP',
    'date': 'DATE',
    'time': 'TIME',
    'year': 'INTEGER',
    'enum': 'VARCHAR(255)',
    'set': 'TEXT',
    'json': 'JSONB',
    'binary': 'BYTEA',
    'varbinary': 'BYTEA',
}

def get_mysql_connection():
    return mysql.connector.connect(**MYSQL_CONFIG)

def get_postgres_connection():
    return psycopg2.connect(**POSTGRES_CONFIG)

def get_mysql_tables(cursor):
    cursor.execute("SHOW TABLES")
    return [row[0] for row in cursor.fetchall()]

def mysql_type_to_postgres(mysql_type, column_name):
    """Convert MySQL type to PostgreSQL type"""
    mysql_type_lower = mysql_type.lower()

    # Handle TINYINT(1) as BOOLEAN
    if 'tinyint(1)' in mysql_type_lower:
        return 'BOOLEAN'

    # Extract base type
    base_type = mysql_type_lower.split('(')[0].split()[0]

    # Handle enum
    if base_type == 'enum':
        return 'VARCHAR(255)'

    # Handle decimal/numeric with precision
    if base_type in ('decimal', 'numeric'):
        if '(' in mysql_type_lower:
            return mysql_type_lower.replace('unsigned', '').strip().upper()
        return 'DECIMAL'

    # Handle varchar/char with length
    if base_type in ('varchar', 'char'):
        if '(' in mysql_type:
            length = mysql_type.split('(')[1].split(')')[0]
            return f"{base_type.upper()}({length})"
        return base_type.upper()

    # Handle int types
    if base_type == 'bigint':
        return 'BIGINT'
    if base_type in ('int', 'integer', 'mediumint'):
        return 'INTEGER'
    if base_type in ('smallint', 'tinyint'):
        return 'SMALLINT'

    return TYPE_MAP.get(base_type, 'TEXT')

def convert_value(value, pg_type):
    """Convert MySQL value to PostgreSQL compatible value"""
    if value is None:
        return None

    # Boolean conversion
    if pg_type == 'BOOLEAN':
        if isinstance(value, (int, bool)):
            return bool(value)
        return value in ('1', 'true', 'True', True, 1)

    # Binary conversion
    if pg_type == 'BYTEA' and isinstance(value, bytes):
        return psycopg2.Binary(value)

    # Datetime/date
    if isinstance(value, (datetime, date)):
        return value

    # Decimal to float
    if isinstance(value, Decimal):
        return float(value)

    return value

def create_postgres_table(pg_cursor, table_name, mysql_cursor):
    """Create PostgreSQL table based on MySQL structure"""

    mysql_cursor.execute(f"""
        SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT, COLUMN_KEY, EXTRA
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '{MYSQL_CONFIG['database']}' AND TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
    """)
    columns = mysql_cursor.fetchall()

    if not columns:
        print(f"  Warning: No columns found for table {table_name}")
        return False

    col_defs = []
    primary_keys = []

    for col in columns:
        col_name, col_type, is_nullable, col_default, col_key, extra = col

        pg_type = mysql_type_to_postgres(col_type, col_name)

        # auto_increment -> SERIAL/BIGSERIAL
        if extra and 'auto_increment' in str(extra).lower():
            if 'bigint' in str(col_type).lower():
                pg_type = 'BIGSERIAL'
            else:
                pg_type = 'SERIAL'

        col_def = f'"{col_name}" {pg_type}'

        if is_nullable == 'NO' and 'SERIAL' not in pg_type:
            col_def += ' NOT NULL'

        # ✅ safer DEFAULT handling (avoid invalid postgres defaults)
        # ✅ FIX DEFAULTS: treat NULL correctly + fix current_timestamp()
        if col_default is not None and 'SERIAL' not in pg_type:
            default_str = str(col_default).strip()

            # MySQL sometimes returns default as literal "NULL"
            if default_str.upper() == 'NULL':
                # In PostgreSQL, DEFAULT NULL is the same as no DEFAULT, so skip it
                pass

            # Fix CURRENT_TIMESTAMP and current_timestamp()
            elif default_str.upper() in ('CURRENT_TIMESTAMP', 'CURRENT_TIMESTAMP()'):
                col_def += ' DEFAULT CURRENT_TIMESTAMP'

            # Boolean defaults
            elif pg_type == 'BOOLEAN':
                col_def += f" DEFAULT {'TRUE' if default_str in ('1', 'true', 'TRUE') else 'FALSE'}"

            # Numeric defaults (no quotes)
            elif pg_type in ('INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'REAL', 'DOUBLE PRECISION'):
                col_def += f" DEFAULT {default_str}"

            # Everything else -> quoted string
            else:
                escaped_default = default_str.replace("'", "''")
                col_def += f" DEFAULT '{escaped_default}'"


        col_defs.append(col_def)

        if col_key == 'PRI':
            primary_keys.append(f'"{col_name}"')

    if primary_keys:
        col_defs.append(f'PRIMARY KEY ({", ".join(primary_keys)})')

    create_sql = f'CREATE TABLE "{table_name}" (\n  ' + ',\n  '.join(col_defs) + '\n)'

    try:
        pg_cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        pg_cursor.execute(create_sql)
        return True
    except Exception as e:
        print(f"\n  ❌ Error creating table: {table_name}")
        print(f"  Reason: {e}")
        print("  --- FULL SQL ---")
        print(create_sql)
        print("  --- END SQL ---\n")
        return False


  

def migrate_table_data(mysql_cursor, pg_cursor, pg_conn, table_name):
    """Migrate data from MySQL table to PostgreSQL"""

    mysql_cursor.execute(f"""
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '{MYSQL_CONFIG['database']}' AND TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
    """)
    columns_info = mysql_cursor.fetchall()
    column_names = [col[0] for col in columns_info]
    column_types = {col[0]: mysql_type_to_postgres(col[1], col[0]) for col in columns_info}

    mysql_cursor.execute(f"SELECT * FROM `{table_name}`")
    rows = mysql_cursor.fetchall()

    if not rows:
        return 0

    placeholders = ', '.join(['%s'] * len(column_names))
    columns_quoted = ', '.join([f'"{c}"' for c in column_names])
    insert_sql = f'INSERT INTO "{table_name}" ({columns_quoted}) VALUES ({placeholders})'

    batch_size = 1000
    inserted = 0

    for i in range(0, len(rows), batch_size):
        batch = rows[i:i + batch_size]
        converted_batch = []

        for row in batch:
            converted_row = []
            for j, value in enumerate(row):
                col_name = column_names[j]
                pg_type = column_types.get(col_name, 'TEXT')
                converted_row.append(convert_value(value, pg_type))
            converted_batch.append(tuple(converted_row))

        try:
            pg_cursor.executemany(insert_sql, converted_batch)
            pg_conn.commit()
            inserted += len(batch)
        except Exception as e:
            pg_conn.rollback()
            print(f"  Error inserting batch into {table_name}: {e}")
            # Try one by one
            for row in converted_batch:
                try:
                    pg_cursor.execute(insert_sql, row)
                    pg_conn.commit()
                    inserted += 1
                except Exception:
                    pg_conn.rollback()
                    # skip row

    return inserted

def reset_sequences(pg_cursor, pg_conn):
    """Reset all sequences to match max id values"""
    pg_cursor.execute("""
        SELECT table_name, column_name
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_default LIKE 'nextval%'
    """)

    for table_name, column_name in pg_cursor.fetchall():
        try:
            pg_cursor.execute(f"""
                SELECT setval(
                    pg_get_serial_sequence('"{table_name}"', '{column_name}'),
                    COALESCE((SELECT MAX("{column_name}") FROM "{table_name}"), 1)
                )
            """)
            pg_conn.commit()
        except Exception:
            pg_conn.rollback()

def main():
    print("=" * 60)
    print("MySQL to PostgreSQL Migration")
    print("=" * 60)

    # Connect to MySQL
    print("\nConnecting to MySQL...")
    try:
        mysql_conn = get_mysql_connection()
        mysql_cursor = mysql_conn.cursor()
        print("  Connected to MySQL")
    except Exception as e:
        print(f"  Error connecting to MySQL: {e}")
        sys.exit(1)

    # Connect to PostgreSQL
    print("\nConnecting to PostgreSQL...")
    try:
        pg_conn = get_postgres_connection()
        pg_cursor = pg_conn.cursor()
        print("  Connected to PostgreSQL")
    except Exception as e:
        print(f"  Error connecting to PostgreSQL: {e}")
        sys.exit(1)

    # Get list of tables
    tables = get_mysql_tables(mysql_cursor)
    print(f"\nFound {len(tables)} tables to migrate")

    results = {}
    print("\n" + "-" * 60)
    print("Migrating tables...")
    print("-" * 60)

    for i, table in enumerate(tables, 1):
        print(f"\n[{i}/{len(tables)}] {table}")

        print("  Creating table structure...")
        if not create_postgres_table(pg_cursor, table, mysql_cursor):
            results[table] = {'mysql': 0, 'postgres': 0, 'status': 'FAILED'}
            # ✅ IMPORTANT: rollback so next tables can continue
            try:
                pg_conn.rollback()
            except Exception:
                pass
            continue

        pg_conn.commit()

        # Get MySQL row count
        mysql_cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
        mysql_count = mysql_cursor.fetchone()[0]

        print(f"  Migrating {mysql_count} rows...")
        pg_count = migrate_table_data(mysql_cursor, pg_cursor, pg_conn, table)

        results[table] = {
            'mysql': mysql_count,
            'postgres': pg_count,
            'status': 'OK' if mysql_count == pg_count else 'PARTIAL'
        }
        print(f"  Done: {pg_count}/{mysql_count} rows")

    print("\nResetting sequences...")
    # ✅ FIX: if any previous statement aborted the transaction, clear it
    try:
        pg_conn.rollback()
    except Exception:
        pass

    reset_sequences(pg_cursor, pg_conn)
    try:
        pg_conn.commit()
    except Exception:
        pg_conn.rollback()

    print("\n" + "=" * 60)
    print("MIGRATION SUMMARY")
    print("=" * 60)
    print(f"\n{'Table':<45} {'MySQL':>8} {'PgSQL':>8} {'Status':>8}")
    print("-" * 75)

    total_mysql = 0
    total_postgres = 0
    for table, data in sorted(results.items()):
        total_mysql += data['mysql']
        total_postgres += data['postgres']
        status_color = '✓' if data['status'] == 'OK' else '✗' if data['status'] == 'FAILED' else '~'
        print(f"{table:<45} {data['mysql']:>8} {data['postgres']:>8} {status_color:>8}")

    print("-" * 75)
    print(f"{'TOTAL':<45} {total_mysql:>8} {total_postgres:>8}")
    print(f"\nTables migrated: {len(results)}")
    print(f"Successful: {sum(1 for r in results.values() if r['status'] == 'OK')}")
    print(f"Partial: {sum(1 for r in results.values() if r['status'] == 'PARTIAL')}")
    print(f"Failed: {sum(1 for r in results.values() if r['status'] == 'FAILED')}")

    mysql_cursor.close()
    mysql_conn.close()
    pg_cursor.close()
    pg_conn.close()

    print("\nMigration complete!")

if __name__ == '__main__':
    main()
