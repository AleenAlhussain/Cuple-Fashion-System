<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id, name, is_active FROM categories WHERE slug = "flat"');
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row);
    echo "\n";
}
