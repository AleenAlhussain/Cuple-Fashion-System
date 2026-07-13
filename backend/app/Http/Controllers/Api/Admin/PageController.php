<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Api\BaseController;
use App\Models\Page;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;

class PageController extends BaseController
{
    public function index(Request $request)
    {
        $query = Page::with('creator');

        if ($request->filled('search')) {
            $query->where('title', 'like', '%' . $request->input('search') . '%');
        }

        if ($request->filled('status')) {
            $query->where('status', $request->input('status'));
        }

        if ($request->filled('trashed')) {
            $query->onlyTrashed();
        }

        if ($request->filled('field')) {
            $query->orderBy($request->input('field'), $request->input('sort', 'asc'));
        } else {
            $query->latest();
        }

        $perPage = $request->input('paginate', $request->input('per_page', 15));
        $paginator = $query->paginate((int) $perPage);

        return $this->success([
            'data' => $paginator->items(),
            'current_page' => $paginator->currentPage(),
            'last_page' => $paginator->lastPage(),
            'per_page' => $paginator->perPage(),
            'total' => $paginator->total(),
            'from' => $paginator->firstItem(),
            'to' => $paginator->lastItem(),
        ]);
    }

    public function store(Request $request)
    {
        $payload = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'status' => 'sometimes|numeric',
            'page_meta_image_id' => 'nullable|integer',
        ]);

        $payload['slug'] = $this->generateSlug($payload['title']);
        $payload['created_by_id'] = Auth::id() ?? 1;

        $page = Page::create($payload);
        $page->loadMissing('creator');

        return $this->success($page, 'Page created successfully');
    }

    public function show($id)
    {
        $page = Page::find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $page->loadMissing('creator');

        return $this->success($page);
    }

    public function update(Request $request, $id)
    {
        $page = Page::withTrashed()->with('creator')->find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $payload = $request->validate([
            'title' => 'required|string|max:255',
            'content' => 'nullable|string',
            'meta_title' => 'nullable|string|max:255',
            'meta_description' => 'nullable|string',
            'status' => 'sometimes|numeric',
            'page_meta_image_id' => 'nullable|integer',
        ]);

        $payload['slug'] = $this->generateSlug($payload['title'], $page->id);
        $page->update($payload);
        $page->loadMissing('creator');

        return $this->success($page, 'Page updated successfully');
    }

    public function destroy($id)
    {
        $page = Page::find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $page->forceDelete();

        return $this->success(null, 'Page permanently deleted');
    }

    public function duplicate($id)
    {
        $page = Page::find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $newPage = $page->replicate();
        $newPage->slug = $this->generateSlug($page->title . ' copy');
        $newPage->created_by_id = Auth::id() ?? 1;
        $newPage->save();
        $newPage->loadMissing('creator');

        return $this->success($newPage, 'Page duplicated successfully');
    }

    public function restore($id)
    {
        $page = Page::onlyTrashed()->find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $page->restore();

        return $this->success($page, 'Page restored successfully');
    }

    public function force($id)
    {
        $page = Page::withTrashed()->find($id);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        $page->forceDelete();

        return $this->success(null, 'Page permanently deleted');
    }

    private function generateSlug(string $title, ?int $ignoreId = null): string
    {
        $slug = Str::slug($title);
        $original = $slug;
        $counter = 1;

        while (
            Page::where('slug', $slug)
                ->when($ignoreId, fn ($query) => $query->where('id', '!=', $ignoreId))
                ->exists()
        ) {
            $slug = "{$original}-{$counter}";
            $counter++;
        }

        return $slug;
    }
}
