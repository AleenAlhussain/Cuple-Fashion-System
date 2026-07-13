<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\AramexStatusMapping;
use App\Services\AramexStatusMappingImporter;
use Illuminate\Http\Request;

class AramexStatusMappingController extends BaseController
{
    public function index()
    {
        $mappings = AramexStatusMapping::orderBy('aramex_code')->get();
        return $this->success($mappings);
    }

    public function update(Request $request, AramexStatusMapping $mapping)
    {
        $validated = $request->validate([
            'stage' => 'required|string|max:100',
            'severity' => 'required|in:info,warn,error',
            'customer_title_en' => 'nullable|string|max:255',
            'customer_message_en' => 'nullable|string',
            'customer_title_ar' => 'nullable|string|max:255',
            'customer_message_ar' => 'nullable|string',
            'is_active' => 'sometimes|boolean',
        ]);

        $shouldMarkManual = $request->hasAny([
            'stage',
            'severity',
            'customer_title_en',
            'customer_message_en',
            'customer_title_ar',
            'customer_message_ar',
        ]);

        $mapping->update([
            'stage' => $validated['stage'],
            'severity' => $validated['severity'],
            'customer_title_en' => $validated['customer_title_en'],
            'customer_message_en' => $validated['customer_message_en'],
            'customer_title_ar' => $validated['customer_title_ar'],
            'customer_message_ar' => $validated['customer_message_ar'],
            'is_active' => $validated['is_active'] ?? $mapping->is_active,
            'is_manual_override' => $shouldMarkManual || $mapping->is_manual_override,
        ]);

        return $this->success($mapping->fresh());
    }

    public function reimport(Request $request, AramexStatusMappingImporter $importer)
    {
        $overwrite = (bool) $request->boolean('overwrite');
        $result = $importer->import($overwrite);

        if (!$result['success']) {
            return $this->error($result['message'], 422);
        }

        return $this->success(
            $result,
            'Re-import completed. Created ' . $result['created'] . ', updated ' . $result['updated'] . ' mappings.'
        );
    }
}
