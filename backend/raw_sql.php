<?php
$db = new SQLite3('database/database.sqlite');
$query = "select count(*) as aggregate from \"products\" where \"is_active\" = 1 and exists (select * from \"categories\" inner join \"category_product\" on \"categories\".\"id\" = \"category_product\".\"category_id\" where \"products\".\"id\" = \"category_product\".\"product_id\" and (\"categories\".\"id\" = 1 or \"categories\".\"slug\" = 'flat')) and (((COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= 100 and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= 149) or exists (select * from \"product_variants\" where \"products\".\"id\" = \"product_variants\".\"product_id\" and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= 100 and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= 149)) and \"products\".\"deleted_at\" is null";
$res = $db->query($query);
$row = $res->fetchArray(SQLITE3_ASSOC);
var_export($row);

$query2 = "select * from \"products\" where \"is_active\" = 1 and exists (select * from \"categories\" inner join \"category_product\" on \"categories\".\"id\" = \"category_product\".\"category_id\" where \"products\".\"id\" = \"category_product\".\"product_id\" and (\"categories\".\"id\" = 1 or \"categories\".\"slug\" = 'flat')) and (((COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= 100 and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= 149) or exists (select * from \"product_variants\" where \"products\".\"id\" = \"product_variants\".\"product_id\" and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) >= 100 and (COALESCE(NULLIF(NULLIF(sale_price, ''), 0), price)) <= 149)) and \"products\".\"deleted_at\" is null limit 5";
$res2 = $db->query($query2);
while ($row2 = $res2->fetchArray(SQLITE3_ASSOC)) {
    var_export($row2);
    echo "\n";
}
