<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id,name,price,sale_price,is_active FROM products WHERE id IN (1072,1076)');
while($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row);
    echo "\n";
}
