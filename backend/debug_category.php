<?php
$db = new SQLite3('database/database.sqlite');
$query = <<<'SQL'
SELECT p.id,p.name, p.price, p.sale_price, group_concat(c.slug) as categories
FROM products p
JOIN category_product cp ON cp.product_id = p.id
JOIN categories c ON c.id = cp.category_id
WHERE c.slug = 'flat'
GROUP BY p.id
LIMIT 5;
SQL;
echo "$query\n";
$res = $db->query($query);
while ($row = $res->fetchArray(SQLITE3_ASSOC)) {
    var_export($row);
    echo "\n";
}
