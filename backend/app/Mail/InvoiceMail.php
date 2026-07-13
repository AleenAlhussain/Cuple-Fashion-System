<?php

namespace App\Mail;

use App\Models\Invoice;
use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Storage;

class InvoiceMail extends Mailable
{
    use Queueable, SerializesModels;

    public Invoice $invoice;

    /**
     * Create a new message instance.
     */
    public function __construct(Invoice $invoice)
    {
        $this->invoice = $invoice;
    }

    /**
     * Build the message.
     */
    public function build()
    {
        $order = $this->invoice->order;

        $mail = $this->subject('Your Order Invoice - ' . $this->invoice->invoice_number)
            ->view('emails.invoice')
            ->with([
                'invoice' => $this->invoice,
                'order' => $order,
            ]);

        // Attach PDF if exists
        if ($this->invoice->pdf_path && Storage::disk('public')->exists($this->invoice->pdf_path)) {
            $mail->attach(Storage::disk('public')->path($this->invoice->pdf_path), [
                'as' => $this->invoice->invoice_number . '.pdf',
                'mime' => 'application/pdf',
            ]);
        }

        return $mail;
    }
}
