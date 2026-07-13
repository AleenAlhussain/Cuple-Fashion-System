<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id,name,price,sale_price FROM products LIMIT 5');
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    $sale = $row['sale_price'] ?? 0;
    printf("%d %s %.2f %.2f\n", $row['id'], $row['name'], $row['price'], $sale);
}
