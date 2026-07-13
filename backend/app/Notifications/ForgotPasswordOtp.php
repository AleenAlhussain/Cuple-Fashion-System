<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Notifications\Notification;

class ForgotPasswordOtp extends Notification
{
    use Queueable;

    public $otp;

    public function __construct(string $otp)
    {
        $this->otp = $otp;
    }

    public function via($notifiable)
    {
        return ['mail'];
    }

    public function toMail($notifiable)
    {
        return (new MailMessage)
            ->subject('Password reset code')
            ->line("Use the following code to reset your password: {$this->otp}")
            ->line('This code expires soon. If you did not request a password reset, please ignore this email.');
    }
}
