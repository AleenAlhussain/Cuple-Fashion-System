<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends BaseController
{
    private function normalizeFaqInput(Request $request): void
    {
        $normalized = [];

        foreach (['title', 'title_ar', 'description', 'description_ar'] as $field) {
            if ($request->has($field)) {
                $value = trim((string) $request->input($field, ''));
                $normalized[$field] = $value === '' ? null : $value;
            }
        }

        if ($normalized !== []) {
            $request->merge($normalized);
        }
    }

    private function validateFaq(Request $request): array
    {
        $this->normalizeFaqInput($request);

        return $request->validate([
            'title' => 'nullable|string|max:255|required_without:title_ar',
            'title_ar' => 'nullable|string|max:255|required_without:title',
            'description' => 'nullable|string|required_without:description_ar',
            'description_ar' => 'nullable|string|required_without:description',
            'status' => 'nullable|boolean',
        ], [
            'title.required_without' => 'Either the English or Arabic title is required.',
            'title_ar.required_without' => 'Either the English or Arabic title is required.',
            'description.required_without' => 'Either the English or Arabic description is required.',
            'description_ar.required_without' => 'Either the English or Arabic description is required.',
        ]);
    }

    public function index(Request $request)
    {
        $query = Faq::query();

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        if ($request->filled('status') && $request->status !== '') {
            $status = $request->status == '1' || $request->status === 'true' || $request->status === true ? 1 : 0;
            $query->where('status', $status);
        }

        if ($request->filled('search')) {
            $search = trim($request->search);
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('title_ar', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('description_ar', 'like', "%{$search}%");
            });
        }

        $allowed = ['title', 'title_ar', 'status', 'created_at', 'updated_at'];
        $field = in_array($request->field, $allowed, true) ? $request->field : 'created_at';
        $order = strtolower($request->sort) === 'desc' ? 'desc' : 'asc';
        $query->orderBy($field, $order);

        $perPage = $request->input('paginate', 15);
        $faqs = $query->paginate($perPage);

        return $this->paginated($faqs);
    }

    public function store(Request $request)
    {
        $validated = $this->validateFaq($request);

        $faq = Faq::create([
            'title' => $validated['title'] ?? null,
            'title_ar' => $validated['title_ar'] ?? null,
            'description' => $validated['description'] ?? null,
            'description_ar' => $validated['description_ar'] ?? null,
            'status' => $validated['status'] ?? true,
            'created_by_id' => auth()->id(),
        ]);

        return $this->success($faq, 'FAQ created successfully.', 201);
    }

    public function show($id)
    {
        $faq = Faq::withTrashed()->findOrFail($id);

        return $this->success($faq);
    }

    public function update(Request $request, $id)
    {
        $faq = Faq::withTrashed()->findOrFail($id);

        $validated = $this->validateFaq($request);

        $faq->update([
            'title' => $validated['title'] ?? null,
            'title_ar' => $validated['title_ar'] ?? null,
            'description' => $validated['description'] ?? null,
            'description_ar' => $validated['description_ar'] ?? null,
            'status' => $validated['status'] ?? $faq->status,
        ]);

        return $this->success($faq->fresh(), 'FAQ updated successfully.');
    }

    public function destroy($id)
    {
        $faq = Faq::findOrFail($id);
        $faq->forceDelete();

        return $this->success(null, 'FAQ permanently deleted.');
    }

    public function restore($id)
    {
        $faq = Faq::onlyTrashed()->findOrFail($id);
        $faq->restore();

        return $this->success(null, 'FAQ restored successfully.');
    }

    public function force($id)
    {
        $faq = Faq::withTrashed()->findOrFail($id);
        $faq->forceDelete();

        return $this->success(null, 'FAQ permanently deleted.');
    }
}
