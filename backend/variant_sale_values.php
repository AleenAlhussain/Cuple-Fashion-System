<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query("SELECT DISTINCT sale_price FROM product_variants ORDER BY sale_price LIMIT 20");
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row['sale_price']);
    echo "\n";
}
