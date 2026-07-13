<?php
$db = new SQLite3('database/database.sqlite');
$res = $db->query('SELECT id, sale_price FROM product_variants WHERE id <= 10');
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    $value = $row['sale_price'];
    $len = $value === null ? 0 : strlen($value);
    echo "id {$row['id']} sale=";
    var_export($value);
    echo " len={$len}\n";
}
