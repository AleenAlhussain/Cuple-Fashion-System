#!/usr/bin/env python3
"""
MySQL to PostgreSQL Migration Script
Migrates all tables and data from MySQL to PostgreSQL
"""

import mysql.connector
import psycopg2
from psycopg2 import sql
import sys
from datetime import datetime, date
from decimal import Decimal

# MySQL connection settings
MYSQL_CONFIG = {
    'host': '127.0.0.1',
    'port': 3306,
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
    'database': 'cuple_shop'
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

def get_table_structure(cursor, table_name):
    cursor.execute(f"DESCRIBE `{table_name}`")
    return cursor.fetchall()

def get_table_create_statement(cursor, table_name):
    cursor.execute(f"SHOW CREATE TABLE `{table_name}`")
    return cursor.fetchone()[1]

def mysql_type_to_postgres(mysql_type, column_name):
    """Convert MySQL type to PostgreSQL type"""
    mysql_type_lower = mysql_type.lower()

    # Handle TINYINT(1) as BOOLEAN
    if 'tinyint(1)' in mysql_type_lower:
        return 'BOOLEAN'

    # Handle UNSIGNED - PostgreSQL doesn't have unsigned, just use larger type
    is_unsigned = 'unsigned' in mysql_type_lower

    # Extract base type and size
    base_type = mysql_type_lower.split('(')[0].split()[0]

    # Handle enum specially
    if base_type == 'enum':
        return 'VARCHAR(255)'

    # Handle decimal/numeric with precision
    if base_type in ('decimal', 'numeric'):
        # Extract precision and scale from type like decimal(10,2)
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

    # Get mapped type
    pg_type = TYPE_MAP.get(base_type, 'TEXT')

    return pg_type

def convert_value(value, pg_type):
    """Convert MySQL value to PostgreSQL compatible value"""
    if value is None:
        return None

    # Handle boolean
    if pg_type == 'BOOLEAN':
        if isinstance(value, (int, bool)):
            return bool(value)
        return value in ('1', 'true', 'True', True, 1)

    # Handle bytes/binary
    if pg_type == 'BYTEA' and isinstance(value, bytes):
        return psycopg2.Binary(value)

    # Handle datetime
    if isinstance(value, datetime):
        return value

    # Handle date
    if isinstance(value, date):
        return value

    # Handle Decimal
    if isinstance(value, Decimal):
        return float(value)

    return value

def create_postgres_table(pg_cursor, table_name, mysql_cursor):
    """Create PostgreSQL table based on MySQL structure"""

    # Get column info
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

    # Build CREATE TABLE statement
    col_defs = []
    primary_keys = []

    for col in columns:
        col_name, col_type, is_nullable, col_default, col_key, extra = col

        # Convert type
        pg_type = mysql_type_to_postgres(col_type, col_name)

        # Handle auto_increment
        if 'auto_increment' in extra.lower():
            if 'bigint' in col_type.lower():
                pg_type = 'BIGSERIAL'
            else:
                pg_type = 'SERIAL'

        # Build column definition
        col_def = f'"{col_name}" {pg_type}'

        # Add NOT NULL
        if is_nullable == 'NO' and 'SERIAL' not in pg_type:
            col_def += ' NOT NULL'

        # Add DEFAULT (skip for SERIAL types)
        if col_default is not None and 'SERIAL' not in pg_type:
            if col_default == 'CURRENT_TIMESTAMP':
                col_def += ' DEFAULT CURRENT_TIMESTAMP'
            elif pg_type == 'BOOLEAN':
                col_def += f" DEFAULT {'TRUE' if col_default == '1' else 'FALSE'}"
            elif pg_type in ('INTEGER', 'BIGINT', 'SMALLINT', 'DECIMAL', 'REAL', 'DOUBLE PRECISION'):
                col_def += f" DEFAULT {col_default}"
            else:
                # Escape single quotes in default value
                escaped_default = col_default.replace("'", "''")
                col_def += f" DEFAULT '{escaped_default}'"

        col_defs.append(col_def)

        # Track primary key
        if col_key == 'PRI':
            primary_keys.append(f'"{col_name}"')

    # Add primary key constraint
    if primary_keys:
        col_defs.append(f'PRIMARY KEY ({", ".join(primary_keys)})')

    # Create table
    create_sql = f'CREATE TABLE "{table_name}" (\n  ' + ',\n  '.join(col_defs) + '\n)'

    try:
        pg_cursor.execute(f'DROP TABLE IF EXISTS "{table_name}" CASCADE')
        pg_cursor.execute(create_sql)
        return True
    except Exception as e:
        print(f"  Error creating table {table_name}: {e}")
        print(f"  SQL: {create_sql[:500]}...")
        return False

def migrate_table_data(mysql_cursor, pg_cursor, pg_conn, table_name):
    """Migrate data from MySQL table to PostgreSQL"""

    # Get column names and types
    mysql_cursor.execute(f"""
        SELECT COLUMN_NAME, COLUMN_TYPE
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = '{MYSQL_CONFIG['database']}' AND TABLE_NAME = '{table_name}'
        ORDER BY ORDINAL_POSITION
    """)
    columns_info = mysql_cursor.fetchall()
    column_names = [col[0] for col in columns_info]
    column_types = {col[0]: mysql_type_to_postgres(col[1], col[0]) for col in columns_info}

    # Get data from MySQL
    mysql_cursor.execute(f"SELECT * FROM `{table_name}`")
    rows = mysql_cursor.fetchall()

    if not rows:
        return 0

    # Prepare INSERT statement
    placeholders = ', '.join(['%s'] * len(column_names))
    columns_quoted = ', '.join([f'"{c}"' for c in column_names])
    insert_sql = f'INSERT INTO "{table_name}" ({columns_quoted}) VALUES ({placeholders})'

    # Insert data in batches
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
            print(f"  Error inserting batch: {e}")
            # Try one by one
            for row in converted_batch:
                try:
                    pg_cursor.execute(insert_sql, row)
                    pg_conn.commit()
                    inserted += 1
                except Exception as e2:
                    pg_conn.rollback()
                    pass

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
                SELECT setval(pg_get_serial_sequence('"{table_name}"', '{column_name}'),
                       COALESCE((SELECT MAX("{column_name}") FROM "{table_name}"), 1))
            """)
            pg_conn.commit()
        except Exception as e:
            pg_conn.rollback()
            pass

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

    # Migrate each table
    results = {}
    print("\n" + "-" * 60)
    print("Migrating tables...")
    print("-" * 60)

    for i, table in enumerate(tables, 1):
        print(f"\n[{i}/{len(tables)}] {table}")

        # Create table in PostgreSQL
        print("  Creating table structure...")
        if not create_postgres_table(pg_cursor, table, mysql_cursor):
            results[table] = {'mysql': 0, 'postgres': 0, 'status': 'FAILED'}
            continue
        pg_conn.commit()

        # Get MySQL row count
        mysql_cursor.execute(f"SELECT COUNT(*) FROM `{table}`")
        mysql_count = mysql_cursor.fetchone()[0]

        # Migrate data
        print(f"  Migrating {mysql_count} rows...")
        pg_count = migrate_table_data(mysql_cursor, pg_cursor, pg_conn, table)

        results[table] = {
            'mysql': mysql_count,
            'postgres': pg_count,
            'status': 'OK' if mysql_count == pg_count else 'PARTIAL'
        }
        print(f"  Done: {pg_count}/{mysql_count} rows")

    # Reset sequences
    print("\nResetting sequences...")
    reset_sequences(pg_cursor, pg_conn)
    pg_conn.commit()

    # Print summary
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

    # Close connections
    mysql_cursor.close()
    mysql_conn.close()
    pg_cursor.close()
    pg_conn.close()

    print("\nMigration complete!")

if __name__ == '__main__':
    main()
