<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reset Your Password</title>
</head>
<body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f4; padding: 20px 0;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background-color: #c9a86c; padding: 30px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 28px;">CUPLE</h1>
                        </td>
                    </tr>

                    <!-- Content -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <h2 style="margin: 0 0 20px 0; color: #333333; font-size: 24px;">Reset Your Password</h2>

                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                Dear {{ $user->name }},
                            </p>

                            <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                                We received a request to reset the password for your account. Click the button below to create a new password:
                            </p>

                            <!-- Reset Button -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                                <tr>
                                    <td align="center">
                                        <a href="{{ $resetUrl }}" style="display: inline-block; background-color: #c9a86c; color: #ffffff; text-decoration: none; padding: 15px 40px; border-radius: 5px; font-size: 16px; font-weight: bold;">
                                            Reset Password
                                        </a>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0;">
                                If the button doesn't work, copy and paste this link into your browser:
                            </p>
                            <p style="color: #c9a86c; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0; word-break: break-all;">
                                <a href="{{ $resetUrl }}" style="color: #c9a86c;">{{ $resetUrl }}</a>
                            </p>

                            <!-- Warning Box -->
                            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff8e6; border-radius: 8px; margin: 20px 0; border-left: 4px solid #c9a86c;">
                                <tr>
                                    <td style="padding: 15px;">
                                        <p style="margin: 0; color: #666666; font-size: 14px; line-height: 1.6;">
                                            <strong>Note:</strong> This link will expire in 60 minutes. If you didn't request a password reset, please ignore this email or contact support if you have concerns.
                                        </p>
                                    </td>
                                </tr>
                            </table>

                            <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0;">
                                If you have any questions, please contact us at <a href="mailto:support@cuple.shop" style="color: #c9a86c;">support@cuple.shop</a>
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #333333; padding: 30px; text-align: center;">
                            <p style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px;">
                                CUPLE Shop
                            </p>
                            <p style="margin: 0; color: #888888; font-size: 12px;">
                                {{ date('Y') }} CUPLE. All rights reserved.<br>
                                UAE
                            </p>
                            <p style="margin: 15px 0 0 0;">
                                <a href="https://cuple.ae" style="color: #c9a86c; text-decoration: none; font-size: 14px;">cuple.ae</a>
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>
