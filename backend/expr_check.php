<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query("SELECT id, sale_price, price,
    (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) AS effective_price
    FROM product_variants LIMIT 5");
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    printf("var %d sale='%s' price=%s nice=%s\n", $row['id'], $row['sale_price'], $row['price'], $row['effective_price']);
}
