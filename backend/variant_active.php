<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id, product_id, price, sale_price, is_active FROM product_variants WHERE product_id IN (1072, 1076, 1186)');
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row);
    echo "\n";
}
