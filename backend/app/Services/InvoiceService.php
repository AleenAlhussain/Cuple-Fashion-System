<?php

namespace App\Services;

use App\Models\Invoice;
use App\Models\Order;
use App\Mail\InvoiceMail;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Storage;

class InvoiceService
{
    /**
     * Generate invoice for an order
     */
    public function generateInvoice(Order $order): Invoice
    {
        // Check if invoice already exists
        if ($order->invoice) {
            return $order->invoice;
        }

        // Create invoice record
        $invoice = Invoice::createFromOrder($order);

        // Generate PDF
        $this->generatePdf($invoice);

        return $invoice;
    }

    /**
     * Generate PDF for invoice
     */
    public function generatePdf(Invoice $invoice): string
    {
        $order = $invoice->order->load('items.product', 'items.variant');

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'order' => $order,
        ]);

        $pdfPath = $invoice->getPdfStoragePath();

        // Ensure the invoices directory exists
        Storage::disk('public')->makeDirectory('invoices');

        // Save PDF to storage
        Storage::disk('public')->put($pdfPath, $pdf->output());

        // Update invoice with PDF path
        $invoice->update(['pdf_path' => $pdfPath]);

        return $pdfPath;
    }

    /**
     * Get PDF content for download
     */
    public function getPdfContent(Invoice $invoice): string
    {
        // If PDF exists in storage, return it
        if ($invoice->pdf_path && Storage::disk('public')->exists($invoice->pdf_path)) {
            return Storage::disk('public')->get($invoice->pdf_path);
        }

        // Otherwise, generate it
        $this->generatePdf($invoice);
        return Storage::disk('public')->get($invoice->pdf_path);
    }

    /**
     * Download PDF
     */
    public function downloadPdf(Invoice $invoice)
    {
        $content = $this->getPdfContent($invoice);

        return response($content, 200, [
            'Content-Type' => 'application/pdf',
            'Content-Disposition' => 'attachment; filename="' . $invoice->invoice_number . '.pdf"',
        ]);
    }

    /**
     * Stream PDF (for preview)
     */
    public function streamPdf(Invoice $invoice)
    {
        $order = $invoice->order->load('items.product', 'items.variant');

        $pdf = Pdf::loadView('invoices.pdf', [
            'invoice' => $invoice,
            'order' => $order,
        ]);

        return $pdf->stream($invoice->invoice_number . '.pdf');
    }

    /**
     * Send invoice via email
     */
    public function sendInvoiceEmail(Invoice $invoice): bool
    {
        try {
            $order = $invoice->order;
            $email = $order->shipping_email;

            if (!$email) {
                return false;
            }

            // Ensure PDF is generated
            if (!$invoice->pdf_path || !Storage::disk('public')->exists($invoice->pdf_path)) {
                $this->generatePdf($invoice);
            }

            // Send email with invoice attachment
            Mail::to($email)->send(new InvoiceMail($invoice));

            // Mark invoice as sent
            $invoice->markAsSent();

            return true;
        } catch (\Exception $e) {
            \Log::error('Failed to send invoice email: ' . $e->getMessage());
            return false;
        }
    }

    /**
     * Regenerate PDF (useful after updates)
     */
    public function regeneratePdf(Invoice $invoice): string
    {
        // Delete existing PDF if exists
        if ($invoice->pdf_path && Storage::disk('public')->exists($invoice->pdf_path)) {
            Storage::disk('public')->delete($invoice->pdf_path);
        }

        return $this->generatePdf($invoice);
    }
}
