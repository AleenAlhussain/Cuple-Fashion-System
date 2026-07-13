<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query("SELECT id, name, price, sale_price, (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) AS effective_price FROM products WHERE (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) BETWEEN 100 AND 149 AND is_active = 1 LIMIT 5");
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row);
    echo "\n";
}
