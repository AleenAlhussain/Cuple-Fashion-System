<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query("SELECT id,product_id,price,sale_price FROM product_variants WHERE (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) BETWEEN 100 AND 149 LIMIT 5");
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    echo "var {$row['id']} prod={$row['product_id']} price={$row['price']} sale={$row['sale_price']}\n";
}
