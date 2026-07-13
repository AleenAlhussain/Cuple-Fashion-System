<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Page;
use Illuminate\Http\Request;

class PageController extends BaseController
{
    public function index(Request $request)
    {
        $query = Page::query()->where('status', 1);

        if ($request->filled('search')) {
            $query->where(function ($query) use ($request) {
                $query->where('title', 'like', '%' . $request->input('search') . '%')
                    ->orWhere('slug', 'like', '%' . $request->input('search') . '%');
            });
        }

        $pages = $query->orderBy('updated_at', 'desc')
            ->get(['id', 'title', 'slug', 'content', 'meta_title', 'meta_description', 'status']);

        return $this->success($pages);
    }

    public function show($slug)
    {
        $page = Page::where('slug', $slug)
            ->where('status', 1)
            ->first(['id', 'title', 'slug', 'content', 'meta_title', 'meta_description', 'status']);

        if (!$page) {
            return $this->error('Page not found', 404);
        }

        return $this->success($page);
    }
}
