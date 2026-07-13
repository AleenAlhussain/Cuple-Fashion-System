<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Tag;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TagController extends BaseController
{
    public function index(Request $request)
    {
        $query = Tag::query();

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('search')) {
            $query->where('name', 'like', '%' . $request->search . '%');
        }

        $tags = $query->orderBy('created_at', 'desc')->paginate($request->get('paginate', 15));

        return response()->json([
            'success' => true,
            'data' => $tags->items(),
            'total' => $tags->total(),
            'current_page' => $tags->currentPage(),
            'last_page' => $tags->lastPage(),
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'status' => 'boolean',
        ]);

        $tag = Tag::create([
            'name' => $validated['name'],
            'slug' => Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'] ?? true,
        ]);

        return $this->success($tag, 'Tag created successfully.');
    }

    public function show($id)
    {
        $tag = Tag::findOrFail($id);
        return $this->success($tag);
    }

    public function update(Request $request, $id)
    {
        $tag = Tag::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'status' => 'boolean',
        ]);

        if (isset($validated['name'])) {
            $validated['slug'] = Str::slug($validated['name']);
        }

        $tag->update($validated);

        return $this->success($tag, 'Tag updated successfully.');
    }

    public function destroy($id)
    {
        $tag = Tag::findOrFail($id);
        $tag->delete();

        return $this->success(null, 'Tag deleted successfully.');
    }

    public function bulkAction(Request $request)
    {
        $action = $request->input('action');
        $ids = $request->input('ids', []);

        if (empty($ids)) {
            return $this->error('No items selected.', 400);
        }

        switch ($action) {
            case 'delete':
                Tag::whereIn('id', $ids)->delete();
                return $this->success(null, count($ids) . ' tag(s) deleted successfully.');

            case 'active':
                Tag::whereIn('id', $ids)->update(['status' => true]);
                return $this->success(null, count($ids) . ' tag(s) activated.');

            case 'deactive':
                Tag::whereIn('id', $ids)->update(['status' => false]);
                return $this->success(null, count($ids) . ' tag(s) deactivated.');

            default:
                return $this->error('Invalid action.', 400);
        }
    }
}
