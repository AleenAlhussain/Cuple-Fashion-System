<?php

namespace App\Http\Controllers\Api\Admin;

use App\Models\Invoice;
use App\Models\Order;
use App\Services\InvoiceService;
use App\Http\Controllers\Api\BaseController;
use Illuminate\Http\Request;

class InvoiceController extends BaseController
{
    protected InvoiceService $invoiceService;

    public function __construct(InvoiceService $invoiceService)
    {
        $this->invoiceService = $invoiceService;
    }

    /**
     * List all invoices
     */
    public function index(Request $request)
    {
        $query = Invoice::with(['order.user', 'order.items'])
            ->latest();

        // Filter by status
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Search by invoice number or order number
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('invoice_number', 'like', "%{$search}%")
                    ->orWhereHas('order', function ($oq) use ($search) {
                        $oq->where('order_number', 'like', "%{$search}%");
                    });
            });
        }

        $invoices = $query->paginate($request->input('paginate', 15));

        return $this->paginated($invoices);
    }

    /**
     * Get single invoice
     */
    public function show($id)
    {
        $invoice = Invoice::with(['order.user', 'order.items.product'])->findOrFail($id);
        return $this->success($invoice);
    }

    /**
     * Get invoice by order ID
     */
    public function getByOrder($orderId)
    {
        $order = Order::findOrFail($orderId);

        if (!$order->invoice) {
            // Generate invoice if it doesn't exist
            $invoice = $this->invoiceService->generateInvoice($order);
        } else {
            $invoice = $order->invoice;
        }

        return $this->success($invoice->load('order.items.product'));
    }

    /**
     * Generate invoice for an order
     */
    public function generate($orderId)
    {
        $order = Order::findOrFail($orderId);

        $invoice = $this->invoiceService->generateInvoice($order);

        return $this->success($invoice, 'Invoice generated successfully');
    }

    /**
     * Download invoice PDF
     */
    public function download($id)
    {
        $invoice = Invoice::with(['order.items.product', 'order.items.variant'])->findOrFail($id);

        return $this->invoiceService->downloadPdf($invoice);
    }

    /**
     * Download invoice PDF by order ID
     */
    public function downloadByOrder($orderId)
    {
        $order = Order::findOrFail($orderId);

        if (!$order->invoice) {
            $invoice = $this->invoiceService->generateInvoice($order);
        } else {
            $invoice = $order->invoice;
        }

        return $this->invoiceService->downloadPdf($invoice);
    }

    /**
     * Preview invoice PDF (stream)
     */
    public function preview($id)
    {
        $invoice = Invoice::with(['order.items.product', 'order.items.variant'])->findOrFail($id);

        return $this->invoiceService->streamPdf($invoice);
    }

    /**
     * Send invoice via email
     */
    public function sendEmail($id)
    {
        $invoice = Invoice::with('order')->findOrFail($id);

        $sent = $this->invoiceService->sendInvoiceEmail($invoice);

        if ($sent) {
            return $this->success($invoice->fresh(), 'Invoice sent successfully');
        }

        return $this->error('Failed to send invoice email', 500);
    }

    /**
     * Regenerate invoice PDF
     */
    public function regenerate($id)
    {
        $invoice = Invoice::findOrFail($id);

        $this->invoiceService->regeneratePdf($invoice);

        return $this->success($invoice->fresh(), 'Invoice regenerated successfully');
    }

    /**
     * Mark invoice as paid
     */
    public function markPaid($id)
    {
        $invoice = Invoice::findOrFail($id);
        $invoice->markAsPaid();

        // Also update order payment status
        $invoice->order->update(['payment_status' => 'paid']);

        return $this->success($invoice->fresh(), 'Invoice marked as paid');
    }
}
