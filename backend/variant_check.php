<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id,product_id,sku,price,sale_price FROM product_variants WHERE price BETWEEN 100 AND 149 LIMIT 20');
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    printf("var %d prod=%d price=%s sale=%s\n", $row['id'], $row['product_id'], $row['price'], $row['sale_price']);
}
