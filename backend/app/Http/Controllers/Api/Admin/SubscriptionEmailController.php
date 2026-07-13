<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\SubscriptionEmail;
use Illuminate\Http\Request;

class SubscriptionEmailController extends BaseController
{
    public function index(Request $request)
    {
        $query = SubscriptionEmail::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('source')) {
            $query->where('source', (string) $request->input('source'));
        }

        $items = $query->latest()->paginate((int) $request->input('paginate', 15));

        return $this->paginated($items);
    }

    public function export(Request $request)
    {
        $query = SubscriptionEmail::query();

        if ($request->filled('search')) {
            $search = trim((string) $request->input('search'));
            $query->where(function ($q) use ($search) {
                $q->where('email', 'like', "%{$search}%")
                    ->orWhere('source', 'like', "%{$search}%")
                    ->orWhere('ip_address', 'like', "%{$search}%");
            });
        }

        if ($request->filled('source')) {
            $query->where('source', (string) $request->input('source'));
        }

        $rows = $query->latest()->get(['id', 'email', 'source', 'ip_address', 'created_at']);
        $filename = 'subscription_emails_' . now()->format('Y-m-d_His') . '.csv';

        $callback = function () use ($rows) {
            $handle = fopen('php://output', 'w');

            fputcsv($handle, ['id', 'email', 'source', 'ip_address', 'created_at']);

            foreach ($rows as $row) {
                fputcsv($handle, [
                    $row->id,
                    $row->email,
                    $row->source,
                    $row->ip_address,
                    optional($row->created_at)?->toDateTimeString(),
                ]);
            }

            fclose($handle);
        };

        return response()->streamDownload($callback, $filename, [
            'Content-Type' => 'text/csv',
        ]);
    }
}

