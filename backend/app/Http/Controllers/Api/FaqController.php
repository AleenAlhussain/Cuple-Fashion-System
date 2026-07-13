<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\BaseController;
use App\Models\Faq;
use Illuminate\Http\Request;

class FaqController extends BaseController
{
    public function index(Request $request)
    {
        $faqs = Faq::query()
            ->where('status', true)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->success($faqs);
    }

    public function show($id)
    {
        $faq = Faq::where('status', true)->findOrFail($id);

        return $this->success($faq);
    }
}
