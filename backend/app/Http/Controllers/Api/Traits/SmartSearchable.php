<?php

namespace App\Http\Controllers\Api\Traits;

use Illuminate\Database\Eloquent\Builder;

trait SmartSearchable
{
    protected function normalizeUaePhoneCandidate(string $value): ?string
    {
        $value = trim($value);
        if ($value === '') {
            return null;
        }

        if (preg_match('/^[\d\+\-\s\(\)]+$/', $value) !== 1) {
            return null;
        }

        $digits = preg_replace('/\D+/', '', $value);
        if ($digits === '') {
            return null;
        }

        if (str_starts_with($digits, '971')) {
            $digits = substr($digits, 3);
        }

        if (str_starts_with($digits, '0')) {
            $digits = substr($digits, 1);
        }

        if (preg_match('/^5\d{8}$/', $digits) === 1) {
            return $digits;
        }

        return null;
    }

    protected function applySmartSearch(
        Builder $query,
        ?string $search,
        array $columns = [],
        array $relations = [],
        array $options = []
    ): Builder {
        $search = trim((string) $search);
        if ($search === '') {
            return $query;
        }

        $tokens = preg_split('/\s+/', $search) ?: [];
        $tokens = array_values(array_filter($tokens, fn ($token) => $token !== ''));
        if (empty($tokens)) {
            return $query;
        }

        $numericColumns = $options['numeric_columns'] ?? [];
        $phoneColumns = $options['phone_columns'] ?? [];
        $phoneRelations = $options['phone_relations'] ?? [];

        foreach ($tokens as $token) {
            $query->where(function ($q) use ($token, $columns, $relations, $numericColumns, $phoneColumns, $phoneRelations) {
                foreach ($columns as $column) {
                    $q->orWhere($column, 'like', "%{$token}%");
                }

                if (!empty($numericColumns) && ctype_digit($token)) {
                    foreach ($numericColumns as $column) {
                        $q->orWhere($column, (int) $token);
                    }
                }

                foreach ($relations as $relation => $relColumns) {
                    $q->orWhereHas($relation, function ($rq) use ($relColumns, $token) {
                        $rq->where(function ($rqq) use ($relColumns, $token) {
                            foreach ($relColumns as $relColumn) {
                                $rqq->orWhere($relColumn, 'like', "%{$token}%");
                            }
                        });
                    });
                }

                $isNumericToken = preg_match('/^\+?\d+$/', $token) === 1;
                $digits = $isNumericToken ? ltrim($token, '+') : '';
                if ($digits !== '') {
                    foreach ($phoneColumns as $column) {
                        $q->orWhereRaw(
                            "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$column}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?",
                            ["%{$digits}%"]
                        );
                    }
                    foreach ($phoneRelations as $relation => $relColumns) {
                        $q->orWhereHas($relation, function ($rq) use ($relColumns, $digits) {
                            foreach ($relColumns as $relColumn) {
                                $rq->orWhereRaw(
                                    "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE({$relColumn}, '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') LIKE ?",
                                    ["%{$digits}%"]
                                );
                            }
                        });
                    }
                }
            });
        }

        return $query;
    }
}
